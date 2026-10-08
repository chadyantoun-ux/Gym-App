# WO-020 — Read the data he has actually logged

Filed by `project-manager`, 2026-10-08, from Chady's second ask in the same message:
*"Please go check all the data that I already added."*
Status: **specified**. Nothing built. **This order ships no code.**

---

## 0. Why this is its own order

Nobody has read his real training data since 2026-09-29, and on that day reading it produced **B-155**
(the pain detector was deaf, twice, for seventeen days) and closed half of **B-131** (two loads that did
not mean what their slot read). Both were invisible to 977 passing tests. **Reading his data has a higher
defect yield per hour than any other activity in this repo, and it is the only activity that has ever
found a wrong-advice bug nobody imagined.**

Since then he has logged at least one session on a new split (he says Push / Pull / Upper / Lower), used
`Swap` for real on it, and seen the `Log corrected` card — which means the WO-015 B-131 repair ran on his
device. **None of that has been looked at.**

**The PM cannot read it.** The permission layer in this session refuses anything touching the live
Supabase project, and RLS correctly blocks an anonymous read. What the PM *can* do, and did, is verify
that production is byte-identical to `main @ e0a7b57` on all four shell files — so whatever his device is
running, it is this tree, and every rule below is the rule that ran.

---

## 1. The four questions, and what answers each

| # | Question | Answered by |
|---|---|---|
| Q1 | **Did the B-131 repair reach the server?** The repair ran on his device (he saw the card). The server row is a separate fact: `mergeOnOpen` pushes after a merge, but a device that was offline, or a second storage context (WO-011 H1) that never got the corrected bytes, can still hold or re-push the old ones. B-151 cannot be closed and the throwaway repair code cannot be deleted until the corrected bytes are observed **on both of his storage contexts and on the server row** | the SQL query — rows for `1789264514484` / `d1d` and `1790128305395` / `d1d` |
| Q2 | **Do his new sessions carry `mv` and `sw` correctly on the swaps he made?** `sw: 1` is derived at `buildSession`, never typed, and only when the plan contains the slot and the draft names a different movement. A swap that logged no `sw` means MV1 is reading the wrong prior, which is the defect MV1 exists to stop | the SQL query — `movement` and `swapped` per entry |
| Q3 | **Does any load look like a unit misread — B-150's class?** The load column still means **per hand** on a dumbbell slot and **added** on a bodyweight slot, and WO-016 is unbuilt. He enters totals. He has now logged on a new split whose slots nobody has checked, and WO-014's swap can land him on a dumbbell or bodyweight movement on any slot | the SQL query's `sets` column, then a `strength-coach` read on plausibility. **A 178 lb dumbbell is a coaching judgement, not a code one** — that is how B-131 was found |
| Q4 | **Are the new split's slots logging cleanly?** Does every entry carry an `rx`, does the `day_id` / `plan` match the split he thinks he is on, are there orphan or minted (`x_`) ids, and are there any `added` entries (which would mean he *did* find `Add as well`) | the SQL query — `plan`, `day_id`, `rx`, `added_mid_session` |

---

## 2. The two things to hand Chady — and it is two, not three

Being honest about this rather than pretending one artefact answers everything: **the device half and the
server half are different facts, and Q1 is specifically the question of whether they agree.** One of them
cannot answer it alone.

### (A) One export file — the device half

Settings → Backup → **Export**, and hand over the file.

That is the complete local document: every session, every entry, every set, every `ld`, every `mv` /
`sw` / `n`, every note, the bodyweight series, the plans, and `log.repairs.b131`. It answers Q2, Q3 and
Q4 outright and gives Q1 its left-hand side.

**If he opens the app in more than one place — Safari and the home-screen icon are two separate stores
(WO-011 H1, observed, not inferred) — one export per context.** That is the only way B-151 ever closes.

### (B) One SQL query — the server half

Supabase dashboard → SQL Editor → paste → Run. One query, one grid, one row per logged entry.

```sql
select
  u.email,
  s.local_date                                     as date,
  s.day_id,
  coalesce(s.plan_id, '(shipped PHAT)')            as plan,
  e.key                                            as ex_id,
  e.value->>'n'                                    as logged_name,
  e.value->>'mv'                                   as movement,
  jsonb_exists(e.value, 'sw')                      as swapped,
  e.value->'rx'                                    as rx,
  (left(e.key, 2) = 'x_' and not jsonb_exists(e.value, 'rx'))
                                                   as added_mid_session,
  (select string_agg(
            (x->>'w') || ' x ' || (x->>'r') ||
            case when jsonb_exists(x, 'ld')
                 then ' [' || coalesce(x->'ld'->>'add', '-') || ' '
                           || coalesce(x->'ld'->>'au', 'kg') || ']'
                 else '' end,
            '  |  ' order by ord)
     from jsonb_array_elements(e.value->'sets') with ordinality t(x, ord))
                                                   as sets,
  nullif(e.value->>'note', '')                     as note,
  s.client_id,
  s.client_updated_at,
  s.deleted_at
from public.sessions s
join auth.users u on u.id = s.user_id
cross join lateral jsonb_each(s.doc->'entries') as e
order by u.email, s.local_date, s.client_id, e.key;
```

Notes on reading it, so nobody misreads the grid:

- **The server cannot tell you whether the repair *mark* was set.** `log.repairs.b131` lives on the log
  **store**, and only session **documents** are pushed (`buildSession` → `{id, date, dayId, planId?,
  entries}`). The corrected **bytes** are the evidence, and they are the better evidence anyway.
