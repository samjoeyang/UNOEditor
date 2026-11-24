/* UNOEditor — application logic */
(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var I = window.UnoI18n, T = window.UnoThemes, M = window.UnoMD;
  var STORE = 'uno-md-v1';

  /* ---------------- sample documents ---------------- */
  var GRID = '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="170" viewBox="0 0 600 170">' +
    '<rect width="600" height="170" fill="#f4f4f2"/>' +
    '<g stroke="#d9d9d6" stroke-width="1"><path d="M40 30H560M40 70H560M40 110H560M40 150H560"/></g>' +
    '<g fill="#111111"><rect x="40" y="18" width="150" height="9"/><rect x="40" y="62" width="330" height="6"/>' +
    '<rect x="40" y="102" width="280" height="6"/></g>' +
    '<rect x="40" y="62" width="3" height="90" fill="#e2231a"/>' +
    '<rect x="40" y="158" width="520" height="1" fill="#111111"/></svg>';
  // short alias keeps the sample source readable; resolved to a data URI at render time
  window.__UNO_GRID_URI__ = 'data:image/svg+xml,' + encodeURIComponent(GRID);
  var GRID_URI = '![对齐网格示意](uno://grid)';

  var SAMPLE = {
    zh: {
      title: '对齐，是最便宜的高级感',
      body: [
        '# 对齐，是最便宜的高级感', '',
        '> 好的版式，让人感觉不到版式。',
        '> 它只留在该真正要留的地方，其余交给空白。', '',
        '把正文、标题、引用全部**左对齐**，页面立刻安静下来。不需要新字体，也不需要一套配色方案，只需要一把尺子。', '',
        GRID_URI, '',
        '---', '',
        '## ❶ 字号，一级差四号', '',
        '正文 15px，三级标题 16px，二级标题 20px，一级标题 28px。每一级只差一点，读者却能一眼分出层级。', '',
        '| 层级 | 字号 | 用途 |',
        '| :--- | :---: | ---: |',
        '| 正文 | 15px | 长段阅读 |',
        '| H3 | 16px | 段落小节 |',
        '| H2 | 20px | 章节标题 |',
        '| H1 | 28px | 文章标题 |', '',
        '## ❷ 刻度要均匀', '',
        '- 段间距固定为 `0.9em`',
        '- 章节前加一条细线，不用色块',
        '- 强调只用一处红：`#e2231a`',
        '- 其余全部交给留白', '',
        '> ❸ 二、线比色块安静', '',
        '细线不抢内容，色块会。所以分隔线是 1px 黑线，引用只用 2px 红色竖线，连圆角都省了。', '',
        '```css',
        '.md-body {',
        '  text-align: left;',
        '  --accent: #e2231a;',
        '  --rule: 1px solid #111;',
        '}',
        '```', '',
        '- [x] 左对齐',
        '- [x] 统一刻度',
        '- [ ] 再加一种颜色', '',
        '## ❹ 流程图，也能内嵌', '',
        'Mermaid 代码块会直接渲染成矢量图，清晰又轻巧。', '',
        '```mermaid',
        'flowchart TD',
        '    A[开始] --> B{判断条件}',
        '    B -->|是| C[执行操作1]',
        '    B -->|否| D[执行操作2]',
        '    C --> E[结束]',
        '    D --> E',
        '```', '',
        '点击顶部「主题」菜单，同一份内容会换一整套气质。', ''
      ].join('\n')
    },
    en: {
      title: 'Alignment Is the Cheapest Luxury',
      body: [
        '# Alignment Is the Cheapest Luxury', '',
        '> Good typography is invisible.',
        '> It stays only where it matters, and leaves the rest to white space.', '',
        'Set body, headings and quotes to **left align** and the page goes quiet. No new typeface, no color system — just a ruler.', '',
        GRID_URI, '',
        '---', '',
        '## 01 One step per level', '',
        'Body 15px, H3 16px, H2 20px, H1 28px. Each step is small, yet the hierarchy reads instantly.', '',
        '| Level | Size | Use |',
        '| :--- | :---: | ---: |',
        '| Body | 15px | Long reading |',
        '| H3 | 16px | Sub-section |',
        '| H2 | 20px | Chapter |',
        '| H1 | 28px | Title |', '',
        '## 02 Keep the scale even', '',
        '- Paragraph gap fixed at `0.9em`',
        '- A hairline before each chapter, never a color block',
        '- One accent only: `#e2231a`',
        '- Everything else is white space', '',
        '> 03 Lines are quieter than blocks', '',
        'A 1px rule does not compete with the text. A filled box does. Even border radius is unnecessary here.', '',
        '```css',
        '.md-body {',
        '  text-align: left;',
        '  --accent: #e2231a;',
        '  --rule: 1px solid #111;',
        '}',
        '```', '',
        '- [x] Left aligned',
        '- [x] Even scale',
        '- [ ] Add another color', '',
        '## 04 Diagrams, inline', '',
        'Mermaid code blocks render straight into crisp vector diagrams.', '',
        '```mermaid',
        'flowchart TD',
        '    A[Start] --> B{Condition}',
        '    B -->|Yes| C[Do task 1]',
        '    B -->|No| D[Do task 2]',
        '    C --> E[End]',
        '    D --> E',
        '```', '',
        'Open the Themes menu — same content, entirely different character.', ''
      ].join('\n')
    }
  };

  /* ---------------- state ---------------- */
  function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  var state = {
    lang: 'zh', themeId: 'wechat', view: 'mobile', sidebar: true, preview: true, splitX: 0.495, tweak: {},
    docs: [{ id: uid(), title: SAMPLE.zh.title, content: SAMPLE.zh.body }],
    activeId: null, imported: []
  };
  state.activeId = state.docs[0].id;

  // Tombstones stay in state.docs on desktop so deletions can propagate through
  // sync; the UI always works on the visible subset.
  function visibleDocs() {
    var out = [];
    for (var i = 0; i < state.docs.length; i++) if (!state.docs[i].deleted) out.push(state.docs[i]);
    return out;
  }
  function newRev() { return 'r' + Date.now().toString(16) + '-' + Math.random().toString(36).slice(2, 6); }

  function load() {
    try {
      var raw = localStorage.getItem(STORE);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && Array.isArray(d.docs) && d.docs.length) {
        state.lang = d.lang || 'zh';
        state.imported = Array.isArray(d.imported) ? d.imported : [];
        state.themeId = resolveThemeId(d.themeId);
        state.view = d.view === 'web' ? 'web' : 'mobile';
        state.sidebar = d.sidebar !== false;
        state.preview = d.preview !== false;
        state.splitX = (typeof d.splitX === 'number' && isFinite(d.splitX) && d.splitX >= 0.15 && d.splitX <= 0.85)
          ? d.splitX : 0.495;
        state.tweak = d.tweak || {};
        state.docs = d.docs;
        state.activeId = d.activeId && d.docs.some(function (x) { return x.id === d.activeId; })
          ? d.activeId : d.docs[0].id;
      }
    } catch (e) { /* corrupted storage: fall back to defaults */ }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { }
    if (window.UnoSync && UnoSync.available()) UnoSync.schedulePersist();
  }
  var saveTimer;
  function scheduleSave() {
    $('saveState').textContent = I.t('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { save(); $('saveState').textContent = I.t('saved'); }, 420);
  }
  function activeDoc() {
    var v = visibleDocs();
    if (!v.length) return state.docs[0];
    for (var i = 0; i < v.length; i++) if (v[i].id === state.activeId) return v[i];
    state.activeId = v[0].id;
    return v[0];
  }
  function getThemes() { return T.list.concat(state.imported); }
  function resolveThemeId(id) {
    if (!id) return 'wechat';
    var all = getThemes();
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i].id;
    return 'wechat';
  }
  function theme() {
    for (var i = 0; i < state.imported.length; i++) if (state.imported[i].id === state.themeId) return state.imported[i];
    return T.byId(state.themeId);
  }
  function loc(th) { return T.loc(th, state.lang); }

  /* ---------------- custom (imported) themes ---------------- */
  function slug(s) {
    return (s || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'theme';
  }
  // third-party market root selectors -> our preview root (.md-body)
  // so themes authored for GitHub/Typora/Obsidian can be imported as-is
  var MARKET_ROOTS = [
    /\.markdown-body(?![-\w])/g,
    /\.markdown-rendered(?![-\w])/g,
    /\.markdown-preview-view(?![-\w])/g,
    /\.cm-editor(?![-\w])/g,
    /#write(?![-\w])/g
  ];
  function sanitizeCss(css, id) {
    css = String(css).replace(/<[^>]*>/g, '');                 // drop any markup
    css = css.replace(/@import\b[^;]*;?/gi, '');               // no remote imports
    css = css.replace(/javascript:/gi, '');                    // no js: protocol
    // rewrite market-specific root selectors onto our .md-body root
    for (var i = 0; i < MARKET_ROOTS.length; i++) {
      css = css.replace(MARKET_ROOTS[i], '.md-body');
    }
    // scope every .md-body reference to our preview root
    css = css.replace(/\.md-body(?![-\w])/g, '.md-body[data-import="' + id + '"]');
    return css;
  }
  function buildImportedMeta(name, css, j) {
    j = j || {};
    var id = 'x-' + slug(name) + '-' + Math.random().toString(36).slice(2, 6);
    var accent = j.accent || '#4a4a4a';
    var surface = j.surface || j.bg || '#ffffff';
    var text = j.text || '#333333';
    var line = j.line || '#e5e5e5';
    var sz = j.size || 16;
    var step = function (n) { return sz + ' / ' + (sz + 4) + ' / ' + (sz + 8) + ' / ' + (sz + 16); };
    var safe = M.escape(name);
    return {
      id: id, imported: true, dark: !!j.dark,
      accent: accent, bg: surface,
      swatch: [accent, text, surface, line],
      sample: (j.sample || name.slice(0, 2)),
      sampleFont: (j.sampleFont || '-apple-system, "PingFang SC", sans-serif'),
      defaults: { size: sz, leading: j.leading || 1.8 },
      css: sanitizeCss(css, id),
      zh: {
        name: (j.zh && j.zh.name) || name,
        desc: (j.zh && j.zh.desc) || j.desc || '',
        tags: (j.zh && j.zh.tags) || j.tags || ['自定义'],
        font: j.font || '系统字体', size: step(), rule: j.rule || '用户导入'
      },
      en: {
        name: (j.en && j.en.name) || name,
        desc: (j.en && j.en.desc) || j.desc || '',
        tags: (j.en && j.en.tags) || j.tags || ['Custom'],
        font: j.font || 'System', size: step(), rule: j.rule || 'Imported'
      }
    };
  }
  function injectImportedCss() {
    var css = state.imported.map(function (t) { return t.css || ''; }).join('\n');
    var tag = $('unoImportedCss') || document.createElement('style');
    tag.id = 'unoImportedCss';
    tag.textContent = css;
    if (!tag.parentNode) document.head.appendChild(tag);
  }
  function addImportedTheme(meta) {
    state.imported.push(meta);
    injectImportedCss();
    renderThemes(); scheduleSave();
  }
  function deleteImportedTheme(id) {
    state.imported = state.imported.filter(function (t) { return t.id !== id; });
    if (state.themeId === id) state.themeId = 'wechat';
    injectImportedCss();
    renderThemes(); renderDetail(); renderPreview(); renderTweakUI(); scheduleSave();
    toast(I.t('themeRemoved'));
  }
  function importThemeFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = String(reader.result), ext = (file.name.split('.').pop() || '').toLowerCase();
        var name, css, meta;
        if (ext === 'json') {
          var j = JSON.parse(text);
          name = j.name || j.title || file.name.replace(/\.json$/, '');
          css = j.css || '';
          if (!name || !css) throw new Error('bad');
          meta = buildImportedMeta(name, css, j);
        } else {
          name = file.name.replace(/\.(css|txt)$/, '') || '自定义主题';
          css = text;
          if (!css.trim()) throw new Error('bad');
          meta = buildImportedMeta(name, css, {});
        }
        addImportedTheme(meta);
        toast(I.t('importSuccess') + name);
      } catch (e) {
        toast(I.t('importError'));
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- open local Markdown files ---------------- */
  function parseMdFrontMatter(text) {
    var meta = { title: '', id: '', content: text };
    if (text.indexOf('---\n') !== 0) return meta;
    var end = text.indexOf('\n---\n', 4);
    if (end < 0) return meta;
    var head = text.slice(4, end);
    var lines = head.split('\n');
    for (var i = 0; i < lines.length; i++) {
      if (lines[i].indexOf('uno-title:') === 0) meta.title = lines[i].slice(10).trim().replace(/\\n/g, '\n').replace(/\\\\/g, '\\');
      if (lines[i].indexOf('uno-id:') === 0) meta.id = lines[i].slice(7).trim();
    }
    meta.content = text.slice(end + 5);
    return meta;
  }
  function importMarkdownFile(file) {
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var text = String(reader.result || '');
        var meta = parseMdFrontMatter(text);
        var name = file.name.replace(/\.(md|markdown|txt)$/i, '') || I.t('untitledDoc');
        var title = meta.title || name;
        var existing = null;
        for (var i = 0; i < state.docs.length; i++) {
          if (meta.id && state.docs[i].id === meta.id) existing = state.docs[i];
          else if (!meta.id && state.docs[i].title === title) existing = state.docs[i];
        }
        if (existing) {
          existing.content = meta.content; existing.title = title;
          existing.updated = Date.now(); existing.rev = newRev();
          existing.deleted = false; state.activeId = existing.id;
        } else {
          var id = uid();
          state.docs.unshift({ id: id, title: title, content: meta.content,
            file: file.name, updated: Date.now(), rev: newRev(), base: '', deleted: false });
          state.activeId = id;
        }
        renderAll(); scheduleSave(); toast(I.t('mdOpened') + ' ' + name);
      } catch (err) { toast(I.t('mdOpenFail')); }
    };
    reader.readAsText(file);
  }

  /* ---------------- feedback ---------------- */
  var toastTimer;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2300);
  }

  /* ---------------- mermaid diagrams (vendored, lazy-loaded, offline) ---------------- */
  var mermaidPromise = null, mermaidSeq = 0, mermaidTimer = null;
  var mermaidReady = false; // 仅在真实库加载成功后置位；<h1 id="mermaid"> 等命名元素会污染 window.mermaid，不能作为判据
  function ensureMermaid() {
    if (mermaidReady && window.mermaid && window.mermaid.render) return Promise.resolve();
    if (!mermaidPromise) {
      mermaidPromise = new Promise(function (resolve, reject) {
        var s = document.createElement('script');
        s.src = 'js/vendor/mermaid.min.js';
        s.onload = function () {
          // UMD 会覆盖掉同名命名元素全局；再校验一次 render 可用
          if (window.mermaid && window.mermaid.render) { mermaidReady = true; resolve(); }
          else { mermaidPromise = null; reject(new Error('mermaid load failed')); }
        };
        s.onerror = function () { mermaidPromise = null; reject(new Error('mermaid load failed')); };
        document.head.appendChild(s);
      });
    }
    return mermaidPromise;
  }
  function configureMermaid() {
    window.mermaid.initialize({
      startOnLoad: false,
      securityLevel: 'strict',
      theme: theme().dark ? 'dark' : 'neutral',
      // mermaid v12 起顶层 htmlLabels 才生效（flowchart.htmlLabels 被忽略）；
      // 关掉是为了公众号复制走 canvas 转 PNG 时不受 foreignObject 影响
      htmlLabels: false,
      flowchart: { htmlLabels: false },
      sequence: { useMaxWidth: true }
    });
  }
  // Render every unrendered .mermaid-wrap inside root. Always resolves (never
  // rejects): if the engine cannot load, blocks keep showing the mermaid source.
  function renderMermaidIn(root) {
    var wraps = root.querySelectorAll('.mermaid-wrap');
    if (!wraps.length) return Promise.resolve();
    return ensureMermaid().then(function () {
      configureMermaid();
      var jobs = [];
      for (var i = 0; i < wraps.length; i++) (function (wrap) {
        if (wrap.dataset.done) return;
        var code = wrap.querySelector('pre code');
        var src = code ? code.textContent : '';
        if (!src.trim()) return;
        // render() 形态归一化：v9 可能同步返回 SVG 字符串或 Promise；
        // v10+ 返回 Promise<{svg}>。统一归一成 SVG 字符串。
        jobs.push(Promise.resolve().then(function () {
          return window.mermaid.render('uno-mmd-' + (++mermaidSeq), src);
        }).then(function (out) {
          var svg = typeof out === 'string' ? out : (out && out.svg) || '';
          if (!svg) throw new Error('empty svg');
          wrap.dataset.done = '1';
          wrap.innerHTML = '<div class="mermaid-svg">' + svg + '</div>';
          // mermaid emits width:100% + max-width:<natural px>. In a narrow
          // preview that squashes wide diagrams (gantt, sequence) until the
          // labels are unreadable. Pin the SVG to its viewBox size instead and
          // let the wrapper scroll horizontally when it overflows.
          var s = wrap.querySelector('svg');
          var vb = s && (s.getAttribute('viewBox') || '').split(/[\s,]+/);
          if (vb && vb.length === 4) {
            s.style.maxWidth = 'none';
            s.setAttribute('width', parseFloat(vb[2]) || '100%');
            s.setAttribute('height', parseFloat(vb[3]) || 'auto');
          }
        }).catch(function () {
          wrap.classList.add('mermaid-error');
          if (!wrap.querySelector('.mermaid-note')) {
            var note = document.createElement('div');
            note.className = 'mermaid-note';
            note.textContent = I.t('mermaidFail');
            wrap.appendChild(note);
          }
        }));
      })(wraps[i]);
      return Promise.all(jobs);
    }).catch(function () { /* engine unavailable: keep source blocks */ });
  }
  // Typing re-renders the preview on every keystroke; diagrams follow a short
  // debounce so mermaid's heavier rendering never blocks live editing.
  function scheduleMermaid(root) {
    clearTimeout(mermaidTimer);
    mermaidTimer = setTimeout(function () { renderMermaidIn(root); }, 350);
  }

  /* ---------------- rendering ---------------- */
  function renderThemes() {
    var all = getThemes();
    $('themeCount').textContent = all.length;
    $('themeList').innerHTML = all.map(function (th) {
      var l = loc(th);
      var badge = th.imported
        ? '<span class="theme-badge custom">' + I.t('customBadge') + '</span>'
        : (th.featured ? '<span class="theme-badge">' + (state.lang === 'zh' ? '推荐' : 'TOP') + '</span>' : '');
      var del = th.imported
        ? '<button class="theme-del" data-deltheme="' + th.id + '" title="' + I.t('deleteTheme') + '"><svg class="icon sm"><use href="#i-trash"/></svg></button>'
        : '';
      return '<div class="theme-item' + (th.id === state.themeId ? ' active' : '') + '" data-id="' + th.id + '">' +
        '<div class="theme-swatch" style="background:' + th.swatch[2] + ';color:' + th.swatch[0] +
        ';font-family:' + th.sampleFont + '">' + th.sample + '</div>' +
        '<div class="theme-item-text"><div class="theme-item-name">' + M.escape(l.name) + '</div>' +
        '<div class="theme-item-sub">' + l.tags.join(' · ') + '</div></div>' +
        badge + del +
        '</div>';
    }).join('');
  }

  function renderDetail() {
    var th = theme(), l = loc(th);
    $('themeDetail').innerHTML = '<div class="detail-card">' +
      '<div class="detail-title">' + l.name + '</div>' +
      '<div class="detail-desc">' + l.desc + '</div>' +
      '<div class="detail-label" style="margin-top:13px">' + I.t('suitableFor') + '</div>' +
      '<div class="detail-tags">' + l.tags.map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
      '<div class="detail-label">' + I.t('specs') + '</div>' +
      '<div class="spec-row"><b>' + I.t('specFont') + '</b><span>' + l.font + '</span></div>' +
      '<div class="spec-row"><b>' + I.t('specSize') + '</b><span>' + l.size + ' px</span></div>' +
      '<div class="spec-row"><b>' + I.t('specRule') + '</b><span>' + l.rule + '</span></div>' +
      '</div>';
  }

  function renderDocs() {
    $('docList').innerHTML = visibleDocs().map(function (d) {
      return '<div class="doc-item' + (d.id === state.activeId ? ' active' : '') + '" data-id="' + d.id + '">' +
        '<svg class="icon sm"><use href="#i-file"/></svg>' +
        '<span class="doc-item-name">' + M.escape(d.title || I.t('untitledDoc')) + '</span>' +
        '<button class="doc-del" data-del="' + d.id + '" title="' + I.t('deleteDoc') + '"><svg class="icon sm"><use href="#i-trash"/></svg></button>' +
        '</div>';
    }).join('');
  }

  /* ---- article outline (left panel), auto-built from headings ---- */
  function stripMd(s) {
    return s
      .replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1')
      .replace(/`(.+?)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/^\s*#+\s*/, '').trim();
  }
  var outlineCache = null;
  function collectOutline(content) {
    var lines = content.split('\n');
    var items = [], inFence = false;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (/^```/.test(ln)) { inFence = !inFence; continue; }
      if (inFence) continue;
      var m = lines[i].match(/^(#{1,6})\s+(.*)$/);
      if (m) items.push({ level: m[1].length, text: stripMd(m[2]), line: i });
    }
    return items;
  }
  function outlineTextSame(a, b) {
    if (!a || a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (a[i].level !== b[i].level || a[i].text !== b[i].text) return false;
    }
    return true;
  }
  function renderOutline() {
    var items = collectOutline(activeDoc().content);
    /* hot path (typing): headings unchanged -> only patch line numbers, keep DOM */
    if (outlineTextSame(outlineCache, items)) {
      var els = $('outlineList').querySelectorAll('.outline-item');
      for (var j = 0; j < items.length; j++) {
        if (els[j] && els[j].dataset.line !== String(items[j].line)) els[j].dataset.line = String(items[j].line);
      }
      outlineCache = items;
      updateOutlineActive();
      return;
    }
    outlineCache = items;
    $('outlineCount').textContent = items.length;
    if (!items.length) {
      $('outlineList').innerHTML = '';
      $('outlineEmpty').style.display = 'block';
      return;
    }
    $('outlineEmpty').style.display = 'none';
    $('outlineList').innerHTML = items.map(function (it) {
      return '<button class="outline-item lvl-' + it.level + '" data-line="' + it.line + '">' +
        '<span class="oi-mark">' + 'H' + it.level + '</span>' +
        '<span class="oi-text">' + M.escape(it.text || ('H' + it.level)) + '</span></button>';
    }).join('');
    updateOutlineActive();
  }
  function updateOutlineActive() {
    var ta = $('editor'); if (!ta) return;
    var before = ta.value.slice(0, ta.selectionStart).split('\n').length - 1;
    var items = $('outlineList').querySelectorAll('.outline-item');
    var act = -1;
    items.forEach(function (el, idx) { if (+el.dataset.line <= before) act = idx; });
    items.forEach(function (el, idx) { el.classList.toggle('active', idx === act); });
  }

  /* ---- theme drawer (right overlay, opened from the top bar) ---- */
  function openTheme() { $('workspace').classList.add('theme-open'); }
  function closeTheme() { $('workspace').classList.remove('theme-open'); }

  function applyTweak() {
    var el = $('preview');
    ['--fs-body', '--lh-body', '--c-accent'].forEach(function (p) { el.style.removeProperty(p); });
    if (state.tweak.size) el.style.setProperty('--fs-body', state.tweak.size + 'px');
    if (state.tweak.leading) el.style.setProperty('--lh-body', state.tweak.leading);
    if (state.tweak.accent) el.style.setProperty('--c-accent', state.tweak.accent);
  }

  function tweakStyleString() {
    var s = [];
    if (state.tweak.size) s.push('--fs-body:' + state.tweak.size + 'px');
    if (state.tweak.leading) s.push('--lh-body:' + state.tweak.leading);
    if (state.tweak.accent) s.push('--c-accent:' + state.tweak.accent);
    return s.join(';');
  }

  function renderPreview() {
    var doc = activeDoc(), el = $('preview');
    el.dataset.theme = state.themeId;
    el.dataset.import = theme().imported ? theme().id : '';
    el.innerHTML = M.render(doc.content);
    applyTweak();
    scheduleMermaid(el);

    var surface = getComputedStyle(el).getPropertyValue('--c-surface').trim() || '#ffffff';
    $('paper').style.setProperty('--paper', surface);
    $('paper').classList.toggle('dark', !!theme().dark);
    $('previewStage').style.background = theme().bg;
    $('previewThemeName').innerHTML = '<b>' + loc(theme()).name + '</b> · ' + I.t('previewLabel');
    $('articleMeta').textContent = 'UNOEditor · ' + loc(theme()).name;
  }

  function renderMeta() {
    var plain = M.plain(activeDoc().content);
    var compact = plain.replace(/\s/g, '');
    // count by the content language, not the UI language
    var cjk = (compact.match(/[\u3400-\u9fff]/g) || []).length;
    var isCjk = compact.length > 0 && cjk / compact.length > 0.15;
    var n = isCjk ? compact.length : plain.split(/\s+/).filter(Boolean).length;
    var mins = Math.max(1, Math.ceil(n / (isCjk ? 350 : 220)));
    $('metaInfo').textContent = state.lang === 'zh'
      ? n.toLocaleString() + ' 字 · 约 ' + mins + ' 分钟阅读'
      : n.toLocaleString() + ' chars · ' + mins + ' min read';
  }

  function renderTweakUI() {
    var d = theme().defaults;
    $('tweakSize').value = state.tweak.size || d.size;
    $('tweakLeading').value = state.tweak.leading || d.leading;
    $('tweakSizeVal').textContent = $('tweakSize').value + 'px';
    $('tweakLeadingVal').textContent = $('tweakLeading').value;
    var colors = ['#e2231a', '#e3120b', '#576b95', '#a8897e', '#0071e3', '#111111'];
    $('swatchRow').innerHTML = colors.map(function (c) {
      return '<span class="swatch' + (state.tweak.accent === c ? ' active' : '') + '" data-color="' + c +
        '" style="background:' + c + '"></span>';
    }).join('');
  }

  function renderAll() {
    I.apply();
    $('docTitle').value = activeDoc().title;
    $('editor').value = activeDoc().content;
    var langLabel = $('langLabel');
    if (langLabel) langLabel.textContent = state.lang === 'zh' ? 'EN' : '中';
    $('workspace').classList.toggle('sidebar-collapsed', !state.sidebar);
    $('workspace').classList.toggle('preview-collapsed', !state.preview);
    $('workspace').style.setProperty('--split-x', state.splitX);
    $('previewPane').classList.toggle('view-mobile', state.view === 'mobile');
    $('previewPane').classList.toggle('view-web', state.view === 'web');
    document.querySelectorAll('#viewSeg button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === state.view);
    });
    renderThemes(); renderDetail(); renderDocs(); renderOutline(); renderPreview();
    renderMeta(); renderTweakUI(); updateCaret();
    historySync();
  }

  function updateCaret() {
    var ta = $('editor'), p = ta.selectionStart;
    var before = ta.value.slice(0, p).split('\n');
    $('caretInfo').textContent = I.t('line') + ' ' + before.length + ', ' + I.t('col') + ' ' +
      (before[before.length - 1].length + 1);
    updateOutlineActive();
  }

  /* ---------------- undo / redo ----------------
     The editor is a plain textarea: the browser's native undo stack does NOT
     record programmatic value / setRangeText changes, which is exactly how all
     toolbar commands and AI insertions edit the text. So we keep a snapshot
     stack of our own. Every content change funnels through onEdit(). */
  var HISTORY_LIMIT = 200;
  var HISTORY_MERGE_MS = 700;
  var hist = [];            // [{text,start,end}] — history[histIndex] is current state
  var histIndex = -1;
  var histDocId = null;     // document this stack belongs to
  var lastEditKind = '';    // 'type' | 'cmd'
  var lastEditAt = 0;
  var histRestoring = false;

  function caretSnapshot() {
    var ta = $('editor');
    return { text: ta.value, start: ta.selectionStart, end: ta.selectionEnd };
  }
  function setUndoBtnState(btn, off) {
    if (!btn) return;
    // Drive the visual + clickability through a class, not the native
    // `disabled` property: WKWebView does not reliably repaint a disabled
    // button toggled from JS, so the toolbar stayed grey even when undo was
    // available. aria-disabled keeps the accessibility semantics.
    btn.classList.toggle('is-off', off);
  }
  function updateUndoRedo() {
    setUndoBtnState($('undoBtn'), histIndex <= 0);
    setUndoBtnState($('redoBtn'), histIndex >= hist.length - 1);
  }
  // Called after any full render (doc switch / load / lang change). Reset only
  // when the document or its content actually changed, so a language toggle
  // does not wipe the undo stack.
  function historySync() {
    var doc = activeDoc(), snap = caretSnapshot();
    if (!doc || histDocId !== doc.id || histIndex < 0 || !hist.length || hist[histIndex].text !== snap.text) {
      hist = [snap]; histIndex = 0; histDocId = doc && doc.id;
      lastEditKind = ''; lastEditAt = 0;
    }
    updateUndoRedo();
  }
  function recordHistory(kind) {
    if (histRestoring) return;
    var doc = activeDoc();
    if (!doc || histDocId !== doc.id) { historySync(); return; }
    var snap = caretSnapshot(), prev = hist[histIndex];
    if (prev && prev.text === snap.text) { updateUndoRedo(); return; }
    var now = Date.now();
    var merge = kind === 'type' && lastEditKind === 'type' &&
      (now - lastEditAt) < HISTORY_MERGE_MS && histIndex === hist.length - 1;
    if (!merge && histIndex < hist.length - 1) hist.length = histIndex + 1; // drop redo branch
    if (merge) {
      // keep the caret from before this typing burst so undo returns there
      hist[histIndex] = { text: snap.text, start: prev.start, end: prev.end };
    } else {
      hist.push(snap);
      if (hist.length > HISTORY_LIMIT) hist.shift();
      histIndex = hist.length - 1;
    }
    lastEditKind = kind; lastEditAt = now;
    updateUndoRedo();
  }
  function applyHistoryState(s) {
    var ta = $('editor');
    histRestoring = true;
    ta.value = s.text;
    activeDoc().content = s.text;
    renderPreview(); renderMeta(); renderOutline(); scheduleSave();
    // A toolbar click blurs the textarea; a selection set while unfocused is
    // not reliably kept, so focus first, then restore the caret.
    ta.focus();
    try { ta.setSelectionRange(s.start, s.end); } catch (e) { }
    updateCaret();
    histRestoring = false;
  }
  function doUndo() {
    if (histIndex <= 0) return;
    histIndex--;
    applyHistoryState(hist[histIndex]);
    lastEditKind = ''; lastEditAt = 0;
    updateUndoRedo();
  }
  function doRedo() {
    if (histIndex >= hist.length - 1) return;
    histIndex++;
    applyHistoryState(hist[histIndex]);
    lastEditKind = ''; lastEditAt = 0;
    updateUndoRedo();
  }

  function onEdit(ev) {
    activeDoc().content = $('editor').value;
    renderPreview(); renderMeta(); renderOutline(); scheduleSave();
    recordHistory(ev && ev.type === 'input' ? 'type' : 'cmd');
  }

  /* ---------------- editor commands ---------------- */
  function wrap(before, after, placeholder) {
    var ta = $('editor'), s = ta.selectionStart, e = ta.selectionEnd;
    var body = ta.value.slice(s, e) || placeholder;
    ta.setRangeText(before + body + after, s, e, 'end');
    ta.focus();
    ta.setSelectionRange(s + before.length, s + before.length + body.length);
    onEdit(); updateCaret();
  }
  function linePrefix(prefix, placeholder) {
    var ta = $('editor'), s = ta.selectionStart, e = ta.selectionEnd;
    var lineStart = ta.value.lastIndexOf('\n', s - 1) + 1;
    var lineEnd = ta.value.indexOf('\n', e); if (lineEnd < 0) lineEnd = ta.value.length;
    var block = ta.value.slice(lineStart, lineEnd) || placeholder;
    var lines = block.split('\n');
    var all = lines.every(function (l) { return l.indexOf(prefix) === 0; });
    var next = lines.map(function (l) { return all ? l.slice(prefix.length) : prefix + l; }).join('\n');
    ta.setRangeText(next, lineStart, lineEnd, 'end');
    ta.focus(); onEdit(); updateCaret();
  }
  function insertBlock(text) {
    var ta = $('editor'), s = ta.selectionStart, e = ta.selectionEnd;
    var pre = s > 0 && ta.value[s - 1] !== '\n' ? '\n\n' : (s > 1 && ta.value[s - 2] !== '\n' ? '\n' : '');
    var post = '\n\n';
    ta.setRangeText(pre + text + post, s, e, 'end');
    ta.focus(); onEdit(); updateCaret();
  }
  var COMMANDS = {
    undo: function () { doUndo(); },
    redo: function () { doRedo(); },
    h1: function () { linePrefix('# ', I.t('h1')); },
    h2: function () { linePrefix('## ', I.t('h2')); },
    h3: function () { linePrefix('### ', I.t('h3')); },
    bold: function () { wrap('**', '**', state.lang === 'zh' ? '粗体文本' : 'bold text'); },
    italic: function () { wrap('*', '*', state.lang === 'zh' ? '斜体文本' : 'italic text'); },
    strike: function () { wrap('~~', '~~', state.lang === 'zh' ? '删除线' : 'strikethrough'); },
    code: function () { wrap('`', '`', 'code'); },
    link: function () {
      var ta = $('editor'), s = ta.selectionStart, e = ta.selectionEnd;
      var text = ta.value.slice(s, e) || (state.lang === 'zh' ? '链接文字' : 'link text');
      var md = '[' + text + '](https://example.com)';
      ta.setRangeText(md, s, e, 'end'); ta.focus();
      ta.setSelectionRange(s + text.length + 3, s + md.length - 1);
      onEdit(); updateCaret();
    },
    quote: function () { linePrefix('> ', state.lang === 'zh' ? '引用内容' : 'quote'); },
    ul: function () { linePrefix('- ', state.lang === 'zh' ? '列表项' : 'list item'); },
    ol: function () { linePrefix('1. ', state.lang === 'zh' ? '列表项' : 'list item'); },
    task: function () { linePrefix('- [ ] ', state.lang === 'zh' ? '待办事项' : 'todo'); },
    codeblock: function () { insertBlock('```js\n\n```'); },
    table: function () {
      insertBlock(state.lang === 'zh'
        ? '| 列 A | 列 B | 列 C |\n| :--- | :---: | ---: |\n| 内容 | 内容 | 内容 |'
        : '| Column A | Column B | Column C |\n| :--- | :---: | ---: |\n| Cell | Cell | Cell |');
    },
    image: function () { insertBlock('![' + (state.lang === 'zh' ? '图片说明' : 'caption') + '](https://example.com/image.png)'); },
    hr: function () { insertBlock('---'); }
  };

  /* ---------------- export ---------------- */
  var INLINE_PROPS = [
    'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
    'color', 'background-color', 'text-align', 'text-indent', 'text-transform',
    'text-decoration-line', 'text-decoration-color', 'text-underline-offset',
    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
    'border-top-width', 'border-top-style', 'border-top-color',
    'border-right-width', 'border-right-style', 'border-right-color',
    'border-bottom-width', 'border-bottom-style', 'border-bottom-color',
    'border-left-width', 'border-left-style', 'border-left-color',
    'border-radius', 'display', 'list-style-type', 'vertical-align', 'white-space',
    'overflow-x', 'box-sizing', 'max-width', 'font-variant',
    'border-collapse', 'border-spacing'
  ];
  var SKIP_ROOT = { 'padding-top': 1, 'padding-right': 1, 'padding-bottom': 1, 'padding-left': 1, 'min-height': 1 };

  function richHtml() {
    var src = $('preview'), clone = src.cloneNode(true);
    clone.removeAttribute('id'); clone.removeAttribute('class'); clone.removeAttribute('data-theme');
    function walk(a, b, isRoot) {
      var cs = getComputedStyle(a), decl = [];
      INLINE_PROPS.forEach(function (p) {
        if (isRoot && SKIP_ROOT[p]) return;
        var v = cs.getPropertyValue(p);
        if (v && v !== 'normal' && v !== 'none' && v !== 'auto' && v !== '0px') decl.push(p + ':' + v);
      });
      if (b.tagName === 'TABLE') decl.push('width:100%');
      if (b.tagName === 'IMG') decl.push('max-width:100%;height:auto');
      // preview root is transparent; carry the theme surface into the pasted HTML
      if (isRoot) {
        decl.push('background-color:' + (getComputedStyle(src).getPropertyValue('--c-surface').trim() || '#ffffff'));
      }
      b.setAttribute('style', decl.join(';'));
      for (var i = 0; i < a.children.length; i++) walk(a.children[i], b.children[i], false);
    }
    walk(src, clone, true);
    clone.querySelectorAll('[class],[id]').forEach(function (n) {
      n.removeAttribute('class'); n.removeAttribute('id');
    });
    // WeChat's editor keeps <section> styles; <article> is often stripped
    var section = document.createElement('section');
    section.setAttribute('style', clone.getAttribute('style') || '');
    while (clone.firstChild) section.appendChild(clone.firstChild);
    return section.outerHTML;
  }

  function standaloneHtml() {
    var th = theme();
    var extraCss = th.imported ? (th.css || '') : '';
    var importAttr = th.imported ? ' data-import="' + th.id + '"' : '';
    var holder = document.createElement('div');
    holder.innerHTML = M.render(activeDoc().content);
    // swap mermaid source blocks for the SVGs already rendered in the live preview
    var srcWraps = $('preview').querySelectorAll('.mermaid-wrap');
    var dstWraps = holder.querySelectorAll('.mermaid-wrap');
    for (var i = 0; i < dstWraps.length && i < srcWraps.length; i++) {
      var rendered = srcWraps[i].querySelector('.mermaid-svg');
      if (!rendered) continue;
      dstWraps[i].innerHTML = rendered.innerHTML;
      // the preview pins SVGs to their natural width; in a standalone page the
      // CSS max-width:100% should scale them to the sheet instead
      var svg = dstWraps[i].querySelector('svg');
      if (svg) {
        svg.style.maxWidth = '';
        svg.removeAttribute('width');
        svg.removeAttribute('height');
      }
    }
    var body = '<article class="md-body" data-theme="' + state.themeId + '"' + importAttr +
      (tweakStyleString() ? ' style="' + tweakStyleString() + '"' : '') + '>' +
      holder.innerHTML + '</article>';
    return '<!DOCTYPE html>\n<html lang="' + (state.lang === 'zh' ? 'zh-CN' : 'en') + '">\n<head>\n' +
      '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + M.escape(activeDoc().title) + '</title>\n<style>\n' +
      'body{margin:0;padding:40px 16px;background:#eef0f2;font-family:-apple-system,sans-serif}\n' +
      '.sheet{max-width:760px;margin:0 auto;box-shadow:0 12px 40px rgba(0,0,0,.08);border-radius:8px;overflow:hidden}\n' +
      '.sheet .md-body{padding:48px 56px;min-height:600px}\n' +
      '.md-body svg{max-width:100%;height:auto}\n' +
      window.UnoThemeCSS + (extraCss ? '\n' + extraCss : '') + '\n</style>\n</head>\n<body>\n<div class="sheet">' + body + '</div>\n</body>\n</html>';
  }

  function download(name, content, type) {
    var blob = new Blob([content], { type: type });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a'); a.href = url; a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1500);
  }
  function fileName(ext) {
    return (activeDoc().title || I.t('untitledDoc')).replace(/[\\/:*?"<>|]/g, '_') + '.' + ext;
  }

  // Rasterize a rendered mermaid SVG to a PNG data URL. WeChat's editor strips
  // <svg>, so the "copy for WeChat" path swaps diagrams for <img> copies.
  // flowchart htmlLabels are disabled in the mermaid config, so the SVG contains
  // no foreignObject and drawing it on a canvas cannot taint the bitmap.
  function svgToPng(svg) {
    var box = svg.getBoundingClientRect();
    var w = box.width || 600, h = box.height || 400, scale = 2;
    var clone = svg.cloneNode(true);
    clone.setAttribute('width', w);
    clone.setAttribute('height', h);
    var xml = new XMLSerializer().serializeToString(clone);
    return new Promise(function (resolve) {
      var img = new Image();
      img.onload = function () {
        try {
          var c = document.createElement('canvas');
          c.width = Math.round(w * scale); c.height = Math.round(h * scale);
          c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
          resolve(c.toDataURL('image/png'));
        } catch (e) { resolve(null); }
      };
      img.onerror = function () { resolve(null); };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    });
  }

  function copyWechat() {
    renderMermaidIn($('preview')).then(function () {
      var svgs = $('preview').querySelectorAll('.mermaid-wrap .mermaid-svg > svg');
      var jobs = [];
      for (var i = 0; i < svgs.length; i++) (function (svg) {
        jobs.push(svgToPng(svg).then(function (png) {
          if (!png) return;
          var img = document.createElement('img');
          img.src = png; img.alt = 'diagram';
          svg.parentNode.parentNode.replaceChild(img, svg.parentNode);
        }));
      })(svgs[i]);
      return Promise.all(jobs);
    }).then(function () {
      var html = richHtml(), text = $('preview').innerText;
      setTimeout(renderPreview, 0);   // restore live SVG diagrams; strings already captured
      function fallback() {
      var holder = document.createElement('div');
      holder.contentEditable = 'true';
      holder.style.cssText = 'position:fixed;left:-99999px;top:0;';
      holder.innerHTML = html;
      document.body.appendChild(holder);
      var r = document.createRange(); r.selectNodeContents(holder);
      var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(r);
      var ok = document.execCommand('copy');
      sel.removeAllRanges(); holder.remove();
      if (!ok) throw new Error('copy failed');
    }
    if (navigator.clipboard && window.ClipboardItem) {
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([text], { type: 'text/plain' })
      })]).then(function () { toast(I.t('copied')); }).catch(function () {
        try { fallback(); toast(I.t('copied')); } catch (e) { toast(I.t('copyFail')); }
      });
    } else {
      try { fallback(); toast(I.t('copied')); } catch (e) { toast(I.t('copyFail')); }
    }
    });
  }

  /* ---------------- print / export PDF ---------------- */
  function isTauri() {
    return !!(window.__TAURI_INTERNALS__ || window.__TAURI__ ||
      (navigator.userAgent || '').toLowerCase().indexOf('tauri') >= 0);
  }
  // Safari and WKWebView open the print sheet without blocking JS, and neither
  // fires a reliable afterprint. In those engines the print view must stay alive
  // until the user explicitly returns, or the preview/PDF comes out blank.
  function asyncPrintEngine() {
    if (isTauri()) return true;
    var ua = navigator.userAgent || '';
    if (/CriOS|FxiOS|EdgiOS|iPad|iPhone|iPod/i.test(ua)) return true;  // iOS browsers are WebKit
    if (/Firefox/i.test(ua)) return false;                               // blocks like Chrome
    return !/Chrome|Chromium|Edg|Android/i.test(ua);                      // Safari / WebKit / unknown
  }

  // Resolve when fonts + every <img> in the print root are ready, capped by a timeout
  // so a broken/remote image can never block the print dialog forever.
  function waitForAssets(root, ms) {
    var waits = [];
    try { if (document.fonts && document.fonts.ready) waits.push(document.fonts.ready); } catch (e) { /* ignore */ }
    var imgs = root.querySelectorAll('img');
    for (var i = 0; i < imgs.length; i++) {
      (function (img) {
        if (img.complete) return;
        waits.push(new Promise(function (res) {
          img.addEventListener('load', res, { once: true });
          img.addEventListener('error', res, { once: true });
        }));
      })(imgs[i]);
    }
    var cap = new Promise(function (res) { setTimeout(res, ms || 2500); });
    return Promise.race([Promise.all(waits), cap]);
  }

  var printTeardown = null;
  function endPrintMode() {
    if (!printTeardown) return;
    var off = printTeardown; printTeardown = null;
    off();
  }

  // Print only the article, not the whole app shell: the editor UI is a fixed-height
  // viewport layout with scroll containers, and paginating it is what made export slow.
  // The print view is a real, visible full-screen overlay: engines that capture the
  // live render asynchronously (WKWebView / Safari) would otherwise print a blank page.
  function exportPdf() {
    var doc = activeDoc();
    if (!(doc.content || '').trim()) { toast(I.t('printEmpty')); return; }
    endPrintMode();

    var th = theme();
    var root = document.createElement('div');
    root.id = 'unoPrintRoot';
    var bar = document.createElement('div');
    bar.id = 'unoPrintBar';
    var label = document.createElement('b'); label.textContent = I.t('printPreviewTitle');
    var hint = document.createElement('span'); hint.className = 'hint'; hint.textContent = I.t('printPreviewHint');
    var back = document.createElement('button'); back.type = 'button'; back.textContent = I.t('printDone');
    back.addEventListener('click', endPrintMode);
    bar.appendChild(label); bar.appendChild(hint); bar.appendChild(back);

    var sheet = document.createElement('div');
    sheet.id = 'unoPrintSheet';
    var art = document.createElement('article');
    art.className = 'md-body';
    art.setAttribute('data-theme', state.themeId);
    if (th.imported) art.setAttribute('data-import', th.id);
    var tw = tweakStyleString();
    if (tw) art.setAttribute('style', tw);
    art.innerHTML = M.render(doc.content);
    sheet.appendChild(art);
    root.appendChild(bar); root.appendChild(sheet);
    document.body.appendChild(root);

    var prevTitle = document.title;
    document.title = doc.title || I.t('untitledDoc');   // becomes the PDF filename
    var onKey = function (e) { if (e.key === 'Escape') { e.preventDefault(); endPrintMode(); } };
    var timer = setTimeout(endPrintMode, 600000);       // 10min safety net only
    printTeardown = function () {
      clearTimeout(timer);
      document.body.classList.remove('uno-printing');
      var r = document.getElementById('unoPrintRoot'); if (r) r.remove();
      document.title = prevTitle;
      document.removeEventListener('keydown', onKey);
    };
    document.body.classList.add('uno-printing');
    document.addEventListener('keydown', onKey);
    toast(I.t('printPreparing'));

    renderMermaidIn(art).then(function () {
      // Two frames so the overlay is actually painted before the print sheet opens.
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          waitForAssets(root, 2500).then(function () {
          var ret;
          try { ret = window.print(); } catch (e) { endPrintMode(); toast(I.t('printFail')); return; }
          if (ret && typeof ret.catch === 'function') {
            ret.catch(function () { endPrintMode(); toast(I.t('printFail')); });
          }
          // Chrome / Firefox block inside window.print() until the dialog is dismissed,
          // so it is safe to restore the editor now. Safari / Tauri return immediately:
          // keep the print view until the user clicks "Back to editor" or presses Esc.
          if (!asyncPrintEngine()) setTimeout(endPrintMode, 150);
          });
        });
      });
    });
  }

  function runExport(act) {
    switch (act) {
      case 'wechat': copyWechat(); break;
      case 'html':
        renderMermaidIn($('preview')).then(function () {
          download(fileName('html'), standaloneHtml(), 'text/html;charset=utf-8');
          toast(I.t('htmlSaved'));
        });
        break;
      case 'md': download(fileName('md'), activeDoc().content, 'text/markdown;charset=utf-8'); toast(I.t('mdSaved')); break;
      case 'print': exportPdf(); break;
    }
  }

  /* ---------------- check for updates (PDF Studio style) ---------------- */
  function currentVersion() { return window.UNO_VERSION || '0.0.0'; }
  function runtimeEnvText() {
    var tauri = !!(window.__TAURI_INTERNALS__ || window.__TAURI__ ||
      (navigator.userAgent || '').toLowerCase().indexOf('tauri') >= 0);
    return tauri ? I.t('envDesktop') : I.t('envWeb');
  }
  function repoApi() {
    var r = window.UNO_REPO || { owner: 'samjoeyang', repo: 'UNOEditor' };
    return 'https://api.github.com/repos/' + r.owner + '/' + r.repo + '/releases/latest';
  }
  function repoReleasesPage() {
    var r = window.UNO_REPO || { owner: 'samjoeyang', repo: 'UNOEditor' };
    return 'https://github.com/' + r.owner + '/' + r.repo + '/releases';
  }
  function openExternal(url) {
    try {
      if (window.__TAURI__ && window.__TAURI__.opener && window.__TAURI__.opener.openUrl) {
        window.__TAURI__.opener.openUrl(url); return;
      }
      if (window.__TAURI__ && window.__TAURI__.shell && window.__TAURI__.shell.open) {
        window.__TAURI__.shell.open(url); return;
      }
    } catch (e) { /* fall through to window.open */ }
    window.open(url, '_blank', 'noopener');
  }
  function parseVer(v) {
    v = ('' + (v || '')).replace(/^v/i, '').trim();
    var p = v.split('.');
    return [parseInt(p[0], 10) || 0, parseInt(p[1], 10) || 0, parseInt(p[2], 10) || 0];
  }
  function cmpVer(a, b) {
    var x = parseVer(a), y = parseVer(b);
    for (var i = 0; i < 3; i++) { if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1; }
    return 0;
  }
  function setUpdateState(html) { $('updateState').innerHTML = html; }
  function renderNotes(notes) {
    var box = $('updateNotes');
    if (notes && notes.trim()) {
      box.hidden = false;
      box.innerHTML = '<div class="detail-label">' + I.t('releaseNotes') + '</div>' +
        (M.render ? M.render(notes) : '<pre>' + notes + '</pre>');
    } else { box.hidden = true; box.innerHTML = ''; }
  }
  function checkForUpdates() {
    var cur = currentVersion();
    setUpdateState('<div class="update-loading"><span class="spinner"></span>' + I.t('checkingUpdate') + '</div>');
    renderNotes('');
    $('downloadUpdateBtn').hidden = true;
    fetch(repoApi(), { headers: { 'Accept': 'application/vnd.github+json' } })
      .then(function (r) {
        if (!r.ok) {
          if (r.status === 404) throw { kind: 'norelease' };
          if (r.status === 403) throw { kind: 'ratelimit' };
          throw { kind: 'http', status: r.status };
        }
        return r.json();
      })
      .then(function (data) {
        var latest = (data.tag_name || '').replace(/^v/i, '') || (data.name || '').replace(/^v/i, '');
        if (!latest) throw { kind: 'norelease' };
        if (cmpVer(latest, cur) > 0) {
          setUpdateState(
            '<div class="update-available"><svg class="icon"><use href="#i-alert"/></svg>' +
            '<div><b>' + I.t('updateAvailable') + '</b> <span class="up-ver">v' + latest + '</span>' +
            '<div class="up-sub">' + I.t('currentVersion') + ': v' + cur + '</div></div></div>');
          renderNotes(data.body || '');
          var dl = $('downloadUpdateBtn');
          dl.hidden = false;
          dl.onclick = function () { openExternal(data.html_url || repoReleasesPage()); };
        } else {
          setUpdateState('<div class="update-ok"><svg class="icon"><use href="#i-check"/></svg>' +
            '<div><b>' + I.t('upToDate') + '</b><div class="up-sub">v' + cur + '</div></div></div>');
          renderNotes('');
        }
      })
      .catch(function (err) {
        var msg = I.t('checkFailed');
        if (err && err.kind === 'norelease') msg = I.t('noRelease');
        else if (err && err.kind === 'ratelimit') msg = I.t('rateLimit');
        setUpdateState('<div class="update-error"><svg class="icon"><use href="#i-alert"/></svg><div><b>' + msg + '</b></div></div>');
      });
  }
  function openAbout() {
    $('aboutVersion').textContent = 'v' + currentVersion();
    $('aboutEnv').textContent = runtimeEnvText();
    setUpdateState('<div class="update-idle">' + I.t('checkHint') + '</div>');
    renderNotes('');
    $('downloadUpdateBtn').hidden = true;
    $('aboutModal').hidden = false;
    document.body.classList.add('modal-open');
  }
  function closeAbout() {
    $('aboutModal').hidden = true;
    document.body.classList.remove('modal-open');
  }
  function autoCheck() {
    if (!window.UNO_AUTO_CHECK) return;
    try {
      var KEY = 'uno-md-update-lastauto', DAY = 24 * 3600 * 1000;
      var last = parseInt(localStorage.getItem(KEY) || '0', 10);
      if (Date.now() - last < DAY) return;
      localStorage.setItem(KEY, String(Date.now()));
      fetch(repoApi(), { headers: { 'Accept': 'application/vnd.github+json' } })
        .then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) {
          var latest = (d.tag_name || '').replace(/^v/i, '');
          if (latest && cmpVer(latest, currentVersion()) > 0) toast(I.t('updateToast') + ' v' + latest);
        })
        .catch(function () { /* silent on failure */ });
    } catch (e) { /* ignore */ }
  }

  /* ---------------- account / sign-in ---------------- */
  function currentSession() { return window.UnoAuth ? window.UnoAuth.getSession() : null; }
  function accountLabel(s) {
    var c = s && s.claims || {};
    return c.name || c.email || c.username || '';
  }
  function accountPicture(s) {
    if (!s) return '';
    return s.claims && (s.claims.picture || s.claims.avatar) || '';
  }
  // 头像：优先显示 userinfo 的图片，加载失败则保留首字母兜底
  function paintAvatar(el, name, picture) {
    if (!el) return;
    var initial = name ? String(name).charAt(0).toUpperCase() : '?';
    // 清掉旧图片（兼容没有 NodeList.forEach 的旧 WebKit）
    var old = el.getElementsByTagName('img');
    while (old.length) { old[0].parentNode.removeChild(old[0]); }
    el.textContent = initial;
    el.setAttribute('data-initial', initial);
    if (!picture || !/^(https?:\/\/|data:image\/)/i.test(picture)) return;
    var img = document.createElement('img');
    img.alt = '';
    img.onload = function () { el.style.background = 'transparent'; };
    img.onerror = function () { if (img.parentNode) img.parentNode.removeChild(img); };
    img.src = picture;
    el.appendChild(img);
  }
  // 弹窗内容单独渲染：登录回调完成后也要刷新，否则一直停在“等待返回软件”
  function renderAccountBody() {
    var s = currentSession();
    var signedOut = $('accountSignedOut'), signedIn = $('accountSignedIn');
    if (!signedOut || !signedIn) return;
    signedOut.hidden = !!s;
    signedIn.hidden = !s;
    if (s) {
      var c = s.claims || {};
      var name = c.name || c.username || '';
      var email = c.email || '';
      $('accountName').textContent = name || email || '—';
      $('accountEmail').textContent = name && email ? email : '';
      paintAvatar($('accountAvatarBig'), name || email, accountPicture(s));
    }
    var pending = $('loginPending');
    if (pending) pending.hidden = !(window.UnoAuth && window.UnoAuth.isTauri() && !s);
  }
  var lastSignedIn = null;
  function renderAccount() {
    var s = currentSession();
    var btn = $('accountBtn');
    if (!btn) return;
    var icon = $('accountIcon'), avatar = $('accountAvatar');
    if (s) {
      var name = accountLabel(s);
      if (icon) icon.style.display = 'none';
      if (avatar) {
        avatar.hidden = false;
        paintAvatar(avatar, name, accountPicture(s));
        avatar.title = name;
      }
      btn.setAttribute('data-i18n-title', 'account');
      btn.title = name || I.t('account');
    } else {
      if (icon) icon.style.display = '';
      if (avatar) avatar.hidden = true;
      btn.title = I.t('account');
    }
    var modal = $('accountModal');
    if (modal && !modal.hidden) {
      renderAccountBody();
      // 从未登录变为已登录：登录链路已完成，自动收起弹窗
      if (lastSignedIn === false && s) closeAccount();
    }
    lastSignedIn = !!s;
  }
  function openAccount() {
    renderAccountBody();
    $('accountModal').hidden = false;
  }
  function closeAccount() { $('accountModal').hidden = true; }

  /* ---------------- events ---------------- */
  function bind() {
    function closeUtilityPanel() {
      var p = $('utilityPanel'); if (p) p.hidden = true;
      var b = $('utilityBtn'); if (b) b.setAttribute('aria-expanded', 'false');
    }
    $('themeList').addEventListener('click', function (e) {
      var del = e.target.closest('[data-deltheme]');
      if (del) {
        e.stopPropagation();
        if (confirm(I.t('deleteTheme') + '？')) deleteImportedTheme(del.dataset.deltheme);
        return;
      }
      var item = e.target.closest('.theme-item'); if (!item) return;
      state.themeId = item.dataset.id; state.tweak = {};
      renderThemes(); renderDetail(); renderPreview(); renderTweakUI(); scheduleSave();
      closeTheme(); toast(I.t('themeSwitched'));
    });

    $('docList').addEventListener('click', function (e) {
      var del = e.target.closest('[data-del]');
      if (del) {
        e.stopPropagation();
        if (!confirm(I.t('confirmDelete'))) return;
        var desktopSync = !!(window.UnoSync && UnoSync.available());
        if (visibleDocs().length === 1) {
          var only = activeDoc();
          only.content = ''; only.title = I.t('untitledDoc');
          only.updated = Date.now(); only.rev = newRev();
        } else if (desktopSync) {
          for (var i = 0; i < state.docs.length; i++) {
            if (state.docs[i].id === del.dataset.del) {
              state.docs[i].deleted = true;
              state.docs[i].updated = Date.now();
              state.docs[i].rev = 'del-' + Date.now().toString(16);
              break;
            }
          }
          if (state.activeId === del.dataset.del) state.activeId = visibleDocs()[0].id;
        } else {
          state.docs = state.docs.filter(function (d) { return d.id !== del.dataset.del; });
          if (state.activeId === del.dataset.del) state.activeId = state.docs[0].id;
        }
        toast(I.t('docDeleted')); renderAll(); scheduleSave(); return;
      }
      var item = e.target.closest('.doc-item'); if (!item) return;
      state.activeId = item.dataset.id; renderAll(); scheduleSave();
      $('docPanel').hidden = true;
    });

    $('newDocBtn').addEventListener('click', function () {
      var nid = uid();
      var d = { id: nid, title: I.t('untitledDoc'), content: '# ' + I.t('untitledDoc') + '\n\n',
        file: 'doc-' + nid + '.md', updated: Date.now(), rev: newRev(), base: '', deleted: false };
      state.docs.unshift(d); state.activeId = d.id;
      renderAll(); scheduleSave(); toast(I.t('docCreated'));
      $('docTitle').focus(); $('docTitle').select();
    });

    $('loadSampleBtn').addEventListener('click', function () {
      var s = SAMPLE[state.lang];
      if (activeDoc().content.trim() && !confirm(state.lang === 'zh'
        ? '将用示例内容替换当前文档，继续？' : 'Replace the current document with the sample?')) return;
      activeDoc().title = s.title; activeDoc().content = s.body;
      renderAll(); scheduleSave(); toast(I.t('sampleLoaded'));
    });

    $('docTitle').addEventListener('input', function () {
      activeDoc().title = this.value; renderDocs(); scheduleSave();
    });
    $('editor').addEventListener('input', onEdit);
    $('editor').addEventListener('keyup', updateCaret);
    $('editor').addEventListener('click', updateCaret);
    $('editor').addEventListener('scroll', function () {
      var a = this, b = $('previewStage');
      var ra = a.scrollTop / ((a.scrollHeight - a.clientHeight) || 1);
      b.scrollTop = ra * ((b.scrollHeight - b.clientHeight) || 0);
      updateOutlineActive();
    });

    $('toolbar').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-cmd]'); if (!btn) return;
      e.preventDefault(); COMMANDS[btn.dataset.cmd]();
    });

    document.addEventListener('keydown', function (e) {
      var mod = e.metaKey || e.ctrlKey;
      if (!mod) {
        if (e.key === 'Tab' && document.activeElement === $('editor')) {
          e.preventDefault();
          var ta = $('editor'), p = ta.selectionStart;
          ta.setRangeText('  ', p, ta.selectionEnd, 'end'); onEdit();
        }
        return;
      }
      var k = e.key.toLowerCase();
      if (k === 'p') { e.preventDefault(); exportPdf(); return; }
      // undo / redo: only take over when editing the Markdown body, so native
      // undo still works in the title field, AI prompts and other inputs.
      var ae = document.activeElement;
      var inBody = ae === $('editor');
      if (inBody && k === 'z' && !e.shiftKey) { e.preventDefault(); doUndo(); return; }
      if (inBody && (k === 'z' && e.shiftKey || k === 'y')) { e.preventDefault(); doRedo(); return; }
      if (k === 'b' || k === 'i' || k === 'k' || k === 's') {
        if (document.activeElement !== $('editor') && k !== 's') return;
        e.preventDefault();
        if (k === 'b') COMMANDS.bold();
        if (k === 'i') COMMANDS.italic();
        if (k === 'k') COMMANDS.link();
        if (k === 's') { save(); $('saveState').textContent = I.t('saved'); }
      }
    });

    /* pane toggles: collapse buttons live inside each pane's own header,
       and a thin rail on the workspace edge brings a collapsed pane back. */
    function setSidebar(on) {
      state.sidebar = on;
      $('workspace').classList.toggle('sidebar-collapsed', !on);
      scheduleSave();
    }
    function setPreview(on) {
      state.preview = on;
      $('workspace').classList.toggle('preview-collapsed', !on);
      scheduleSave();
    }

    $('sideClose').addEventListener('click', function () {
      $('workspace').classList.remove('drawer-open');
      setSidebar(false);
    });
    $('expandSidebar').addEventListener('click', function () { setSidebar(true); });
    $('previewClose').addEventListener('click', function () { setPreview(false); });
    $('expandPreview').addEventListener('click', function () { setPreview(true); });

    /* draggable divider: editor ↔ preview width. Only the --split-x custom
       property changes, so the browser keeps both panes responsive on resize. */
    (function initSplitter() {
      var sp = $('paneSplitter'), ws = $('workspace');
      if (!sp || !ws) return;
      var dragging = false, startX = 0, startRatio = 0.495;
      function current() {
        var v = parseFloat(getComputedStyle(ws).getPropertyValue('--split-x'));
        return isFinite(v) ? v : 0.495;
      }
      function apply(v) {
        state.splitX = Math.max(0.15, Math.min(0.85, Math.round(v * 1000) / 1000));
        ws.style.setProperty('--split-x', state.splitX);
      }
      function pointerX(e) {
        if (typeof e.clientX === 'number') return e.clientX;
        return e.touches && e.touches[0] ? e.touches[0].clientX : null;
      }
      function available() {
        var side = ws.classList.contains('sidebar-collapsed') ? 22 : (window.innerWidth <= 1180 ? 236 : 264);
        return ws.clientWidth - side - 8; // 8px divider
      }
      function down(e) {
        if (window.innerWidth <= 900 || ws.classList.contains('preview-collapsed')) return;
        var x = pointerX(e); if (x == null) return;
        dragging = true; startX = x; startRatio = current();
        sp.classList.add('dragging'); ws.classList.add('resizing');
        e.preventDefault();
      }
      function move(e) {
        if (!dragging) return;
        var x = pointerX(e), avail = available();
        if (x == null || avail <= 0) return;
        apply(startRatio + (x - startX) / avail);
        e.preventDefault();
      }
      function up() {
        if (!dragging) return;
        dragging = false;
        sp.classList.remove('dragging'); ws.classList.remove('resizing');
        scheduleSave();
      }
      sp.addEventListener('mousedown', down);
      document.addEventListener('mousemove', move);
      document.addEventListener('mouseup', up);
      sp.addEventListener('touchstart', down, { passive: false });
      document.addEventListener('touchmove', move, { passive: false });
      document.addEventListener('touchend', up);
      document.addEventListener('touchcancel', up);
      sp.addEventListener('dblclick', function () { apply(0.495); scheduleSave(); });
      sp.addEventListener('keydown', function (e) {
        var step = e.shiftKey ? 0.1 : 0.02, v = current(), next = null;
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') next = v - step;
        else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') next = v + step;
        else if (e.key === 'Home') next = 0.495;
        if (next == null) return;
        e.preventDefault(); apply(next); scheduleSave();
      });
    })();

    /* outline: click a heading to jump the caret there */
    $('outlineList').addEventListener('click', function (e) {
      var b = e.target.closest('.outline-item'); if (!b) return;
      var ta = $('editor'), line = +b.dataset.line, lines = ta.value.split('\n');
      var pos = 0; for (var i = 0; i < line && i < lines.length; i++) pos += lines[i].length + 1;
      ta.focus(); ta.setSelectionRange(pos, pos);
      var lh = parseFloat(getComputedStyle(ta).lineHeight) || 22;
      ta.scrollTop = Math.max(0, line * lh - ta.clientHeight / 2);
      updateOutlineActive();
    });

    /* theme drawer (top-bar 主题 button) */
    $('themeBtn').addEventListener('click', function (e) {
      e.stopPropagation(); openTheme();
    });
    $('themeDrawerClose').addEventListener('click', closeTheme);

    /* import a custom theme from a file (market-agnostic) */
    $('themeImportBtn').addEventListener('click', function () { $('themeFileInput').click(); });
    $('themeFileInput').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0]; if (f) importThemeFile(f);
      e.target.value = '';
    });

    /* open Markdown files into the document list (all runtimes) */
    var openMd = $('openMdBtn');
    if (openMd) openMd.addEventListener('click', function () { $('mdFileInput').click(); });
    $('mdFileInput').addEventListener('change', function (e) {
      var files = e.target.files || [];
      for (var i = 0; i < files.length; i++) importMarkdownFile(files[i]);
      e.target.value = '';
      $('docPanel').hidden = true;
    });

    /* documents dropdown (top-bar 文档 button) */
    $('docBtn').addEventListener('click', function (e) {
      e.stopPropagation(); closeUtilityPanel();
      var p = $('docPanel'); p.hidden = !p.hidden;
      if (!p.hidden) renderDocs();
    });
    $('viewSeg').addEventListener('click', function (e) {
      var b = e.target.closest('[data-view]'); if (!b) return;
      state.view = b.dataset.view;
      $('previewPane').classList.toggle('view-mobile', state.view === 'mobile');
      $('previewPane').classList.toggle('view-web', state.view === 'web');
      document.querySelectorAll('#viewSeg button').forEach(function (x) {
        x.classList.toggle('active', x.dataset.view === state.view);
      });
      scheduleSave();
    });
    $('langBtn').addEventListener('click', function () {
      state.lang = state.lang === 'zh' ? 'en' : 'zh';
      I.set(state.lang); renderAll(); scheduleSave();
    });

    $('tweakBtn').addEventListener('click', function () { $('tweakPanel').hidden = !$('tweakPanel').hidden; });
    $('tweakSize').addEventListener('input', function () {
      state.tweak.size = +this.value; $('tweakSizeVal').textContent = this.value + 'px';
      applyTweak(); scheduleSave();
    });
    $('tweakLeading').addEventListener('input', function () {
      state.tweak.leading = +this.value; $('tweakLeadingVal').textContent = this.value;
      applyTweak(); scheduleSave();
    });
    $('swatchRow').addEventListener('click', function (e) {
      var s = e.target.closest('[data-color]'); if (!s) return;
      state.tweak.accent = s.dataset.color; applyTweak(); renderTweakUI(); scheduleSave();
    });
    $('tweakReset').addEventListener('click', function () {
      state.tweak = {}; applyTweak(); renderTweakUI(); scheduleSave(); toast(I.t('resetDone'));
    });

    $('exportBtn').addEventListener('click', function (e) {
      e.stopPropagation(); closeUtilityPanel(); $('exportPanel').hidden = !$('exportPanel').hidden;
    });
    $('exportPanel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      $('exportPanel').hidden = true; runExport(b.dataset.act);
    });

    /* language / sync / account dropdown (top-bar right) */
    $('utilityBtn').addEventListener('click', function (e) {
      e.stopPropagation();
      var p = $('utilityPanel'); p.hidden = !p.hidden;
      this.setAttribute('aria-expanded', String(!p.hidden));
      if (!p.hidden) { $('exportPanel').hidden = true; $('docPanel').hidden = true; }
    });
    $('utilityPanel').addEventListener('click', function (e) {
      if (e.target.closest('button')) closeUtilityPanel();
    }, true);
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#exportDropdown')) $('exportPanel').hidden = true;
      if (!e.target.closest('#docDropdown')) $('docPanel').hidden = true;
      if (!e.target.closest('#utilityDropdown')) closeUtilityPanel();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeUtilityPanel();
    });

    /* about / check-for-updates (top-bar button removed; left sidebar entry remains) */
    $('aboutClose').addEventListener('click', closeAbout);
    $('aboutModal').addEventListener('click', function (e) {
      if (e.target === this) closeAbout();
    });
    $('checkUpdateBtn').addEventListener('click', checkForUpdates);
    $('sideCheckUpdateBtn').addEventListener('click', function () {
      openAbout();
      checkForUpdates();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('aboutModal').hidden) closeAbout();
    });

    /* account / sign-in */
    $('accountBtn').addEventListener('click', function (e) { e.stopPropagation(); openAccount(); });
    $('accountClose').addEventListener('click', closeAccount);
    $('accountModal').addEventListener('click', function (e) { if (e.target === this) closeAccount(); });
    $('loginBtn').addEventListener('click', function () { window.UnoAuth.signIn(false); });
    $('signupBtn').addEventListener('click', function () { window.UnoAuth.signIn(true); });
    $('logoutBtn').addEventListener('click', function () {
      window.UnoAuth.signOut(); closeAccount(); toast(I.t('signedOut'));
    });
    $('loginPasteBtn').addEventListener('click', function () {
      var v = $('loginPaste').value.trim();
      if (!v) return;
      window.UnoAuth.manualComplete(v).then(function (s) { if (s) closeAccount(); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !$('accountModal').hidden) closeAccount();
    });

    /* ---- 移动端：底部 Tab + 抽屉 ---- */
    var ws = $('workspace');
    function isMobile() { return window.matchMedia('(max-width:900px)').matches; }
    function closeDrawer() { ws.classList.remove('drawer-open'); }
    ws.classList.add('mobile-edit');
    $('drawerMask').addEventListener('click', function () { closeDrawer(); closeTheme(); });
    var dc = $('drawerClose'); if (dc) dc.addEventListener('click', closeDrawer);
    document.querySelectorAll('[data-mtab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var t = btn.dataset.mtab;
        if (t === 'outline') { ws.classList.add('drawer-open'); return; }
        ws.classList.toggle('mobile-edit', t === 'edit');
        ws.classList.toggle('mobile-preview', t === 'preview');
        document.querySelectorAll('[data-mtab]').forEach(function (b) {
          b.classList.toggle('active', b === btn);
        });
        if (t === 'preview') $('previewStage').scrollTop = 0;
      });
    });
  }

  /* ---------------- boot ---------------- */
  load();
  injectImportedCss();
  // optional deep link: ?theme=morandi&lang=en&view=web  (handy for sharing a preview)
  try {
    var q = new URLSearchParams(location.search);
    if (q.has('theme')) state.themeId = resolveThemeId(q.get('theme'));
    if (q.has('lang')) state.lang = q.get('lang') === 'en' ? 'en' : 'zh';
    if (q.has('view')) state.view = q.get('view') === 'web' ? 'web' : 'mobile';
  } catch (e) { }
  I.set(state.lang); bind(); renderAll();
  if (window.UnoSync && UnoSync.available()) {
    UnoSync.init({
      getState: function () { return state; },
      onLoad: function () { injectImportedCss(); renderAll(); },
      onSaved: function () { $('saveState').textContent = I.t('saved'); },
      onStatus: function (kind, report) { UnoSync.onStatus(kind, report); },
      toast: toast
    });
    UnoSync.bindUI();
    UnoSync.boot();
  } else {
    var syncBtn = $('syncBtn'); if (syncBtn) syncBtn.hidden = true;
  }
  /* optional AI assist: off by default, never blocks local writing */
  if (window.UnoAI) {
    UnoAI.init({
      toast: toast,
      onEdit: onEdit,
      previewDiff: function (next, prev, accept) {
        if (window.confirm(I.t('aiReplaceHint') + '\n\n' + next.slice(0, 400))) accept();
      },
      /* results render into the copilot drawer (UnoAI opens it itself) */
      showResult: function () { },
      getDocText: function () {
        var ta = $('editor');
        return ta ? ta.value.replace(/^---[\s\S]*?---\s*/, '') : '';
      },
      getThemeInfo: function () {
        var th = theme();
        return { name: th ? loc(th) : state.themeId, css: th && th.css ? th.css : '' };
      },
      setDocTitle: function (title) {
        var d = activeDoc();
        if (!d) return;
        d.title = title;
        $('docTitle').value = title;
        renderAll(); scheduleSave();
      },
      createTranslatedDoc: function (lang, content) {
        var nid = uid();
        var base = activeDoc();
        var baseTitle = base ? base.title : I.t('untitledDoc');
        var suffix = ' · ' + (lang || 'translated');
        // Guard against duplicated suffixes on repeated translations.
        var title = baseTitle.replace(/ · [a-z]{2,}(-[A-Za-z]{2,4})? · /g, ' · ').replace(/ · [a-z]{2,}(-[A-Za-z]{2,4})?$/, '');
        title = title + suffix;
        var d = { id: nid, title: title, content: content,
          file: 'doc-' + nid + '.md', updated: Date.now(), rev: newRev(), base: '', deleted: false,
          themeId: state.themeId, tweak: JSON.parse(JSON.stringify(state.tweak)) };
        state.docs.unshift(d); state.activeId = d.id;
        renderAll(); scheduleSave();
      }
    });
    UnoAI.bindUI();
    UnoAI.boot();
  }

  if (window.UNO_AUTO_CHECK) autoCheck();

  /* account sign-in: session restore + deep-link / redirect handling */
  if (window.UnoAuth) {
    window.UnoAuth.init({ onChange: renderAccount, toast: toast, openExternal: openExternal, ctx: { t: I.t } });
    window.UnoAuth.boot();
    renderAccount();
  }

  // deep links for sharing a mobile view / opening a drawer
  try {
    var pq = new URLSearchParams(location.search).get('panel');
    var wsk = $('workspace');
    if (pq === 'preview') {
      wsk.classList.remove('mobile-edit'); wsk.classList.add('mobile-preview');
      document.querySelectorAll('[data-mtab]').forEach(function (b) {
        b.classList.toggle('active', b.dataset.mtab === 'preview');
      });
    }
    if (location.hash === '#theme' || location.hash === '#themes') openTheme();
    if (location.hash === '#outline' || location.hash === '#toc') wsk.classList.add('drawer-open');
    if (location.hash === '#doc' || location.hash === '#docs') { $('docPanel').hidden = false; renderDocs(); }
    if (location.hash === '#about' || location.search.indexOf('about=1') >= 0) openAbout();
  } catch (e) { }

  // small public surface for embedding / automation
  window.UnoApp = {
    state: state, themes: T.list,
    renderAll: renderAll, richHtml: richHtml, standaloneHtml: standaloneHtml,
    importThemeFile: importThemeFile, getThemes: getThemes,
    checkForUpdates: checkForUpdates, openAbout: openAbout, currentVersion: currentVersion,
    openAccount: openAccount, renderAccount: renderAccount,
    syncNow: function () { return window.UnoSync ? UnoSync.syncNow(false) : null; }
  };
})();
