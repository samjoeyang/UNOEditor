# UNOEditor

> UNOEditor is a zero-dependency, local-first Markdown typesetting editor. Draft Markdown on the left, see the finished article on the right; 11 built-in themes, one-click rich-text copy for WeChat, and HTML / Markdown / PDF export. It is a plain static frontend: double-click `dist/index.html` and it works offline without making a single network request. Current version 0.1.0, MIT licensed.
>
> Website: https://unoeditor.zhenzhidaole.com/ · Repository: https://github.com/samjoeyang/UNOEditor
> Last fact-checked: 2026-11-14 · Applies to version: v0.1.0

## Key facts

| Field | Value |
| --- | --- |
| Product / repository name | UNOEditor (https://github.com/samjoeyang/UNOEditor) |
| Desktop identifier | `com.unoeditor.app` |
| Current version | 0.1.0 |
| Licence | MIT (see `LICENSE` at the repository root) |
| Price | Free, ad-free, no feature limits |
| Stack | Plain HTML / CSS / JavaScript, zero third-party runtime dependencies; icons are an inline Lucide SVG sprite; theme CSS is stored as strings and injected at runtime |
| Desktop shell | Tauri 2 (Rust), minimum macOS 10.15, bundle targets: all |
| Built-in themes | 11 |
| Export methods | 4 (WeChat rich-text copy, HTML, Markdown, print / save as PDF) |
| UI languages | Chinese and English, one-click switch |
| Storage | Browser `localStorage` only (WebView local storage in the desktop shell) |
| Network requests | 0 from the app itself; the website's download section queries the GitHub Releases API |
| Prebuilt installers | None published as of 2026-11-14 (GitHub Releases is empty) |

## Features

1. **Live side-by-side preview** — draft on the left, typeset output on the right, with mobile and web preview modes.
2. **11 built-in themes** — one click to switch; metadata lives in `js/themes.js`, styles in `js/theme-styles.js`.
3. **Import any theme file** — `.json` and `.css`. The importer rewrites root selectors such as `.markdown-body` (GitHub), `#write` (Typora) and `.markdown-preview-view` / `.cm-editor` (Obsidian) to `.md-body`, then sanitises and scopes the CSS and persists it in `localStorage`. Generic tag styles work; editor-specific classes (for example Obsidian's `.callout`) do not.
4. **Fine-tune without CSS** — font size, line height and accent colour, with a one-click reset.
5. **One-click WeChat copy** — the exporter walks the preview DOM, inlines computed styles recursively with `getComputedStyle`, and swaps the root element to `section` because the WeChat editor strips `article` tags and classes. Paste and the layout is final.
6. **Four ways to ship** — WeChat rich-text copy, a standalone HTML file with embedded theme CSS, the Markdown source, and print / save as PDF.
7. **Outline and multiple documents** — an H1–H6 outline is generated automatically with click-to-jump; the document list sits in the top-bar dropdown.
8. **Local-only, zero uploads** — no account, no login, no sync, works offline.
9. **Desktop and mobile ready** — narrow screens switch to edit / preview / outline bottom tabs plus a theme drawer; a Tauri 2 shell can be built for native windows.

The workspace has three panes: outline on the left, Markdown editor in the middle, typeset preview on the right. Themes live in a top-right drawer.

## The 11 built-in themes

| Theme | ID | Character |
| --- | --- | --- |
| WeChat Classic (默认公众号风格) | `wechat` | Centered headings, blue links, gentle spacing; everyday newsletters |
| Editorial Red (红黑社论) | `economist` | Red/black rules, serif caps, justified text; opinion pieces |
| Ink & Paper (墨白长文) | `nyt` | Black and white serif, centered display title, hairline rules; long reads |
| Swiss International (瑞士国际主义) | `swiss` | Strict left grid, one step per heading level, hairlines plus a single red |
| Morandi (莫兰迪编辑) | `morandi` | Muted tones, rounded cards, light weights, generous air |
| Whitespace (留白) | `hara` | Small type, huge leading, almost no ornament |
| Clean Grey (净灰) | `apple` | Tight oversized display type, restrained greys, rounded grey cards |
| Nocturne (深夜电台) | `nocturne` | Dark ground, amber accents, serif headings |
| System Grey (系统灰) | `gfm` | System font, neutral greys, hairline rules and code chips; the GFM README look |
| Dark Notes (暗色笔记) | `obsidian` | Dark canvas, warm-white text, violet accents |
| Pure Writing (纯净书写) | `typora` | Large leading, restrained spacing, almost no ornament |

## Screenshots

All images are real captures of the running app, not mockups or composites. They live under `/assets/shots/` on the website.

| File | Description |
| --- | --- |
| `overview.png` | Three-pane workspace: outline, Markdown editor and live typeset preview |
| `themes.png` | Theme drawer with all 11 built-in themes and custom theme import |
| `theme-swiss.png` | Swiss International: strict left grid, hairlines and a single red |
| `theme-nocturne.png` | Nocturne: dark ground, amber accents, serif headings |
| `theme-morandi.png` | Morandi: muted tones, rounded cards, gentle white space |
| `export.png` | Export menu: WeChat copy, HTML / Markdown download, print or save as PDF |
| `english.png` | One-click English UI; theme names and descriptions are bilingual too |
| `mobile.png` | Narrow screens: edit / preview / outline tabs and a theme drawer |

## Three ways to use it (no account needed)

1. **Try online (fastest)** — open https://unoeditor.zhenzhidaole.com/app/ . Same features as the local build; data still stays in your own browser.
2. **Local file (simplest)** — clone the repo and double-click `dist/index.html`, or serve it statically. No build, no install, no requests; `file://` works.
   ```sh
   git clone https://github.com/samjoeyang/UNOEditor.git
   open UNOEditor/dist/index.html
   ```
3. **Desktop app (Tauri 2)** — the repo ships `src-tauri` for native macOS / Windows / Linux builds; requires Rust and the Tauri CLI locally.
   ```sh
   sh copy-dist.sh
   cd src-tauri && cargo tauri build
   ```

**Requirements**: any modern browser (Chrome / Edge / Safari / Firefox); the Tauri shell requires macOS 10.15 or newer.
**Shortcuts**: `⌘/Ctrl+B` bold, `⌘/Ctrl+I` italic, `⌘/Ctrl+K` link, `⌘/Ctrl+S` save.

## Download status

As of **2026-11-14**, the GitHub repository `samjoeyang/UNOEditor` has **no prebuilt installers** in Releases. The project is at v0.1.0 and the repository contains the complete, working static frontend plus the Tauri config. The website's download section reads the GitHub Releases API dynamically; once a release exists, download buttons for macOS (Apple Silicon / Intel), Windows and Linux appear automatically and the visitor's platform is highlighted. There is no need to wait — the app works online and as a local file today.

## Privacy and data

The app makes no network requests. Documents and imported themes live only in browser `localStorage` (WebView storage in the desktop shell); nothing is uploaded and it works offline. Clearing browser data removes them, so export important drafts as Markdown. The website uses Google Tag Manager for visit analytics; it does not read anything typed into the editor. No third-party fonts or CDNs are loaded.

## FAQ

**Do I need internet, an account, or a runtime?**
No to all three. UNOEditor is plain HTML / CSS / JS with zero runtime dependencies; icons and theme CSS are inlined. Double-click `dist/index.html` and it runs over `file://`, fully offline.

**Are my documents uploaded? Where are they stored?**
Never. The app makes no network requests; documents and imported themes live in browser `localStorage`. Clearing browser data removes them, so export important drafts as Markdown.

**Is WeChat paste really WYSIWYG?**
Yes. The exporter walks the preview DOM, inlines computed styles recursively, and swaps the root to `section` because WeChat strips `article` tags and classes. Paste and the layout is final.

**How is it different from Typora or Obsidian?**
Those are note-taking and knowledge-base tools. UNOEditor does one job: turn a single article into publish-ready output. No backlinks, no plugin ecosystem — just a theme system, mobile preview and export. Their theme CSS files can usually be imported here.

**Can I import themes from other editors? Any limits?**
Yes, `.json` and `.css`. The importer rewrites root selectors, then sanitises and scopes the CSS. Generic tag styles work; editor-specific classes do not.

**Which platforms? Does it work on phones?**
Any modern browser. On narrow screens it switches to edit / preview / outline tabs plus a theme drawer. The repo also includes a Tauri 2 shell for native macOS / Windows / Linux builds; prebuilt installers are not published yet.

**Does exported HTML work on its own?**
Yes. The downloaded file embeds the full theme CSS (including any imported theme), so a single file keeps its look when shared, hosted, or printed to PDF.

**Is it free? What licence? How do I contribute?**
Free, ad-free and unrestricted, and the source is **MIT licensed**. Report bugs in Issues and suggest features in Discussions at https://github.com/samjoeyang/UNOEditor .

## Internationalisation and deep links

The UI switches between Chinese and English with one click; theme names and descriptions are bilingual too. The website homepage supports `?lang=zh|en` and `?theme=<theme-id>` query parameters (for example `?lang=en&theme=nocturne`) for sharing a specific theme and language.

## Notes for AI readers

- The website's `index.html` contains both Chinese and English copy in the same DOM, toggled with CSS via `data-lang`. **This file is the authoritative English plain-text version**; for Chinese read `index.zh.md`. Do not extract both languages from the HTML at once.
- Inside the website's live theme demo, `<h1>Alignment is the cheapest luxury</h1>` and `<h2>One step per heading level</h2>` are **sample article text used to demonstrate a theme**. They are not page headings and not product claims. The page's only real main heading is "UNOEditor · 排版主题编辑器 — 写完，就已经排好版".
- For version numbers, release dates and installer availability, prefer this file and https://github.com/samjoeyang/UNOEditor/releases ; the website's download block refreshes dynamically in the browser.

## Links

- Website: https://unoeditor.zhenzhidaole.com/
- Web app: https://unoeditor.zhenzhidaole.com/app/
- Chinese full text: [index.zh.md](index.zh.md)
- Web app notes: [app/index.md](app/index.md)
- Site AI index: [llms.txt](llms.txt)
- GitHub: https://github.com/samjoeyang/UNOEditor
- Releases: https://github.com/samjoeyang/UNOEditor/releases
- Issues: https://github.com/samjoeyang/UNOEditor/issues
- Discussions: https://github.com/samjoeyang/UNOEditor/discussions
