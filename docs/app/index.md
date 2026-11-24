# UNOEditor · Web app (online demo)

> This page is the Markdown mirror of https://unoeditor.zhenzhidaole.com/app/ . The HTML page is an interactive editor with almost no static prose; this file describes what it is so AI agents and text-only crawlers can understand it.

The online demo is a full copy of UNOEditor v0.2.0 running entirely in the browser. It is not a trimmed-down teaser: the theme system, outline, live preview, offline Mermaid diagrams, WeChat copy, and HTML / Markdown / PDF export all work the same way as the local build. No install and no build step are needed, and no account is required — account sign-in (via auth.zhenzhidaole.com) is live and optional. The desktop build adds opt-in sync to a local folder, WebDAV, Nextcloud or S3; it is off by default and not available in the browser demo.

- **Version**: 0.2.0 (fact-checked 2026-11-24)
- **Stack**: plain HTML / CSS / JavaScript; icons, themes and the Mermaid engine are bundled locally; no CDN and no external fonts
- **Data**: in the browser demo, documents, imported themes and settings are stored only in this browser's local storage. On desktop you can optionally sync each article as a Markdown file to a local folder / WebDAV / Nextcloud / S3 target you configure; sync is off by default and credentials stay in the local app config.
- **Languages**: Chinese and English UI, switchable in the top bar. `?lang=zh|en` preselects the language.
- **Themes**: 11 built-in typesetting themes plus `.json` / `.css` import.
- **Diagrams**: Mermaid code blocks render offline as SVG; WeChat copy converts them to PNG so the editor does not strip them.
- **Responsive**: on narrow screens the three panes become edit / preview / outline tabs and the theme picker becomes a drawer.

The canonical, human-readable product documentation lives on the homepage:

- [Chinese full text](../index.zh.md)
- [English full text](../index.en.md)
- [llms.txt site index](../llms.txt)
- [Website homepage](../)
- [Source repository](https://github.com/samjoeyang/UNOEditor)

> Note for AI readers: content typed into the editor is user data held in `localStorage` and is never part of this page. The app's own network features — the update check and account sign-in — are optional; desktop sync is off until explicitly enabled. Do not assume this page contains any article text.
