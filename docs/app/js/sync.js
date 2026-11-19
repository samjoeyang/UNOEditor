/* UNOEditor — optional workspace sync (desktop only, ES5 / old WebKit safe) */
(function () {
  'use strict';

  var hooks = {};
  var cfg = null;
  var busy = false;
  var persistTimer = null;
  var syncTimer = null;
  var persistChain = Promise.resolve();
  var lastReport = null;

  function t(k) { return window.UnoI18n ? window.UnoI18n.t(k) : k; }
  function $ (id) { return document.getElementById(id); }

  function available() {
    return !!(window.__TAURI_INTERNALS__ || (window.__TAURI__ && window.__TAURI__.core));
  }

  function invoke(cmd, args) {
    if (!available()) return Promise.reject(new Error('web'));
    try {
      if (window.__TAURI_INTERNALS__ && window.__TAURI_INTERNALS__.invoke) {
        return window.__TAURI_INTERNALS__.invoke(cmd, args || {});
      }
      return window.__TAURI__.core.invoke(cmd, args || {});
    } catch (err) {
      return Promise.reject(err);
    }
  }

  function init(h) { hooks = h || {}; }

  function getConfig() {
    return invoke('uno_config_get').then(function (c) { cfg = c || {}; return cfg; });
  }

  function setConfig(c) {
    return invoke('uno_config_set', { cfg: c }).then(function () { cfg = c; return c; });
  }

  /* ---------- workspace payload ---------- */

  function filesFor(state) {
    var docs = state.docs || [];
    var documents = {}, order = [];
    for (var i = 0; i < docs.length; i++) {
      var d = docs[i];
      documents[d.id] = d.content || '';
      order.push(d.id);
    }
    return { documents: documents, order: order };
  }

  function buildWorkspace(state) {
    var f = filesFor(state);
    return {
      workspace: {
        version: 1,
        updated: Date.now(),
        activeId: state.activeId,
        lang: state.lang,
        themeId: state.themeId,
        view: state.view,
        sidebar: state.sidebar,
        preview: state.preview,
        tweak: state.tweak || {},
        imported: state.imported || [],
        docs: (state.docs || []).map(function (d) {
          return {
            id: d.id,
            title: d.title || '',
            file: d.file || ('doc-' + d.id + '.md'),
            updated: d.updated || Date.now(),
            rev: d.rev || ('local-' + (d.updated || Date.now()).toString(16)),
            base: d.base || '',
            deleted: !!d.deleted
          };
        })
      },
      documents: f.documents
    };
  }

  function applyPayload(payload) {
    if (!payload || !payload.workspace) return false;
    var ws = payload.workspace;
    var state = hooks.getState ? hooks.getState() : null;
    if (!state) return false;
    state.lang = ws.lang || 'zh';
    state.themeId = ws.themeId || 'wechat';
    state.view = ws.view || 'mobile';
    state.sidebar = ws.sidebar !== false;
    state.preview = ws.preview !== false;
    state.tweak = ws.tweak || {};
    state.imported = ws.imported || [];
    state.docs = (ws.docs || []).map(function (m) {
      var content = payload.documents && Object.prototype.hasOwnProperty.call(payload.documents, m.id)
        ? payload.documents[m.id] : '';
      return {
        id: m.id, title: m.title, content: content, file: m.file,
        updated: m.updated, rev: m.rev, base: m.base, deleted: !!m.deleted
      };
    });
    state.activeId = state.docs.length ? state.docs[0].id : null;
    for (var i = 0; i < state.docs.length; i++) {
      if (state.docs[i].id === ws.activeId) { state.activeId = state.docs[i].id; break; }
    }
    if (hooks.onLoad) hooks.onLoad(state);
    return true;
  }

  function persist() {
    if (!available() || !cfg || !cfg.localDir) return Promise.resolve(false);
    var state = hooks.getState ? hooks.getState() : null;
    if (!state) return Promise.resolve(false);
    var payload = buildWorkspace(state);
    persistChain = persistChain.then(function () {
      return invoke('uno_workspace_write', { payload: payload });
    }).then(function () { return true; }).catch(function (err) {
      if (hooks.toast) hooks.toast(t('syncPersistFail') + ' ' + err);
      return false;
    });
    return persistChain;
  }

  function schedulePersist() {
    clearTimeout(persistTimer);
    $('saveState').textContent = t('saving');
    persistTimer = setTimeout(function () {
      persist().then(function (ok) {
        if (hooks.onSaved) hooks.onSaved(ok);
        if (ok && cfg && cfg.autoSync) {
          clearTimeout(syncTimer);
          syncTimer = setTimeout(function () { syncNow(true); }, 2200);
        }
      });
    }, 420);
  }

  function syncNow(silent) {
    if (!available() || busy) return Promise.resolve(null);
    if (!cfg || !cfg.localDir) {
      if (!silent && hooks.toast) hooks.toast(t('syncNoDir'));
      return Promise.resolve(null);
    }
    busy = true;
    if (hooks.onStatus) hooks.onStatus('running', null);
    var state = hooks.getState ? hooks.getState() : null;
    var payload = buildWorkspace(state);
    payload.config = cfg;
    return persist().then(function () {
      return invoke('uno_sync', { payload: payload });
    }).then(function (report) {
      lastReport = report;
      if (report && report.workspace) {
        applyPayload({ workspace: report.workspace, documents: report.documents || {} });
        if (hooks.onSaved) hooks.onSaved(true);
      }
      if (hooks.onStatus) hooks.onStatus(report && report.ok ? 'done' : 'fail', report);
      if (!silent && hooks.toast) {
        hooks.toast(report && report.ok ? t('syncDone') : t('syncFail'));
      }
      return report;
    }).catch(function (err) {
      if (hooks.onStatus) hooks.onStatus('fail', null);
      if (!silent && hooks.toast) hooks.toast(t('syncFail') + ' ' + err);
      return null;
    }).then(function (r) {
      busy = false;
      return r;
    });
  }

  function boot() {
    if (!available()) return Promise.resolve(false);
    return getConfig().then(function (c) {
      if (!c || !c.localDir) return false;
      return invoke('uno_workspace_read').then(function (payload) {
        if (!payload) return false;
        return applyPayload(payload);
      });
    }).then(function (loaded) {
      if (loaded && hooks.onStatus) hooks.onStatus('idle', null);
      if (cfg && cfg.autoSync) setTimeout(function () { syncNow(true); }, 1600);
      return loaded;
    }).catch(function () { return false; });
  }

  /* ---------- settings UI ---------- */

  function fieldsFor(kind) {
    return {
      local: kind === 'local',
      dav: kind === 'webdav' || kind === 'nextcloud',
      s3: kind === 's3'
    };
  }

  function showSections(kind) {
    var f = fieldsFor(kind);
    var map = { local: 'syncSecLocal', dav: 'syncSecDav', s3: 'syncSecS3', nextcloud: 'syncSecNextcloud' };
    for (var key in map) {
      var el = $(map[key]);
      if (el) el.hidden = key === 'nextcloud' ? kind !== 'nextcloud' : !f[key];
    }
  }

  function fillForm() {
    if (!cfg) return;
    $('syncKind').value = cfg.kind || 'local';
    $('syncLocalDir').textContent = cfg.localDir || t('notSet');
    $('syncUrl').value = cfg.url || '';
    $('syncUser').value = cfg.username || '';
    $('syncPass').value = cfg.password || '';
    $('syncEndpoint').value = cfg.endpoint || '';
    $('syncRegion').value = cfg.region || '';
    $('syncBucket').value = cfg.bucket || '';
    $('syncPrefix').value = cfg.prefix || '';
    $('syncAk').value = cfg.accessKey || '';
    $('syncSk').value = cfg.secretKey || '';
    $('syncToken').value = cfg.sessionToken || '';
    $('syncPathStyle').checked = !!cfg.pathStyle;
    $('syncAuto').checked = !!cfg.autoSync;
    showSections(cfg.kind || 'local');
    renderStatus();
  }

  function readForm() {
    var c = cfg || {};
    c.kind = $('syncKind').value;
    c.url = $('syncUrl').value.trim();
    c.username = $('syncUser').value.trim();
    c.password = $('syncPass').value;
    c.endpoint = $('syncEndpoint').value.trim();
    c.region = $('syncRegion').value.trim();
    c.bucket = $('syncBucket').value.trim();
    c.prefix = $('syncPrefix').value.trim();
    c.accessKey = $('syncAk').value.trim();
    c.secretKey = $('syncSk').value;
    c.sessionToken = $('syncToken').value;
    c.pathStyle = !!$('syncPathStyle').checked;
    c.autoSync = !!$('syncAuto').checked;
    return c;
  }

  function renderStatus() {
    var el = $('syncStatus');
    if (!el) return;
    var lines = [];
    if (!available()) {
      el.innerHTML = '<div class="sync-status-note">' + t('syncWebOnly') + '</div>';
      return;
    }
    if (cfg && cfg.localDir) {
      lines.push('<div class="sync-path">' + t('localDir') + ': ' +
        String(cfg.localDir).replace(/[<>&]/g, '') + '</div>');
    }
    if (lastReport) {
      var r = lastReport;
      lines.push('<div class="sync-summary">' + t('uploaded') + ': ' + (r.uploaded || 0) +
        ' · ' + t('downloaded') + ': ' + (r.downloaded || 0) +
        ' · ' + (r.ok ? t('syncDone') : t('syncFail')) + '</div>');
      if (r.conflicts && r.conflicts.length) {
        lines.push('<div class="sync-warn">' + t('conflicts') + ': ' + r.conflicts.length + '</div>');
      }
      if (r.errors && r.errors.length) {
        lines.push('<div class="sync-error">' + r.errors.slice(0, 3).join(' / ') + '</div>');
      }
    } else {
      lines.push('<div class="sync-status-note">' + t('syncIdle') + '</div>');
    }
    el.innerHTML = lines.join('');
  }

  function onStatus(kind, report) {
    var dot = $('syncDot');
    if (dot) dot.className = 'sync-dot ' + (kind || 'idle');
    if (kind === 'done' && report) lastReport = report;
    renderStatus();
  }

  function openModal() {
    if (!available()) {
      if (hooks.toast) hooks.toast(t('syncWebOnly'));
      return;
    }
    if (!cfg) { getConfig().then(fillForm); } else { fillForm(); }
    $('syncModal').hidden = false;
    document.body.classList.add('modal-open');
  }

  function closeModal() {
    $('syncModal').hidden = true;
    document.body.classList.remove('modal-open');
  }

  function bindUI() {
    var btn = $('syncBtn'); if (btn) btn.addEventListener('click', function (e) { e.stopPropagation(); openModal(); });
    var close = $('syncClose'); if (close) close.addEventListener('click', closeModal);
    var mask = $('syncModal');
    if (mask) mask.addEventListener('click', function (e) { if (e.target === this) closeModal(); });
    var kind = $('syncKind');
    if (kind) kind.addEventListener('change', function () { showSections(this.value); });
    var pick = $('syncPickDir');
    if (pick) pick.addEventListener('click', function () {
      invoke('uno_pick_dir').then(function (dir) {
        if (dir) { cfg = cfg || {}; cfg.localDir = dir; $('syncLocalDir').textContent = dir; }
      });
    });
    var test = $('syncTest');
    if (test) test.addEventListener('click', function () {
      var c = readForm();
      if (hooks.toast) hooks.toast(t('testing'));
      invoke('uno_test_connection', { cfg: c }).then(function (msg) {
        if (hooks.toast) hooks.toast(t('testOK') + ' ' + msg);
      }).catch(function (err) {
        if (hooks.toast) hooks.toast(t('testFail') + ' ' + err);
      });
    });
    var save = $('syncSave');
    if (save) save.addEventListener('click', function () {
      var c = readForm();
      if (!c.localDir) {
        if (hooks.toast) hooks.toast(t('syncNoDir'));
        return;
      }
      setConfig(c).then(function () {
        if (hooks.toast) hooks.toast(t('settingsSaved'));
        fillForm();
      }).catch(function (err) {
        if (hooks.toast) hooks.toast(t('settingsFail') + ' ' + err);
      });
    });
    var now = $('syncNow');
    if (now) now.addEventListener('click', function () {
      var c = readForm();
      setConfig(c).then(function () { return syncNow(false); });
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && $('syncModal') && !$('syncModal').hidden) closeModal();
    });
  }

  window.UnoSync = {
    init: init, boot: boot, bindUI: bindUI,
    available: available, invoke: invoke,
    getConfig: getConfig, setConfig: setConfig,
    schedulePersist: schedulePersist, persist: persist,
    syncNow: syncNow, onStatus: onStatus, openModal: openModal,
    applyPayload: applyPayload, buildWorkspace: buildWorkspace
  };
})();
