# WO-019 — Add an exercise, from the session

Filed by `project-manager`, 2026-10-08, from Chady's first ask that comes out of **real training**.
Status: **specified**. Nothing built.

---

## 0. The ask, and the uncomfortable part

> *"Sometimes on training and at the end I feel that I can do one more exercise, so why I cannot add an
> exercise to my current session instead of just swapping? … I want that to be **by session** — so when
> I add an exercise on a session I don't want that to be reflected on the actual workout plan … Only
> problem is that I can add sets and I can swap exercise, but **I cannot add a new exercise within a
> session**."*

**He can. It shipped on 2026-09-29 and he could not find it.**

`Add as well` is live and verified on production today (`index.html:7365`; production `index.html` is
byte-identical to `main @ e0a7b57`, checked by the PM with `curl` before writing this). Tap `Swap` on a
card → pick a movement → tap `Add as well` instead of `Replace`. It appends to the end of the session,
carries `mv` and `n`, renders `No prescription` and Rule AD1's sentence, logs sets, reps, load, unit
and note like any other card, offers `Undo — remove {X}` for the rest of the session, and **touches no
plan document.** Every clause of his ask is already true.

**So the capability is correct and complete, and the defect is the door.** This order is about the door.

### Why he could not find it, named precisely

1. **The only entry point is a button labelled `Swap`, and it sits on an exercise card.** Its accessible
   name is `Swap {movement} for another movement` (`index.html:3638`) — the assistive-technology name
   explicitly excludes adding. Adding is framed as a variant of replacing, and he was not looking to
   replace anything.
2. **His moment is the end of the session, and at the end of the session there is no card he wants to
   swap.** He is on the last card, or on the Summary, thinking *one more* — not *instead of this*.
3. **UX §22.5 made `Add as well` the no-loss fallback**, offered when a card already holds a typed set
   and `Replace` is therefore withheld. That is a good rule and it is also the reason Add ended up
   subordinate to Swap: it was designed as the answer to a *refusal*, not as a thing he would seek out.

**This is the first ask in this repo's history that comes from use rather than from imagination.** The
standing diagnosis — *the training effort is the bottleneck, not the tooling* — is suspended for this
one: he has been training since 22 Sep, he hit a real wall, and the wall is ours.

---

## 1. Scope ruling: what is already built, and what is genuinely missing

The PM was asked to confirm or correct the reading that this is UX + frontend only, **so that nobody
rebuilds a working path.** Confirmed in the large, corrected in one place.

### Already built. Do not touch, do not rebuild, do not re-specify.

| Thing | Where | Status |
|---|---|---|
| The engine that adds a movement to a draft | `PHAT.addDraftEntry(draft, mv, n, opts)`, `logic.js:1580` | Complete. Mints an id (never derived from `mv`), widens the taken set from every plan, appends or inserts, returns `{ok, draft, exId, …}`. Pure. |
| The entry shape | `{sets, note, mv, n}` on the draft; `buildSession` carries `mv` + `n` and derives **no** `sw` and **no** `rx` for a slot-less entry (`logic.js:1419`–`1431`) | Complete. Schema 7. |
| The read-side exercise object | the shim at `index.html:3931` → `{id, n, s:0, lo:0, hi:0, k:"", mv, added:true}` | Complete. `s/lo/hi/k` at zero is what keeps every verdict silent *by construction*. |
| The advice rule | **Rule AD1**, coach addendum §22.3 — logs freely, every verdict silent, no rest target, the pain referral line still renders, feeds no engine | Signed off 2026-09-28. |
| The screen treatment | UX §22.9 — `No prescription` in the target slot, AD1's sentence in the verdict slot, `ADDED` kicker on Summary, no `EXTRA` badge | Shipped, and amended once (B-149). |
| Session-only by construction | `swAdd` writes `S.draft.entries` and nothing else; no code path on it reaches `phat:v1:plans` or `PHAT_PLAN` | **This is exactly what he asked for and it already holds.** |
| Undo | toast undo + a persistent `Undo — remove {X}` in the card's bottom stack | Complete. |
| Storage | **no new key, no new field, no schema bump, no migration, zero stored bytes moved** | Nothing owed. |

**There is no data-model work in this order. There is no migration. `SCHEMA_VERSION` stays 7.**

### Genuinely missing. Three things, and one of them is not frontend.

**(a) A control that belongs to the session rather than to a card.** UX owns where. Frontend builds it.

