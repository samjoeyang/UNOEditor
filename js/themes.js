/* UNOEditor — theme catalogue (metadata only; see theme-styles.js for CSS) */
(function (global) {
  'use strict';
  var THEMES = [
    {
      id: 'wechat', accent: '#576b95', bg: '#eef0f3',
      swatch: ['#576b95', '#333333', '#f0f2f5', '#ffffff'],
      sample: 'Aa', sampleFont: '-apple-system, "PingFang SC", sans-serif',
      defaults: { size: 16, leading: 1.8 },
      zh: { name: '默认公众号风格', desc: '居中标题、蓝色链接、柔和留白。最稳妥的日常款。', tags: ['日常推送', '企业动态'], font: '系统无衬线', size: '16 / 19 / 22 / 26', rule: '居中标题 · 蓝色竖线小节' },
      en: { name: 'WeChat Classic', desc: 'Centered headings, blue links, gentle spacing. The safe everyday choice.', tags: ['Newsletters', 'Company updates'], font: 'System sans', size: '16 / 19 / 22 / 26', rule: 'Centered title · blue section bar' }
    },
    {
      id: 'economist', accent: '#e3120b', bg: '#ece9e4',
      swatch: ['#e3120b', '#161616', '#ffffff', '#d8d3cb'],
      sample: 'Ea', sampleFont: 'Georgia, "Songti SC", serif',
      defaults: { size: 16, leading: 1.72 },
      zh: { name: '红黑社论', desc: '红黑双线、衬线大写标题、两端对齐。观点类内容的气场。', tags: ['深度评论', '行业分析'], font: 'Georgia / 宋体', size: '16 / 18 / 22 / 30', rule: '红黑双线 · 全大写字距' },
      en: { name: 'Editorial Red', desc: 'Red/black rules, serif caps, justified text. Built for strong opinions.', tags: ['Opinion', 'Analysis'], font: 'Georgia / Songti', size: '16 / 18 / 22 / 30', rule: 'Double rule · tracked caps' }
    },
    {
      id: 'nyt', accent: '#121212', bg: '#e9e8e5',
      swatch: ['#121212', '#4a4a4a', '#ffffff', '#cfcdc8'],
      sample: 'Ny', sampleFont: 'Georgia, "Times New Roman", serif',
      defaults: { size: 17, leading: 1.85 },
      zh: { name: '墨白长文', desc: '黑白、衬线、居中大标题与极细分隔线。叙事型长文。', tags: ['人物特写', '长篇叙事'], font: 'Georgia / Times', size: '17 / 19 / 22 / 32', rule: '居中大标题 · 斜体引语' },
      en: { name: 'Ink & Paper', desc: 'Black & white serif, centered display title, hairline rules. For long-form stories.', tags: ['Features', 'Long reads'], font: 'Georgia / Times', size: '17 / 19 / 22 / 32', rule: 'Centered display · italic pull-quote' }
    },
    {
      id: 'swiss', accent: '#e2231a', bg: '#ededea',
      swatch: ['#111111', '#e2231a', '#ffffff', '#d9d9d6'],
      sample: 'Aa', sampleFont: '"Helvetica Neue", Arial, sans-serif',
      defaults: { size: 15, leading: 1.7 }, featured: true,
      zh: { name: '瑞士国际主义', desc: '严格左对齐网格、字号一级差四号、只用细线与一点红。专业而不花哨。', tags: ['产品介绍', '行业观察'], font: 'Helvetica / 无衬线', size: '15 / 16 / 20 / 28', rule: '左对齐网格 · 线优于色块' },
      en: { name: 'Swiss International', desc: 'Strict left grid, one step per heading level, hairlines plus a single red. Professional, never loud.', tags: ['Product', 'Industry notes'], font: 'Helvetica / Sans', size: '15 / 16 / 20 / 28', rule: 'Left grid · lines over blocks' }
    },
    {
      id: 'morandi', accent: '#a8897e', bg: '#eeeae6',
      swatch: ['#a8897e', '#5c5a57', '#faf7f4', '#e6ded8'],
      sample: 'Mo', sampleFont: '"PingFang SC", "Helvetica Neue", sans-serif',
      defaults: { size: 16, leading: 1.9 },
      zh: { name: '莫兰迪编辑', desc: '低饱和雾色、圆角卡片、轻字重大留白。温和的生活方式内容。', tags: ['生活方式', '美学好物'], font: '苹方 / 无衬线', size: '16 / 18 / 22 / 28', rule: '雾色卡片 · 大留白' },
      en: { name: 'Morandi', desc: 'Muted tones, rounded cards, light weights and generous air. Lifestyle & aesthetics.', tags: ['Lifestyle', 'Design goods'], font: 'PingFang / Sans', size: '16 / 18 / 22 / 28', rule: 'Muted cards · generous air' }
    },
    {
      id: 'hara', accent: '#8c867c', bg: '#efede8',
      swatch: ['#2b2b2b', '#8c867c', '#fffdf9', '#e8e6e2'],
      sample: '空', sampleFont: '"Songti SC", "Hiragino Mincho ProN", serif',
      defaults: { size: 14, leading: 2.2 },
      zh: { name: '留白', desc: '极小字号、极大行距与段距，近乎无装饰。让空白成为内容。', tags: ['随笔', '品牌叙事'], font: '宋体 / 明朝体', size: '14 / 16 / 18 / 21', rule: '余白优先 · 近乎无装饰' },
      en: { name: 'Whitespace', desc: 'Small type, huge leading, almost no ornament. Negative space is the content.', tags: ['Essays', 'Brand stories'], font: 'Songti / Mincho', size: '14 / 16 / 18 / 21', rule: 'Space first · near-zero ornament' }
    },
    {
      id: 'apple', accent: '#0071e3', bg: '#eceef1',
      swatch: ['#1d1d1f', '#0071e3', '#ffffff', '#f5f5f7'],
      sample: 'Aa', sampleFont: '-apple-system, "SF Pro Display", sans-serif',
      defaults: { size: 17, leading: 1.75 },
      zh: { name: '净灰', desc: '大号紧字距标题、克制的灰度层次、圆角灰底卡片。发布稿观感。', tags: ['产品发布', '科技评测'], font: 'SF Pro / 苹方', size: '17 / 20 / 25 / 40', rule: '紧字距大标题 · 灰底卡片' },
      en: { name: 'Clean Grey', desc: 'Tight oversized display type, restrained greys, rounded grey cards. Launch-note feel.', tags: ['Launches', 'Tech reviews'], font: 'SF Pro / PingFang', size: '17 / 20 / 25 / 40', rule: 'Tight display · grey cards' }
    },
    {
      id: 'nocturne', accent: '#e8b96a', bg: '#26282d', dark: true,
      swatch: ['#e8b96a', '#d8dade', '#16181d', '#2c2f36'],
      sample: '夜', sampleFont: 'Georgia, "Songti SC", serif',
      defaults: { size: 16, leading: 1.9 },
      zh: { name: '深夜电台', desc: '深色底、琥珀色重点、衬线标题。适合夜间阅读与专栏。', tags: ['夜读', '专栏连载'], font: 'Georgia / 宋体', size: '16 / 18 / 22 / 30', rule: '暗色底 · 琥珀色点缀' },
      en: { name: 'Nocturne', desc: 'Dark ground, amber accents, serif headings. Made for late-night reading.', tags: ['Night reads', 'Columns'], font: 'Georgia / Songti', size: '16 / 18 / 22 / 30', rule: 'Dark ground · amber accents' }
    },
    {
      id: 'gfm', accent: '#0969da', bg: '#eef1f4',
      swatch: ['#0969da', '#1f2328', '#ffffff', '#d0d7de'],
      sample: 'Gh', sampleFont: '-apple-system, "PingFang SC", sans-serif',
      defaults: { size: 16, leading: 1.6 },
      zh: { name: '系统灰', desc: '系统字体、中性灰、发丝级分隔线与代码芯片。GitHub 式 README 渲染观感。', tags: ['技术文档', '代码风格'], font: '系统无衬线', size: '16 / 20 / 24 / 32', rule: '发丝线 · 代码芯片' },
      en: { name: 'System Grey', desc: 'System font, neutral greys, hairline rules and code chips. The GFM README look.', tags: ['Docs', 'Code style'], font: 'System sans', size: '16 / 20 / 24 / 32', rule: 'Hairline · code chips' }
    },
    {
      id: 'obsidian', accent: '#8b88e3', bg: '#1b1b1f', dark: true,
      swatch: ['#8b88e3', '#e6e6e6', '#1b1b1f', '#33333a'],
      sample: 'Ob', sampleFont: '-apple-system, "PingFang SC", sans-serif',
      defaults: { size: 16, leading: 1.7 },
      zh: { name: '暗色笔记', desc: '深色画布、暖白正文、紫色点缀。知识库式的安静暗色界面。', tags: ['知识管理', '夜读'], font: '系统无衬线', size: '16 / 20 / 24 / 32', rule: '深色底 · 紫调点缀' },
      en: { name: 'Dark Notes', desc: 'Dark canvas, warm-white text, violet accents. The quiet knowledge-base dark UI.', tags: ['Knowledge', 'Night reads'], font: 'System sans', size: '16 / 20 / 24 / 32', rule: 'Dark ground · violet accent' }
    },
    {
      id: 'typora', accent: '#3a6ea5', bg: '#ffffff',
      swatch: ['#3a6ea5', '#1f1f1f', '#ffffff', '#e8e8e8'],
      sample: 'Ty', sampleFont: '-apple-system, "PingFang SC", Georgia, serif',
      defaults: { size: 16, leading: 1.95 },
      zh: { name: '纯净书写', desc: '大行距、克制留白、几乎无装饰。沉浸式的纯净写作界面。', tags: ['随笔', '长文'], font: '系统无衬线', size: '16 / 20 / 26 / 34', rule: '大行距 · 极简' },
      en: { name: 'Pure Writing', desc: 'Large leading, restrained spacing, almost no ornament. An immersive, distraction-free writing surface.', tags: ['Essays', 'Long reads'], font: 'System sans', size: '16 / 20 / 26 / 34', rule: 'Big leading · minimal' }
    }
  ];

  function byId(id) { for (var i = 0; i < THEMES.length; i++) if (THEMES[i].id === id) return THEMES[i]; return THEMES[0]; }
  function loc(theme, lang) { return theme[lang] || theme.zh; }
  global.UnoThemes = { list: THEMES, byId: byId, loc: loc };
})(window);
