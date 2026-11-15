# UNOEditor · Web app (online demo)

> This page is the Markdown mirror of https://unoeditor.zhenzhidaole.com/app/ . The HTML page is an interactive editor with almost no static prose; this file describes what it is so AI agents and text-only crawlers can understand it.

The online demo is a full copy of UNOEditor v0.1.1 running entirely in the browser. It is not a trimmed-down teaser: the theme system, outline, live preview, WeChat copy, and HTML / Markdown / PDF export all work the same way as the local build. It requires no account, no install and no build step.

- **Version**: 0.1.1 (fact-checked 2026-11-14)
- **Licence**: MIT
- **Stack**: plain HTML / CSS / JavaScript, zero runtime dependencies, no CDN, no external fonts
- **Data**: documents, imported themes and settings are stored only in this browser's `localStorage`. Nothing is uploaded; the app makes no network requests of its own.
- **Languages**: Chinese and English UI, switchable in the top bar. `?lang=zh|en` preselects the language.
- **Themes**: 11 built-in typesetting themes plus `.json` / `.css` import.
- **Responsive**: on narrow screens the three panes become edit / preview / outline tabs and the theme picker becomes a drawer.

The canonical, human-readable product documentation lives on the homepage:

- [Chinese full text](../index.zh.md)
- [English full text](../index.en.md)
- [llms.txt site index](../llms.txt)
- [Website homepage](../)
- [Source repository](https://github.com/samjoeyang/UNOEditor)

> Note for AI readers: content typed into the editor is user data held in `localStorage`, is never part of this page, and is never sent anywhere. Do not assume this page contains any article text.