**(b) `librarySearch` has no ranking basis when there is no slot — and the recency bonus is switched off
with it.** This is the correction to the "UX/frontend only" reading, and it is load-bearing.

`librarySearch(index, query, opts)` ranks against `opts.slot` / `opts.mv`. With neither:

```
out.basis = null;  out.order = "name";
```

and every scoring clause in the loop is gated on `out.order === "score"` — **including the recency
bonus** (`logic.js:5108`: `if (out.order === "score" && own(recent, r.mv)) sc += SW_SCORE.recent;`).
So a session-level Add that passes no slot opens on **the alphabetically first 40 of 876 movements**
(`assets/exercises.json` `count: 876`; `SW_LIMIT = 40`), with the recency signal that already exists
and is already computed in the sheet's `base` object deliberately suppressed.

A list like that is not a worse list, it is a **useless** list, and it defeats Rule SW-ORDER's own stated
reason for existing (`index.html:7206`): *"the ranked list, not the keyboard, is what makes this fast,
and auto-focusing the field would put the keyboard over the list that does the work."*

Worse, the notice the sheet prints over a basis-less list is `Ordered by name. This slot does not name a
movement.` — **false when there is no slot at all.** UX §22.3.1 forbids a notice that describes an order
the list is not in; the same objection applies to a notice that describes a slot that does not exist.

Three candidate answers, and the PM is naming one:

| | Option | PM's view |
|---|---|---|
| (i) | Rank against the card he happened to be on | **Rejected.** Re-couples the session-level door to a card, and at the end of a session that card is a calf raise. The list would rank calves. |
| (ii) | **A new basis: recency.** `recentMovements` already exists, is already pure, is already passed in. Let `order:"score"` hold with `basis:"recent"` when there is no slot, scoring on the recency bonus alone, with its own notice literal | **Recommended.** One branch in one pure function, one new literal, no new scoring input, no new data. It is also the honest order for the question he is asking: *one more thing, probably something I do.* |
| (iii) | Accept name-ascending and make the search field the primary act | **Fallback only**, if the coach refuses (ii). Contradicts SW-ORDER, and costs a keyboard with chalky hands. |

Ranking against **the day's muscle groups** was considered and is rejected without a lane: `librarySearch`
takes one reference row, a whole day is a new scoring input, and that is a bigger change than the ask.

**(c) Two copy questions that are the coach's, not the engineer's.** §4.

---

## 2. Constraint and backlog check

- **CLAUDE.md §3.1 (no build step)** — no conflict. One control, one sheet mode, one pure-function branch.
- **§3.2 (offline-first)** — the exercise library is a precached shell file (`assets/exercises.json`,
  `sw.js` `REQUIRED`), so the list works with the network off. **This is an acceptance criterion, not an
  assumption** (`docs/deploy.md` §670 already makes it one for the swap).
- **§3.3 (never lose a number)** — the risk here is not the added set, it is the **other eight cards**.
  A control that rebuilds the draft's key order near the end of a session is one bad line from dropping
  a typed set. Criteria C1–C5 in §6 exist for that and nothing ships without them.
- **§3.4 (local dates)** — no date arithmetic added. `recentMovements` already uses `localDate`.
- **§3.5 (stored loads are kg)** — no change. See B-161 below for what the added card does *not* know.
- **§3.6 (≥ 44 px)** — a new control. UX sizes it; QA measures it with Playwright at 400 px.
- **§3.7 (secrets)** — none involved.
- **§3.8 (`main` always deploys)** — `main @ e0a7b57` **is** production, byte-identical on all four shell
  files, checked today. There is no undeployed lane. This order starts from a clean tree.
- **Open P0s:** none. B-01 / B-02 / B-03 are closed. Nothing is being built on top of an open P0.
- **In flight:** nothing. WO-015, WO-017 and WO-018 T2/T2a/T3 are all merged **and live**. WO-016 is
  specified and unbuilt — see §5.
- **New items filed by this order:** **B-160** (this defect), **B-161** (an added movement carries no
  `implement`), **B-162** (the basis-less list and its false notice).

---

## 3. Where the control goes — the facts UX must plan against

UX owns the ruling. These are the three facts that constrain it, and the first one invalidates the PM's
own first instinct, which was *"at the bottom of the session, below the last card."*

