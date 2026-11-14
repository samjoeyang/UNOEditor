/* UNOEditor 官网交互
   1) 中英切换（纯 CSS 显隐 + 少量 JS 属性同步）
   2) 11 套主题实时演示（直接复用应用同一份 themes.js / theme-styles.js）
   3) 截图画廊
   4) GitHub Releases 动态下载 + 系统推荐 + 无发布时优雅降级
   5) 移动端导航、FAQ 手风琴、复制命令、滚动高亮 */
(function () {
  'use strict';

  var REPO = 'samjoeyang/UNOEditor';
  var API = 'https://api.github.com/repos/' + REPO + '/releases/latest';
  var LANG_KEY = 'uno-site-lang';
  var UnoThemes = window.UnoThemes;
  var lang = 'zh';
  var themeId = 'wechat';
  var shotIndex = 0;
  var dlStatus = null;

  var TEXT = {
    zh: {
      title: 'UNOEditor · 排版主题编辑器 — 写完，就已经排好版',
      desc: 'UNOEditor 是零依赖、本地优先的 Markdown 排版主题编辑器：左侧写稿、右侧实时预览，内置 11 套排版主题，一键复制到公众号、导出 HTML / Markdown / PDF。',
      langTitle: 'Switch to English',
      copied: '已复制到剪贴板',
      copyFail: '复制失败，请手动选择文本',
      dlChecking: '正在检查 GitHub Releases…',
      dlNone: 'UNOEditor v0.1.0 · 截至 2026-11-14 尚未发布预编译安装包 · 可直接在线试用或查看源码',
      dlError: '暂时无法连接 GitHub Releases，可稍后重试或直接前往 Releases 查看',
      dlReady: '最新版本 <b>v{ver}</b> · 发布于 {date} · 已为你的系统推荐 ↓'
    },
    en: {
      title: 'UNOEditor — Markdown Theme Editor | Write once, publish beautifully',
      desc: 'UNOEditor is a local-first, zero-dependency Markdown theme editor with 11 typesetting themes, live preview, WeChat-ready rich-text copy and HTML / Markdown / PDF export.',
      langTitle: '切换为中文',
      copied: 'Copied to clipboard',
      copyFail: 'Copy failed — select the text manually',
      dlChecking: 'Checking GitHub Releases…',
      dlNone: 'UNOEditor v0.1.0 · No prebuilt installer published as of 2026-11-14 · Try online or browse the source',
      dlError: "Couldn't reach GitHub Releases — retry later or open Releases directly",
      dlReady: 'Latest <b>v{ver}</b> · published {date} · recommended for your system ↓'
    }
  };

  var SHOTS = [
    { file: 'overview.png', zh: '三栏总览', en: 'Workspace',
      capZh: '三栏工作区：大纲、Markdown 编辑器与实时排版预览。', capEn: 'Three-pane workspace: outline, Markdown editor and live typeset preview.',
      altZh: 'UNOEditor 三栏工作区', altEn: 'UNOEditor three-pane workspace' },
    { file: 'themes.png', zh: '主题抽屉', en: 'Theme drawer',
      capZh: '右侧主题抽屉：11 套内置主题，点选即换，支持导入自定义主题文件。', capEn: 'Theme drawer: 11 built-in themes, one click to switch, plus custom theme import.',
      altZh: 'UNOEditor 主题抽屉', altEn: 'UNOEditor theme drawer' },
    { file: 'theme-swiss.png', zh: '瑞士国际主义', en: 'Swiss grid',
      capZh: '「瑞士国际主义」主题：严格左对齐网格、细线与一点红。', capEn: 'Swiss International theme: strict left grid, hairlines and a single red.',
      altZh: '瑞士国际主义主题预览', altEn: 'Swiss International theme preview' },
    { file: 'theme-nocturne.png', zh: '深夜电台', en: 'Nocturne',
      capZh: '「深夜电台」主题：深色底、琥珀色重点与衬线标题。', capEn: 'Nocturne theme: dark ground, amber accents, serif headings.',
      altZh: '深夜电台主题预览', altEn: 'Nocturne theme preview' },
    { file: 'theme-morandi.png', zh: '莫兰迪编辑', en: 'Morandi',
      capZh: '「莫兰迪编辑」主题：低饱和雾色、圆角卡片与温和留白。', capEn: 'Morandi theme: muted tones, rounded cards, gentle white space.',
      altZh: '莫兰迪编辑主题预览', altEn: 'Morandi theme preview' },
    { file: 'export.png', zh: '导出菜单', en: 'Export menu',
      capZh: '导出菜单：复制到公众号、下载 HTML / Markdown、打印或存为 PDF。', capEn: 'Export menu: WeChat copy, HTML / Markdown download, print or save as PDF.',
      altZh: 'UNOEditor 导出菜单', altEn: 'UNOEditor export menu' },
    { file: 'english.png', zh: '英文界面', en: 'English UI',
      capZh: '一键切换英文界面，主题名称与说明同样提供中英双语。', capEn: 'One-click English UI; theme names and descriptions are bilingual too.',
      altZh: 'UNOEditor 英文界面', altEn: 'UNOEditor English interface' },
    { file: 'mobile.png', zh: '手机端', en: 'Mobile', portrait: true,
      capZh: '窄屏自动变为编辑 / 预览 / 大纲三个底部标签，主题走抽屉。', capEn: 'On narrow screens: edit / preview / outline tabs and a theme drawer.',
      altZh: 'UNOEditor 手机端预览', altEn: 'UNOEditor mobile preview' }
  ];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function $(id) { return document.getElementById(id); }
  function $$ (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function t(key) { return (TEXT[lang] || TEXT.zh)[key]; }
  function loc(theme) { return UnoThemes ? UnoThemes.loc(theme, lang) : (theme[lang] || theme.zh); }

  /* ---------------- i18n ---------------- */
  function initialLang() {
    var m = new URLSearchParams(location.search).get('lang');
    if (m === 'en' || m === 'zh') return m;
    try { return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'zh'; } catch (e) { return 'zh'; }
  }

  function syncUrl() {
    try {
      var p = new URLSearchParams(location.search);
      p.set('lang', lang);
      if (themeId !== 'wechat') p.set('theme', themeId); else p.delete('theme');
      history.replaceState(null, '', location.pathname + '?' + p.toString() + location.hash);
    } catch (e) { /* file:// 下部分浏览器禁用 replaceState，忽略 */ }
  }

  function setLang(next, skipUrl) {
    lang = next === 'en' ? 'en' : 'zh';
    document.body.setAttribute('data-ui-lang', lang);
    document.documentElement.setAttribute('lang', lang === 'en' ? 'en' : 'zh-CN');
    document.title = t('title');
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', t('desc'));
    $('langLabel').textContent = lang === 'zh' ? 'EN' : '中';
    $('langBtn').title = t('langTitle');

    $$('.try-link').forEach(function (a) { a.setAttribute('href', 'app/index.html?lang=' + lang); });

    // 动态生成、无法用 CSS 切换的文本
    if (UnoThemes) $('themeBadge').textContent = loc(UnoThemes.byId(themeId)).name;
    if (shotIndex >= 0) $('shotImage').alt = lang === 'en' ? SHOTS[shotIndex].altEn : SHOTS[shotIndex].altZh;
    if (dlStatus) renderDlStatus();

    $$('img[data-alt-en]').forEach(function (img) {
      if (lang === 'en') img.alt = img.getAttribute('data-alt-en');
      else if (img.getAttribute('data-alt-zh')) img.alt = img.getAttribute('data-alt-zh');
    });

    try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
    if (!skipUrl) syncUrl();
  }

  /* ---------------- 主题实时演示 ---------------- */
  function buildThemePicker() {
    var box = $('themePicker');
    if (!box || !UnoThemes) return;
    UnoThemes.list.forEach(function (theme) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-chip';
      btn.setAttribute('role', 'tab');
      btn.dataset.theme = theme.id;

      var sw = document.createElement('span');
      sw.className = 'chip-sw';
      sw.style.background = theme.bg || '#fff';
      sw.style.color = theme.accent || '#222';
      sw.style.fontFamily = theme.sampleFont || 'inherit';
      sw.textContent = theme.sample || 'Aa';

      var name = document.createElement('span');
      name.className = 'chip-name';
      name.innerHTML = '<span lang="zh-CN" data-lang="zh">' + esc(theme.zh.name) + '</span><span lang="en" data-lang="en">' + esc(theme.en.name) + '</span>';

      var dots = document.createElement('span');
      dots.className = 'chip-dots';
      (theme.swatch || []).forEach(function (color) {
        var i = document.createElement('i');
        i.style.background = color;
        dots.appendChild(i);
      });

      btn.appendChild(sw);
      btn.appendChild(name);
      btn.appendChild(dots);
      btn.addEventListener('click', function () { applyTheme(theme.id, true); });
      box.appendChild(btn);
    });
  }

  function applyTheme(id, fromClick) {
    if (!UnoThemes || !$('livePreview')) return;
    var meta = UnoThemes.byId(id);
    themeId = meta.id;
    $('livePreview').setAttribute('data-theme', themeId);
    $('themeBadge').textContent = loc(meta).name;
    $$('.theme-chip').forEach(function (btn) {
      var on = btn.dataset.theme === themeId;
      btn.classList.toggle('active', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    if (fromClick) syncUrl();
  }

  /* ---------------- 截图画廊 ---------------- */
  function buildShotTabs() {
    var box = $('shotTabs');
    if (!box) return;
    SHOTS.forEach(function (s, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'shot-tab';
      b.setAttribute('role', 'tab');
      b.innerHTML = '<span lang="zh-CN" data-lang="zh">' + esc(s.zh) + '</span><span lang="en" data-lang="en">' + esc(s.en) + '</span>';
      b.addEventListener('click', function () { setShot(i); });
      box.appendChild(b);
    });
  }

  function setShot(i) {
    var s = SHOTS[i];
    if (!s) return;
    shotIndex = i;
    var img = $('shotImage');
    img.src = 'assets/shots/' + s.file;
    img.alt = lang === 'en' ? s.altEn : s.altZh;
    img.classList.toggle('is-portrait', !!s.portrait);
    $('shotCaption').innerHTML = '<span lang="zh-CN" data-lang="zh">' + esc(s.capZh) + '</span><span lang="en" data-lang="en">' + esc(s.capEn) + '</span>';
    $$('.shot-tab').forEach(function (b, n) {
      b.classList.toggle('active', n === i);
      b.setAttribute('aria-selected', n === i ? 'true' : 'false');
    });
  }

  /* ---------------- 下载区 ---------------- */
  function renderDlStatus() {
    if (!dlStatus) return;
    $('dlStatus').innerHTML = '<span lang="zh-CN" data-lang="zh">' + dlStatus.zh + '</span><span lang="en" data-lang="en">' + dlStatus.en + '</span>';
  }
  function setDlStatus(zh, en) {
    dlStatus = { zh: zh, en: en };
    renderDlStatus();
  }

  function classify(name) {
    var n = String(name).toLowerCase();
    if (/\.(msi|exe)$/.test(n)) return 'windows';
    if (/\.(appimage|deb|rpm)$/.test(n)) return 'linux';
    if (/\.dmg$/.test(n) || /\.app\.tar\.gz$/.test(n) || (/darwin/.test(n) && /\.zip$/.test(n))) {
      return /aarch64|arm64|apple/.test(n) ? 'macos-arm' : 'macos-intel';
    }
    return null;
  }
  function fmtSize(bytes) {
    if (!bytes) return '';
    return bytes < 1048576 ? (bytes / 1024).toFixed(0) + ' KB' : (bytes / 1048576).toFixed(1) + ' MB';
  }
  function detectPlatform() {
    var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    var ua = navigator.userAgent || '';
    if (/Mac|iPhone|iPad/i.test(p) || /Macintosh/i.test(ua)) return 'macos-arm';
    if (/Win/i.test(p) || /Windows/i.test(ua)) return 'windows';
    if (/Linux|Android/i.test(p) || /Linux/i.test(ua)) return 'linux';
    return null;
  }
  function recommend(plat) {
    if (!plat) return;
    $$('.dl-card').forEach(function (c) { c.classList.toggle('is-recommended', c.dataset.plat === plat); });
    try {
      var uad = navigator.userAgentData;
      if (uad && uad.getHighEntropyValues && plat === 'macos-arm') {
        uad.getHighEntropyValues(['architecture']).then(function (v) {
          if (v.architecture === 'x86') {
            $$('.dl-card').forEach(function (c) { c.classList.toggle('is-recommended', c.dataset.plat === 'macos-intel'); });
          }
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function showNoRelease(isError) {
    $('dlGrid').hidden = true;
    $('dlEmpty').hidden = false;
    if (isError) setDlStatus(TEXT.zh.dlError, TEXT.en.dlError);
    else setDlStatus(TEXT.zh.dlNone, TEXT.en.dlNone);
  }

  function assetPriority(name) {
    var n = String(name).toLowerCase();
    if (/\.(dmg|msi|exe|appimage|deb)$/.test(n)) return 0;
    if (/\.rpm$/.test(n)) return 1;
    return 2; // .app.tar.gz / zip 等更新包，排在安装包之后
  }

  function renderRelease(rel) {
    var assets = (rel && rel.assets) || [];
    var used = {};
    var found = 0;
    $$('.dl-card').forEach(function (card) {
      var plat = card.dataset.plat;
      var matches = assets.filter(function (a) { return !used[a.name] && classify(a.name) === plat; });
      matches.sort(function (a, b) { return assetPriority(a.name) - assetPriority(b.name); });
      var asset = matches[0];
      if (!asset) return;
      used[asset.name] = true;
      found++;
      var ext = (asset.name.match(/\.(dmg|msi|exe|AppImage|deb|rpm|zip)$/i) || ['.' + 'file'])[0];
      var size = fmtSize(asset.size);
      var btn = card.querySelector('[data-role="dl"]');
      btn.href = asset.browser_download_url;
      btn.target = '_blank';
      btn.rel = 'noopener';
      btn.classList.remove('is-disabled');
      btn.innerHTML = '<span lang="zh-CN" data-lang="zh">下载 ' + esc(ext) + (size ? ' · ' + size : '') + '</span>' +
                      '<span lang="en" data-lang="en">Download ' + esc(ext) + (size ? ' · ' + size : '') + '</span>';
    });

    if (!found) { showNoRelease(false); return; }
    $('dlEmpty').hidden = true;
    $('dlGrid').hidden = false;
    var ver = String(rel.tag_name || rel.name || '').replace(/^v/, '');
    var date = String(rel.published_at || '').slice(0, 10);
    var zh = TEXT.zh.dlReady.replace('{ver}', esc(ver)).replace('{date}', esc(date));
    var en = TEXT.en.dlReady.replace('{ver}', esc(ver)).replace('{date}', esc(date));
    setDlStatus(zh, en);
    recommend(detectPlatform());
  }

  function initDownload() {
    setDlStatus(TEXT.zh.dlChecking, TEXT.en.dlChecking);
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, 8000);
    var opts = { headers: { Accept: 'application/vnd.github+json' } };
    if (ctrl) opts.signal = ctrl.signal;
    fetch(API, opts)
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (rel) { clearTimeout(timer); rel ? renderRelease(rel) : showNoRelease(false); })
      .catch(function () { clearTimeout(timer); showNoRelease(true); });
  }

  /* ---------------- 其它交互 ---------------- */
  function toast(msg) {
    var el = $('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  }
  function bindCopy() {
    ['copyLocal', 'copyBuild'].forEach(function (id) {
      var btn = $(id);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var pre = btn.parentElement.querySelector('pre');
        var text = pre ? pre.innerText : '';
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () { toast(t('copied')); }).catch(function () { toast(t('copyFail')); });
        } else { toast(t('copyFail')); }
      });
    });
  }
  function bindNav() {
    var toggle = $('navToggle'), mobile = $('navMobile');
    if (toggle && mobile) {
      toggle.addEventListener('click', function () {
        var open = mobile.classList.toggle('open');
        toggle.classList.toggle('open', open);
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      $$('a', mobile).forEach(function (a) {
        a.addEventListener('click', function () {
          mobile.classList.remove('open');
          toggle.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
    if ('IntersectionObserver' in window) {
      var links = $$('.navlinks a');
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-25% 0px -65% 0px' });
      $$('main section[id]').forEach(function (s) { obs.observe(s); });
    }
  }
  function bindFaq() {
    // 用同步的 click 而非异步的 toggle 事件关闭其它项，避免点击后立即读取状态不同步
    $$('.faq-item').forEach(function (item) {
      var summary = item.querySelector('summary');
      if (!summary) return;
      summary.addEventListener('click', function () {
        if (item.open) return;
        $$('.faq-item').forEach(function (other) { if (other !== item) other.open = false; });
      });
    });
  }

  /* ---------------- 启动 ---------------- */
  function init() {
    var yr = $('year');
    if (yr) yr.textContent = new Date().getFullYear();

    // 先记住原始中文 alt，供语言切回时使用（必须早于 setLang）
    $$('img[data-alt-en]').forEach(function (img) { img.setAttribute('data-alt-zh', img.getAttribute('alt') || ''); });

    lang = initialLang();
    setLang(lang, true);

    buildThemePicker();
    var params = new URLSearchParams(location.search);
    var wanted = params.get('theme');
    if (wanted && UnoThemes && UnoThemes.byId(wanted).id === wanted) applyTheme(wanted);
    else applyTheme('wechat');

    buildShotTabs();
    setShot(0);

    bindCopy();
    bindNav();
    bindFaq();
    initDownload();

    $('langBtn').addEventListener('click', function () { setLang(lang === 'zh' ? 'en' : 'zh'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
