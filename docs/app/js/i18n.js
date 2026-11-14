/* Uno MD — UI dictionary */
(function (global) {
  'use strict';
  var DICT = {
    zh: {
      tagline: '排版主题编辑器', toggleSidebar: '展开 / 收起大纲', untitled: '未命名文档',
      saved: '已保存', saving: '保存中…', switchLang: 'Switch to English', export: '导出',
      copyWechat: '复制到公众号', copyWechatHint: '内联样式，粘贴即所见',
      downloadHtml: '下载 HTML', downloadHtmlHint: '独立文件，样式内嵌',
      downloadMd: '下载 Markdown', downloadMdHint: '纯文本源文件',
      printPdf: '打印 / 存为 PDF', printPdfHint: '按当前主题输出',
      themeGroup: '排版主题', docs: '文档', newDoc: '新建文档', deleteDoc: '删除文档',
      loadSample: '载入示例文档', sampleLoaded: '示例文档已载入',
      h1: '一级标题', h2: '二级标题', h3: '三级标题', bold: '粗体 ⌘B', italic: '斜体 ⌘I',
      strike: '删除线', link: '链接 ⌘K', quote: '引用', ul: '无序列表', ol: '有序列表',
      task: '任务列表', inlineCode: '行内代码', codeblock: '代码块', table: '表格',
      image: '图片', hr: '分隔线',
      editorPlaceholder: '在这里写 Markdown…',
      editorHint: 'Markdown 实时渲染 · ⌘B 粗体 · ⌘I 斜体 · ⌘K 链接 · ⌘S 保存',
      mobileView: '手机预览', webView: '网页预览', tweak: '微调',
      fontSize: '字号', lineHeight: '行高', accent: '强调色', reset: '重置',
      previewFoot: '— 预览结束 —', suitableFor: '适合', chars: '字', minRead: '分钟阅读',
      confirmDelete: '确定删除这篇文档？', docCreated: '已新建文档', docDeleted: '文档已删除',
      copied: '富文本已复制，去公众号粘贴即可', copyFail: '复制失败，请检查剪贴板权限',
      htmlSaved: 'HTML 已下载', mdSaved: 'Markdown 已下载', resetDone: '已恢复主题默认值',
      wordsUnit: '字', line: '行', col: '列', previewLabel: '公众号预览',
      themeSwitched: '主题已切换', savingLocal: '自动保存到本机',
      specs: '排版规格', specFont: '字体', specSize: '字号阶梯', specRule: '规则',
      untitledDoc: '未命名文档',
      tabEdit: '编辑', tabPreview: '预览', tabTheme: '主题', tabOutline: '大纲', themesAndDocs: '主题与文档', close: '关闭',
      outline: '大纲', outlineEmpty: '暂无标题，用 # 开头写标题即可生成大纲', openTheme: '选择排版主题', openDocs: '文档列表',
      importTheme: '导入主题', importFormat: '支持 .json / .css，GitHub / Typora / Obsidian 主题文件可自动适配',
      importError: '主题文件无法识别，请检查格式', importSuccess: '已导入主题：',
      customBadge: '自定义', deleteTheme: '删除主题', themeRemoved: '主题已删除',
      about: '关于 / 帮助', versionLabel: '当前版本', envLabel: '运行环境',
      envWeb: '网页版', envDesktop: '桌面版 (Tauri)', checkUpdate: '检查更新',
      checkingUpdate: '正在检查更新…', upToDate: '已是最新版本', updateAvailable: '发现新版本',
      currentVersion: '当前', newVersion: '最新', releaseNotes: '更新说明',
      downloadUpdate: '前往下载', retry: '重试', checkFailed: '检查失败，请检查网络后重试',
      rateLimit: 'GitHub 接口限流，请稍后再试', noRelease: '暂未发布正式版本（当前为开发构建）',
      checkHint: '点击下方按钮，检查是否有新版本可用', updateToast: '发现新版本', github: 'GitHub 仓库'
    },
    en: {
      tagline: 'Themed Markdown Editor', toggleSidebar: 'Show / hide outline', untitled: 'Untitled',
      saved: 'Saved', saving: 'Saving…', switchLang: '切换为中文', export: 'Export',
      copyWechat: 'Copy for WeChat', copyWechatHint: 'Inline styles, paste as-is',
      downloadHtml: 'Download HTML', downloadHtmlHint: 'Standalone file, embedded CSS',
      downloadMd: 'Download Markdown', downloadMdHint: 'Plain text source',
      printPdf: 'Print / Save as PDF', printPdfHint: 'Uses the active theme',
      themeGroup: 'Themes', docs: 'Documents', newDoc: 'New document', deleteDoc: 'Delete document',
      loadSample: 'Load sample', sampleLoaded: 'Sample loaded',
      h1: 'Heading 1', h2: 'Heading 2', h3: 'Heading 3', bold: 'Bold ⌘B', italic: 'Italic ⌘I',
      strike: 'Strikethrough', link: 'Link ⌘K', quote: 'Quote', ul: 'Bullet list', ol: 'Numbered list',
      task: 'Task list', inlineCode: 'Inline code', codeblock: 'Code block', table: 'Table',
      image: 'Image', hr: 'Divider',
      editorPlaceholder: 'Write Markdown here…',
      editorHint: 'Live Markdown · ⌘B bold · ⌘I italic · ⌘K link · ⌘S save',
      mobileView: 'Mobile preview', webView: 'Web preview', tweak: 'Fine-tune',
      fontSize: 'Type scale', lineHeight: 'Leading', accent: 'Accent', reset: 'Reset',
      previewFoot: '— End of preview —', suitableFor: 'Good for', chars: 'chars', minRead: 'min read',
      confirmDelete: 'Delete this document?', docCreated: 'Document created', docDeleted: 'Document deleted',
      copied: 'Rich text copied — paste into WeChat', copyFail: 'Copy failed — check clipboard permission',
      htmlSaved: 'HTML downloaded', mdSaved: 'Markdown downloaded', resetDone: 'Theme defaults restored',
      wordsUnit: 'chars', line: 'Ln', col: 'Col', previewLabel: 'WeChat preview',
      themeSwitched: 'Theme switched', savingLocal: 'Auto-saved locally',
      specs: 'Type spec', specFont: 'Typeface', specSize: 'Scale', specRule: 'Rule',
      untitledDoc: 'Untitled',
      tabEdit: 'Edit', tabPreview: 'Preview', tabTheme: 'Theme', tabOutline: 'Outline', themesAndDocs: 'Themes & Docs', close: 'Close',
      outline: 'Outline', outlineEmpty: 'No headings yet — start a line with # to build an outline', openTheme: 'Choose a theme', openDocs: 'Documents',
      importTheme: 'Import theme', importFormat: 'Accepts .json / .css — GitHub / Typora / Obsidian files auto-adapt',
      importError: 'Unrecognized theme file — check the format', importSuccess: 'Theme imported: ',
      customBadge: 'Custom', deleteTheme: 'Delete theme', themeRemoved: 'Theme deleted',
      about: 'About / Help', versionLabel: 'Current version', envLabel: 'Environment',
      envWeb: 'Web', envDesktop: 'Desktop (Tauri)', checkUpdate: 'Check for Updates',
      checkingUpdate: 'Checking for updates…', upToDate: 'You are up to date', updateAvailable: 'A new version is available',
      currentVersion: 'Current', newVersion: 'Latest', releaseNotes: 'Release notes',
      downloadUpdate: 'Download', retry: 'Retry', checkFailed: 'Check failed — check your connection and retry',
      rateLimit: 'GitHub API rate limited — try again later', noRelease: 'No stable release published yet (development build)',
      checkHint: 'Click below to check for a newer version', updateToast: 'New version available', github: 'GitHub repository'
    }
  };
  var lang = 'zh';
  function t(k) { return (DICT[lang] && DICT[lang][k]) || (DICT.zh[k]) || k; }
  function set(l) { if (DICT[l]) { lang = l; document.documentElement.lang = (l === 'zh' ? 'zh-CN' : 'en'); } }
  function get() { return lang; }
  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) { el.placeholder = t(el.dataset.i18nPlaceholder); });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) { el.title = t(el.dataset.i18nTitle); });
  }
  global.UnoI18n = { t: t, set: set, get: get, apply: apply };
})(window);
