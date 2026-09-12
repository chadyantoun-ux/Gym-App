/* PHAT Log - service worker.  E-4.
   ---------------------------------------------------------------------------
   WHAT THIS IS FOR: the gym has no signal. Without this file an offline reload
   works only on HTTP-cache luck. With it, the app shell is in Cache Storage and
   opens with the radio off.

   WHAT IT CACHES: the app shell - index.html, logic.js, the manifest, the
   icons, the inlined typeface, the backup client, and the exercise
   photographs under assets/ex/. NOTHING ELSE. It never touches localStorage,
   never sees phat:v1:log, phat:v1:bw or phat:v1:draft, and never handles a
   request that is not a same-origin GET for one of the files named in SHELL
   below. It caches the app. It does not cache the data, and it cannot reach the
   data: localStorage is not exposed to a worker scope at all.

   STRATEGY: cache-first, then one atomic background refresh per launch.
     - Cache-first, so opening the app never waits on a network that is not
       there. One bar of signal must not cost him a 30 s stare at a blank
       screen.
     - The refresh re-fetches the WHOLE core shell and commits nothing unless
       EVERY core file came back a real 200. A half-succeeded refresh leaves the
       previous, consistent pair in place. index.html and logic.js are one unit;
       a new index.html over a stale logic.js is the black-screen failure mode.
     - Worst case staleness: ONE launch. A deploy lands in the cache while he is
       using the old copy, and is what he gets the next time he opens the app.
       There is no path where a bad cache serves a stale app forever, because
       the refresh runs every launch and is not gated on the version below.

   NEVER CACHE A FAILURE: usable() requires status exactly 200 (so a 404 body, a
   206 partial and a 30x are all rejected), a non-opaque response, and a
   content-type that matches the extension. A cached 404 of logic.js is exactly
   the black screen index.html already has a guard for; it cannot get in here.

   VERSION: bump VERSION to force every installed app to rebuild its shell from
   the network on the next launch and delete the old cache. Only needed if the
   shell FILE LIST changes or a cached entry must be discarded - routine content
   deploys are handled by the per-launch refresh and need no bump.
   ONE EXCEPTION, the photographs: PHOTOS are filled in, never re-fetched (see
   the PHOTOS comment), so a photo that changes bytes under the SAME path is
   only ever delivered by a VERSION bump. A new photo set = a bump. Always. */

'use strict';

/* v2 (2026-09-11, WO-005 Wave 6a): first version any browser has ever seen,
   because index.html gained its registration in the same commit - before it,
   nothing called register() and v1 was never installed anywhere. Bumped
   anyway, and the reason is the rule above: the SHELL FILE LIST changed under
   v1 when B-68 added the four icons, so v1 and v2 do not describe the same
   set of files. A version that was correct in the repo but stale in the file
   list is exactly the thing this constant exists to discard. */
/* v3 (2026-09-11, E-3): sync.js joins the OPTIONAL list. A file-list change
   is one of the two reasons this constant moves. OPTIONAL and not CORE on
   purpose: the backup client is an upgrade to Settings, never a dependency
   of logging, and its absence may not fail an install. The CDN module it
   imports is cross-origin and is NOT precached - the fetch handler ignores
   every origin but this one, and an opaque response cannot be verified by
   usable(), so it has no place in an atomic shell. */
/* v4 (2026-09-12, WO-006 W5): the Plan Editor release. Bumped on the release
   instruction because index.html and logic.js both changed shape (PROGRAM is
   now plan-derived). Strictly, the rule above did not require it - the file
   list is unchanged and the per-launch refresh would have carried the new
   pair on its own - and it is harmless: install fills v4 completely before
   activate deletes v3, so no launch is ever left without a shell. */
/* v5 (2026-09-12, WO-009 W3): the exercise photographs join the shell as
   PHOTOS, 48 files under assets/ex/ generated from assets/ex/manifest.json.
   The file list changed, so the header rule fires. Also: usable() gains a
   .jpg rule (B-103 - until now a 404 page served as 200 text/html would have
   been cached as a photograph, and every real photo would have been refused
   under a stricter reading), and PHOTOS get their own refresh policy. */
