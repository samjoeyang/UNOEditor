/* UNOEditor — optional AI assist (BYOK, ES5 / old WebKit safe) */
(function () {
  'use strict';

  var hooks = {};
  var cfg = null;
  var busy = false, busySeq = 0, busyTimer = null, busyKick = null;
  var WEB_KEY = 'unoeditor-ai-config';
  var MAX_PROFILES = 8;
  var MAX_SKILLS = 24;
  var streamHandler = null;

  // LANGUAGE LOCK: these are rewrites, never translations. The model must keep
  // the input language (Chinese in -> Chinese out). Prepended to every action
  // so even custom skills and English-language prompts cannot switch language.
  var LANG_LOCK = 'CRITICAL LANGUAGE RULE: This is a rewrite, NOT a translation. ' +
    'Write the result in the EXACT SAME language as the input text below ' +
    '(if the input is Chinese, output Chinese; never convert it to English). ' +
    'Preserve the original language, do not translate. ' +
    '【重要·语言要求】这是改写，不是翻译。输入是中文就必须用中文输出，严禁把中文翻译成英文或其他语言。 ';
  var ACTIONS = {
    polish: 'Improve the following text: smooth the flow, replace dull or repetitive wording, fix awkward phrasing and strengthen sentence rhythm. Keep the original meaning and Markdown structure. The result must be visibly better than the input - make word-level changes a reader can notice. If the text is already strong, still refine word choice. Output only the improved text.',
    concise: 'Rewrite the following text to be substantially shorter while keeping all key information. Cut filler words and merge redundant sentences. Keep Markdown structure. Output only the rewritten text.',
    expand: 'Expand the following text with concrete, useful detail and richer phrasing, keeping its voice. Output only the expanded text in Markdown.',
    formal: 'Rewrite the following text in a formal, professional tone while keeping its meaning. Output only the rewritten text.',
    casual: 'Rewrite the following text in a casual, natural, conversational tone while keeping its meaning. Output only the rewritten text.',
    fix: 'Fix grammar, spelling and punctuation errors in the following text. Correct only real errors; keep the writing style unchanged. Output only the corrected text.',
    heading: 'Turn the following text into a short, clear Markdown heading (single line). Output only the heading.'
  };

  var DOC_ACTIONS = {
    title: 'Give me 3 concise title options for this article. Number them 1-3, one per line. Output only the titles.',
    summary: 'Summarize this article in 3-5 sentences. Output Markdown only.',
    keywords: 'Extract 5-8 SEO keywords for this article, comma separated. Output only the keywords.',
    outline: 'Extract a clear Markdown outline (headings only) from this article.',
    intro: 'Write a short engaging intro for publishing this article on WeChat. Output Markdown only.'
  };

  var LANGS = {
    'zh-CN': 'Simplified Chinese', 'zh-TW': 'Traditional Chinese', en: 'English',
    ja: 'Japanese', ko: 'Korean', fr: 'French', de: 'German', es: 'Spanish'
  };

  function t(k) { return window.UnoI18n ? window.UnoI18n.t(k) : k; }
  function $(id) { return document.getElementById(id); }
  function available() {
    return !!(window.__TAURI_INTERNALS__ || (window.__TAURI__ && window.__TAURI__.core));
  }
  function invoke(cmd, args) {
    if (!available()) return Promise.reject(new Error('web'));
    try {
      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        return window.__TAURI_INTERNALS__.invoke(cmd, args || {});
      }
      return window.__TAURI__.core.invoke(cmd, args || {});
    } catch (err) { return Promise.reject(err); }
  }
  function hasEventApi() {
    return !!(window.__TAURI__ && window.__TAURI__.event && window.__TAURI__.event.listen);
  }

  function defaultConfig() {
    return { enabled: false, version: 1, defaultProfile: '', profiles: [], skills: [], systemPrompt: '', requestTimeoutMs: 30000, updatedAt: 0 };
  }
  function normalize(c) {
    var d = defaultConfig();
    if (!c || typeof c !== 'object') return d;
    d.enabled = !!c.enabled;
    d.version = c.version || 1;
    d.defaultProfile = c.defaultProfile || '';
    d.systemPrompt = c.systemPrompt || '';
    d.requestTimeoutMs = c.requestTimeoutMs || 30000;
    d.updatedAt = c.updatedAt || 0;
    var ps = c.profiles || [];
    for (var i = 0; i < ps.length && i < MAX_PROFILES; i++) {
      var p = ps[i] || {};
      d.profiles.push({
        id: p.id || ('p' + (i + 1)),
        name: p.name || ('Profile ' + (i + 1)),
        provider: p.provider || 'openai-compatible',
        baseUrl: p.baseUrl || '',
        model: p.model || '',
        apiKey: p.apiKey || '',
        temperature: typeof p.temperature === 'number' ? p.temperature : 0.7,
        maxTokens: p.maxTokens || 2048
      });
    }
    var ss = c.skills || [];
    for (var j = 0; j < ss.length && j < MAX_SKILLS; j++) {
      var s = ss[j] || {};
      if (!s.name || !s.prompt) continue;
      d.skills.push({
        id: s.id || ('s' + (j + 1)),
        name: s.name,
        prompt: s.prompt,
        scopes: s.scopes || ''
      });
    }
    return d;
  }

  function getConfig() {
    if (available()) {
      return invoke('uno_ai_config_get').then(function (c) { cfg = normalize(c); return cfg; })
        .catch(function () { cfg = readWeb(); return cfg; });
    }
    cfg = readWeb();
    return Promise.resolve(cfg);
  }
  function readWeb() {
    try {
      var raw = window.localStorage && window.localStorage.getItem(WEB_KEY);
      return normalize(raw ? JSON.parse(raw) : null);
    } catch (e) { return defaultConfig(); }
  }
  function writeWeb(c) {
    try { if (window.localStorage) window.localStorage.setItem(WEB_KEY, JSON.stringify(c)); } catch (e) { }
  }
  function setConfig(c) {
    var next = normalize(c);
    next.updatedAt = Date.now();
    if (available()) {
      return invoke('uno_ai_config_set', { cfg: next }).then(function () {
        writeWeb(next); cfg = next; syncModelSelect(); return cfg;
      });
    }
    writeWeb(next); cfg = next; syncModelSelect(); return Promise.resolve(cfg);
  }
  function init(h) { hooks = h || {}; }

  function currentProfile() {
    if (!cfg) return null;
    if (!cfg.profiles.length) return null;
    for (var i = 0; i < cfg.profiles.length; i++) {
      if (cfg.profiles[i].id === cfg.defaultProfile) return cfg.profiles[i];
    }
    return cfg.profiles[0];
  }
  function findProfile(pid) {
    if (!cfg) return null;
    if (!pid) return currentProfile();
    for (var i = 0; i < cfg.profiles.length; i++) if (cfg.profiles[i].id === pid) return cfg.profiles[i];
    return null;
  }
  function selectedProfileId() {
    var sel = $('aiModelSelect');
    return sel ? sel.value : '';
  }
  function maskKey(k) {
    if (!k) return '';
    if (k.length <= 8) return '••••';
    return k.slice(0, 3) + '••••••••' + k.slice(-4);
  }
  function estimateTokens(s) {
    if (!s) return 0;
    var chinese = (s.match(/[\u4e00-\u9fff]/g) || []).length;
    var rest = s.length - chinese;
    return Math.ceil(chinese / 1.5 + rest / 4);
  }

  /* ---------------- transport ---------------- */

  function systemContent() {
    return cfg.systemPrompt ||
      'You are a writing assistant. Output Markdown only. Do not wrap the answer in code fences.';
  }
  function webChatFetch(p, messages, onDelta) {
    if (!window.fetch) return Promise.reject(new Error('noFetch'));
    var url = p.baseUrl.replace(/\/+$/, '') + '/chat/completions';
    var body = {
      model: p.model,
      messages: [{ role: 'system', content: systemContent() }].concat(messages),
      temperature: p.temperature,
      max_tokens: p.maxTokens,
      stream: !!onDelta
    };
    return window.fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + p.apiKey },
      body: JSON.stringify(body)
    }).then(function (r) {
      if (!r.ok) return r.text().then(function (tx) { throw new Error('HTTP ' + r.status + ': ' + tx.slice(0, 200)); });
      if (!onDelta || !r.body || !r.body.getReader) return r.json().then(function (data) {
        var c = data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        if (!c) throw new Error('Empty response');
        var out = cleanOutput(String(c));
        if (onDelta) onDelta(out, out);
        return out;
      });
      var reader = r.body.getReader();
      var decoder = window.TextDecoder ? new window.TextDecoder() : null;
      var buf = '', out = '';
      function pump() {
        return reader.read().then(function (res) {
          if (res.done) return cleanOutput(out);
          buf += decoder ? decoder.decode(res.value, { stream: true }) : String.fromCharCode.apply(null, res.value);
          var nl;
          while ((nl = buf.indexOf('\n')) >= 0) {
            var line = buf.slice(0, nl).replace(/\r$/, '');
            buf = buf.slice(nl + 1);
            if (line.indexOf('data:') !== 0) continue;
            var data = line.slice(5).trim();
            if (data === '[DONE]') continue;
            try {
              var obj = JSON.parse(data);
              var d = obj && obj.choices && obj.choices[0] && obj.choices[0].delta && obj.choices[0].delta.content;
              if (d) { out += d; onDelta(d, out); }
            } catch (e) { /* ignore malformed chunk */ }
          }
          return pump();
        });
      }
      return pump();
    });
  }

  function chat(messages, profileId, silent, onDelta) {
    if (!cfg) return getConfig().then(function () { return chat(messages, profileId, silent, onDelta); });
    var pid = profileId || selectedProfileId() || (currentProfile() ? currentProfile().id : '');
    if (!pid) return Promise.reject(new Error('noProfile'));
    var p = findProfile(pid);
    if (!p || p.id !== pid) return Promise.reject(new Error('noProfile'));
    // Any incoming progress re-arms the busy watchdog, so active streams are
    // never killed by the idle timer.
    if (onDelta && busyKick) {
      var userDelta = onDelta;
      onDelta = function (d, full) { busyKick(); userDelta(d, full); };
    }
    if (available()) {
      if (onDelta && hasEventApi()) return desktopStream(messages, pid, onDelta);
      // No event API (old WebView / stub) -> use the non-streaming command and
      // deliver the whole result once through onDelta.
      return invoke('uno_ai_chat', { profileId: pid, messages: messages }).then(function (res) {
        var out = cleanOutput(res);
        if (onDelta) onDelta(out, out);
        return out;
      });
    }
    return webChatFetch(p, messages, onDelta);
  }

  function desktopStream(messages, pid, onDelta) {
    var rid = 'ai-' + Date.now() + '-' + Math.floor(Math.random() * 1e6);
    return new Promise(function (resolve, reject) {
      var out = '', settled = false, unlisten = null;
      function finish(err, val) {
        if (settled) return;
        settled = true;
        if (unlisten) { try { unlisten(); } catch (e) { } }
        if (err) reject(err); else resolve(val);
      }
      window.__TAURI__.event.listen('uno-ai-stream', function (e) {
        var payload = e && e.payload;
        if (!payload || payload.requestId !== rid) return;
        if (payload.error) { finish(new Error(payload.error)); return; }
        if (payload.delta) { out += payload.delta; onDelta(payload.delta, out); }
        if (payload.done) finish(null, cleanOutput(out));
      }).then(function (fn) {
        unlisten = fn;
        invoke('uno_ai_chat_stream', { profileId: pid, messages: messages, requestId: rid })
          .then(function () {
            // Belt and braces: command completion means the Rust side has
            // finished streaming. Give in-flight delta events a short grace
            // period to flush, then settle even if the terminal event was
            // missed (older build / event loss).
            setTimeout(function () { finish(null, cleanOutput(out)); }, 30);
          })
          .catch(function (e) { finish(e); });
      }).catch(function (e) { finish(e); });
    });
  }

  function fail(e, silent) {
    var msg = (e && e.message) || String(e);
    if (!silent && hooks.toast) hooks.toast(t('aiFail') + ' ' + msg);
    return Promise.reject(e);
  }
  function begin() {
    if (busy) { if (hooks.toast) hooks.toast(t('aiBusy')); return false; }
    busy = true;
    busySeq++;
    var seq = busySeq;
    // Watchdog: a request that stops making progress must not block AI forever.
    // Each incoming delta re-arms the timer, so a long but active stream is
    // never killed; only a genuinely stuck request trips it.
    var limit = Math.max(45000, ((cfg && cfg.requestTimeoutMs) || 30000) + 20000);
    busyKick = function () {
      if (busyTimer) clearTimeout(busyTimer);
      busyTimer = setTimeout(function () {
        if (!busy || busySeq !== seq) return;
        busy = false;
        busyKick = null;
        updateStatus('off');
        closeResultPanel();
        closeInlineCard();
        if (hooks.toast) hooks.toast(t('aiBusyTimeout'));
      }, limit);
    };
    busyKick();
    updateStatus('busy');
    return true;
  }
  function end() {
    busy = false;
    busySeq++;
    busyKick = null;
    if (busyTimer) { clearTimeout(busyTimer); busyTimer = null; }
    updateStatus('ready');
  }

  /* ---------------- capability: rewrite / draft ---------------- */

  function rewrite(action) {
    var ta = $('editor');
    if (!ta) return Promise.reject(new Error('noEditor'));
    var s = ta.selectionStart, e = ta.selectionEnd;
    var text = ta.value.slice(s, e);
    if (!text.trim()) {
      if (hooks.toast) hooks.toast(t('aiNoSelection'));
      return Promise.reject(new Error('noSelection'));
    }
    if (!begin()) return Promise.reject(new Error('busy'));
    var instruction = ACTIONS[action] || ACTIONS.polish;
    if (action && action.indexOf('skill:') === 0) {
      var sk = getSkill(action.slice(6));
      if (sk) instruction = sk.prompt + '\n\nOutput only the improved text in Markdown.';
    }
    instruction = LANG_LOCK + instruction;
    var streamBox = openInlineCard(t('aiRewriteTitle'), text);
    return chat([
      { role: 'user', content: instruction + '\n\n' + text }
    ], '', false, function (delta, full) { if (streamBox) streamBox.update(full); })
      .then(function (out) {
        end();
        if (streamBox) streamBox.update(out);
        offerReplace(streamBox, out, s, e);
        positionInlineCard();
        if (hooks.toast) hooks.toast(t('aiDone'));
        return out;
      }).catch(function (err) { end(); closeInlineCard(); return fail(err); });
  }

  function replaceSelection(text) {
    var ta = $('editor');
    if (!ta) return;
    var s = ta.selectionStart, e = ta.selectionEnd;
    ta.value = ta.value.slice(0, s) + text + ta.value.slice(e);
    var pos = s + text.length;
    ta.setSelectionRange(pos, pos);
    if (hooks.onEdit) hooks.onEdit();
    if (hooks.toast) hooks.toast(t('aiInserted'));
    if (hooks.toast) hooks.toast(t('aiDisclose'));
  }

  // Replace an exact range captured when the AI action started, so later
  // cursor moves or edits elsewhere do not corrupt the insertion point.
  function replaceRange(s, e, text) {
    var ta = $('editor');
    if (!ta) return;
    var cur = ta.value;
    var rs = Math.min(s, cur.length), re = Math.min(e, cur.length);
    ta.value = cur.slice(0, rs) + text + cur.slice(re);
    var pos = rs + text.length;
    ta.setSelectionRange(pos, pos);
    if (hooks.onEdit) hooks.onEdit();
    if (hooks.toast) hooks.toast(t('aiInserted'));
    if (hooks.toast) hooks.toast(t('aiDisclose'));
  }

  var pendingApply = null;

  // Offer the finished result as an explicit "replace" action in the drawer
  // instead of a blocking confirm() dialog. Falls back to direct replace when
  // the drawer is unavailable.
  function offerReplace(box, out, s, e) {
    if (box) {
      box.setAction('replace', function () { replaceRange(s, e, out); });
    } else if (hooks.previewDiff) {
      hooks.previewDiff(out, '', function () { replaceRange(s, e, out); });
    } else {
      replaceRange(s, e, out);
    }
  }

  function draft(prompt) {
    var ta = $('editor');
    if (!ta) return Promise.reject(new Error('noEditor'));
    var at = ta.selectionStart;
    if (!begin()) return Promise.reject(new Error('busy'));
    var before = ta.value.slice(0, at).slice(-800);
    var box = openInlineCard(t('aiRewriteTitle'), before);
    return chat([
      { role: 'user', content: 'Continue writing the following Markdown document. ' + (prompt || '') +
        '\n\nContext:\n' + before }
    ], '', false, function (delta, full) { if (box) box.update(full); })
      .then(function (out) { end(); if (box) box.update(out); offerReplace(box, out, at, at); positionInlineCard(); return out; })
      .catch(function (err) { end(); closeInlineCard(); return fail(err); });
  }

  /* /ai slash command: WebViews do not implement window.prompt reliably, so
     collect the instruction with an in-app dialog. The /ai token is only
     removed when the user confirms; cancelling leaves the document intact. */
  var draftCaret = -1;
  function openDraftPrompt(pos) {
    var m = $('aiDraftModal');
    if (!m) { draft(''); return; }
    draftCaret = pos;
    var input = $('aiDraftPrompt');
    if (input) input.value = '';
    m.hidden = false;
    if (input && input.focus) setTimeout(function () { input.focus(); }, 0);
  }
  function closeDraftPrompt(restore) {
    var m = $('aiDraftModal');
    if (m) m.hidden = true;
    if (restore && draftCaret >= 0) {
      var ta = $('editor');
      if (ta) {
        var p = Math.min(draftCaret + 3, ta.value.length);
        ta.setSelectionRange(p, p);
        if (ta.focus) ta.focus();
      }
    }
    draftCaret = -1;
  }
  function confirmDraft() {
    var ta = $('editor');
    var pos = draftCaret;
    var input = $('aiDraftPrompt');
    var instruction = input ? input.value.trim() : '';
    closeDraftPrompt(false);
    if (!ta || pos < 0) return;
    // Only consume the slash token if it is still exactly where we left it.
    if (ta.value.slice(pos, pos + 3) === '/ai') {
      var after = ta.value.slice(pos + 3);
      if (after.charAt(0) === ' ' || after.charAt(0) === '\u3000') after = after.slice(1);
      ta.value = ta.value.slice(0, pos) + after;
      ta.setSelectionRange(pos, pos);
      if (hooks.onEdit) hooks.onEdit();
    }
    draft(instruction).catch(function () { });
  }

  /* ---------------- capability: document copilot ---------------- */

  function docText() {
    if (hooks.getDocText) return hooks.getDocText();
    var ta = $('editor');
    return ta ? ta.value.replace(/^---[\s\S]*?---\s*/, '') : '';
  }

  function documentAction(action) {
    var text = docText();
    if (!text.trim()) { if (hooks.toast) hooks.toast(t('aiEmpty')); return Promise.reject(new Error('empty')); }
    if (!begin()) return Promise.reject(new Error('busy'));
    var box = openResultPanel(t('aiResultLabel'), true);
    return chat([{ role: 'user', content: (DOC_ACTIONS[action] || DOC_ACTIONS.summary) + '\n\n' + text }],
      '', false, function (delta, full) { if (box) box.update(full); })
      .then(function (out) {
        end(); if (box) { box.update(out); box.setAction(action); }
        if (hooks.showResult) hooks.showResult(out, action);
        return out;
      }).catch(function (err) { end(); closeResultPanel(); return fail(err); });
  }

  function applyResultAsTitle(result) {
    if (hooks.setDocTitle) {
      var first = String(result || '').split('\n')[0].replace(/^\s*\d+[.)]\s*/, '').replace(/^#+\s*/, '').trim();
      if (first) { hooks.setDocTitle(first); if (hooks.toast) hooks.toast(t('aiTitleSet')); }
    }
  }

  /* ---------------- capability: translate ---------------- */

  function translate(targetLang, scope) {
    var langName = LANGS[targetLang] || targetLang || 'English';
    var isDoc = scope === 'doc';
    var selRange = [0, 0];
    var source = isDoc ? docText() : (function () {
      var ta = $('editor');
      if (!ta) return '';
      selRange = [ta.selectionStart, ta.selectionEnd];
      return ta.value.slice(ta.selectionStart, ta.selectionEnd);
    })();
    if (!source.trim()) {
      if (hooks.toast) hooks.toast(isDoc ? t('aiEmpty') : t('aiNoSelection'));
      return Promise.reject(new Error('noSource'));
    }
    if (!begin()) return Promise.reject(new Error('busy'));
    var instruction = 'Translate the following Markdown text into ' + langName + '. ' +
      'Preserve all Markdown structure: headings (#), bold, links, lists, code blocks and tables. ' +
      'Do not summarize. Output only the translated Markdown.';
    // Whole-document translation belongs in the copilot drawer (it creates a
    // new doc); a selected-text translation is a rewrite and uses the inline card.
    var box = isDoc ? openResultPanel(t('aiResultLabel'), true) : openInlineCard(t('aiRewriteTitle'), source);
    return chat([{ role: 'user', content: instruction + '\n\n' + source }], '', false,
      function (delta, full) { if (box) box.update(full); })
      .then(function (out) {
        end(); if (box) box.update(out);
        if (isDoc) {
          if (box) box.setAction('translate:' + targetLang + ':' + scope);
          if (hooks.createTranslatedDoc) hooks.createTranslatedDoc(targetLang, out);
          if (hooks.toast) hooks.toast(t('aiTranslatedDoc'));
        } else {
          offerReplace(box, out, selRange[0], selRange[1]);
          positionInlineCard();
        }
        if (hooks.toast) hooks.toast(t('aiDisclose'));
        if (hooks.showResult) hooks.showResult(out, 'translate');
        return out;
      }).catch(function (err) { end(); if (isDoc) closeResultPanel(); else closeInlineCard(); return fail(err); });
  }

  /* ---------------- capability: layout coach ---------------- */

  function localStructure(text) {
    var lines = text.split('\n');
    var heads = [], images = 0, imagesNoAlt = 0, codeFences = 0, longLines = 0, tables = 0;
    for (var i = 0; i < lines.length; i++) {
      var l = lines[i];
      var h = /^(#{1,6})\s+(.+)$/.exec(l);
      if (h) heads.push({ level: h[1].length, title: h[2].trim() });
      if (/^```/.test(l)) codeFences++;
      if (/^\s*\|.*\|\s*$/.test(l)) tables++;
      var im = /!\[([^\]]*)\]\([^)]*\)/g, m;
      while ((m = im.exec(l))) { images++; if (!m[1].trim()) imagesNoAlt++; }
      if (l.length > 120 && !/^```/.test(l)) longLines++;
    }
    var counts = [0, 0, 0, 0, 0, 0], jumps = 0, prev = 0, h1 = 0;
    for (var j = 0; j < heads.length; j++) {
      counts[heads[j].level - 1]++;
      if (heads[j].level === 1) h1++;
      if (prev && heads[j].level > prev + 1) jumps++;
      prev = heads[j].level;
    }
    return {
      headings: heads.length, h1: h1, counts: counts, levelJumps: jumps,
      images: images, imagesNoAlt: imagesNoAlt, codeBlocks: Math.floor(codeFences / 2),
      tables: tables, longLines: longLines, chars: text.length
    };
  }

  function localAdvice(s) {
    var out = [];
    if (!s.h1) out.push(t('aiCoachNoH1'));
    if (s.levelJumps) out.push(t('aiCoachJumps').replace('{n}', s.levelJumps));
    if (s.imagesNoAlt) out.push(t('aiCoachNoAlt').replace('{n}', s.imagesNoAlt));
    if (s.longLines > 3) out.push(t('aiCoachLong').replace('{n}', s.longLines));
    if (s.headings > 12 && s.counts[1] === 0) out.push(t('aiCoachDeep'));
    if (!out.length) out.push(t('aiCoachOk'));
    return out;
  }

  function layoutCoach() {
    var text = docText();
    if (!text.trim()) { if (hooks.toast) hooks.toast(t('aiEmpty')); return Promise.reject(new Error('empty')); }
    var s = localStructure(text);
    var local = localAdvice(s);
    var themeInfo = hooks.getThemeInfo ? hooks.getThemeInfo() : { name: '', css: '' };
    var box = openResultPanel(t('aiCoachTitle'), false);
    if (box) box.updateHtml('<ul><li>' + local.join('</li><li>') + '</li></ul>');

    if (!cfg || !cfg.enabled || !currentProfile()) {
      if (hooks.toast) hooks.toast(t('aiCoachLocalOnly'));
      return Promise.resolve(local.join('\n'));
    }
    if (!begin()) return Promise.reject(new Error('busy'));
    var prompt = 'You are a Markdown layout editor. Here is a structural summary of an article: ' +
      JSON.stringify(s) + '\nTheme: ' + (themeInfo.name || 'unknown') + '\nTheme CSS excerpt: ' +
      String(themeInfo.css || '').slice(0, 600) +
      '\n\nGive 3-5 concrete, actionable layout improvements for THIS article. ' +
      'Focus on heading hierarchy, paragraph width, image captions and publishing readability. ' +
      'Output a Markdown bullet list only, no preamble.';
    return chat([{ role: 'user', content: prompt }], '', false, function () { })
      .then(function (out) {
        end();
        if (box) box.updateHtml('<p><b>' + t('aiCoachLocal') + '</b></p><ul><li>' + local.join('</li><li>') +
          '</li></ul><p><b>' + t('aiCoachAI') + '</b></p>' + simpleMd(out),
          local.join('\n') + '\n\n' + out);
        if (hooks.showResult) hooks.showResult(out, 'coach');
        return out;
      }).catch(function (err) { end(); return fail(err); });
  }

  function simpleMd(s) {
    var parts = [];
    var inList = false;
    String(s || '').split('\n').forEach(function (l) {
      var m = /^\s*[-*]\s+(.+)$/.exec(l);
      if (m) {
        if (!inList) { parts.push('<ul>'); inList = true; }
        parts.push('<li>' + m[1] + '</li>');
      } else {
        if (inList) { parts.push('</ul>'); inList = false; }
        if (l.trim()) parts.push('<p>' + l + '</p>');
      }
    });
    if (inList) parts.push('</ul>');
    return parts.join('');
  }

  /* ---------------- capability: custom skills ---------------- */

  function getSkill(id) {
    if (!cfg || !cfg.skills) return null;
    for (var i = 0; i < cfg.skills.length; i++) if (cfg.skills[i].id === id) return cfg.skills[i];
    return null;
  }
  function saveSkill(skill, oldId) {
    if (!cfg) cfg = defaultConfig();
    var found = false;
    for (var i = 0; i < cfg.skills.length; i++) {
      if (cfg.skills[i].id === (oldId || skill.id)) { cfg.skills[i] = skill; found = true; }
    }
    if (!found) {
      if (cfg.skills.length >= MAX_SKILLS) return Promise.reject(new Error('tooManySkills'));
      cfg.skills.push(skill);
    }
    return setConfig(cfg);
  }
  function removeSkill(id) {
    if (!cfg) return Promise.resolve();
    var keep = [];
    for (var i = 0; i < cfg.skills.length; i++) if (cfg.skills[i].id !== id) keep.push(cfg.skills[i]);
    cfg.skills = keep;
    return setConfig(cfg);
  }
  function scopedSkills(scope) {
    var out = [];
    if (!cfg || !cfg.skills) return out;
    for (var i = 0; i < cfg.skills.length; i++) {
      var s = cfg.skills[i];
      if (!s.scopes || s.scopes.split(/[\s,]+/).indexOf(scope) >= 0) out.push(s);
    }
    return out;
  }

  /* ---------------- result panel (side drawer) ---------------- */

  var resultAction = '';
  var drawerTab = 'tools';
  function switchDrawerTab(name) {
    drawerTab = name || 'tools';
    var bar = $('aiDrawerTabs');
    if (bar) {
      var tabs = bar.querySelectorAll('[data-tab]');
      for (var i = 0; i < tabs.length; i++) {
        tabs[i].className = 'ai-tab' + (tabs[i].getAttribute('data-tab') === drawerTab ? ' active' : '');
      }
    }
    // Only tools/translate have panes. The result dock stays visible under both.
    var panes = ['tools', 'translate'];
    for (var j = 0; j < panes.length; j++) {
      var pane = $('aiPane' + panes[j].charAt(0).toUpperCase() + panes[j].slice(1));
      if (pane) pane.hidden = panes[j] !== drawerTab;
    }
  }
  // A result box is a small uniform facade over a result <pre>: update text,
  // update HTML, and configure the footer actions. Both the copilot drawer and
  // the inline rewrite card use it, so callers don't care which surface shows.
  function makeResultBox(body, isInline) {
    return {
      update: function (text) {
        body.textContent = text;
        body.setAttribute('data-raw', text);
      },
      updateHtml: function (html, raw) {
        body.innerHTML = html;
        body.setAttribute('data-raw', raw || html.replace(/<[^>]+>/g, ''));
      },
      setAction: function (a, applyFn) {
        resultAction = a || '';
        if (!isInline) {
          // Only the drawer owns the "set as title" action.
          var titleBtn = $('aiApplyTitle');
          if (titleBtn) titleBtn.hidden = String(a).indexOf('title') !== 0;
          return;
        }
        // Only the inline card owns "replace original". Keeping this scoped to
        // the inline box stops a whole-document action from hiding a pending
        // rewrite that the user has not applied yet.
        var applyBtn = $('aiApplyReplace');
        pendingApply = null;
        if (applyBtn) {
          if (a === 'replace' && typeof applyFn === 'function') {
            pendingApply = applyFn;
            applyBtn.hidden = false;
          } else {
            applyBtn.hidden = true;
          }
        }
      }
    };
  }

  function openResultPanel(title, editable) {
    var panel = $('aiCopilot');
    var body = $('aiCopilotBody');
    if (!panel || !body) return null;
    panel.hidden = false;
    // Result dock is always visible; no tab switch needed.
    var rt = $('aiResultTitle'); if (rt) rt.textContent = title || t('aiResultLabel');
    var meta = $('aiResultMeta');
    if (meta) { var cp = currentProfile(); meta.textContent = cp ? cp.name + ' · ' + cp.model : ''; }
    body.textContent = '';
    resultAction = '';
    return makeResultBox(body, false);
  }
  function closeResultPanel() {
    var panel = $('aiCopilot'); if (panel) panel.hidden = true;
  }

  /* ---------------- inline rewrite card (selected-text actions) ---------------- */
  // Selected-text rewrites render here, not in the copilot drawer, so they are
  // independent of whole-document tools and never overwrite each other's result.
  // Measure the full bounding box of the current selection (may span lines).
  function selectionBox(ta) {
    var s = ta.selectionStart, e = ta.selectionEnd;
    var a = caretPosAt(ta, s), b = caretPosAt(ta, e);
    var line = (a.height || 18);
    var top = Math.min(a.top, b.top);
    var bottom = Math.max(a.top + line, b.top + line);
    // When the selection wraps to multiple lines it occupies full lines in
    // between, so its box spans the editor width - not a marker's character
    // edge (which would let the card land on the selected text).
    var multi = b.top > a.top + 2;
    var tr = ta.getBoundingClientRect ? ta.getBoundingClientRect() : { left: 0 };
    var taRight = (tr.right != null) ? tr.right : ((tr.left || 0) + (ta.offsetWidth || 600));
    var right = multi ? taRight : Math.max(a.left, b.left) + 6;
    var left = multi ? Math.min(a.left, tr.left || a.left) : Math.min(a.left, b.left);
    return { left: left, top: top, right: right, bottom: bottom };
  }
  // Place the card where it does NOT cover the selected text: prefer the right
  // side of the selection, then below, then above; clamp into the viewport.
  function positionInlineCard() {
    var card = $('aiRewriteCard'), ta = $('editor');
    if (!card || !ta || card._dragging) return;
    var sel = selectionBox(ta);
    var cw = card.offsetWidth || 390;
    var ch = card.offsetHeight || 260;
    var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
    var px = window.pageXOffset || 0, py = window.pageYOffset || 0;
    var gap = 14, safeTop = 58;
    var candidates = [
      { x: sel.right + gap, y: sel.top - 4 },        // right of selection
      { x: sel.left, y: sel.bottom + gap },          // below selection
      { x: sel.left, y: sel.top - ch - gap },        // above selection
      { x: Math.max(8, vw - cw - 12), y: sel.top - 4 } // far right fallback
    ];
    function hitsSelection(x, y) {
      return !(x + cw <= sel.left || x >= sel.right || y + ch <= sel.top || y >= sel.bottom);
    }
    var chosen = candidates[candidates.length - 1];
    for (var i = 0; i < candidates.length; i++) {
      var cx = Math.max(8, Math.min(candidates[i].x, vw - cw - 8));
      var cy = Math.max(safeTop, Math.min(candidates[i].y, vh - ch - 8));
      if (!hitsSelection(cx, cy)) { chosen = { x: cx, y: cy }; break; }
    }
    var fx = Math.max(8, Math.min(chosen.x, vw - cw - 8));
    var fy = Math.max(safeTop, Math.min(chosen.y, vh - ch - 8));
    card.style.left = Math.round(fx + px) + 'px';
    card.style.top = Math.round(fy + py) + 'px';
  }
  function openInlineCard(title, sourceText) {
    var card = $('aiRewriteCard'), body = $('aiRewriteBody');
    if (!card || !body) return null;
    card.hidden = false;
    card._dragging = false; // new action: re-enable auto placement
    var rt = $('aiRewriteTitle'); if (rt) rt.textContent = title || t('aiRewriteTitle');
    var srcWrap = $('aiRewriteSrcWrap'), src = $('aiRewriteSrc');
    if (srcWrap && src) {
      if (sourceText && String(sourceText).trim()) {
        src.textContent = String(sourceText);
        srcWrap.hidden = false;
      } else {
        src.textContent = '';
        srcWrap.hidden = true;
      }
    }
    body.textContent = '';
    if (body.removeAttribute) body.removeAttribute('data-raw');
    resultAction = '';
    pendingApply = null;
    var applyBtn = $('aiApplyReplace'); if (applyBtn) applyBtn.hidden = true;
    positionInlineCard();
    return makeResultBox(body, true);
  }
  // Drag the inline card by its title bar. Uses pointer events for broad
  // support (mouse + touch), with an emulated mouse fallback for old WebKit.
  function bindInlineDrag() {
    var card = $('aiRewriteCard'), hd = $('aiRewriteHd');
    if (!card || !hd || !hd.addEventListener) return;
    var dragging = false, startX = 0, startY = 0, originX = 0, originY = 0;
    hd.addEventListener('mousedown', function (e) {
      if (e.target && e.target.closest && e.target.closest('button')) return;
      dragging = true;
      card._dragging = true;
      startX = e.clientX || 0; startY = e.clientY || 0;
      originX = parseFloat(card.style.left) || card.getBoundingClientRect().left || 0;
      originY = parseFloat(card.style.top) || card.getBoundingClientRect().top || 0;
      if (e.preventDefault) e.preventDefault();
    });
    var onMove = function (e) {
      if (!dragging) return;
      var vw = window.innerWidth || 1200, vh = window.innerHeight || 800;
      var cw = card.offsetWidth || 390, ch = Math.min(card.offsetHeight || 260, vh - 70);
      var x = Math.max(8, Math.min(originX + (e.clientX || 0) - startX, vw - cw - 8));
      var y = Math.max(58, Math.min(originY + (e.clientY || 0) - startY, vh - ch - 8));
      card.style.left = Math.round(x + (window.pageXOffset || 0)) + 'px';
      card.style.top = Math.round(y + (window.pageYOffset || 0)) + 'px';
      if (e.preventDefault) e.preventDefault();
    };
    var onUp = function () { dragging = false; };
    if (document.addEventListener) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
  }
  function closeInlineCard() {
    var card = $('aiRewriteCard'); if (card) card.hidden = true;
    pendingApply = null;
    var applyBtn = $('aiApplyReplace'); if (applyBtn) applyBtn.hidden = true;
  }
  function copyResult() {
    // Copy from whichever result surface is currently visible.
    var card = $('aiRewriteCard');
    var body = (card && !card.hidden) ? $('aiRewriteBody') : $('aiCopilotBody');
    if (!body) return;
    var text = body.getAttribute('data-raw') || body.textContent;
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        if (hooks.toast) hooks.toast(t('copied'));
      }).catch(function () { fallbackCopy(text); });
    } else fallbackCopy(text);
  }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); if (hooks.toast) hooks.toast(t('copied')); }
    catch (e) { if (hooks.toast) hooks.toast(t('copyFail')); }
    document.body.removeChild(ta);
  }

  function updateStatus(kind) {
    var dot = $('aiDot');
    if (!dot) return;
    dot.className = 'ai-dot ' + (kind === 'busy' ? 'busy' : (cfg && cfg.enabled ? 'on' : 'off'));
  }
  function syncModelSelect() {
    var sel = $('aiModelSelect');
    if (!sel || !cfg) return;
    var prev = sel.value;
    sel.innerHTML = '<option value="">' + t('aiDefault') + ' (' +
      (currentProfile() ? currentProfile().name : '-') + ')</option>';
    for (var i = 0; i < cfg.profiles.length; i++) {
      var o = document.createElement('option');
      o.value = cfg.profiles[i].id;
      o.textContent = cfg.profiles[i].name + ' · ' + cfg.profiles[i].model;
      sel.appendChild(o);
    }
    sel.value = prev || '';
  }

  /* ---------------- settings UI ---------------- */

  function openModal() {
    getConfig().then(function (c) {
      cfg = c;
      renderProfiles();
      renderSkills();
      syncModelSelect();
      $('aiEnable').checked = !!c.enabled;
      $('aiSystemPrompt').value = c.systemPrompt || '';
      var m = $('aiModal'); if (m) m.hidden = false;
    }).catch(function (e) { if (hooks.toast) hooks.toast(String(e)); });
  }
  function closeModal() { var m = $('aiModal'); if (m) m.hidden = true; }

  function renderProfiles() {
    var box = $('aiProfiles');
    if (!box) return;
    box.innerHTML = '';
    var list = cfg.profiles || [];
    for (var i = 0; i < list.length; i++) {
      (function (p) {
        var row = document.createElement('div');
        row.className = 'ai-profile' + (p.id === cfg.defaultProfile ? ' is-default' : '');
        var isDefault = p.id === cfg.defaultProfile;
        row.innerHTML =
          '<div class="ai-profile-head"><b></b>' +
          (isDefault ? '<span class="ai-badge">' + t('aiDefault') + '</span>' : '') + '</div>' +
          '<div class="ai-profile-meta"></div>' +
          '<div class="ai-profile-actions">' +
          '<button type="button" data-a="edit">' + t('aiEdit') + '</button>' +
          '<button type="button" data-a="def"' + (isDefault ? ' disabled' : '') + '>' + t('aiSetDefault') + '</button>' +
          '<button type="button" data-a="test">' + t('aiTest') + '</button>' +
          '<button type="button" data-a="del">' + t('aiDelete') + '</button>' +
          '</div>';
        row.querySelector('b').textContent = p.name;
        row.querySelector('.ai-profile-meta').textContent = p.model + ' · ' + (p.baseUrl || '-') + ' · ' + t('aiKey') + ': ' + maskKey(p.apiKey);
        var btns = row.querySelectorAll('button');
        for (var j = 0; j < btns.length; j++) {
          btns[j].addEventListener('click', function () {
            var a = this.getAttribute('data-a');
            if (a === 'edit') editProfile(p);
            else if (a === 'test') testProfile(p.id);
            else if (a === 'del') removeProfile(p.id);
            else if (a === 'def') {
              cfg.defaultProfile = p.id;
              setConfig(cfg).then(function () { renderProfiles(); syncModelSelect(); });
            }
          });
        }
        box.appendChild(row);
      })(list[i]);
    }
    var add = $('aiAddProfile');
    if (add) add.disabled = list.length >= MAX_PROFILES;
  }

  function editProfile(id) {
    var p = null;
    for (var i = 0; i < cfg.profiles.length; i++) if (cfg.profiles[i].id === id) p = cfg.profiles[i];
    if (!p) return;
    $('aiProfileId').value = p.id;
    $('aiProfileName').value = p.name;
    $('aiBaseUrl').value = p.baseUrl;
    $('aiModel').value = p.model;
    $('aiKey').value = p.apiKey;
    $('aiMaxTokens').value = p.maxTokens;
    $('aiProfileEditor').hidden = false;
  }
  function newProfile() {
    $('aiProfileId').value = '';
    $('aiProfileName').value = '';
    $('aiBaseUrl').value = '';
    $('aiModel').value = '';
    $('aiKey').value = '';
    $('aiMaxTokens').value = 2048;
    $('aiProfileEditor').hidden = false;
  }
  function saveProfileEditor() {
    var id = $('aiProfileId').value;
    var p = {
      id: id || ('p' + Date.now()),
      name: $('aiProfileName').value.trim(),
      baseUrl: $('aiBaseUrl').value.trim().replace(/\/+$/, ''),
      model: $('aiModel').value.trim(),
      apiKey: $('aiKey').value.trim(),
      provider: 'openai-compatible',
      temperature: 0.7,
      maxTokens: parseInt($('aiMaxTokens').value, 10) || 2048
    };
    if (!p.name || !p.baseUrl || !p.model) {
      if (hooks.toast) hooks.toast(t('aiProfileRequired'));
      return;
    }
    var found = false;
    for (var i = 0; i < cfg.profiles.length; i++) {
      if (cfg.profiles[i].id === id) { cfg.profiles[i] = p; found = true; }
    }
    if (!found) {
      if (cfg.profiles.length >= MAX_PROFILES) { if (hooks.toast) hooks.toast(t('aiTooMany')); return; }
      cfg.profiles.push(p);
      if (!cfg.defaultProfile) cfg.defaultProfile = p.id;
    }
    setConfig(cfg).then(function () {
      $('aiProfileEditor').hidden = true;
      renderProfiles(); syncModelSelect();
      if (hooks.toast) hooks.toast(t('aiSaved'));
    }).catch(function (e) { if (hooks.toast) hooks.toast(String(e && e.message || e)); });
  }
  function removeProfile(id) {
    var keep = [];
    for (var i = 0; i < cfg.profiles.length; i++) if (cfg.profiles[i].id !== id) keep.push(cfg.profiles[i]);
    cfg.profiles = keep;
    if (cfg.defaultProfile === id) cfg.defaultProfile = keep.length ? keep[0].id : '';
    setConfig(cfg).then(function () { renderProfiles(); syncModelSelect(); });
  }
  function testProfile(id) {
    if (!available()) { if (hooks.toast) hooks.toast(t('aiWebTestHint')); return; }
    if (hooks.toast) hooks.toast(t('aiTesting'));
    invoke('uno_ai_test', { profileId: id }).then(function (msg) {
      if (hooks.toast) hooks.toast(t('aiTestOK') + ' ' + msg);
    }).catch(function (e) { if (hooks.toast) hooks.toast(t('aiTestFail') + ' ' + (e.message || e)); });
  }
  function saveSettings() {
    cfg.enabled = !!$('aiEnable').checked;
    cfg.systemPrompt = $('aiSystemPrompt').value;
    setConfig(cfg).then(function () {
      updateStatus('ready');
      closeModal();
      if (hooks.toast) hooks.toast(t('aiSaved'));
    }).catch(function (e) { if (hooks.toast) hooks.toast(t('aiFail') + ' ' + (e.message || e)); });
  }

  /* ---------------- skills UI ---------------- */

  function renderSkills() {
    var box = $('aiSkills');
    if (!box) return;
    box.innerHTML = '';
    var list = cfg.skills || [];
    for (var i = 0; i < list.length; i++) {
      (function (s) {
        var row = document.createElement('div');
        row.className = 'ai-profile';
        row.innerHTML = '<div class="ai-profile-head"><b></b></div>' +
          '<div class="ai-profile-meta"></div>' +
          '<div class="ai-profile-actions">' +
          '<button type="button" data-a="edit">' + t('aiEdit') + '</button>' +
          '<button type="button" data-a="del">' + t('aiDelete') + '</button></div>';
        row.querySelector('b').textContent = s.name;
        row.querySelector('.ai-profile-meta').textContent = (s.scopes || t('aiSkillAllScopes')) + ' · ' + s.prompt.slice(0, 60);
        var btns = row.querySelectorAll('button');
        for (var j = 0; j < btns.length; j++) {
          btns[j].addEventListener('click', function () {
            var a = this.getAttribute('data-a');
            if (a === 'edit') editSkill(s);
            else removeSkill(s.id).then(renderSkills);
          });
        }
        box.appendChild(row);
      })(list[i]);
    }
    var add = $('aiAddSkill'); if (add) add.disabled = list.length >= MAX_SKILLS;
  }
  function editSkill(s) {
    $('aiSkillId').value = s ? s.id : '';
    $('aiSkillName').value = s ? s.name : '';
    $('aiSkillPrompt').value = s ? s.prompt : '';
    $('aiSkillScopes').value = s ? s.scopes : 'rewrite';
    $('aiSkillEditor').hidden = false;
  }
  function saveSkillEditor() {
    var name = $('aiSkillName').value.trim(), prompt = $('aiSkillPrompt').value.trim();
    if (!name || !prompt) { if (hooks.toast) hooks.toast(t('aiSkillRequired')); return; }
    var oldId = $('aiSkillId').value;
    saveSkill({
      id: oldId || ('s' + Date.now()),
      name: name, prompt: prompt,
      scopes: $('aiSkillScopes').value.trim()
    }, oldId).then(function () {
      $('aiSkillEditor').hidden = true; renderSkills(); renderSkillButtons();
      if (hooks.toast) hooks.toast(t('aiSaved'));
    }).catch(function () { if (hooks.toast) hooks.toast(t('aiTooManySkills')); });
  }
  function renderSkillButtons() {
    var box = $('editorMenu');
    if (!box) return;
    var olds = box.querySelectorAll('[data-skill]');
    for (var i = 0; i < olds.length; i++) box.removeChild(olds[i]);
    var list = scopedSkills('rewrite');
    for (var j = 0; j < list.length; j++) {
      (function (s) {
        var b = document.createElement('button');
        b.type = 'button';
        b.setAttribute('data-ai', 'skill:' + s.id);
        b.setAttribute('data-skill', '1');
        b.textContent = s.name;
        b.title = s.name;
        box.appendChild(b);
      })(list[j]);
    }
  }

  /* ---------------- UI binding ---------------- */

  function bindUI() {
    var btn = $('aiBtn'); if (btn) btn.addEventListener('click', openModal);
    var close = $('aiClose'); if (close) close.addEventListener('click', closeModal);
    var save = $('aiSave'); if (save) save.addEventListener('click', saveSettings);
    var add = $('aiAddProfile'); if (add) add.addEventListener('click', newProfile);
    var pe = $('aiProfileSave'); if (pe) pe.addEventListener('click', saveProfileEditor);
    var pc = $('aiProfileCancel'); if (pc) pc.addEventListener('click', function () { $('aiProfileEditor').hidden = true; });
    var mask = $('aiModal');
    if (mask) mask.addEventListener('click', function (e) { if (e.target === mask) closeModal(); });

    // /ai instruction dialog (in-app replacement for window.prompt)
    var dClose = $('aiDraftClose'), dCancel = $('aiDraftCancel'), dGo = $('aiDraftGo');
    if (dClose) dClose.addEventListener('click', function () { closeDraftPrompt(true); });
    if (dCancel) dCancel.addEventListener('click', function () { closeDraftPrompt(true); });
    if (dGo) dGo.addEventListener('click', confirmDraft);
    var dMask = $('aiDraftModal');
    if (dMask) dMask.addEventListener('click', function (e) { if (e.target === dMask) closeDraftPrompt(true); });
    var dInput = $('aiDraftPrompt');
    if (dInput) dInput.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') { e.preventDefault(); confirmDraft(); }
    });

    var askill = $('aiAddSkill'); if (askill) askill.addEventListener('click', function () { editSkill(null); });
    var spe = $('aiSkillSave'); if (spe) spe.addEventListener('click', saveSkillEditor);
    var spc = $('aiSkillCancel'); if (spc) spc.addEventListener('click', function () { $('aiSkillEditor').hidden = true; });

    var cclose = $('aiCopilotClose'); if (cclose) cclose.addEventListener('click', closeResultPanel);
    var tabsBar = $('aiDrawerTabs');
    if (tabsBar) tabsBar.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('[data-tab]') : null;
      if (b) switchDrawerTab(b.getAttribute('data-tab'));
    });
    var applyBtn = $('aiApplyReplace');
    if (applyBtn) {
      applyBtn.addEventListener('click', function () {
        if (!pendingApply) return;
        var fn = pendingApply;
        pendingApply = null;
        applyBtn.hidden = true;
        fn();
      });
    }
    var ccopy = $('aiCopyResult'); if (ccopy) ccopy.addEventListener('click', copyResult);
    var rclose = $('aiRewriteClose'); if (rclose) rclose.addEventListener('click', closeInlineCard);
    var rcopy = $('aiRewriteCopy'); if (rcopy) rcopy.addEventListener('click', copyResult);
    bindInlineDrag();
    var srcToggle = $('aiRewriteSrcToggle');
    if (srcToggle) srcToggle.addEventListener('click', function () {
      var wrap = $('aiRewriteSrcWrap');
      if (!wrap) return;
      var cn = wrap.className || '';
      wrap.className = cn.indexOf('collapsed') >= 0
        ? cn.replace(/\bcollapsed\b/, '').replace(/\s+/g, ' ').trim()
        : (cn + ' collapsed').trim();
    });
    var ctitle = $('aiApplyTitle'); if (ctitle) ctitle.addEventListener('click', function () {
      var body = $('aiCopilotBody'); applyResultAsTitle(body ? (body.getAttribute('data-raw') || body.textContent) : '');
    });

    function launchCopilot() {
      if (cfg && cfg.enabled && currentProfile()) {
        var p = $('aiCopilot'); if (p) p.hidden = false;
        switchDrawerTab('tools');
      } else if (hooks.toast) hooks.toast(t('aiNeedEnable'));
    }
    var copilotBtn = $('aiCopilotBtn');
    if (copilotBtn) copilotBtn.addEventListener('click', launchCopilot);
    var copilotMenu = $('aiCopilotMenuBtn');
    if (copilotMenu) copilotMenu.addEventListener('click', function () {
      // Close the utility dropdown if the host app exposes it.
      var panel = $('utilityPanel'); if (panel) panel.hidden = true;
      var ubtn = $('utilityBtn'); if (ubtn && ubtn.setAttribute) ubtn.setAttribute('aria-expanded', 'false');
      launchCopilot();
    });

    if ($('aiDocActions')) {
      $('aiDocActions').addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-doc]') : null;
        if (!b) return;
        var a = b.getAttribute('data-doc');
        if (a === 'layout') layoutCoach(); else documentAction(a);
      });
    }
    if ($('aiTranslate')) {
      $('aiTranslate').addEventListener('click', function () {
        var sel = $('aiTranslateLang');
        translate(sel ? sel.value : 'en', 'doc');
      });
    }
    if ($('aiCoachBtn')) $('aiCoachBtn').addEventListener('click', layoutCoach);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if ($('aiSkillEditor') && !$('aiSkillEditor').hidden) { $('aiSkillEditor').hidden = true; return; }
        if ($('aiProfileEditor') && !$('aiProfileEditor').hidden) { $('aiProfileEditor').hidden = true; return; }
        if ($('aiDraftModal') && !$('aiDraftModal').hidden) { closeDraftPrompt(true); return; }
        if ($('aiRewriteCard') && !$('aiRewriteCard').hidden) { closeInlineCard(); return; }
        if ($('aiCopilot') && !$('aiCopilot').hidden) { closeResultPanel(); return; }
        if ($('aiModal') && !$('aiModal').hidden) closeModal();
      }
    });
    var ta = $('editor');
    var menu = $('editorMenu');
    if (ta && menu) {
      ta.addEventListener('mouseup', function () { setTimeout(updateFloat, 0); });
      ta.addEventListener('keyup', function () { setTimeout(updateFloat, 0); });
      ta.addEventListener('blur', function () { setTimeout(function () {
        if (menu && !menu.contains(document.activeElement)) menu.hidden = true;
      }, 200); });
      menu.addEventListener('mousedown', function (e) { e.preventDefault(); });
      menu.addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-ai]') : null;
        if (!b) return;
        var action = b.getAttribute('data-ai');
        menu.hidden = true;
        if (action === 'translate') {
          var sel = $('aiTranslateLang');
          translate(sel ? sel.value : 'en', 'selection').catch(function () { });
        } else rewrite(action).catch(function () { });
      });
      document.addEventListener('keydown', function (e) {
        if (document.activeElement !== ta) return;
        var s = ta.selectionStart, en = ta.selectionEnd;
        var slash = e.key === ' ' && s === en && ta.value.slice(0, s).slice(-3) === '/ai';
        var altSpace = e.altKey && (e.key === ' ' || e.key === 'Spacebar') && s === en;
        if (!slash && !altSpace) return;
        e.preventDefault();
        if (!cfg || !cfg.enabled || !currentProfile()) {
          if (hooks.toast) hooks.toast(t('aiNeedEnable'));
          return; // keep the typed /ai token so the user does not lose it
        }
        openDraftPrompt(slash ? s - 3 : s);
      });
    }
    renderSkillButtons();
  }

  /* Mirror the textarea's text up to the caret in a hidden div so we can read
     the caret's real pixel position (textarea selection has no geometry API). */
  var MIRROR_PROPS = ['boxSizing', 'fontFamily', 'fontSize', 'fontWeight', 'fontStyle',
    'fontVariant', 'lineHeight', 'letterSpacing', 'textTransform', 'textIndent',
    'textAlign', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
    'borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth',
    'tabSize', 'wordSpacing', 'whiteSpace'];

  function caretPos(ta) { return caretPosAt(ta, ta.selectionStart); }
  function caretPosAt(ta, pos) {
    var div = document.createElement('div');
    var s = div.style;
    s.position = 'absolute'; s.visibility = 'hidden'; s.top = '0'; s.left = '-9999px';
    s.whiteSpace = 'pre-wrap'; s.wordWrap = 'break-word'; s.overflowWrap = 'break-word';
    var cs = window.getComputedStyle ? window.getComputedStyle(ta) : null;
    for (var i = 0; i < MIRROR_PROPS.length; i++) {
      var p = MIRROR_PROPS[i];
      var v = cs ? cs[p] : (ta.style ? ta.style[p] : '');
      if (v) s[p] = v;
    }
    s.width = (cs && cs.width) || (ta.offsetWidth ? ta.offsetWidth + 'px' : '400px');
    var marker = document.createElement('span');
    var ch = ta.value.charAt(pos);
    marker.textContent = (ch && ch !== '\n' && ch !== '\r') ? ch : '.';
    div.textContent = ta.value.slice(0, pos);
    div.appendChild(marker);
    if (document.body && document.body.appendChild) document.body.appendChild(div);
    var left = marker.offsetLeft || 0;
    var top = marker.offsetTop || 0;
    var h = marker.offsetHeight || parseInt(s.lineHeight, 10) || 18;
    var w = marker.offsetWidth || Math.max(6, (ch || '.').length * 8);
    if (document.body && document.body.removeChild) document.body.removeChild(div);
    var r = ta.getBoundingClientRect();
    var hostRight = (r.right != null ? r.right : (r.left || 0) + (ta.offsetWidth || 600));
    return { left: r.left + left - (ta.scrollLeft || 0),
      top: r.top + top - (ta.scrollTop || 0), height: h,
      right: Math.min(r.left + left + w - (ta.scrollLeft || 0), hostRight) };
  }

  function updateFloat() {
    var ta = $('editor'), menu = $('editorMenu');
    if (!ta || !menu) return;
    if (!cfg || !cfg.enabled || !currentProfile()) { menu.hidden = true; return; }
    if (ta.selectionStart === ta.selectionEnd) { menu.hidden = true; return; }
    var sel = ta.value.slice(ta.selectionStart, ta.selectionEnd);
    if (!sel.trim()) { menu.hidden = true; return; }
    menu.hidden = false;
    var r = caretPos(ta);
    var mw = menu.offsetWidth || 460;
    var mh = menu.offsetHeight || 34;
    var x = Math.max(8, Math.min(r.left,
      (window.innerWidth || 1200) - mw - 8)) + (window.pageXOffset || 0);
    var y = r.top - mh - 6;
    if (y < 58) y = r.top + r.height + 6;
    // Defensive clamp: never let the menu render fully off-screen (e.g. a
    // selection that is scrolled out of view would otherwise point outside).
    var vh = window.innerHeight || 800;
    if (y > vh - mh - 8) y = vh - mh - 8;
    if (y < 58) y = 58;
    menu.style.left = Math.round(x) + 'px';
    menu.style.top = Math.round(y + (window.pageYOffset || 0)) + 'px';
  }

  function boot() {
    return getConfig().then(function () {
      updateStatus('ready'); renderSkillButtons(); syncModelSelect();
    }).catch(function () { updateStatus('off'); });
  }

  window.UnoAI = {
    init: init, boot: boot, bindUI: bindUI, openModal: openModal,
    available: available, invoke: invoke,
    getConfig: getConfig, setConfig: setConfig,
    rewrite: rewrite, draft: draft, documentAction: documentAction,
    translate: translate, layoutCoach: layoutCoach,
    getSkill: getSkill, saveSkill: saveSkill, removeSkill: removeSkill, scopedSkills: scopedSkills,
    currentProfile: currentProfile, findProfile: findProfile, estimateTokens: estimateTokens,
    localStructure: localStructure, chat: chat, cleanOutput: cleanOutput,
    openResultPanel: openResultPanel, closeResultPanel: closeResultPanel,
    openInlineCard: openInlineCard, closeInlineCard: closeInlineCard,
    switchDrawerTab: switchDrawerTab,
    openCopilot: function () {
      var p = $('aiCopilot'); if (p) p.hidden = false;
      switchDrawerTab('tools');
    }
  };
  function cleanOutput(s) { return String(s || '').trim().replace(/^```[^\n]*\n?/, '').replace(/\n?```$/, '').trim(); }
})();
