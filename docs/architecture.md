# Architecture

## Today

One file. `index.html` holds markup, CSS tokens, and all JavaScript inside a single IIFE.
No dependencies, no build, no server. Storage is `localStorage` behind a small async adapter
(`load`/`save`) that already prefers a native `window.storage` bridge when one is present —
that indirection is the seam every future storage change goes through.

```
index.html
 ├── PROGRAM / KEY_LIFTS     program definition (data)
 ├── load / save             storage adapter  ← the seam
 ├── S                       in-memory state
 ├── utils                   esc, today, fmt, ago, r1, vol, topSet, done
 ├── PAT / POSES / diagram   SVG movement diagrams
 ├── verdictFor              progression advice   ← strength-coach owns the rules
 ├── linechart               SVG charting
 ├── vTrain/vSession/vTrend/vWeight   views
 └── render + event delegation
```

## Target

```
GitHub (main)  ──auto-deploy──>  Vercel (static)  ──browser──>  Supabase (Postgres + Auth)
                                       │                              ▲
                                       └── localStorage (source of truth during a workout)
```

Three rules govern this shape:

1. **Static hosting, no build.** Vercel serves `index.html` as-is from `main`. No framework, no
   bundler, no `npm run build`. Libraries come from CDN as ESM:
   `import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm"`
2. **Local storage is authoritative during a workout.** The gym has no signal. Writes go to
   localStorage first and always succeed; Supabase sync is a background reconciliation afterwards.
   A sync failure must never surface as a failure to log a set.
3. **RLS or nothing.** The anon key ships in client code — that is by design and safe *only* if
   every table has Row Level Security restricting rows to `auth.uid()`. No RLS means the anon key
   is a public database. The `service_role` key never leaves Vercel's environment variables.

### Schema sketch (to be finalised by `backend-engineer`)

Not yet implemented. Shape mirrors the current JSON so migration is mechanical.

```sql
-- every table: enable RLS, policy "own rows only" on user_id = auth.uid()

sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users,
  local_date  date not null,          -- the user's calendar day, NOT a UTC timestamp
  day_id      text not null,          -- 'd1'..'d5'
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),
  client_id   text                    -- the device-generated id, for idempotent sync
)

entries (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references sessions on delete cascade,
  exercise_id text not null,          -- 'd1a'..
  note        text
)

sets (
  id          uuid primary key default gen_random_uuid(),
  entry_id    uuid not null references entries on delete cascade,
  idx         int not null,           -- set order, 0-based
  weight_kg   numeric(6,2) not null check (weight_kg >= 0),
  reps        int not null check (reps >= 0)
)

bodyweight (
  user_id     uuid not null references auth.users,
  local_date  date not null,
  kg          numeric(5,2) not null check (kg between 20 and 400),
  primary key (user_id, local_date)
)
```

Notes that matter:

- `local_date` is a `date`, never a `timestamptz` coerced from UTC. See B-03.
- `client_id` makes sync idempotent: a session that was already pushed must not duplicate when the
  phone comes back online and retries.
- Sets are rows, not a JSON blob, so progression queries are possible server-side later. If that
  turns out to be over-engineering for one user, collapsing `entries`/`sets` into JSONB is a cheap
  retreat — record it in `decisions.md` if taken.
- Conflict policy for one user on two devices: last-write-wins per session keyed on `updated_at`,
  with the losing version kept in a `conflicts` table rather than discarded. Never silently drop a
  logged set.

### Migration path

1. Fix the local data model first (B-01/B-02/B-03). Do not sync data you know is malformed.
2. Add a `schemaVersion` to the stored JSON and a migration function on boot.
3. Stand up Supabase with RLS, auth, and a one-shot importer that pushes the existing localStorage
   JSON (reuse the export format from B-04 so import/restore and sync share one code path).
4. Only then turn on continuous sync.

## Rejected / deferred

| Option | Why not |
|---|---|
| React / Vue / Svelte | Requires a build step; Node isn't installed; the app is ~700 lines and the single file is an asset, not debt. |
| npm + bundler | Same. CDN ESM covers the one dependency we need. |
| Supabase as primary store | Breaks offline-first. The gym has no signal. |
| IndexedDB now | localStorage is adequate for this data volume. Revisit if the log passes ~5 MB. |
| Separate API server | Nothing needs a server that RLS can't do. |
