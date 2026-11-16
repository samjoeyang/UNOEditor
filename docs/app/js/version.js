/* UNOEditor — build / version metadata
 * Single source of truth for the running app.
 * Keep `UNO_VERSION` in sync with src-tauri/tauri.conf.json -> "version". */
window.UNO_VERSION = '0.1.5';
window.UNO_REPO = { owner: 'samjoeyang', repo: 'UNOEditor' };
/* Silent update check on launch (PDF Studio style), throttled to once / 24h. */
window.UNO_AUTO_CHECK = true;