1. **There is no "bottom of the session."** `vSession` is a **paged, one-card-at-a-time** view keyed on
   `S.exIx` (`index.html:3472`). The footer is `←` + `Next — {next movement}`, and on the last card
   `Finish session`, then `DISCARD SESSION`. There is no scrolling list of all nine cards to put a
   footer control under. A session-level control has to live in a card's chrome, in the last card's
   footer, in the header, or on the Summary.
2. **The Summary is where he described the moment.** `Finish session` → Summary → `Save session` is the
   end of the session, and *"at the end I feel that I can do one more exercise"* is literally that
   screen. Its bottom stack is `#bs-slot` → `← Back | Save session` → `DISCARD SESSION`.
3. **The Summary is a read, and that is a pinned criterion, not a preference.** `vSummary`'s own contract
   (`index.html:3990`): *"THE SUMMARY IS A READ. Nothing in this function writes a storage key, mutates
   S.draft, or schedules a draft save — reaching this screen, leaving it and coming back leaves
   phat:v1:draft byte-identical, which is criterion 1."* A **control** there is allowed: a tap is a
   deliberate act, and the existing `swAdd` already writes the draft and then navigates to the new card,
   leaving Summary. What is forbidden is **rendering** that writes. Criterion C6 re-runs the byte-identity
   check so this cannot be lost by accident, and nobody should "protect" the invariant by refusing the
   control.

**PM recommendation, not a ruling:** the Summary's bottom stack, above `← Back | Save session`, **and**
the last card's footer beside `Finish session` — two placements of **one** control, both at the moment he
named. UX may choose one. The header is the weakest candidate (`CLAUDE.md`: nothing important in the top
corners).

---

## 4. What `strength-coach` owes — narrow, and it does not block W1

Mandatory, because this reaches AD1 and because a ranking is a recommendation.

1. **Does AD1's sentence still read right from the new door?** It is
   `Added today. No sets or reps set, so no verdict. Add it to your plan to get one.`
   Reached from a control whose whole premise is *this is not in my plan and I do not want it there*, the
   last clause recommends against the thing he just deliberately chose. [Likely] it stands — it states
   the only true route to a verdict, and the app does not flatter — but the coach rules, and §22.9 /
   §22.12 #34 may owe a word.
2. **Is recency a defensible order to put in front of him?** (§1(ii)). And if it is, what does the sheet
   say over it, in place of `Ordered by name. This slot does not name a movement.`
3. **The pain interaction, and this one has teeth.** WO-017 shipped the negated-recovery vocabulary four
   days ago, so `painWindow` is now non-empty on his real data — his forearm, twice. A recency-ranked
   list will put **the pulldown he did because his forearm hurt** near the top of the list of things to
   add at the end of a session. AD1.4 keeps the referral line on the card *after* he picks it. Does the
   **list** owe anything? [Guessing] no — the app should not hide a movement from a man who can see his
   own arm — but this is precisely the class of thing QA cannot detect, which is why it is asked.
4. Nothing else. R1 is silent (no `k`), X1 is silent (no prescription), P1/H1/SP1 are silent, Trend
   excludes it (no `lift`). All already true and all already pinned.

---

## 5. Sequence against B-150 / WO-016 — ruled

**WO-016 (B-150, the load column) goes first. WO-019 is specified now, built in parallel where it does
not collide, and ships on WO-016's deploy or immediately after it. It does not ship before it.**

Four reasons, in order of weight:

1. **B-150 is live wrong data; this is a live correct capability behind a wrong word.** A dumbbell slot's
   `w` is per hand and a bodyweight slot's `w` is the added load, and he enters totals — proven twice in
   one session, on his real data. That produces a wrong number on screen every session. This order
   produces none. Wrong numbers outrank a hidden button.
2. **This order deliberately increases B-150's blast radius**, which B-150's own backlog row predicted
   for the swap: *"the swap can land him on a dumbbell or a bodyweight movement mid-session, so the
   column's meaning is about to matter on many more than the four slots it does today."* A first-class,
   discoverable Add is a faster road to the same place.
