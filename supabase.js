/* ═══════════════════════════════════════════════════════════════
   iLoveConvert — supabase.js
   Loads Supabase SDK from CDN, initializes the client, and
   exposes window.ilcSupabase for use by auth.js and tool pages.
   ═══════════════════════════════════════════════════════════════ */
(function () {
  'use strict';

  var SUPABASE_URL  = 'https://azxtfybmjpdgcfbhkutk.supabase.co';
  var SUPABASE_ANON = 'sb_publishable_TZmUouHl_MXze5cWA9m-0Q_tAQ0I1qU';

  function init(lib) {
    try {
      window.ilcSupabase = lib.createClient(SUPABASE_URL, SUPABASE_ANON, {
        auth: {
          persistSession    : true,   // session survives tab close
          autoRefreshToken  : true,
          storageKey        : 'ilc_sb_auth',
          storage           : window.localStorage,
          detectSessionInUrl: true    // picks up OAuth redirects
        }
      });
      document.dispatchEvent(new CustomEvent('ilcSupabaseReady'));
    } catch (err) {
      console.warn('[iLC Supabase] init error:', err);
      document.dispatchEvent(new CustomEvent('ilcSupabaseError', { detail: err }));
    }
  }

  /* If supabase SDK is already present on page (manual inclusion) */
  if (window.supabase && window.supabase.createClient) {
    init(window.supabase);
    return;
  }

  /* Otherwise load from CDN */
  var s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.js';
  s.crossOrigin = 'anonymous';
  s.onload = function () {
    if (window.supabase) init(window.supabase);
    else console.error('[iLC Supabase] SDK loaded but createClient not found');
  };
  s.onerror = function () {
    console.warn('[iLC Supabase] CDN load failed — offline mode');
    document.dispatchEvent(new CustomEvent('ilcSupabaseError', { detail: 'CDN failed' }));
  };
  document.head.appendChild(s);
}());