var VERSION = 'v5';
var PREFIX  = 'phat-shell-';
var CACHE   = PREFIX + VERSION;

/* Resolved against this file's URL, so the same worker is correct at the domain
   root (Vercel production and every preview URL) and under a sub-path. */
function abs(p){ return new URL(p, self.location).href; }

/* CORE: the app does not exist without these. Install fails if either is
   missing, rather than activating a worker that serves half an app. */
var CORE = [ abs('./index.html'), abs('./logic.js') ];

/* OPTIONAL: wanted offline, but their absence is not a broken app. A missing
   icon costs a grey launcher tile; a missing typeface costs the fallback
   stack. Neither can fail an install, because each is fetched inside its own
   catch.
   ALL SEVEN EXIST ON DISK as of 2026-09-11 (sync.js since E-3; the photographs are the
   separate PHOTOS list below, generated, not this one) (B-68 closed - placeholder icons
   generated by scripts/make-icons.mjs, Chady's artwork replaces the PNGs and
   nothing else). Re-check this list against `ls assets/` before every deploy:
   sw.js refuses to cache a non-200, so an entry that 404s is simply never
   cached, and on the CORE list it would be a FAILED INSTALL.
   IF YOU ADD A FILE THE APP NEEDS, ADD IT HERE. Anything not on this list is
   not available offline, by design. tests.html is deliberately absent - it is
   a developer harness, not the app, and the fetch handler ignores it. */
var OPTIONAL = [
  abs('./manifest.webmanifest'),
  abs('./assets/archivo-inline.css'),
  abs('./assets/icon-192.png'),
  abs('./assets/icon-512.png'),
  abs('./assets/icon-maskable-512.png'),
  abs('./assets/apple-touch-icon-180.png'),
  abs('./sync.js')            /* E-3: the backup client; an upgrade, not a dependency */
];

/* PHOTOS: the exercise photographs, WO-009. Same footing as OPTIONAL at
   install - fetched after CORE, each inside its own catch, so a dropped
   connection halfway through the set costs photos and never the app (the cue
   renders alone; W2's missing-image state). DIFFERENT footing at refresh:
   OPTIONAL is re-fetched every launch because sync.js and the icons change
   with deploys and are small. PHOTOS are ~0.7 MB across 48 files and change
   only when the coach changes the map, so the per-launch refresh FILLS GAPS -
   it fetches a photo that is not in the cache and leaves one that is. That
   is what carries a photo dropped by a dead connection at install to the
   phone on a later launch, without paying 48 downloads over mobile data on
   every open. The price, stated in the header: a photo re-shot under the
   same path reaches an installed app only through a VERSION bump.
   THE ARRAY BELOW IS GENERATED from assets/ex/manifest.json by
   scripts/make-photos.mjs. Never edit it by hand: verify-deploy.sh refuses to
   run when its length, the manifest and the files on disk disagree. */
