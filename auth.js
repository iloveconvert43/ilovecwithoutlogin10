/* ═══════════════════════════════════════════════════════════════
   iLoveConvert — auth.js  v1.0
   Handles:
     • Auth state management (Supabase)
     • Persistent sessions + auto-refresh
     • Nav auth widget injection (all page types)
     • IndexedDB local history (anonymous users)
     • Cloud history sync on login
     • Page guard for protected routes
     • Favorite tools toggle
     • window.ilcLogHistory() for tool pages
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── CONSTANTS ─────────────────────────────────── */
  var PROTECTED = ['dashboard.html', 'history.html', 'account.html'];
  var LOGIN_PAGE = 'login.html';
  var IDB_NAME   = 'ilc_local_history';
  var IDB_STORE  = 'history';
  var IDB_VER    = 1;

  /* ── INJECT AUTH CSS ───────────────────────────── */
  var CSS = `
/* ══ iLC AUTH WIDGET ══ */
.ilc-auth-btn{display:inline-flex;align-items:center;gap:6px;padding:5px 12px;border-radius:8px;
  background:rgba(229,62,62,.12);border:1px solid rgba(229,62,62,.3);color:#e53e3e;
  font-size:.76rem;font-weight:700;cursor:pointer;font-family:inherit;text-decoration:none;
  transition:.18s;white-space:nowrap;flex-shrink:0}
.ilc-auth-btn:hover{background:rgba(229,62,62,.2);border-color:rgba(229,62,62,.5);transform:translateY(-1px)}
[data-theme="light"] .ilc-auth-btn{background:rgba(229,62,62,.08);border-color:rgba(229,62,62,.25)}
.ilc-user-wrap{position:relative;flex-shrink:0}
.ilc-avatar-btn{width:33px;height:33px;border-radius:9px;background:linear-gradient(135deg,#e53e3e,#7c3aed);
  border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;
  font-size:.82rem;font-weight:800;color:#fff;font-family:inherit;position:relative;transition:.18s}
.ilc-avatar-btn:hover{transform:scale(1.08)}
.ilc-avatar-btn .ilc-online{position:absolute;bottom:-2px;right:-2px;width:9px;height:9px;
  border-radius:50%;background:#22c55e;border:2px solid var(--bg,#050508)}
.ilc-drop{position:absolute;top:calc(100% + 8px);right:0;min-width:210px;background:var(--bg2,#0a0a10);
  border:1px solid rgba(255,255,255,.1);border-radius:14px;box-shadow:0 16px 50px rgba(0,0,0,.5);
  z-index:9999;overflow:hidden;display:none;animation:ilcDropIn .18s ease}
[data-theme="light"] .ilc-drop{background:#fff;border-color:rgba(18,19,42,.1);box-shadow:0 8px 40px rgba(18,19,42,.12)}
@keyframes ilcDropIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.ilc-drop.open{display:block}
.ilc-drop-head{padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,.07)}
[data-theme="light"] .ilc-drop-head{border-color:rgba(18,19,42,.08)}
.ilc-drop-email{font-size:.73rem;color:var(--txt2,#8888a8);font-weight:600;word-break:break-all}
.ilc-drop-plan{font-size:.67rem;font-weight:700;color:#22c55e;margin-top:2px}
.ilc-drop-links{padding:6px}
.ilc-drop-links a,.ilc-drop-links button{display:flex;align-items:center;gap:8px;padding:8px 10px;
  border-radius:8px;font-size:.8rem;font-weight:600;color:var(--txt2,#8888a8);text-decoration:none;
  transition:.15s;width:100%;background:none;border:none;cursor:pointer;font-family:inherit;text-align:left}
.ilc-drop-links a:hover,.ilc-drop-links button:hover{background:rgba(255,255,255,.06);color:var(--txt,#eeeef5)}
[data-theme="light"] .ilc-drop-links a:hover,[data-theme="light"] .ilc-drop-links button:hover{background:#f7f8fc;color:#12132a}
.ilc-drop-div{height:1px;background:rgba(255,255,255,.07);margin:4px 6px}
[data-theme="light"] .ilc-drop-div{background:rgba(18,19,42,.07)}
.ilc-drop-links .ilc-logout-btn{color:#e53e3e}
.ilc-drop-links .ilc-logout-btn:hover{background:rgba(229,62,62,.08)!important}
/* Mobile auth in mob-nav */
.ilc-mob-auth-section{padding:8px;border-top:1px solid rgba(255,255,255,.07);margin-top:4px}
[data-theme="light"] .ilc-mob-auth-section{border-top-color:rgba(18,19,42,.08)}
/* Toast */
#ilcAuthToast{position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);
  background:#0f172a;border:1px solid rgba(255,255,255,.12);color:#eeeef5;padding:10px 20px;
  border-radius:20px;font-size:.82rem;font-weight:600;z-index:10000;opacity:0;transition:.3s;
  white-space:nowrap;pointer-events:none;font-family:'Plus Jakarta Sans',system-ui,sans-serif}
[data-theme="light"] #ilcAuthToast{background:#fff;border-color:rgba(18,19,42,.1);color:#12132a;box-shadow:0 4px 20px rgba(18,19,42,.12)}
#ilcAuthToast.show{opacity:1;transform:translateX(-50%) translateY(0)}
/* Fav btn on tool pages */
.ilc-fav-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:9px;
  background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);
  font-size:.78rem;font-weight:700;color:var(--txt2,#8888a8);cursor:pointer;
  font-family:inherit;transition:.18s}
.ilc-fav-btn:hover{background:rgba(255,255,255,.1);color:var(--txt,#eeeef5)}
.ilc-fav-btn.active{background:rgba(245,158,11,.1);border-color:rgba(245,158,11,.3);color:#f59e0b}
[data-theme="light"] .ilc-fav-btn{background:rgba(18,19,42,.04);border-color:rgba(18,19,42,.1);color:#52546e}
[data-theme="light"] .ilc-fav-btn.active{background:rgba(245,158,11,.08)}
`;
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);

  /* ── TOAST ─────────────────────────────────────── */
  var toastEl = document.createElement('div');
  toastEl.id = 'ilcAuthToast';
  document.body.appendChild(toastEl);
  var toastTimer;
  function toast(msg, dur) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('show'); }, dur || 2800);
  }

  /* ── BUILD AUTH WIDGET HTML ─────────────────────── */
  function buildWidget() {
    var wrap = document.createElement('div');
    wrap.id  = 'ilcAuthWrap';
    wrap.className = 'ilc-user-wrap';
    wrap.style.display = 'none'; /* hidden until auth state known */

    /* Login button (shown when logged out) */
    var loginBtn = document.createElement('a');
    loginBtn.id = 'ilcLoginBtn';
    loginBtn.href = LOGIN_PAGE;
    loginBtn.className = 'ilc-auth-btn';
    loginBtn.textContent = '👤 Sign In';

    /* Avatar button (shown when logged in) */
    var avatarBtn = document.createElement('button');
    avatarBtn.id = 'ilcAvatarBtn';
    avatarBtn.className = 'ilc-avatar-btn';
    avatarBtn.setAttribute('aria-label', 'Account menu');
    avatarBtn.innerHTML = '<span id="ilcAvatarLetter">U</span><span class="ilc-online"></span>';
    avatarBtn.style.display = 'none';

    /* Dropdown */
    var drop = document.createElement('div');
    drop.id = 'ilcAuthDrop';
    drop.className = 'ilc-drop';
    drop.innerHTML = `
      <div class="ilc-drop-head">
        <div class="ilc-drop-email" id="ilcDropEmail">Loading…</div>
        <div class="ilc-drop-plan">✨ Free Plan</div>
      </div>
      <div class="ilc-drop-links">
        <a href="dashboard.html">📊 Dashboard</a>
        <a href="history.html">🕓 History</a>
        <a href="account.html">⚙️ Account</a>
        <div class="ilc-drop-div"></div>
        <button class="ilc-logout-btn" id="ilcLogoutBtn">🚪 Sign Out</button>
      </div>
    `;

    wrap.appendChild(loginBtn);
    wrap.appendChild(avatarBtn);
    wrap.appendChild(drop);
    return wrap;
  }

  /* ── INJECT WIDGET INTO NAV ─────────────────────── */
  function injectNavWidget() {
    var widget = buildWidget();

    /* Tool pages: i-site-nav with i-nav-sp */
    var iNavSp = document.querySelector('.i-nav-sp');
    if (iNavSp) {
      iNavSp.insertAdjacentElement('afterend', widget);
    }

    /* Index page: mainNav with nav-sp */
    var navSp = document.querySelector('.nav-sp, .nav-srch');
    if (navSp && !iNavSp) {
      navSp.insertAdjacentElement('afterend', widget);
    }

    /* Category pages: cat-nav with flex:1 spacer — insert before cat-theme */
    var catTheme = document.querySelector('.cat-theme');
    if (catTheme && !iNavSp && !navSp) {
      catTheme.insertAdjacentElement('beforebegin', widget);
    }

    /* Fallback: static pages (privacy, about, terms) — append to first nav */
    if (!document.getElementById('ilcAuthWrap')) {
      var nav = document.querySelector('nav');
      if (nav) nav.appendChild(widget);
    }

    /* Mobile nav injection */
    injectMobAuth();

    /* Toggle dropdown on avatar click */
    var avatarBtn = document.getElementById('ilcAvatarBtn');
    var drop      = document.getElementById('ilcAuthDrop');
    if (avatarBtn && drop) {
      avatarBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        drop.classList.toggle('open');
      });
      document.addEventListener('click', function (e) {
        if (!e.target.closest('#ilcAuthWrap')) drop.classList.remove('open');
      });
    }

    /* Logout button */
    var logoutBtn = document.getElementById('ilcLogoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', ilcSignOut);
  }

  function injectMobAuth() {
    /* Mobile nav (tool pages) */
    var mob1 = document.getElementById('i-mob-nav');
    /* Mobile drawer (index) */
    var mob2 = document.getElementById('mobDrawer');
    /* Cat mob */
    var mob3 = document.getElementById('cat-mob-menu');
    var mobTarget = mob1 || mob2 || mob3;
    if (!mobTarget) return;

    var sec = document.createElement('div');
    sec.id = 'ilcMobAuthSec';
    sec.className = 'ilc-mob-auth-section';
    sec.innerHTML = `
      <a href="${LOGIN_PAGE}" id="ilcMobLoginLink" style="padding:10px 13px;border-radius:9px;font-size:.88rem;font-weight:700;color:#e53e3e;display:block;text-decoration:none">👤 Sign In / Create Account</a>
      <div id="ilcMobUserInfo" style="display:none;padding:8px 13px">
        <div style="font-size:.78rem;font-weight:700;color:var(--txt2,#8888a8)" id="ilcMobEmail"></div>
        <div style="display:flex;flex-direction:column;gap:2px;margin-top:8px">
          <a href="dashboard.html" style="padding:8px 10px;border-radius:8px;font-size:.85rem;font-weight:600;color:var(--txt2,#8888a8);text-decoration:none;display:block">📊 Dashboard</a>
          <a href="history.html" style="padding:8px 10px;border-radius:8px;font-size:.85rem;font-weight:600;color:var(--txt2,#8888a8);text-decoration:none;display:block">🕓 History</a>
          <a href="account.html" style="padding:8px 10px;border-radius:8px;font-size:.85rem;font-weight:600;color:var(--txt2,#8888a8);text-decoration:none;display:block">⚙️ Account</a>
          <button onclick="ilcSignOut()" style="padding:8px 10px;border-radius:8px;font-size:.85rem;font-weight:600;color:#e53e3e;background:none;border:none;cursor:pointer;font-family:inherit;text-align:left;display:block;width:100%">🚪 Sign Out</button>
        </div>
      </div>
    `;
    mobTarget.appendChild(sec);
  }

  /* ── UPDATE UI FOR AUTH STATE ───────────────────── */
  function updateNavUI(user) {
    var wrap      = document.getElementById('ilcAuthWrap');
    var loginBtn  = document.getElementById('ilcLoginBtn');
    var avatarBtn = document.getElementById('ilcAvatarBtn');
    var letter    = document.getElementById('ilcAvatarLetter');
    var email     = document.getElementById('ilcDropEmail');

    /* Mobile */
    var mobLogin = document.getElementById('ilcMobLoginLink');
    var mobUser  = document.getElementById('ilcMobUserInfo');
    var mobEmail = document.getElementById('ilcMobEmail');

    if (wrap) wrap.style.display = '';

    if (user) {
      if (loginBtn)  loginBtn.style.display  = 'none';
      if (avatarBtn) avatarBtn.style.display = '';
      if (letter)    letter.textContent = (user.email || 'U')[0].toUpperCase();
      if (email)     email.textContent  = user.email || '';

      if (mobLogin) mobLogin.style.display = 'none';
      if (mobUser)  mobUser.style.display  = '';
      if (mobEmail) mobEmail.textContent   = user.email || '';

      /* Inject fav buttons if on a tool page */
      injectFavBtn();
    } else {
      if (loginBtn)  loginBtn.style.display  = '';
      if (avatarBtn) avatarBtn.style.display = 'none';

      if (mobLogin) mobLogin.style.display = '';
      if (mobUser)  mobUser.style.display  = 'none';
    }
  }

  /* ── PAGE GUARD ─────────────────────────────────── */
  function guardPage(user) {
    var page = location.pathname.split('/').pop() || 'index.html';
    var isProtected = PROTECTED.some(function (p) { return page === p || page.indexOf(p) !== -1; });
    if (isProtected && !user) {
      location.replace(LOGIN_PAGE + '?next=' + encodeURIComponent(page));
    }
    /* Redirect away from login if already logged in */
    if ((page === LOGIN_PAGE || page === 'login') && user) {
      var next = new URLSearchParams(location.search).get('next') || 'dashboard.html';
      location.replace(next);
    }
  }

  /* ── SIGN OUT ───────────────────────────────────── */
  window.ilcSignOut = function () {
    if (!window.ilcSupabase) return;
    window.ilcSupabase.auth.signOut().then(function () {
      toast('✅ Signed out');
      setTimeout(function () { location.href = 'index.html'; }, 800);
    });
  };

  /* ── INDEXEDDB LOCAL HISTORY ────────────────────── */
  var idb = null;
  function openIDB(cb) {
    if (idb) { cb(idb); return; }
    var req = indexedDB.open(IDB_NAME, IDB_VER);
    req.onupgradeneeded = function (e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        var store = db.createObjectStore(IDB_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('created_at', 'created_at');
      }
    };
    req.onsuccess = function (e) { idb = e.target.result; cb(idb); };
    req.onerror   = function () { cb(null); };
  }

  function idbSave(record) {
    openIDB(function (db) {
      if (!db) return;
      var tx  = db.transaction(IDB_STORE, 'readwrite');
      var st  = tx.objectStore(IDB_STORE);
      record.created_at = new Date().toISOString();
      st.add(record);
    });
  }

  function idbGetAll(cb) {
    openIDB(function (db) {
      if (!db) { cb([]); return; }
      var tx    = db.transaction(IDB_STORE, 'readonly');
      var store = tx.objectStore(IDB_STORE);
      var req   = store.getAll();
      req.onsuccess = function () { cb(req.result || []); };
      req.onerror   = function () { cb([]); };
    });
  }

  function idbClear() {
    openIDB(function (db) {
      if (!db) return;
      db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).clear();
    });
  }

  /* ── SYNC LOCAL → SUPABASE ──────────────────────── */
  function syncLocalToCloud(userId) {
    idbGetAll(function (records) {
      if (!records.length) return;
      var rows = records.map(function (r) {
        return {
          user_id    : userId,
          tool_name  : r.tool_name  || '',
          file_name  : r.file_name  || '',
          action_type: r.action_type || '',
          result_url : r.result_url || null,
          created_at : r.created_at || new Date().toISOString()
        };
      });
      window.ilcSupabase.from('tool_history').insert(rows)
        .then(function (res) {
          if (!res.error) {
            idbClear();
            toast('☁️ ' + rows.length + ' local sessions synced!');
          }
        });
    });
  }

  /* ── LOG HISTORY (called by tool pages) ─────────── */
  window.ilcLogHistory = function (toolName, fileName, actionType, resultUrl) {
    var record = {
      tool_name  : toolName   || document.title,
      file_name  : fileName   || '',
      action_type: actionType || 'convert',
      result_url : resultUrl  || null
    };
    var user = window._ilcCurrentUser;
    if (user && window.ilcSupabase) {
      window.ilcSupabase.from('tool_history').insert([Object.assign({}, record, {
        user_id   : user.id,
        created_at: new Date().toISOString()
      })]).then(function (r) {
        if (r.error) idbSave(record); /* fallback to local */
      });
    } else {
      idbSave(record);
    }
  };

  /* ── FAVORITES ──────────────────────────────────── */
  window._ilcFavs = [];

  function loadFavs(userId) {
    if (!window.ilcSupabase) return;
    window.ilcSupabase.from('favorite_tools')
      .select('tool_name')
      .eq('user_id', userId)
      .then(function (r) {
        if (!r.error && r.data) {
          window._ilcFavs = r.data.map(function (x) { return x.tool_name; });
          updateFavBtn();
        }
      });
  }

  window.ilcToggleFav = function (toolName) {
    var user = window._ilcCurrentUser;
    if (!user) { toast('👤 Sign in to save favourites'); return; }
    var idx = window._ilcFavs.indexOf(toolName);
    if (idx === -1) {
      window.ilcSupabase.from('favorite_tools')
        .insert([{ user_id: user.id, tool_name: toolName, created_at: new Date().toISOString() }])
        .then(function (r) {
          if (!r.error) {
            window._ilcFavs.push(toolName);
            updateFavBtn();
            toast('⭐ Added to favourites!');
          }
        });
    } else {
      window.ilcSupabase.from('favorite_tools')
        .delete().eq('user_id', user.id).eq('tool_name', toolName)
        .then(function (r) {
          if (!r.error) {
            window._ilcFavs.splice(idx, 1);
            updateFavBtn();
            toast('✅ Removed from favourites');
          }
        });
    }
  };

  function getToolName() {
    /* Use page data attr or title */
    return document.body.dataset.toolName ||
           document.querySelector('h1') && document.querySelector('h1').textContent.split('—')[0].trim() ||
           document.title.split('|')[0].trim();
  }

  function injectFavBtn() {
    if (document.getElementById('ilcFavBtn')) return; /* already injected */
    var hero = document.querySelector('.tool-hero, .hero');
    if (!hero) return;
    var toolName = getToolName();
    var btn = document.createElement('button');
    btn.id = 'ilcFavBtn';
    btn.className = 'ilc-fav-btn';
    btn.onclick = function () { window.ilcToggleFav(toolName); };
    btn.innerHTML = '⭐ Add to Favourites';
    btn.style.marginTop = '10px';
    hero.appendChild(btn);
    updateFavBtn();
  }

  function updateFavBtn() {
    var btn      = document.getElementById('ilcFavBtn');
    var toolName = getToolName();
    if (!btn) return;
    var isFav = window._ilcFavs.indexOf(toolName) !== -1;
    btn.innerHTML  = isFav ? '⭐ Saved to Favourites' : '⭐ Add to Favourites';
    btn.className  = 'ilc-fav-btn' + (isFav ? ' active' : '');
  }

  /* ── MAIN INIT ──────────────────────────────────── */
  function boot() {
    injectNavWidget();

    if (!window.ilcSupabase) {
      /* Supabase unavailable — show login btn, allow anon use */
      updateNavUI(null);
      return;
    }

    /* Listen for auth state changes */
    window.ilcSupabase.auth.onAuthStateChange(function (event, session) {
      var user = session ? session.user : null;
      window._ilcCurrentUser = user;
      updateNavUI(user);
      guardPage(user);

      if (event === 'SIGNED_IN' && user) {
        syncLocalToCloud(user.id);
        loadFavs(user.id);
        toast('👋 Welcome back, ' + (user.email || '').split('@')[0] + '!');
      }
      if (event === 'SIGNED_OUT') {
        window._ilcFavs = [];
      }
    });

    /* Get current session (persisted) */
    window.ilcSupabase.auth.getSession().then(function (r) {
      var user = r.data && r.data.session ? r.data.session.user : null;
      window._ilcCurrentUser = user;
      updateNavUI(user);
      guardPage(user);
      if (user) loadFavs(user.id);
    }).catch(function () {
      updateNavUI(null);
      guardPage(null);
    });
  }

  /* Wait for Supabase to be ready */
  if (window.ilcSupabase) {
    boot();
  } else {
    document.addEventListener('ilcSupabaseReady', boot);
    document.addEventListener('ilcSupabaseError', function () {
      injectNavWidget();
      updateNavUI(null);
      guardPage(null);
    });
    /* Safety timeout: if SDK doesn't load in 4s, degrade gracefully */
    setTimeout(function () {
      if (!window.ilcSupabase) {
        injectNavWidget();
        updateNavUI(null);
        guardPage(null);
      }
    }, 4000);
  }

  /* ── EXPOSE HELPERS ─────────────────────────────── */
  window.ilcGetUser = function () { return window._ilcCurrentUser || null; };

}());