- **Q1's discriminator, exactly.** `1789264514484` / `d1d` reads `31.5 x 12 | 38.5 x 5 | 38.5 x 6 |
  40.5 x 3` when the repair reached the server, and `63 x 12 | 77 x 5 | 77 x 6 | 81 x 3` when it did not.
  `1790128305395` / `d1d` reads `38.6 x 8 [85 lb] | 40.8 x 5 [90 lb] | 40.8 x 4 [90 lb] | 36.3 x 8
  [80 lb]` corrected, against `77.1 x 8 [170 lb] | …` uncorrected. Both `d1b` rows keep their loads
  unchanged and gain `movement` + `swapped = true`.
- **`added_mid_session` is a heuristic, not a fact.** A minted `x_` id with an `rx` is a slot he created in
  the Plan Editor; a minted `x_` id with **no** `rx` and an `mv` is a movement added mid-session. Both are
  legitimate; the column distinguishes them, it does not prove them.
- `deleted_at` should be null on every row. Anything else is a finding in itself — nothing in the app
  soft-deletes a session today (B-98).
- The SQL Editor runs above RLS, so Diana's rows appear too. That is deliberate: *"did her device write
  anything"* is a question worth the one column it costs.
- **No service_role key goes anywhere.** This is a dashboard query. `CLAUDE.md` §3.7.

**`diag.html` is the third thing and it is only needed if (A) and (B) disagree** — it is the read-only
storage report that settles *which storage context am I looking at*, and it is what proved WO-011. Do not
ask for it up front; it answers a question that may not exist.

---

## 3. Work items

### A1 · Hand over the two artefacts — Chady, via the main session

**In:** the export file (one per storage context) and the SQL grid, pasted back.

**Out:** `diag.html`, unless A2 reports a disagreement.

Acceptance criteria:
- An export exists for every context he opens the app in, each labelled with which one it is.
- The SQL grid covers every row the query returns, not a screenshot of the first ten.

**Depends on:** —

---

### A2 · Read it against Q1–Q4 and tabulate — `qa-engineer`

**In:** a table, one row per logged entry, columns: date · day · plan · slot id · name · `mv` · `sw` ·
`rx` · every set as stored · note · and a verdict column holding exactly one of **clean** / **needs a
coach eye** / **defect**. Plus the four questions answered yes or no with the evidence beside each.
Re-run `PHAT.painFlag` over every note in the export against the **shipped** `PAIN_WORDS` and state the
boolean per note — WO-017 changed that list and no real note has been through the new one.

**Out:** ruling on whether a load is plausible (A3's). Fixing anything (file it). Writing to any store.

Acceptance criteria:
- Every entry in the export appears in the table. A count is stated and matched against the server's.
- Q1 is answered with the two `d1d` rows quoted as bytes from both sides.
- Every entry whose `movement` differs from its slot's `mv` is listed, and whether `sw` is set on it.
- Every entry on a slot whose `implement` is `db` or `bodyweight` is listed with its loads — that is
  B-150's exposure surface and A3 reads exactly this list.
- Any entry with no `rx` is listed with the reason it has none.
- A stated answer to: **is there a session on the server that is not in any export, or in an export that
  is not on the server?** That is B-76's residue and the only way it is ever observed.
- The suite is **not** touched by this item, and no fixture gains his new bytes until a defect needs
  pinning.

**Depends on:** A1

---

### A3 · Rule plausibility on the loads — `strength-coach`

**In:** A2's dumbbell / bodyweight list and anything A2 marked *needs a coach eye*. For each, a ruling:
the number means what the slot says, or it is a unit misread of B-150's class and needs his word.

**Out:** inventing a correction. **A correction to his stored data is a human-ruled, Chady-confirmed,
fingerprint-gated one-off** (WO-015's shape) and nothing else.

Acceptance criteria:
- Every flagged load gets one of: **correct as stored** / **likely a misread, ask him** / **certainly a
  misread, here is why**, each with a confidence tag.
- Anything ruled a misread names the exact question to put to Chady, in one sentence he can answer.
- No stored byte is changed by this item.

**Depends on:** A2

---

### A4 · Rule the findings into the backlog — `project-manager`

**In:** new backlog items with ids; WO-016's scope amended if A3 found a fifth route into B-150; B-151
closed or explicitly held; a dated section in `docs/decisions.md`.

Acceptance criteria:
- B-151 is closed **only** if the corrected bytes are observed on every storage context **and** on the
  server row. Otherwise it is held with the missing observation named.
- Anything that changes WO-016's scope is written into WO-016, not left in this file.

**Depends on:** A3

---

## 4. Risks

| Risk | Mitigation |
|---|---|
| **A2 writes to a store while reading.** An export loaded into a running app, or a fixture that writes a `phat:*` key | The export is read as a **file**, never imported. The third meta-tripwire already fails any fixture that writes a `phat:*` key |
| **His new bytes land in `tests.html` as a fixture before anyone has ruled what they mean.** `CHADY_STORE()` already caused exactly this once — it declared schema 5 while holding a schema-7 key and every migration test built on it was measuring a session nobody has | A2's last criterion: no fixture gains his new bytes until a defect needs pinning |
| **An export is taken from only one storage context and B-151 is closed on it** | A1's criterion, and A4's |
| **A read turns into a repair.** The temptation, having found a wrong number, to fix it | A3's **Out**. WO-015's shape or nothing |
| **Data at risk** | **None. This order reads.** It writes no store, no fixture and no product code |

---

## 5. Needs from Chady

1. The export file, one per place he opens the app.
2. The SQL grid from §2(B).
3. Standing, and this is the fifth order it has been asked in: **B-116 — warm-up sets: logged, marked, or
   omitted?** His five-set 20 → 70 kg ramp on `d1a` is still read by every engine as prescribed work, and
   A2 will find more of them.
4. If A3 flags a load: one sentence per load, the same shape that closed `d1d`.