/* GENERATED by scripts/make-photos.mjs from assets/ex/manifest.json -- begin */
var PHOTOS = [   /* 48 files, 24 exercises, 740232 bytes, upstream a859101 */
  abs('./assets/ex/Barbell_Squat-0.jpg'),
  abs('./assets/ex/Barbell_Squat-1.jpg'),
  abs('./assets/ex/Bent_Over_Barbell_Row-0.jpg'),
  abs('./assets/ex/Bent_Over_Barbell_Row-1.jpg'),
  abs('./assets/ex/Close-Grip_Barbell_Bench_Press-0.jpg'),
  abs('./assets/ex/Close-Grip_Barbell_Bench_Press-1.jpg'),
  abs('./assets/ex/Concentration_Curls-0.jpg'),
  abs('./assets/ex/Concentration_Curls-1.jpg'),
  abs('./assets/ex/Dips_-_Chest_Version-0.jpg'),
  abs('./assets/ex/Dips_-_Chest_Version-1.jpg'),
  abs('./assets/ex/Dumbbell_Bench_Press-0.jpg'),
  abs('./assets/ex/Dumbbell_Bench_Press-1.jpg'),
  abs('./assets/ex/EZ-Bar_Curl-0.jpg'),
  abs('./assets/ex/EZ-Bar_Curl-1.jpg'),
  abs('./assets/ex/EZ-Bar_Skullcrusher-0.jpg'),
  abs('./assets/ex/EZ-Bar_Skullcrusher-1.jpg'),
  abs('./assets/ex/Hack_Squat-0.jpg'),
  abs('./assets/ex/Hack_Squat-1.jpg'),
  abs('./assets/ex/Incline_Cable_Flye-0.jpg'),
  abs('./assets/ex/Incline_Cable_Flye-1.jpg'),
  abs('./assets/ex/Incline_Dumbbell_Press-0.jpg'),
  abs('./assets/ex/Incline_Dumbbell_Press-1.jpg'),
  abs('./assets/ex/Leg_Extensions-0.jpg'),
  abs('./assets/ex/Leg_Extensions-1.jpg'),
  abs('./assets/ex/Leg_Press-0.jpg'),
  abs('./assets/ex/Leg_Press-1.jpg'),
  abs('./assets/ex/Lying_Leg_Curls-0.jpg'),
  abs('./assets/ex/Lying_Leg_Curls-1.jpg'),
  abs('./assets/ex/Machine_Bench_Press-0.jpg'),
  abs('./assets/ex/Machine_Bench_Press-1.jpg'),
  abs('./assets/ex/One-Arm_Dumbbell_Row-0.jpg'),
  abs('./assets/ex/One-Arm_Dumbbell_Row-1.jpg'),
  abs('./assets/ex/Preacher_Curl-0.jpg'),
  abs('./assets/ex/Preacher_Curl-1.jpg'),
  abs('./assets/ex/Seated_Cable_Rows-0.jpg'),
  abs('./assets/ex/Seated_Cable_Rows-1.jpg'),
  abs('./assets/ex/Seated_Calf_Raise-0.jpg'),
  abs('./assets/ex/Seated_Calf_Raise-1.jpg'),
  abs('./assets/ex/Seated_Leg_Curl-0.jpg'),
  abs('./assets/ex/Seated_Leg_Curl-1.jpg'),
  abs('./assets/ex/Side_Lateral_Raise-0.jpg'),
  abs('./assets/ex/Side_Lateral_Raise-1.jpg'),
  abs('./assets/ex/Spider_Curl-0.jpg'),
  abs('./assets/ex/Spider_Curl-1.jpg'),
  abs('./assets/ex/Standing_Calf_Raises-0.jpg'),
  abs('./assets/ex/Standing_Calf_Raises-1.jpg'),
  abs('./assets/ex/Triceps_Pushdown_-_Rope_Attachment-0.jpg'),
  abs('./assets/ex/Triceps_Pushdown_-_Rope_Attachment-1.jpg')
];
/* GENERATED by scripts/make-photos.mjs -- end */

var SHELL_HTML = CORE[0];
var SHELL = CORE.concat(OPTIONAL, PHOTOS);

/* pathname -> cache key. Requests match on pathname so a launch at "/" and a
   launch at "/index.html" hit one cached copy, not two. */
var BY_PATH = (function(){
  var m = Object.create(null), i, u;
  for (i = 0; i < SHELL.length; i++){ u = new URL(SHELL[i]); m[u.pathname] = SHELL[i]; }
  m[new URL('./', self.location).pathname] = SHELL_HTML;   /* "/" serves index.html */
  return m;
})();

var NAV_PATHS = [ new URL('./', self.location).pathname,
                  new URL('./index.html', self.location).pathname ];

/* ----------------------------------------------------------------- guards */

/* A response is cacheable only if it is a complete, successful, same-origin
   answer of the type the URL claims. Anything else is dropped on the floor. */
