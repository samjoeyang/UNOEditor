# UNOEditor

> UNOEditor is a local-first Markdown typesetting editor: draft on the left, see the finished article on the right, then copy rich text into WeChat or export HTML / Markdown / PDF. It ships 11 themes and Mermaid diagrams, imports GitHub / Typora / Obsidian theme CSS, and keeps documents on your device by default. Sign-in is optional; the desktop build adds opt-in sync to a target you choose — a local folder, WebDAV, Nextcloud or S3 (off by default, credentials stored locally). Current version 0.1.6, MIT licensed.
>
> Website: https://unoeditor.zhenzhidaole.com/ · Repository: https://github.com/samjoeyang/UNOEditor
> Last fact-checked: 2026-11-21 · Applies to version: v0.1.6

## Key facts

| Field | Value |
| --- | --- |
| Product / repository name | UNOEditor (https://github.com/samjoeyang/UNOEditor) |
| Desktop identifier | `com.unoeditor.app` |
| Current version | 0.1.6 |
| Licence | MIT (see `LICENSE` at the repository root) |
| Price | Free, ad-free, no feature limits |
| Stack | Plain HTML / CSS / JavaScript; icons are an inline Lucide SVG sprite; the Mermaid engine is bundled locally; theme CSS is stored as strings and injected at runtime |
| Desktop shell | Tauri 2 (Rust), minimum macOS 10.15, bundle targets: all |
| Built-in themes | 11 |
| Markdown extension | Mermaid diagrams: rendered offline as SVG; converted to PNG for WeChat copy |
| Export methods | 4 (WeChat rich-text copy, HTML, Markdown, print / save as PDF) |
| UI languages | Chinese and English, one-click switch |
| Storage | Browser `localStorage` (WebView local storage in the desktop shell); desktop builds support opt-in sync to a local folder / WebDAV / Nextcloud / S3 (off by default, credentials stay local) |
| Network requests | The app's own network features are both optional: the update check (GitHub Releases API) and account sign-in (auth.zhenzhidaole.com); the website's download section queries the same API |
| Account & sync | Account sign-in is live (auth.zhenzhidaole.com, optional); desktop-only opt-in sync to a local folder, WebDAV, Nextcloud or S3 (off by default, credentials stay local) |
| Prebuilt installers | Shipped with v0.1.6: macOS / Windows / Linux desktop installers (see GitHub Releases) |

## Features

1. **Live side-by-side preview** — draft on the left, typeset output on the right, with mobile and web preview modes.
2. **Mermaid diagrams** — `mermaid` code blocks render offline as vector graphics using the bundled engine; WeChat copy converts them to PNG so the editor does not strip the SVG.
3. **11 built-in themes** — one click to switch; metadata lives in `js/themes.js`, styles in `js/theme-styles.js`.
4. **Import any theme file** — `.json` and `.css`. The importer rewrites root selectors such as `.markdown-body` (GitHub), `#write` (Typora) and `.markdown-preview-view` / `.cm-editor` (Obsidian) to `.md-body`, then sanitises and scopes the CSS and persists it in `localStorage`. Generic tag styles work; editor-specific classes (for example Obsidian's `.callout`) do not.
5. **Fine-tune without CSS** — font size, line height and accent colour, with a one-click reset.
6. **One-click WeChat copy** — the exporter walks the preview DOM, inlines computed styles recursively with `getComputedStyle`, and swaps the root element to `section` because the WeChat editor strips `article` tags and classes. Paste and the layout is final.
7. **Four ways to ship** — WeChat rich-text copy, a standalone HTML file with embedded theme CSS, the Markdown source, and print / save as PDF.
8. **Outline and multiple documents** — an H1–H6 outline is generated automatically with click-to-jump; the document list sits in the top-bar dropdown.
9. **Local-first, offline-ready** — writing and typesetting happen entirely on your own machine; it works offline. Documents and imported themes are stored in local browser storage. Account sign-in is live and optional; the desktop build offers opt-in sync to your own storage target, off by default (see the key-facts table).
10. **Desktop and mobile ready** — narrow screens switch to edit / preview / outline bottom tabs plus a theme drawer; a Tauri 2 shell can be built for native windows.

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

## Three ways to use it (sign-in and sync are optional)

1. **Try online (fastest)** — open https://unoeditor.zhenzhidaole.com/app/ . Same features as the local build; data still stays in your own browser.
2. **Local file (simplest)** — clone the repo and double-click `dist/index.html`, or serve it statically. No build, no install; `file://` works and it keeps working offline.
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

**UNOEditor v0.1.6 was released on 2026-11-21**, adding optional account sign-in (OAuth 2.0 + PKCE), opt-in desktop sync to a target you choose (local folder / WebDAV / Nextcloud / S3, off by default), offline Mermaid 12.3.0, draggable panes and a live-updating outline. GitHub Releases ships prebuilt desktop installers: `.dmg` for macOS (Apple Silicon / Intel), `.msi` / `.exe` for Windows, and `.deb` / `.AppImage` / `.rpm` for Linux. The website's download section reads the GitHub Releases API dynamically, lists the latest version and highlights the visitor's platform. The online app and the local file need no installation.

**First launch on macOS**: the `.app` inside the v0.1.6 `.dmg` is ad-hoc signed (`bundle.macOS.signingIdentity: "-"`), so it is no longer reported as "damaged". It is still not notarized, so the first launch may warn about an unidentified developer — right-click UNOEditor in Finder → Open, or use System Settings → Privacy & Security → Open Anyway, and it will be trusted from then on. Alternatively run `xattr -cr /Applications/UNOEditor.app` to remove the quarantine attribute. If you are still on the v0.1.0 build (no bundle signature, reported as damaged), download v0.1.6 instead. Also pick the right architecture: `aarch64.dmg` for Apple Silicon, `x64.dmg` for Intel.

## Privacy and data

Writing and typesetting happen entirely on your machine, with full offline support. Documents and imported themes currently live only in browser `localStorage` (WebView storage in the desktop shell); they are not uploaded. The app's own network features are both optional: the update check (GitHub Releases API, at most once every 24 hours) and account sign-in (auth.zhenzhidaole.com). Clearing browser data removes them, so export important drafts as Markdown. Account sign-in is live and optional (v0.1.6). The desktop build offers opt-in sync: documents are first written to a local folder you choose, then pushed only to a WebDAV / Nextcloud / S3 target you configure. Credentials stay in the local app config, conflicts create a separate copy, and sync is off by default (unavailable in the web demo). The website uses Google Tag Manager for visit analytics; it does not read anything typed into the editor. No third-party fonts or CDNs are loaded.

## FAQ

**Do I need internet, an account, or a runtime?**
Writing needs no internet, account or runtime. UNOEditor is plain HTML / CSS / JS; icons, theme CSS and the Mermaid engine are bundled locally. Double-click `dist/index.html` and it runs over `file://`, fully offline. Account sign-in is live (v0.1.6, auth.zhenzhidaole.com) and stays optional — writing and exporting offline without an account keeps working.

**Are my documents uploaded? Where are they stored?**
Not by default. Documents and imported themes live in browser local storage (WebView storage in the desktop shell); the app's own network features are the optional update check and optional account sign-in. The desktop build adds opt-in sync: documents are first written to a local folder you choose, then pushed only to a WebDAV / Nextcloud / S3 target you configure yourself. Each article is stored as Markdown with front matter; conflicts create a separate copy instead of silently overwriting. Credentials stay in the local app config. Sync is off until you enable it, and is not available in the web demo.

**Is WeChat paste really WYSIWYG?**
Yes. The exporter walks the preview DOM, inlines computed styles recursively, and swaps the root to `section` because WeChat strips `article` tags and classes. Paste and the layout is final.

**How is it different from Typora or Obsidian?**
Those are note-taking and knowledge-base tools. UNOEditor does one job: turn a single article into publish-ready output. No backlinks, no plugin ecosystem — just a theme system, mobile preview and export. Their theme CSS files can usually be imported here.

**Can I import themes from other editors? Any limits?**
Yes, `.json` and `.css`. The importer rewrites root selectors, then sanitises and scopes the CSS. Generic tag styles work; editor-specific classes do not.

**Which platforms? Does it work on phones?**
Any modern browser. On narrow screens it switches to edit / preview / outline tabs plus a theme drawer. The repo also includes a Tauri 2 shell for native macOS / Windows / Linux builds; prebuilt installers ship with v0.1.1.

**Does exported HTML work on its own?**
Yes. The downloaded file embeds the full theme CSS (including any imported theme), so a single file keeps its look when shared, hosted, or printed to PDF.

**Is it free? What licence? How do I contribute?**
Free, ad-free and unrestricted, and the source is **MIT licensed**. Report bugs in Issues, suggest features in Discussions, or join the Telegram group (https://t.me/+3KH9Cn8-yIQ1ZDI1 ) for real-time chat at https://github.com/samjoeyang/UNOEditor . To support development, there's an optional WeChat/Alipay donation section ("Buy the author a coffee") on the site — entirely voluntary, unlocks nothing.

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
- Telegram group: https://t.me/+3KH9Cn8-yIQ1ZDI1
