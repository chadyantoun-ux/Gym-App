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

   STRATEGY: cache-first, then one atomic background refresh per navigation,
   throttled to one every five minutes by a timestamp IN THE CACHE.
     - Cache-first, so opening the app never waits on a network that is not
       there. One bar of signal must not cost him a 30 s stare at a blank
       screen.
     - The refresh re-fetches the WHOLE core shell and commits nothing unless
       EVERY core file came back a real 200. A half-succeeded refresh leaves the
       previous, consistent pair in place. index.html and logic.js are one unit;
       a new index.html over a stale logic.js is the black-screen failure mode.
       The refresh also does not START until the page that triggered it has
       been handed its logic.js (the pair gate below), so a page never reads
       the old index.html and the new logic.js in one load.
     - Worst case staleness: ONE launch, plus five minutes. A deploy lands in
       the cache on the first navigation at least five minutes after the last
       refresh, and is what he gets on the next one. There is no path where a
       bad cache serves a stale app forever: the throttle lives in the cache,
       not in this worker's memory, so it cannot be "already done" for the
       life of a worker. THAT WAS THE v5 BUG (2026-09-13, found on the phone):
       `var refreshed = false` was documented as once per launch and is once
       per WORKER, and on iOS the worker outlives launches by days. After its
       first refresh it never fetched the shell again, and a same-version
       content deploy (WO-010, schema 6) never reached the phone.
     - A new worker does not wait forever either. It waits, by the atomic
       ruling (decisions.md 2026-09-10: no skipWaiting, no reload under a
       lifter mid-set) - but the page tells it when nothing is in flight
       (`phat-idle`, posted by index.html at a paint where mayPaint() holds),
       and it takes over then. Fallback, safe by construction: a worker that
       installs with ZERO clients open activates at once. Taking over an
       idle page changes nothing that page has loaded; the next launch gets
       the new pair.

   NEVER CACHE A FAILURE: usable() requires status exactly 200 (so a 404 body, a
   206 partial and a 30x are all rejected), a non-opaque response, and a
   content-type that matches the extension. A cached 404 of logic.js is exactly
   the black screen index.html already has a guard for; it cannot get in here.

   VERSION: bump VERSION to force every installed app to rebuild its shell from
   the network on the next launch and delete the old cache. Only needed if the
   shell FILE LIST changes or a cached entry must be discarded - routine content
   deploys are handled by the per-navigation refresh and need no bump, ON A
   WORKER WHOSE REFRESH WORKS (v6 and later; v2-v5 do not, see v6 below).
   ONE EXCEPTION, the photographs: PHOTOS are filled in, never re-fetched (see
   the PHOTOS comment), so a photo that changes bytes under the SAME path is
   only ever delivered by a VERSION bump. A new photo set = a bump. Always.
   THE CACHE ALSO HOLDS ONE ENTRY THAT IS NOT A FILE: `/__phat-refreshed`, the
   throttle stamp. Count it when comparing entry totals (2 + 7 + 48 + 1). */

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
/* v6 (2026-09-13, WO-011 P1): the update path was broken, found by diag on
   Chady's phone (iOS 18.7): `phat-shell-v4` active with the pre-WO-010 shell,
   `phat-shell-v5` installed and waiting, a fetch through the worker returning
   the OLD index.html and logic.js at SCHEMA_VERSION 5 while production had
   been 6 since the night before. Two defects, both here: (1) the refresh was
   gated on `var refreshed`, a worker-lifetime flag, and an iOS worker lives
   across launches, so after one refresh it never fetched again - the WO-010
   deploy stayed at v5 and relied on exactly that refresh to carry a
   same-version content change, and it did not; (2) with no skipWaiting and a
   page kept alive by an in-app view, v5 waited indefinitely behind v4.
   Fix: the throttle is a timestamp stored in the cache; the refresh runs on
   every navigation that finds it older than five minutes; a waiting worker
   takes over on `phat-idle` from the page, or at install if no client is
   open. THE FILE LIST IS UNCHANGED. Bumped on the header rule's second
   trigger: the v5 cache holds a stale shell that the broken refresh will
   never replace, and the only way to discard it is a new cache. The FIRST
   transition to v6 on the phone still needs the page closed once (kill the
   in-app view or Safari, reopen): the page on the phone is the old shell,
   which does not post `phat-idle`, and v4 cannot be told to step aside. */
var VERSION = 'v6';
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
          })
          /* This shell is as fresh as it gets: start the five-minute clock
             here, so the first navigation under a new worker does not fetch
             the same two files a second time. */
          .then(function(){ return stampRefreshed(cache); });
      });
    }).then(function(){
      /* No unconditional skipWaiting(). A new worker waits for the old pages
         to go, so a fresh shell can never activate underneath a page running
         the old logic.js. Two exits from the wait, both safe:
           (a) here - nobody is open, so there is nobody to activate under;
           (b) `phat-idle` from the page (message handler below). */
      return self.clients.matchAll({ includeUncontrolled: true }).then(function(cs){
        if (cs.length === 0) return self.skipWaiting();
      }).catch(function(){});
    })
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