function usable(res, url){
  if (!res) return false;
  if (res.status !== 200) return false;                 /* 404, 500, 30x, 206 */
  if (res.type === 'opaque' || res.type === 'opaqueredirect' || res.type === 'error') return false;
  var ct = (res.headers.get('content-type') || '').toLowerCase();
  var p  = String(url).split('?')[0].toLowerCase();
  if (!ct) return true;                                 /* no claim, no contradiction */
  if (/\.js$/.test(p))          return ct.indexOf('javascript') >= 0 || ct.indexOf('ecmascript') >= 0;
  if (/\.html$/.test(p))        return ct.indexOf('html') >= 0;
  if (/\.css$/.test(p))         return ct.indexOf('css') >= 0;
  if (/\.png$/.test(p))         return ct.indexOf('image/') >= 0;
  if (/\.jpe?g$/.test(p))       return ct.indexOf('image/') >= 0;   /* B-103: a 200 text/html is not a photo */
  if (/\.webmanifest$/.test(p)) return ct.indexOf('json') >= 0 || ct.indexOf('manifest') >= 0;
  return true;
}

/* Bypasses the HTTP cache, so a refresh cannot be answered by the same stale
   bytes we are trying to replace. Times out rather than holding the worker
   alive on a gym connection that is technically up. */
function fetchFresh(url){
  var ctl = (typeof AbortController === 'function') ? new AbortController() : null;
  var timer = ctl ? setTimeout(function(){ ctl.abort(); }, 20000) : 0;
  var init = { cache: 'reload', credentials: 'same-origin' };
  if (ctl) init.signal = ctl.signal;
  return fetch(new Request(url, init)).then(function(res){
    if (timer) clearTimeout(timer);
    if (!usable(res, url)) throw new Error('unusable response for ' + url + ' (' + (res && res.status) + ')');
    return res;
  }, function(err){ if (timer) clearTimeout(timer); throw err; });
}

/* --------------------------------------------------------------- install */

self.addEventListener('install', function(e){
  e.waitUntil(
    /* Fetch every core file BEFORE opening the cache, so a failed install
       leaves nothing behind and never half-writes a shell. */
    Promise.all(CORE.map(function(u){
      return fetchFresh(u).then(function(r){ return [u, r]; });
    })).then(function(pairs){
      return caches.open(CACHE).then(function(cache){
        return Promise.all(pairs.map(function(p){ return cache.put(p[0], p[1]); }))
          .then(function(){
            /* Best effort. One missing icon must never cost the whole install,
               and neither may one missing photograph. */
            return Promise.all(OPTIONAL.concat(PHOTOS).map(function(u){
              return fetchFresh(u).then(function(r){ return cache.put(u, r); })
                                  .catch(function(){ /* not fatal */ });
            }));
          });
      });
    })
    /* No skipWaiting(). A new worker waits for the old pages to go, so a fresh
       shell can never activate underneath a page running the old logic.js. */
  );
});

/* -------------------------------------------------------------- activate */

self.addEventListener('activate', function(e){
  e.waitUntil(
    caches.keys().then(function(names){
      return Promise.all(names.map(function(n){
        /* Prefix-scoped and version-filtered. This worker deletes only caches
           it created. It cannot delete another tool's cache, and there is no
           cache anywhere that holds his training data - that is localStorage,
           which this file cannot even name. */
        if (n.indexOf(PREFIX) !== 0) return null;
        if (n === CACHE) return null;
        return caches.delete(n);
      }));
    }).then(function(){
      return self.clients.claim();   /* first visit gets offline without a second load */
    })
  );
});

/* ----------------------------------------------------------------- fetch */

var refreshed = false;   /* once per worker lifetime, i.e. roughly once per launch */

function scheduleRefresh(e){
  if (refreshed) return;
  refreshed = true;
  e.waitUntil(refreshShell());
}

