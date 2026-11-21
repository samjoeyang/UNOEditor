/* UNOEditor — 账号登录（OAuth 2.0 Authorization Code + PKCE）
 * 授权服务器：auth.zhenzhidaole.com（Better Auth OAuth 2.1 Provider）
 * 桌面版：系统浏览器完成登录，unoeditor://callback/ 深链返回，token 交换走 Rust 命令（无 CORS 限制）。
 * 网页版：整页跳转授权，回调 https://unoeditor.zhenzhidaole.com/app/?code=…，token 交换走 fetch
 *         （要求授权服务端登记该 redirect URI 并放行 CORS 源）。
 * 会话只存本机 localStorage；登录是可选能力，不登录不影响任何编辑功能。 */
(function (global) {
  'use strict';
  var CFG = {
    issuer: 'https://auth.zhenzhidaole.com/api/auth',
    clientId: 'qisPREDdYbAkucRAWemTIrXooiSTdTof',
    appRedirect: 'unoeditor://callback/',
    webRedirect: 'https://unoeditor.zhenzhidaole.com/app/',
    siteOrigin: 'https://unoeditor.zhenzhidaole.com',
    scope: 'openid profile offline_access',
    sessionKey: 'uno-auth-session-v1',
    flowKey: 'uno-auth-flow-v1',
    flowTtl: 15 * 60 * 1000
  };

  function EP() {
    return {
      authorize: CFG.issuer + '/oauth2/authorize',
      token: CFG.issuer + '/oauth2/token',
      userinfo: CFG.issuer + '/oauth2/userinfo',
      endSession: CFG.issuer + '/oauth2/end-session'
    };
  }

  function isTauri() {
    return !!(global.__TAURI_INTERNALS__ || global.__TAURI__);
  }

  /* 桌面版外部浏览器回调后深链进应用；网页版整页跳回 /app/。file:// / 其它环境不给登录。 */
  function redirectUri() {
    if (isTauri()) return CFG.appRedirect;
    if (global.location && global.location.origin === CFG.siteOrigin) return CFG.webRedirect;
    return null;
  }

  function b64url(buf) {
    var bytes = new Uint8Array(buf), s = '', i;
    for (i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function randomB64url() {
    var bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return b64url(bytes);
  }

  function challenge(verifier) {
    return crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)).then(b64url);
  }

  function saveFlow(flow) {
    flow.ts = Date.now();
    try { localStorage.setItem(CFG.flowKey, JSON.stringify(flow)); } catch (e) { }
  }

  function loadFlow() {
    try {
      var raw = localStorage.getItem(CFG.flowKey);
      if (!raw) return null;
      var flow = JSON.parse(raw);
      if (!flow || !flow.state || !flow.verifier || Date.now() - flow.ts > CFG.flowTtl) {
        localStorage.removeItem(CFG.flowKey);
        return null;
      }
      return flow;
    } catch (e) { return null; }
  }

  function clearFlow() { try { localStorage.removeItem(CFG.flowKey); } catch (e) { } }

  function saveSession(s) {
    try { localStorage.setItem(CFG.sessionKey, JSON.stringify(s)); } catch (e) { }
  }

  function getSession() {
    try {
      var raw = localStorage.getItem(CFG.sessionKey);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function clearSession() { try { localStorage.removeItem(CFG.sessionKey); } catch (e) { } }

  function formEncode(params) {
    var parts = [], k;
    for (k in params) {
      if (params[k] !== undefined && params[k] !== null) {
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(params[k]));
      }
    }
    return parts.join('&');
  }

  function parseParams(url) {
    var q = '', qi = url.indexOf('?'), hi = url.indexOf('#');
    if (qi >= 0) q = url.slice(qi + 1);
    else if (hi >= 0) q = url.slice(hi + 1);
    var out = {};
    q.split('&').forEach(function (kv) {
      var i = kv.indexOf('=');
      if (i > 0) out[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1).replace(/\+/g, ' '));
    });
    return out;
  }

  /* ---------- token 端点：桌面走 Rust（无 CORS），网页走 fetch ---------- */

  function tauriInvoke(cmd, args) {
    var T = global.__TAURI__;
    if (T && T.core && T.core.invoke) return T.core.invoke(cmd, args);
    throw new Error('tauri invoke unavailable');
  }

  function exchangeToken(opts) {
    if (isTauri()) {
      return tauriInvoke('uno_auth_exchange', {
        code: opts.code, verifier: opts.verifier, redirectUri: opts.redirectUri
      });
    }
    return fetch(EP().token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formEncode({
        grant_type: 'authorization_code',
        client_id: CFG.clientId,
        code: opts.code,
        code_verifier: opts.verifier,
        redirect_uri: opts.redirectUri
      })
    }).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) {
          throw new Error(body.error_description || body.error || ('HTTP ' + r.status));
        }
        return body;
      });
    });
  }

  function refreshToken(refreshTokenValue) {
    if (isTauri()) {
      return tauriInvoke('uno_auth_refresh', { refreshToken: refreshTokenValue });
    }
    return fetch(EP().token, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formEncode({
        grant_type: 'refresh_token',
        client_id: CFG.clientId,
        refresh_token: refreshTokenValue
      })
    }).then(function (r) {
      return r.json().then(function (body) {
        if (!r.ok) {
          throw new Error(body.error_description || body.error || ('HTTP ' + r.status));
        }
        return body;
      });
    });
  }

  function fetchUserinfo(accessToken) {
    if (isTauri()) {
      return tauriInvoke('uno_auth_userinfo', { accessToken: accessToken });
    }
    return fetch(EP().userinfo, { headers: { Authorization: 'Bearer ' + accessToken } })
      .then(function (r) {
        if (!r.ok) throw new Error('userinfo HTTP ' + r.status);
        return r.json();
      });
  }

  function applyTokens(tok) {
    var s = getSession() || {};
    s.accessToken = tok.access_token;
    if (tok.id_token) s.idToken = tok.id_token;
    if (tok.refresh_token) s.refreshToken = tok.refresh_token;
    s.expiresAt = Date.now() + (tok.expires_in || 3600) * 1000 - 60 * 1000;
    saveSession(s);
    return s;
  }

  function loadClaims(s) {
    return fetchUserinfo(s.accessToken).then(function (claims) {
      s.claims = claims;
      saveSession(s);
      return s;
    });
  }

  /* ---------- 对外流程 ---------- */

  var hooks = { onChange: null, toast: null, openExternal: null };

  function emitChange() { if (hooks.onChange) hooks.onChange(); }
  function notify(msg) { if (hooks.toast) hooks.toast(msg); }
  function openBrowser(url) {
    if (hooks.openExternal) { hooks.openExternal(url); return; }
    global.open(url, '_blank', 'noopener');
  }

  function signIn(create) {
    if (!global.crypto || !crypto.subtle) {
      notify(hooks.ctx && hooks.ctx.t ? hooks.ctx.t('loginWebUnavailable') : 'WebCrypto unavailable');
      return Promise.resolve(false);
    }
    var uri = redirectUri();
    if (!uri) {
      notify(hooks.ctx && hooks.ctx.t ? hooks.ctx.t('loginWebUnavailable') : 'Sign-in unavailable here');
      return Promise.resolve(false);
    }
    var state = randomB64url();
    var verifier = randomB64url();
    return challenge(verifier).then(function (cc) {
      saveFlow({ state: state, verifier: verifier, redirectUri: uri, create: !!create });
      var url = EP().authorize +
        '?response_type=code' +
        '&client_id=' + encodeURIComponent(CFG.clientId) +
        '&redirect_uri=' + encodeURIComponent(uri) +
        '&scope=' + encodeURIComponent(CFG.scope) +
        '&state=' + encodeURIComponent(state) +
        '&code_challenge=' + encodeURIComponent(cc) +
        '&code_challenge_method=S256' +
        (create ? '&prompt=create' : '');
      if (isTauri()) {
        openBrowser(url);
        emitChange(); /* 桌面版：弹提示 + 手动粘贴兜底 */
      } else {
        global.location.assign(url);
      }
      return true;
    });
  }

  /* 处理授权回调（桌面深链 URL 或网页版 location.search 参数） */
  function handleUrl(url) {
    var p = (url && typeof url === 'string') ? parseParams(url)
      : (url && typeof url === 'object' ? url : {});
    var flow = loadFlow();
    if (p.error) {
      clearFlow();
      notify(hooks.ctx && hooks.ctx.t ? hooks.ctx.t('loginCancelled') : ('Sign-in error: ' + p.error));
      emitChange();
      return Promise.resolve(null);
    }
    if (!p.code) return Promise.resolve(null);
    if (!flow || flow.state !== p.state) {
      notify(hooks.ctx && hooks.ctx.t ? hooks.ctx.t('loginStateMismatch') : 'Invalid sign-in state');
      return Promise.resolve(null);
    }
    return exchangeToken({ code: p.code, verifier: flow.verifier, redirectUri: flow.redirectUri })
      .then(function (tok) {
        clearFlow();
        var s = applyTokens(tok);
        return loadClaims(s);
      })
      .then(function (s) {
        emitChange();
        var name = (s.claims && (s.claims.name || s.claims.email)) || '';
        notify((hooks.ctx && hooks.ctx.t ? hooks.ctx.t('loginSuccess') : 'Signed in') + (name ? '，' + name : ''));
        return s;
      })
      .catch(function (err) {
        emitChange();
        notify((hooks.ctx && hooks.ctx.t ? hooks.ctx.t('loginFail') : 'Sign-in failed') + (err && err.message ? err.message : err));
        return null;
      });
  }

  function ensureSession() {
    var s = getSession();
    if (!s || !s.accessToken) return Promise.resolve(null);
    if (s.expiresAt && s.expiresAt > Date.now()) return Promise.resolve(s);
    if (!s.refreshToken) { clearSession(); emitChange(); return Promise.resolve(null); }
    return refreshToken(s.refreshToken)
      .then(function (tok) {
        var ns = applyTokens(tok);
        return loadClaims(ns);
      })
      .then(function (ns) { emitChange(); return ns; })
      .catch(function () {
        return getSession(); /* 网络失败时保留旧会话，下次再试 */
      });
  }

  function signOut() {
    clearSession();
    clearFlow();
    emitChange();
    var end = EP().endSession;
    var params = [];
    /* Better Auth end-session：无 id_token_hint 时走浏览器确认页。
       回跳统一用网页 URL —— 自定义 scheme（unoeditor://）不是合法浏览器导航目标，
       确认后会停在 IdP 页面，再点则 state 已消费报 invalid or expired。
       post_logout_redirect_uri 须精确匹配服务端注册项。 */
    var uri = CFG.webRedirect;
    if (uri) {
      params.push('client_id=' + encodeURIComponent(CFG.clientId));
      params.push('post_logout_redirect_uri=' + encodeURIComponent(uri));
    }
    if (params.length) end += '?' + params.join('&');
    if (isTauri()) openBrowser(end);
    else if (global.location) global.location.assign(end);
  }

  function manualComplete(pastedUrl) {
    return handleUrl(String(pastedUrl || '').trim());
  }

  function init(opts) {
    opts = opts || {};
    hooks.onChange = opts.onChange || null;
    hooks.toast = opts.toast || null;
    hooks.openExternal = opts.openExternal || null;
    hooks.ctx = opts.ctx || null;
    ensureSession().then(function () { emitChange(); });
  }

  /* 桌面版：监听 deep-link 插件推送的回调 URL（withGlobalTauri 全局 API） */
  function bindTauriDeepLink() {
    try {
      var T = global.__TAURI__;
      if (!T || !T.deepLink || !T.event || !T.event.listen) return;
      T.deepLink.onOpenUrl(function (urls) {
        if (urls && urls.length) handleUrl(urls[0]);
      });
      // 应用已在运行时，macOS 会启动第二实例并把深链放进 argv；
      // single-instance 插件把它作为 uno-deep-link 事件转发到本实例。
      T.event.listen('uno-deep-link', function (e) {
        var urls = e && e.payload;
        if (Array.isArray(urls) && urls.length) handleUrl(urls[0]);
        else if (typeof urls === 'string' && urls.indexOf('unoeditor://') === 0) handleUrl(urls);
      });
      T.deepLink.getCurrent().then(function (url) {
        if (url && String(url).indexOf('unoeditor://') === 0) handleUrl(url);
      }).catch(function () { });
    } catch (e) { /* 非 Tauri 环境忽略 */ }
  }

  /* 网页版：从当前地址栏解析 ?code=… */
  function handleWebRedirect() {
    if (isTauri() || !global.location) return;
    var q = new URLSearchParams(global.location.search);
    if (!q.has('code') && !q.has('error')) return;
    var params = { code: q.get('code'), state: q.get('state'), error: q.get('error'), iss: q.get('iss') };
    try { history.replaceState(null, '', CFG.webRedirect); } catch (e) { }
    handleUrl(params);
  }

  function boot() {
    bindTauriDeepLink();
    handleWebRedirect();
  }

  global.UnoAuth = {
    init: init,
    boot: boot,
    signIn: signIn,
    signOut: signOut,
    manualComplete: manualComplete,
    getSession: getSession,
    ensureSession: ensureSession,
    isTauri: isTauri,
    config: CFG
  };
})(window);