3. **It is worse than that on an added card, and this is new — see B-161.** The added exercise object
   carries **no `implement` at all** (`index.html:3933`). So on an added movement:
   - `loadWord(0, undefined)` returns **`zero load`**, never `bodyweight` (`logic.js`, `loadWord`). A
     rack chin or a dip added mid-session and logged at `0 × 12` is described with the wrong word.
   - `cardModeFor` seeds the profile's first bar on `bb` slots only, so an added barbell movement gets
     no bar seed.
   - I1 / I2's `per DB` wording cannot fire, so an added dumbbell movement has **no declared meaning in
     its load column whatsoever** — not "per hand", not "pair", nothing.

   `PHAT.libraryImplement(eq)` already exists and the Plan Editor already uses it, so all three are
   derivable at read time from the picked library row through `mv`, **for zero stored bytes and no
   migration.** It is three lines and it is tempting. **The PM is not folding it in**, and the reason
   should be read rather than skimmed: it changes what three coaching rules say on a card, which needs
   the coach, and it is *the same question WO-016 exists to answer*. Folding it in means ruling B-150's
   question inside a discoverability order, by a side door, days before the order that owns it. That is
   the failure this repo wrote down as *"nothing moves after the pin"*. **B-161 is filed and routed to
   WO-016.** If WO-016 slips past one week, B-161 becomes its own three-line order.
4. **WO-016 must rule the slot-less card's load column anyway.** One order, one surface, one QA round.

**Named exception, so the main session does not have to come back and ask.** W1 (UX) and W2 (coach) touch
no product code and can be dispatched the moment WO-016's UX lane is out of
`docs/specs/wo-004-screens.md` — **two UX agents must not be in that file at once.** W3 (backend,
`librarySearch`) touches a function WO-016 has no reason to open, so it may run in parallel with WO-016's
build. Only **W6 (release)** is held.

**The cost of holding it is one sentence, and the main session should deliver that sentence first:**
*tap `Swap` on any card, pick the movement, then tap `Add as well` instead of `Replace`.* He is not
blocked today, and telling him so is worth more than anything in this order.

---

## 6. Work items and acceptance criteria

### W1 · Where the control lives, what it says, and what the list is ordered by — `ux-designer`

**In:** the control's placement (the three facts in §3 are the constraints, and §3's recommendation is a
recommendation); its label; its position in the tap order and the focus order; the sheet's third mode
(heading, body, the consequence sentence on the confirm state, the kicker or notice over a basis-less
list); whether `Add as well` keeps its current label; the toast; `docs/specs/wo-004-screens.md` §22 and
§22.9 amended in place with a dated amendment line, never a rewrite.

**Out:** anything about the load column (WO-016 / B-161). Anything about inserting the new card
**between** two existing ones — `addDraftEntry` accepts `afterExId` and `swAdd` deliberately does not
pass it, because D8's rule is that the list is the day's plan order first and plan-less entries appended
after it. **Appending at the end is also exactly what he asked for.** Do not move it.

**Ruling W1 inherits and must not re-open: `Add as well` stays.** It is not a redundant second door to
one action — it is the **only non-destructive exit from a card that already holds a typed set**, where
`Replace` is withheld by UX §22.5 precisely so a typed set cannot be destroyed. Deleting it would leave
that card with no forward action, which is a data-loss-adjacent regression dressed as simplification.
UX may **demote** it (its label, its weight, or dropping it from the *untyped* case where the new door
serves) and the PM will accept that; UX may not remove it from the typed case. Record which.

Acceptance criteria:
- A dated amendment in `docs/specs/wo-004-screens.md` names the placement, and states in one sentence
  why it is not the other two candidates.
- Every new string is in §22.12's numbered table with an id, including the replacement for
  `Ordered by name. This slot does not name a movement.` on a list that has no slot.
- The control is specified at ≥ 44 px with a stated thumb position at 400 px wide.
- The spec states, in words, that rendering the host screen writes nothing (§3 fact 3).
- The spec states what the existing `Add as well` becomes, in one line.

**Depends on:** WO-016's UX lane being out of `docs/specs/wo-004-screens.md`.

---

### W2 · AD1 from a new door, the recency order, and the pain interaction — `strength-coach`

**In:** the four questions in §4, answered in `docs/coach-audit-addendum.md` as a new subsection under
§22, with any changed literal given verbatim.

**Out:** the placement (W1's). The load column (WO-016's).

Acceptance criteria:
- A yes/no on AD1's third clause from a session-level door, with the literal to ship if it changes.
- A yes/no on recency as a presented ranking basis, with the notice sentence to print over it if yes,
  or a named reason to fall back to §1(iii) if no.
- A yes/no on whether the list owes anything to an open pain flag, with the reason stated either way.
- No new rule id is invented for behaviour AD1 already covers.