/* THE THROTTLE LIVES IN THE CACHE, NOT IN THIS WORKER. `/__phat-refreshed`
   is a synthetic entry holding the ms timestamp of the last refresh that
   COMMITTED. A module variable was the v5 bug: it is reset when the worker is
   killed, and on iOS the worker is not killed between launches, so "once per
   worker" meant "once, ever". The cache is per VERSION, so a bump starts
   with no stamp and refreshes on its first navigation (install writes one).
   The stamp is written only on success: with the radio off the attempt fails
   fast and costs nothing; on one bar it is a background fetch with a 20 s
   abort that never delays the cached answer, and the next navigation may
   try again. */
var REFRESH_KEY   = abs('./__phat-refreshed');
var REFRESH_EVERY = 5 * 60 * 1000;

function stampRefreshed(cache){
  return cache.put(REFRESH_KEY, new Response(String(Date.now()),
    { headers: { 'Content-Type': 'text/plain' } }));
}

/* True when there is no stamp, the stamp is unreadable, or five minutes have
   passed. A clock that went backwards reads as due, not as "recent". */
function refreshDue(){
  return caches.open(CACHE).then(function(cache){
    return cache.match(REFRESH_KEY).then(function(hit){
      if (!hit) return true;
      return hit.text().then(function(t){
        var at = Number(t), age = Date.now() - at;
        return !(at > 0) || age < 0 || age >= REFRESH_EVERY;
      });
    });
  }).catch(function(){ return true; });
}

/* THE PAIR GATE. A refresh kicked off by a navigation must not commit a new
   index.html + logic.js while the page that navigated is still between
   receiving its (old) index.html and asking for its logic.js - that page
   would load the old markup over the new engine, the exact mismatch the
   atomic refresh exists to prevent. So the refresh waits until this page's
   logic.js has been handed over (handleShell fires the gate), or 4 s, for a
   page that never asks (the offline-shell-missing message, a tab that dies).
   A module variable is fine HERE: it orders two events of one page load and
   is held alive by the navigation's own waitUntil; it holds no state that
   must outlive a worker. */
var pairGate = null;

function armPairGate(){
  var fire, p = new Promise(function(resolve){ fire = resolve; });
  var timer = setTimeout(fire, 4000);
  pairGate = function(){ clearTimeout(timer); fire(); };
  return p;
}

function firePairGate(){
  var g = pairGate; pairGate = null;
  if (g) g();
}

/* Called from the navigation handler. Reads the stamp, and if due, refreshes
   once the pair gate opens. Never blocks the response - the cached shell has
   already been handed back by the time any of this runs. */
function scheduleRefresh(e){
  var gate = armPairGate();
  e.waitUntil(refreshDue().then(function(due){
    if (!due){ firePairGate(); return; }
    return gate.then(refreshShell);
  }).catch(function(){}));
}

/* The whole core shell, or nothing. One in flight at a time: a second caller
   (PHAT_CHECK_UPDATE during a navigation's refresh) joins the same promise
   rather than fetching the pair twice. */
var inflight = null;

function refreshShell(){
  if (inflight) return inflight;
  inflight = Promise.all(CORE.map(function(u){
    return fetchFresh(u).then(function(r){ return [u, r]; });
  })).then(function(pairs){
    return caches.open(CACHE).then(function(cache){
      return Promise.all(pairs.map(function(p){ return cache.put(p[0], p[1]); }))
        .then(function(){ return stampRefreshed(cache); })
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
       pair stays exactly as it was, and so does the stamp: nothing partial is
       ever committed, and the next navigation may try again. */
  }).then(function(){ inflight = null; });
  return inflight;
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
  scheduleRefresh(e);                                  /* every navigation; the cache stamp throttles */
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
  /* logic.js is the second half of the pair. Once its Response is in hand -
     from the cache, or from the network - the page has both halves from one
     shell and a pending refresh may start. Fired AFTER the match resolves,
     so a commit cannot land between the lookup and the answer. Subresources
     never trigger a refresh themselves. */
  var isEngine = (key === CORE[1]);
  return caches.match(key).then(function(cached){
    if (cached){ if (isEngine) firePairGate(); return cached; }
    return fetch(e.request).then(function(res){
      if (isEngine) firePairGate();
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

/* `phat-idle`: the page says nothing is in flight - no sheet open, no draft,
   no focused input, Train home on screen (index.html's mayPaint()). It posts
   this to `registration.waiting`, never to the controller, so only a worker
   that is actually waiting hears it; on an active worker skipWaiting() is a
   no-op anyway. Taking over an idle page reloads nothing and changes nothing
   the page has loaded - index.html and logic.js are never re-requested by a
   running page - so the ruling holds: no reload, ever, under a lifter.
   The former unconditional `SKIP_WAITING` handler is gone: nothing sent it,
   and a handler nobody guards is a handler somebody will one day send from
   the wrong place.
   `PHAT_CHECK_UPDATE`: an explicit ask, so it ignores the five-minute stamp. */
self.addEventListener('message', function(e){
  var d = e.data;
  if (!d) return;
  if (d === 'phat-idle' || d.type === 'phat-idle'){ self.skipWaiting(); return; }
  if (d.type === 'PHAT_CHECK_UPDATE'){ e.waitUntil(refreshShell()); }
});
