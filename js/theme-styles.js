/* UNOEditor — theme stylesheet. Kept as a string so it can be injected live AND
   embedded into exported standalone HTML without any network request. */
(function (global) {
  'use strict';
  var CSS = `
.md-body{
  --font-body: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", sans-serif;
  --font-heading: var(--font-body);
  --font-mono: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  --c-surface:#ffffff; --c-text:#333333; --c-heading:#111111; --c-muted:#888888;
  --c-accent:#576b95; --c-line:#e5e5e5; --c-quote-bg:#f7f8fa; --c-code-bg:#f4f5f7;
  --c-table-head:#fafafa; --c-code-text:inherit;
  --fs-body:16px; --lh-body:1.8; --ls-body:0; --ls-head:0;
  --fs-h1:26px; --fs-h2:21px; --fs-h3:18px; --fs-h4:16px;
  --fw-h1:700; --fw-h2:700; --fw-h3:700;
  --space-p:1em; --space-h:2em 0 .8em; --radius:4px; --head-align:left;
  font-family:var(--font-body); font-size:var(--fs-body); line-height:var(--lh-body);
  letter-spacing:var(--ls-body); color:var(--c-text); background:var(--c-surface);
  word-wrap:break-word; overflow-wrap:break-word; text-align:left;
  -webkit-font-smoothing:antialiased;
}
.md-body *{box-sizing:border-box}
.md-body > :first-child{margin-top:0}
.md-body > :last-child{margin-bottom:0}
.md-body p{margin:0 0 var(--space-p); text-align:var(--text-align,left)}
.md-body h1,.md-body h2,.md-body h3,.md-body h4,.md-body h5,.md-body h6{
  font-family:var(--font-heading); color:var(--c-heading); text-align:var(--head-align);
  margin:var(--space-h); line-height:1.35; font-weight:var(--fw-h1); letter-spacing:var(--ls-head);
}
.md-body h1{font-size:var(--fs-h1)}
.md-body h2{font-size:var(--fs-h2); font-weight:var(--fw-h2)}
.md-body h3{font-size:var(--fs-h3); font-weight:var(--fw-h3)}
.md-body h4{font-size:var(--fs-h4)}
.md-body h5{font-size:calc(var(--fs-body) * .95)}
.md-body h6{font-size:calc(var(--fs-body) * .9); color:var(--c-muted)}
.md-body a{color:var(--c-accent); text-decoration:underline; text-underline-offset:3px; text-decoration-thickness:1px}
.md-body strong{font-weight:700; color:var(--c-heading)}
.md-body em{font-style:italic}
.md-body del{color:var(--c-muted)}
.md-body mark{background:var(--c-accent); color:var(--c-surface); padding:.05em .25em; border-radius:2px}
.md-body code{font-family:var(--font-mono); font-size:.88em; background:var(--c-code-bg);
  color:var(--c-code-text); padding:.15em .4em; border-radius:3px}
.md-body pre{background:var(--c-code-bg); color:var(--c-code-text); padding:1em 1.2em;
  border-radius:var(--radius); margin:0 0 var(--space-p); overflow-x:auto; line-height:1.65}
.md-body pre code{background:transparent; padding:0; font-size:.9em; border-radius:0}
.md-body .code-lang{display:block; font-family:var(--font-mono); font-size:11px;
  letter-spacing:.09em; text-transform:uppercase; color:var(--c-muted); margin-bottom:.7em}
.md-body blockquote{margin:0 0 var(--space-p); padding:.75em 1em;
  border-left:3px solid var(--c-accent); background:var(--c-quote-bg); color:var(--c-muted);
  border-radius:0 var(--radius) var(--radius) 0}
.md-body blockquote > :first-child{margin-top:0}
.md-body blockquote > :last-child{margin-bottom:0}
.md-body blockquote p{margin:.4em 0}
.md-body ul,.md-body ol{margin:0 0 var(--space-p); padding-left:1.5em; line-height:var(--lh-body)}
.md-body li{margin:.3em 0}
.md-body li > ul,.md-body li > ol{margin:.3em 0 .1em}
.md-body .task-item{list-style:none; margin-left:-1.3em}
.md-body .task-box{display:inline-block; width:1.15em; height:1.15em; line-height:1.1em;
  text-align:center; border:1px solid var(--c-line); border-radius:3px; font-size:.85em;
  color:var(--c-accent); vertical-align:middle; margin-right:.35em}
.md-body hr{border:0; border-top:1px solid var(--c-line); margin:2em 0}
.md-body img{max-width:100%; height:auto; display:block; margin:1.2em auto; border-radius:var(--radius)}
.md-body table{border-collapse:collapse; width:100%; margin:0 0 var(--space-p); font-size:.94em}
.md-body th,.md-body td{border:1px solid var(--c-line); padding:.55em .75em; text-align:left; vertical-align:top}
.md-body th{background:var(--c-table-head); font-weight:600; color:var(--c-heading)}

/* ---------- 01 默认公众号风格 ---------- */
.md-body[data-theme="wechat"]{
  --c-text:#3f3f3f; --c-heading:#1a1a1a; --c-accent:#576b95; --c-line:#e2e6ec;
  --c-quote-bg:#f6f8fb; --c-table-head:#f4f7fb; --c-muted:#7b8290;
  --fs-body:16px; --lh-body:1.8; --space-p:1.1em; --space-h:2.2em 0 .9em;
  --fs-h1:26px; --fs-h2:20px; --fs-h3:18px; --radius:6px; --head-align:center;
}
.md-body[data-theme="wechat"] h1{letter-spacing:.02em; padding-bottom:.5em; border-bottom:1px solid var(--c-line)}
.md-body[data-theme="wechat"] h2{text-align:left; border-left:4px solid var(--c-accent); padding-left:.6em}
.md-body[data-theme="wechat"] h3{text-align:left; color:var(--c-accent)}
.md-body[data-theme="wechat"] blockquote{border-left:3px solid #c3cee0}
.md-body[data-theme="wechat"] hr{border-top:1px dashed #d8dde6}

/* ---------- 02 经济学人风 ---------- */
.md-body[data-theme="economist"]{
  --font-body:Georgia,"Songti SC","SimSun",serif; --font-heading:Georgia,"Songti SC",serif;
  --c-text:#262626; --c-heading:#161616; --c-accent:#e3120b; --c-line:#d8d3cb;
  --c-quote-bg:transparent; --c-table-head:#161616; --c-muted:#5c5c5c;
  --fs-body:16px; --lh-body:1.72; --space-p:.95em; --space-h:2em 0 .7em;
  --fs-h1:30px; --fs-h2:22px; --fs-h3:18px; --radius:0; --text-align:justify;
}
.md-body[data-theme="economist"] h1{border-top:5px solid #e3120b; border-bottom:1px solid #161616;
  padding:.5em 0 .4em; text-transform:uppercase; letter-spacing:.04em}
.md-body[data-theme="economist"] h2{color:#e3120b; font-size:20px; letter-spacing:.03em;
  border-bottom:1px solid #161616; padding-bottom:.35em}
.md-body[data-theme="economist"] h3{font-style:italic}
.md-body[data-theme="economist"] blockquote{font-style:italic; padding:.2em 0 .2em 1em}
.md-body[data-theme="economist"] th{color:#ffffff; border-color:#161616}
.md-body[data-theme="economist"] hr{border-top:3px double #161616}

/* ---------- 03 纽约时报 ---------- */
.md-body[data-theme="nyt"]{
  --font-body:Georgia,"Times New Roman","Songti SC",serif; --font-heading:Georgia,"Songti SC",serif;
  --c-text:#222222; --c-heading:#121212; --c-accent:#121212; --c-line:#cfcdc8;
  --c-quote-bg:transparent; --c-table-head:#f2f1ee; --c-muted:#555555;
  --fs-body:17px; --lh-body:1.85; --space-p:1.05em; --space-h:2.1em 0 .8em;
  --fs-h1:32px; --fs-h2:22px; --fs-h3:19px; --radius:0; --head-align:center;
}
.md-body[data-theme="nyt"] h1{letter-spacing:-.01em; padding-bottom:.45em; border-bottom:1px solid #121212}
.md-body[data-theme="nyt"] h2,.md-body[data-theme="nyt"] h3{text-align:left; font-style:italic}
.md-body[data-theme="nyt"] blockquote{border-left:0; border-top:1px solid #121212;
  border-bottom:1px solid #121212; text-align:center; font-style:italic; font-size:1.1em;
  padding:1.1em 0; color:#3a3a3a}
.md-body[data-theme="nyt"] a{color:#121212}
.md-body[data-theme="nyt"] hr{border-top:1px solid #121212}

/* ---------- 04 瑞士国际主义 ---------- */
.md-body[data-theme="swiss"]{
  --font-body:"Helvetica Neue",Helvetica,Arial,"PingFang SC","Microsoft YaHei",sans-serif;
  --font-heading:"Helvetica Neue",Helvetica,Arial,"PingFang SC",sans-serif;
  --c-surface:#ffffff; --c-text:#2b2b2b; --c-heading:#111111; --c-accent:#e2231a;
  --c-line:#111111; --c-quote-bg:transparent; --c-code-bg:#f4f4f2;
  --c-table-head:#ffffff; --c-muted:#666666;
  --fs-body:15px; --lh-body:1.7; --ls-body:0; --space-p:.9em; --space-h:2em 0 .75em;
  --fs-h1:28px; --fs-h2:20px; --fs-h3:16px; --fs-h4:15px;
  --fw-h1:800; --fw-h2:700; --fw-h3:700; --radius:0; --head-align:left;
}
.md-body[data-theme="swiss"] h1{letter-spacing:-.035em; line-height:1.2;
  border-top:3px solid #111111; padding-top:.55em}
.md-body[data-theme="swiss"] h2{border-top:1px solid #111111; padding-top:.75em}
.md-body[data-theme="swiss"] h3{border-left:2px solid #e2231a; padding-left:.55em}
.md-body[data-theme="swiss"] strong{color:#111111}
.md-body[data-theme="swiss"] blockquote{border-left:2px solid #e2231a; padding:.15em 0 .15em 1em;
  color:#555555; border-radius:0}
.md-body[data-theme="swiss"] hr{border-top:1px solid #111111; margin:2.2em 0}
.md-body[data-theme="swiss"] ul,.md-body[data-theme="swiss"] ol{padding-left:1.25em}
.md-body[data-theme="swiss"] th{border-bottom:2px solid #111111; border-top:0; border-left:0; border-right:0}
.md-body[data-theme="swiss"] td{border-bottom:1px solid #d9d9d6; border-top:0; border-left:0; border-right:0}
.md-body[data-theme="swiss"] pre{border-left:2px solid #111111; border-radius:0}
.md-body[data-theme="swiss"] img{border-radius:0}
.md-body[data-theme="swiss"] mark{border-radius:0}

/* ---------- 05 莫兰迪编辑 ---------- */
.md-body[data-theme="morandi"]{
  --font-body:"PingFang SC","Helvetica Neue",sans-serif;
  --c-surface:#faf7f4; --c-text:#5c5a57; --c-heading:#4a4744; --c-accent:#a8897e;
  --c-line:#e6ded8; --c-quote-bg:#f2ece7; --c-code-bg:#efe9e4;
  --c-table-head:#f0e9e3; --c-muted:#8d8781;
  --fs-body:16px; --lh-body:1.9; --space-p:1.2em; --space-h:2.4em 0 1em;
  --fs-h1:28px; --fs-h2:22px; --fs-h3:18px;
  --fw-h1:600; --fw-h2:600; --fw-h3:600; --radius:12px; --ls-head:.06em;
}
.md-body[data-theme="morandi"] h2{color:#8c7168; border-left:3px solid #c2a79c; padding-left:.7em}
.md-body[data-theme="morandi"] blockquote{border-left:3px solid #c2a79c; padding:1em 1.2em}
.md-body[data-theme="morandi"] hr{border-top:1px dashed #d8cec7}
.md-body[data-theme="morandi"] a{text-decoration:none; border-bottom:1px solid #d8c3ba}

/* ---------- 06 原研哉 · 空 ---------- */
.md-body[data-theme="hara"]{
  --font-body:"Songti SC","Hiragino Mincho ProN",Georgia,serif;
  --font-heading:"Songti SC","Hiragino Mincho ProN",serif;
  --c-surface:#fffdf9; --c-text:#3a3936; --c-heading:#2b2b2b; --c-accent:#8c867c;
  --c-line:#e8e6e2; --c-quote-bg:transparent; --c-code-bg:#f6f4ef;
  --c-table-head:#faf8f3; --c-muted:#8c867c;
  --fs-body:14px; --lh-body:2.2; --ls-body:.08em; --ls-head:.22em;
  --space-p:2.2em; --space-h:3.6em 0 1.6em;
  --fs-h1:21px; --fs-h2:18px; --fs-h3:16px; --fs-h4:14px;
  --fw-h1:400; --fw-h2:400; --fw-h3:400; --radius:0; --head-align:center;
}
.md-body[data-theme="hara"] h1{border:0}
.md-body[data-theme="hara"] h2,.md-body[data-theme="hara"] h3{text-align:center}
.md-body[data-theme="hara"] h3{color:#8c867c}
.md-body[data-theme="hara"] blockquote{border:0; padding-left:2em; font-size:.95em; color:#8c867c}
.md-body[data-theme="hara"] strong{font-weight:600}
.md-body[data-theme="hara"] hr{border-top:1px solid #e8e6e2; width:30%; margin:4em auto}
.md-body[data-theme="hara"] th,.md-body[data-theme="hara"] td{border-color:#e8e6e2}
.md-body[data-theme="hara"] a{color:#6d675e; text-decoration-thickness:.5px}

/* ---------- 07 苹果极简 ---------- */
.md-body[data-theme="apple"]{
  --font-body:-apple-system,BlinkMacSystemFont,"SF Pro Text","PingFang SC",sans-serif;
  --font-heading:-apple-system,BlinkMacSystemFont,"SF Pro Display","PingFang SC",sans-serif;
  --c-surface:#ffffff; --c-text:#1d1d1f; --c-heading:#1d1d1f; --c-accent:#0071e3;
  --c-line:#d2d2d7; --c-quote-bg:#f5f5f7; --c-code-bg:#f5f5f7;
  --c-table-head:#f5f5f7; --c-muted:#6e6e73;
  --fs-body:17px; --lh-body:1.75; --space-p:1.1em; --space-h:2.4em 0 .8em;
  --fs-h1:40px; --fs-h2:25px; --fs-h3:20px; --fw-h1:700; --radius:14px;
}
.md-body[data-theme="apple"] h1{letter-spacing:-.035em; line-height:1.12}
.md-body[data-theme="apple"] h2{letter-spacing:-.02em}
.md-body[data-theme="apple"] a{text-decoration:none}
.md-body[data-theme="apple"] blockquote{border-left:0; padding:1.1em 1.3em}
.md-body[data-theme="apple"] tbody tr:nth-child(even) td{background:#fafafa}

/* ---------- 08 深夜电台 ---------- */
.md-body[data-theme="nocturne"]{
  --font-body:Georgia,"Songti SC",serif; --font-heading:Georgia,"Songti SC",serif;
  --c-surface:#16181d; --c-text:#c8cbd1; --c-heading:#f2f2f3; --c-accent:#e8b96a;
  --c-line:#33373f; --c-quote-bg:#1d2026; --c-code-bg:#22252c;
  --c-table-head:#22252c; --c-code-text:#e3d3b5; --c-muted:#9298a3;
  --fs-body:16px; --lh-body:1.9; --space-p:1.2em; --space-h:2.3em 0 .8em;
  --fs-h1:30px; --fs-h2:22px; --fs-h3:18px; --radius:6px;
}
.md-body[data-theme="nocturne"] h1{padding-bottom:.4em; border-bottom:1px solid #33373f}
.md-body[data-theme="nocturne"] blockquote{border-left:2px solid #e8b96a; color:#a8acb4}
.md-body[data-theme="nocturne"] strong{color:#f2f2f3}
.md-body[data-theme="nocturne"] th,.md-body[data-theme="nocturne"] td{border-color:#33373f}
.md-body[data-theme="nocturne"] mark{color:#16181d}

/* ---------- 09 系统灰（GitHub Flavored Markdown 风） ---------- */
.md-body[data-theme="gfm"]{
  --font-body:-apple-system,BlinkMacSystemFont,"PingFang SC","Segoe UI",sans-serif;
  --c-surface:#ffffff; --c-text:#1f2328; --c-heading:#1f2328; --c-accent:#0969da;
  --c-line:#d0d7de; --c-quote-bg:#f6f8fa; --c-code-bg:#f6f8fa; --c-table-head:#f6f8fa; --c-muted:#656d76;
  --fs-body:16px; --lh-body:1.6; --space-p:1em; --space-h:2em 0 .6em; --radius:6px;
  --fs-h1:32px; --fs-h2:24px; --fs-h3:20px;
}
.md-body[data-theme="gfm"] h1{border-bottom:1px solid #d0d7de; padding-bottom:.3em}
.md-body[data-theme="gfm"] h2{border-bottom:1px solid #d0d7de; padding-bottom:.3em}
.md-body[data-theme="gfm"] blockquote{border-left:4px solid #d0d7de; background:#f6f8fa; color:#656d76}
.md-body[data-theme="gfm"] a{text-decoration:none}
.md-body[data-theme="gfm"] th{background:#f6f8fa}

/* ---------- 10 暗色笔记（Obsidian 暗色风） ---------- */
.md-body[data-theme="obsidian"]{
  --font-body:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;
  --c-surface:#1b1b1f; --c-text:#dcddde; --c-heading:#e6e6e6; --c-accent:#8b88e3;
  --c-line:#33333a; --c-quote-bg:#242429; --c-code-bg:#242429; --c-table-head:#242429; --c-muted:#9a9aa2; --c-code-text:#e6e6e6;
  --fs-body:16px; --lh-body:1.7; --space-p:1.1em; --space-h:2.1em 0 .8em; --radius:6px;
  --fs-h1:30px; --fs-h2:23px; --fs-h3:19px;
}
.md-body[data-theme="obsidian"] h1{border-bottom:1px solid #33333a; padding-bottom:.3em}
.md-body[data-theme="obsidian"] h2{border-bottom:1px solid #33333a; padding-bottom:.2em}
.md-body[data-theme="obsidian"] blockquote{border-left:3px solid #8b88e3}
.md-body[data-theme="obsidian"] strong{color:#e6e6e6}
.md-body[data-theme="obsidian"] th,.md-body[data-theme="obsidian"] td{border-color:#33333a}
.md-body[data-theme="obsidian"] mark{color:#1b1b1f}

/* ---------- 11 纯净书写（Typora 默认风） ---------- */
.md-body[data-theme="typora"]{
  --font-body:-apple-system,BlinkMacSystemFont,"PingFang SC",sans-serif;
  --c-surface:#ffffff; --c-text:#2f2f2f; --c-heading:#1a1a1a; --c-accent:#3a6ea5;
  --c-line:#e8e8e8; --c-quote-bg:#f7f7f7; --c-code-bg:#f5f5f5; --c-table-head:#f5f5f5; --c-muted:#8a8a8a;
  --fs-body:16px; --lh-body:1.95; --space-p:1.3em; --space-h:2.3em 0 1em; --radius:4px;
  --fs-h1:34px; --fs-h2:26px; --fs-h3:21px;
}
.md-body[data-theme="typora"] h1{text-align:center; letter-spacing:.02em}
.md-body[data-theme="typora"] h2{border-bottom:1px solid #e8e8e8; padding-bottom:.3em}
.md-body[data-theme="typora"] blockquote{border-left:3px solid #d8d8d8; background:transparent; color:#666}
.md-body[data-theme="typora"] a{color:#3a6ea5; text-decoration:none}
.md-body[data-theme="typora"] hr{border-top:1px solid #e8e8e8}
`;
  global.UnoThemeCSS = CSS;
  var tag = document.createElement('style');
  tag.id = 'uno-theme-styles';
  tag.textContent = CSS;
  document.head.appendChild(tag);
})(window);