**Depends on:** — (parallel with W1)

---

### W3 · `librarySearch` gains a basis for "no slot at all" — `backend-engineer`

**In:** one branch in `librarySearch` (`logic.js:5034`) so that with no `slot` and no `mv` the function
can return `order:"score"`, `basis:"recent"` — scoring on the recency bonus alone — when the caller asks
for it, with the `basis` value reported so the sheet can print the coach's sentence rather than guess an
order. Pure, never throws, no new scoring input, no new data shape, exported constants unchanged.

**Out:** `addDraftEntry` (complete — do not open it). The entry shape. Any stored byte. `implement`
derivation (B-161, WO-016). `afterExId`.

Acceptance criteria:
- With no `slot` and no `mv` and the new opt set, `basis` is the coach's value and `order` is `"score"`,
  and a movement in `recentMovements` ranks above one that is not, with the folded-name tie-break intact.
- With no `slot`, no `mv` and the new opt **absent**, the return is **byte-identical** to today
  (`basis: null`, `order: "name"`) — the Plan Editor's `mode:"form"` list must not move.
- With a `slot`, every existing return is byte-identical to today. Pinned as a differential hash over
  all 42 slots × the existing query set, the same instrument WO-014 W6 used.
- Still pure: no DOM, no globals, no throw on `undefined`, `null`, `7`, `{}` or a malformed index.
- Every moved SW-ORDER pin is re-pinned **one at a time, each with its stated reason** (the WO-014 W6
  rule). A pin that moves without a reason is a red.
- **Red-first proof:** the new tests are run against `git cat-file blob e0a7b57:logic.js` under the same
  harness and reported red, with the count.

**Depends on:** W2 (the basis name and its sentence).

---

### W4 · The control, and the sheet's third mode — `frontend-engineer`

**In:** the control where W1 puts it; a third mode on the **existing** swap sheet (`openSwapSheet` already
carries `mode:"form"` for the Plan Editor — add a third, do not build a second sheet, the file says so at
`index.html:7336`); the commit path calling the **existing** `PHAT.addDraftEntry` through the **existing**
`swAdd` so the entry it writes is byte-identical to the one `Add as well` writes; navigation to the new
card; the toast and both undos, unchanged.

**Out:** `logic.js`. `addDraftEntry`'s contract. `implement`. The load column. Any change to `Add as well`
beyond what W1 rules. Any write to `phat:v1:plans`.

Acceptance criteria — **C1–C6 are the data criteria and none of them is negotiable:**

- **C1.** With **three** exercises logged and a typed set in each, use the new control to add a movement.
  Serialise `phat:v1:draft` before and after and diff: the only difference is **one added entry key**.
  Every existing entry object, every set string and the note on all three cards are byte-identical, and
  `exIx`'s stored value is the only other field permitted to change.
- **C2.** Immediately after adding, **before typing anything into the new card**, reload the page. The
  draft is offered back; accepting it restores all three original cards with all their sets intact **and**
  the added movement with its name; declining it discards the whole draft and leaves `phat:v1:log`
  byte-identical.
- **C3.** Type `40 × 8` into the added card, then reload. The draft is offered back with `40 × 8` on the
  added card and the three original cards unchanged.
- **C4.** Tap `Undo — remove {X}`. The added entry is gone and the serialised draft is byte-identical to
  the C1 "before" string.
- **C5.** Save the session. The saved document's `entries` contains the added entry with `mv` and `n`,
  **no `rx`** and **no `sw`**; `phat:v1:plans` is byte-identical before and after; and the shipped PHAT
  plan's `days` are byte-identical. **Session-only, asserted on bytes, not on a screenshot.**
- **C6.** Reach the host screen, leave it, come back: `phat:v1:draft` is byte-identical across all three,
  **before** the control is tapped (§3 fact 3's criterion, re-run).
- **C7.** The entry the new door writes is **byte-identical** to the entry `Add as well` writes for the
  same movement. This is the proof that nothing was rebuilt.
- **C8.** The added card renders `No prescription` in the target slot and AD1's sentence (whatever W2
  rules it to be) in the verdict slot, and renders **no** verdict, **no** rest target and **no** `EXTRA`
  badge, at every set count from 1 to 6.
- **C9.** With the network off and a cold load from the service worker, the whole flow works and the list
  returns results.