/* The whole core shell, or nothing. */
function refreshShell(){
  return Promise.all(CORE.map(function(u){
    return fetchFresh(u).then(function(r){ return [u, r]; });
  })).then(function(pairs){
    return caches.open(CACHE).then(function(cache){
      return Promise.all(pairs.map(function(p){ return cache.put(p[0], p[1]); }))
        .then(function(){
          return Promise.all(OPTIONAL.map(function(u){
            return fetchFresh(u).then(function(r){ return cache.put(u, r); })
                                .catch(function(){});
          }));
        })
        .then(function(){ return fillPhotos(cache); })
        .then(function(){ return notify({ type: 'phat-shell-updated', cache: CACHE }); });
    });
  }).catch(function(){
    /* Offline, or one core file did not come back clean. The previously cached
       pair stays exactly as it was. Nothing partial is ever committed. */
  });
}

/* Fetch only the photographs the cache does not hold. See the PHOTOS comment
   for why this is not a re-fetch. Every miss is its own catch: one photo the
   origin cannot serve does not stop the next. */
function fillPhotos(cache){
  return Promise.all(PHOTOS.map(function(u){
    return cache.match(u).then(function(hit){
      if (hit) return null;
      return fetchFresh(u).then(function(r){ return cache.put(u, r); })
                          .catch(function(){});
    });
  }));
}

function notify(msg){
  return self.clients.matchAll({ includeUncontrolled: true }).then(function(cs){
    cs.forEach(function(c){ try { c.postMessage(msg); } catch (_e) {} });
  });
}

self.addEventListener('fetch', function(e){
  var req = e.request, url;
  if (req.method !== 'GET') return;                    /* never a write, never a POST */
  try { url = new URL(req.url); } catch (_e) { return; }
  if (url.origin !== self.location.origin) return;     /* Supabase, CDNs: untouched */

  if (req.mode === 'navigate'){
    if (NAV_PATHS.indexOf(url.pathname) >= 0) e.respondWith(handleNav(e));
    return;                                            /* /tests.html etc: untouched */
  }
  if (url.search) return;                              /* a cache-buster means bypass me */
  if (!BY_PATH[url.pathname]) return;                  /* not shell: untouched */
  e.respondWith(handleShell(e, BY_PATH[url.pathname]));
});

function handleNav(e){
  scheduleRefresh(e);
  return caches.match(SHELL_HTML).then(function(cached){
    if (cached) return cached;
    return fetch(e.request).then(function(res){
      if (!usable(res, SHELL_HTML)) return res;        /* return it, do not keep it */
      var copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(function(c){ return c.put(SHELL_HTML, copy); }));
      return res;
    }).catch(function(){ return offlineShellMissing(); });
  });
}

function handleShell(e, key){
  return caches.match(key).then(function(cached){
    if (cached){ scheduleRefresh(e); return cached; }
    return fetch(e.request).then(function(res){
      if (!usable(res, key)) return res;
      var copy = res.clone();
      e.waitUntil(caches.open(CACHE).then(function(c){ return c.put(key, copy); }));
      return res;
    });
    /* A genuine network failure rejects, the browser reports it, and
       index.html's own "logic.js did not load" guard says so in words. */
  });
}

/* Only reachable if the cache was evicted under storage pressure while offline.
   Never cached, never written to the shell - it is a message, not the app. */
function offlineShellMissing(){
  return new Response(
    '<!doctype html><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>PHAT Log</title>' +
    '<body style="margin:0;background:#1c1b1a;color:#f0eeea;font:16px system-ui;padding:26px 16px">' +
    '<h1 style="font-size:1.25rem;margin:0 0 8px">Offline, and the app is not cached</h1>' +
    '<p style="opacity:.7;font-size:.875rem;line-height:1.5">Your saved log is untouched - it is on ' +
    'this phone, not in this cache. Connect once and reload to restore the app.</p>',
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

/* --------------------------------------------------------------- message */

self.addEventListener('message', function(e){
  var d = e.data;
  if (!d) return;
  if (d === 'SKIP_WAITING' || d.type === 'SKIP_WAITING'){ self.skipWaiting(); return; }
  if (d.type === 'PHAT_CHECK_UPDATE'){ e.waitUntil(refreshShell()); }
});
