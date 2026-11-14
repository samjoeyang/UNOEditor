/* Uno MD — application logic */
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
        'Open the Themes menu — same content, entirely different character.', ''
      ].join('\n')
    }
  };

  /* ---------------- state ---------------- */
  function uid() { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  var state = {
    lang: 'zh', themeId: 'wechat', view: 'mobile', sidebar: true, tweak: {},
    docs: [{ id: uid(), title: SAMPLE.zh.title, content: SAMPLE.zh.body }],
    activeId: null, imported: []
  };
  state.activeId = state.docs[0].id;

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
        state.tweak = d.tweak || {};
        state.docs = d.docs;
        state.activeId = d.activeId && d.docs.some(function (x) { return x.id === d.activeId; })
          ? d.activeId : d.docs[0].id;
      }
    } catch (e) { /* corrupted storage: fall back to defaults */ }
  }
  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch (e) { }
  }
  var saveTimer;
  function scheduleSave() {
    $('saveState').textContent = I.t('saving');
    clearTimeout(saveTimer);
    saveTimer = setTimeout(function () { save(); $('saveState').textContent = I.t('saved'); }, 420);
  }
  function activeDoc() {
    for (var i = 0; i < state.docs.length; i++) if (state.docs[i].id === state.activeId) return state.docs[i];
    return state.docs[0];
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

  /* ---------------- feedback ---------------- */
  var toastTimer;
  function toast(msg) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('show'); }, 2300);
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
    $('docList').innerHTML = state.docs.map(function (d) {
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
  function renderOutline() {
    var lines = activeDoc().content.split('\n');
    var items = [], inFence = false;
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i].trim();
      if (/^```/.test(ln)) { inFence = !inFence; continue; }
      if (inFence) continue;
      var m = lines[i].match(/^(#{1,6})\s+(.*)$/);
      if (m) items.push({ level: m[1].length, text: stripMd(m[2]), line: i });
    }
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

    var surface = getComputedStyle(el).getPropertyValue('--c-surface').trim() || '#ffffff';
    $('paper').style.setProperty('--paper', surface);
    $('paper').classList.toggle('dark', !!theme().dark);
    $('previewStage').style.background = theme().bg;
    $('previewThemeName').innerHTML = '<b>' + loc(theme()).name + '</b> · ' + I.t('previewLabel');
    $('articleMeta').textContent = 'Uno MD · ' + loc(theme()).name;
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
    $('langLabel').textContent = state.lang === 'zh' ? 'EN' : '中';
    $('workspace').classList.toggle('sidebar-collapsed', !state.sidebar);
    $('previewPane').classList.toggle('view-mobile', state.view === 'mobile');
    $('previewPane').classList.toggle('view-web', state.view === 'web');
    document.querySelectorAll('#viewSeg button').forEach(function (b) {
      b.classList.toggle('active', b.dataset.view === state.view);
    });
    renderThemes(); renderDetail(); renderDocs(); renderOutline(); renderPreview();
    renderMeta(); renderTweakUI(); updateCaret();
  }

  function updateCaret() {
    var ta = $('editor'), p = ta.selectionStart;
    var before = ta.value.slice(0, p).split('\n');
    $('caretInfo').textContent = I.t('line') + ' ' + before.length + ', ' + I.t('col') + ' ' +
      (before[before.length - 1].length + 1);
  }

  function onEdit() {
    activeDoc().content = $('editor').value;
    renderPreview(); renderMeta(); scheduleSave();
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
    var body = '<article class="md-body" data-theme="' + state.themeId + '"' + importAttr +
      (tweakStyleString() ? ' style="' + tweakStyleString() + '"' : '') + '>' +
      M.render(activeDoc().content) + '</article>';
    return '<!DOCTYPE html>\n<html lang="' + (state.lang === 'zh' ? 'zh-CN' : 'en') + '">\n<head>\n' +
      '<meta charset="UTF-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n' +
      '<title>' + M.escape(activeDoc().title) + '</title>\n<style>\n' +
      'body{margin:0;padding:40px 16px;background:#eef0f2;font-family:-apple-system,sans-serif}\n' +
      '.sheet{max-width:760px;margin:0 auto;box-shadow:0 12px 40px rgba(0,0,0,.08);border-radius:8px;overflow:hidden}\n' +
      '.sheet .md-body{padding:48px 56px;min-height:600px}\n' +
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

  function copyWechat() {
    var html = richHtml(), text = $('preview').innerText;
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
  }

  function runExport(act) {
    switch (act) {
      case 'wechat': copyWechat(); break;
      case 'html': download(fileName('html'), standaloneHtml(), 'text/html;charset=utf-8'); toast(I.t('htmlSaved')); break;
      case 'md': download(fileName('md'), activeDoc().content, 'text/markdown;charset=utf-8'); toast(I.t('mdSaved')); break;
      case 'print': window.print(); break;
    }
  }

  /* ---------------- events ---------------- */
  function bind() {
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
        if (state.docs.length === 1) {
          state.docs[0].content = ''; state.docs[0].title = I.t('untitledDoc');
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
      var d = { id: uid(), title: I.t('untitledDoc'), content: '# ' + I.t('untitledDoc') + '\n\n' };
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
      if (k === 'b' || k === 'i' || k === 'k' || k === 's') {
        if (document.activeElement !== $('editor') && k !== 's') return;
        e.preventDefault();
        if (k === 'b') COMMANDS.bold();
        if (k === 'i') COMMANDS.italic();
        if (k === 'k') COMMANDS.link();
        if (k === 's') { save(); $('saveState').textContent = I.t('saved'); }
      }
    });

    $('toggleSidebar').addEventListener('click', function () {
      state.sidebar = !state.sidebar;
      $('workspace').classList.toggle('sidebar-collapsed', !state.sidebar);
      scheduleSave();
    });

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

    /* documents dropdown (top-bar 文档 button) */
    $('docBtn').addEventListener('click', function (e) {
      e.stopPropagation();
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
      e.stopPropagation(); $('exportPanel').hidden = !$('exportPanel').hidden;
    });
    $('exportPanel').addEventListener('click', function (e) {
      var b = e.target.closest('[data-act]'); if (!b) return;
      $('exportPanel').hidden = true; runExport(b.dataset.act);
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#exportDropdown')) $('exportPanel').hidden = true;
      if (!e.target.closest('#docDropdown')) $('docPanel').hidden = true;
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
  } catch (e) { }

  // small public surface for embedding / automation
  window.UnoApp = {
    state: state, themes: T.list,
    renderAll: renderAll, richHtml: richHtml, standaloneHtml: standaloneHtml,
    importThemeFile: importThemeFile, getThemes: getThemes
  };
})();