- **C10.** The control is ≥ 44 px on both axes and reachable one-handed at 400 × 852, measured with
  Playwright, not asserted.
- **C11.** Nothing in the top corners.
- **C12.** `S.err` and the blocked-save path are unchanged: a malformed set on the added card refuses the
  save with the existing message and loses nothing.

**Depends on:** W1, W3.

---

### W5 · Verify — `qa-engineer`

**In:** C1–C12 driven in a browser, not reasoned about; a regression test per criterion in `tests.html`;
the two-tab attack (`finish()` from a stale tab while the other adds — WO-013's overlay should hold, so
**prove it still does on this path**); the suite count recorded and stated to be independent of the day
of the week; the three meta-tripwires intact.

**Out:** fixing anything found. File it, name it, hand it back.

Acceptance criteria:
- Every criterion C1–C12 passes **as observed**, each with the observation stated.
- The suite is green with the count recorded, and **zero** skips without a reason and zero named failures.
- At least three mutants injected into W3's branch and W4's commit path, each killed, each injection
  asserted to have matched at least once.
- A stated answer to: *what is the worst thing that happens if he taps the control twice in one second?*

**Depends on:** W4.

---

### W6 · Ship — `release-engineer`

**In:** merge, deploy, verify. `sw.js` VERSION moves only by its own header rule (the shell file list does
not change here, so [Likely] it stays `v7` — the rule decides, not this order). `scripts/verify-deploy.sh`
to `PASS 61/61`.

**Out:** anything that is not this order. **Do not install the Vercel GitHub App** (`CLAUDE.md` §2: it
would publish the whole repository, `.vercelignore` is a prerequisite, not a follow-up).

Acceptance criteria:
- 61 files byte-verified against `git cat-file blob` on the production origin.
- A fetch of `/index.html` contains the new control's string.
- A cold **offline** load of the session screen and the new control's list returns results.
- `docs/backlog.md` and `docs/decisions.md` updated at close.

**Depends on:** W5, **and WO-016's deploy** (§5).

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| **A rebuild of a working path.** The single biggest risk in this order is an engineer reading the ask instead of §1 and reimplementing `addDraftEntry`, the entry shape or AD1 | §1's table is in every brief. W4's C7 makes a rebuild fail a criterion |
| **A typed set in another card is lost when the draft's key order is rebuilt near the end of a session.** This is the only data-loss path here and it is a real one | C1, C2, C4 assert on serialised bytes, not on the screen |
| **The Summary's write-nothing invariant is broken by a render-time write** | C6 |
| **`librarySearch`'s pins move.** SW-ORDER is heavily pinned; a basis change moves pins | W3's byte-identity criteria plus the one-at-a-time re-pin rule and the red-first proof |
| **Two UX agents in `docs/specs/wo-004-screens.md`** (this order and WO-016) | §5's named exception: serialise them. The main session owns it |
| **This makes B-150 and B-161 easier to reach** | §5's sequencing ruling. WO-016 first |
| **A useless list ships.** If W3 is skipped, the control opens on 40 of 876 names, alphabetically | W3 is not optional. If the coach refuses recency, §1(iii) is the explicit fallback and the control's label and the search field change with it |
| **Data at risk / migration** | **None, and that is asserted rather than assumed.** No new key, no new field, no schema bump, `SCHEMA_VERSION` stays 7, zero stored bytes move, and nothing in this order can write to `phat:v1:plans` |

---

## 8. Needs from Chady

1. **Nothing, to use it today** — and this is the first thing he should be told, before any of the above:
   `Swap` on any card → pick the movement → `Add as well` instead of `Replace`. It appends to the end,
   it tracks everything, and it never touches the plan.
2. **Confirm or override §5**: WO-016 (the load column, B-150) first, this second, or the other way.
   The PM recommends WO-016 first and will build this first if he says so.
3. **B-116, fifth asking: warm-up sets — logged, marked, or omitted?** It is sharper now, not softer: if
   he adds a movement at the end and ramps into it, those ramp sets land on a card with **no prescription
   at all**, so there is not even a rep range to judge them against. One sentence.
4. Not asked, because he already answered it in this message and it is now recorded in
   `docs/decisions.md`: **an added movement is never offered to the plan.** *"I don't want that to be
   reflected on the actual workout plan."* `make it permanent` re-points a **slot**, and an added movement
   has no slot, so there is nothing to re-point and no question to ask. Nobody re-opens this.
