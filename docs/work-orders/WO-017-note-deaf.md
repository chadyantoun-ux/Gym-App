# WO-017 — The note field is the only recovery input, and it is deaf

Filed by `project-manager`, 2026-09-29, from a live finding in Chady's real data.
Status: **specified**. Nothing built.

---

## 0. The finding

His two `d1` sessions carry these notes on slot `d1b` (Weighted pull-up):

| Date | Note, verbatim | `painFlag` |
|---|---|---|
| 12 Sep | `I have done iso-lateral front lat pull downs- forearm still not recovered` | **false** |
| 22 Sep | `I did pull down on this, arm still not recovered` | **false** |

Re-run by the PM against the shipped regex compiled from `PHAT.PAIN_WORDS` (`logic.js:6463`,
`PAIN_RE` at `:6486`). Both false. The 21 entries cover *pain / hurt / injur / sharp / pinch / tweak /
strain / sprain / twinge / ache / niggl / numb / tingl / swollen / impinge / inflam / stabbing / tear /
spasm / pulled / gave way*. **No entry, and no shape of entry, covers negated recovery.**

So he reported an unresolved forearm problem **twice, ten days apart, in the field the app provides for
it**, and Rules S1 / S1b stayed silent both times: no suppression of load increases on that slot, no
referral line, no entry into `painWindow`, no clause on a stall report. He went on being told to add
load on the slot he was substituting *because of the arm*.

**The list's own stated design goal is the one it failed.** Addendum §13.5: *"The over-trigger is
deliberate — a false positive costs one held session and two lines of text, a false negative adds load
to something that hurts."* It has now produced exactly that false negative, on the first and only
injury report the app has ever received, twice.

## 1. Severity, and where it sits against everything else open

**P1, and it goes first — ahead of WO-015 (the B-131 repair) and ahead of WO-016 (the load column).**

The reason is not only that the app can tell him to load an injured joint, though it can. It is that
**the note field is the only recovery input the app has** (§13.5 says so in those words), and that input
has been dead for 17 days while he used it correctly. B-150 produces wrong *numbers*, which are on the
screen where he can see them and argue with them. This produces **silence on the one channel that is
about his body**, and silence is not visible. Every injury note he writes from here is subject to the
same coin flip on whether he happened to use a word someone thought of on 2026-09-11.

Cost seals it: the vocabulary half is one frozen array and its tests, writes **zero stored bytes**, and
conflicts with no other order. WO-016 is a data-entry redesign across two slot types. First in, first
out.

Against WO-015: the repair is finite, historical, and about numbers he can read. This is live, recurring
and invisible. WO-015 also gets *better* by waiting one order — see §6.

## 2. Constraint and backlog check

- **CLAUDE.md §3:** no conflict. No build step, no network, no stored-byte change, no date arithmetic
  added, no new touch target below 44 px unless W6 ships a control (UX sizes it).
- **B-01 / B-02 / B-03** are closed. Nothing is being built on an open P0.
- **In flight / adjacent:** WO-014 is deployed and live (`sw.js` v7, `SCHEMA_VERSION 7`, 61 files
  verified). WO-015 (repair) and WO-016 (column) are specified, not started. WO-018 (the four splits)
  is specified in parallel and **also writes to `logic.js`** — see §7.
- **New items:** B-155 (this defect), B-156 (the instrument), B-157 (the suite pins the list against
  itself).
- **B-116 is *not* closed by this.** See §5.

## 3. Work order

**W1 · The vocabulary — owner: `strength-coach`**

Scope — in: `docs/coach-audit-addendum.md` **§24**, amending §13.5's `Inputs` line and nothing else in
Rule S1. A transcribable list, in §13.5's own table format, with a status and a confidence tag per
entry, plus the stem hazards for every new entry.

The two notes above are the specimens. Rule on at least these, each individually, each with a reason:

1. **Negated recovery** — `not recovered`, `not healed`, `still not right`, `not right`, `still bad`,
   `hasn't settled`, `not 100`. **Note for the coach, because it decides the instrument:** §13.5 closes
   with *"do not extend this into a parser"*, and a bare `recovered` would fire on `recovered well
   between sets`, which is a **good** report. But the prohibition on a parser is **not** a prohibition
   on phrases — `g(?:ave|ives|iving) way` is already a multi-word alternation in the shipped list. A
   negated phrase as a literal alternation is the *same* instrument, not a new one. That precedent is
   the PM's observation and is offered so it is not re-derived; whether to use it is yours.
2. **`playing up`, `acting up`, `flared`, `flare up`** — `flare/flared` is on §13.5's CONSIDERED AND
   EXCLUDED list ("elbow flare is a bench form cue"), which says *do not add back without a coach
   ruling*. This is the ruling. `flare up` as a phrase may escape the cue collision; your call.
3. **`sore`, `stiff`, `tender`, `dodgy`** — `sore` was rejected **outright on frequency, not
   physiology**, with a written argument the PM is not overturning: a trigger that fires most weeks in
   a five-day surplus holds loads that are progressing fine, suppresses V1's offer near-permanently
   through `painWindow`, and teaches him to stop writing notes, which blinds the other twenty words.
   `stiff` is on the same exclusion list. **The trade-off is yours to make and the PM explicitly
   declines to make it.** If you hold the line on `sore`, say so in one sentence so it is not asked a
   third time.
4. **`physio`, `doctor`, `MRI`, `cortisone`** — also on the exclusion list. Re-examine them **only**
   because Rule S1's response is itself a referral: if he is already seeing someone, the referral line
   is redundant but the *load suppression* is not. Two halves, and the rule has no second tier.

Also owed, and it is the reason this is a coaching item and not a regex item:

5. **Does `S1_LINES[0]` — `You logged pain on this. Not something this app can assess.` — stay
   literal?** He did not log pain. He logged an arm that has not recovered. §13.5 says *"Output copy:
   unchanged. S1_LINES, verbatim. No new string."* A vocabulary that fires on non-pain words strains
   that sentence. Rule it: the literal stands, or UX is owed one replacement string (W5). **No engineer
   invents a literal here.**

Out: the detection shape (W2), any code, any test, any change to S1's suppression scope, clearing rule
(S1a), per-exercise reach or prohibitions. Out: the retroactivity ruling — that is §4 below, and W1
confirms or rebuts it in one line rather than re-deriving it.

Acceptance criteria:
- Both specimen notes are stated to fire or not fire, **by name**, with the reason.
- Every new entry carries a stem-hazard line in §13.5's table shape (`Tempting` / `Breaks on` /
  `Use instead`), or a statement that it has none.
- Every word the PM listed above is ruled in or out. **A word not mentioned is a gap, not a rejection** —
  say "out" and why.
- The compiled regex is printed once, character-exact, as §13.5 prints its own.
- The four previously-excluded entries (`flare`, `stiff`, `sore`, the clinician words) each carry an
  explicit overturn-or-hold sentence.
- **This item is deliverable without W2.** If W2 needs more thought, W1 ships alone.

Depends on: —

---

**W2 · The instrument — owner: `strength-coach`**

Scope — in: one section of §24. Is a keyword list the right instrument at all, given it just failed on
the first real injury the app ever received? Rule between, at minimum:

(a) list only, widened by W1;
(b) list **plus** a persistent one-tap control on the card that reports the same fact without any
    vocabulary at all;
(c) list plus a prompt fired when a note contains no recognised word.

**PM recommendation, on the record so it is not re-litigated: (b). `[Likely]`** No vocabulary catches
words not chosen in advance — that is the defect, restated — so the app needs one path that is not
vocabulary. And a tap can be forgotten, which is why the list stays as the safety net rather than being
replaced. (c) is rejected here: he writes prose most sessions, so it would fire most sessions, which is
the exact frequency argument that killed `sore`. The coach rules; the recommendation is not a decision.

If (b): state what the tap asserts (it must be the same boolean S1 already consumes — **one definition
of the trigger in this file, §13.5's rule, not a second one**), whether it is per exercise or per
session, whether it persists the way `painState` persists (ordinal, until that exercise is logged again
without it), and how it is cleared.

Out: the control's shape, size, position and words — UX's (W5). Any code.

Acceptance criteria:
- A named ruling with a confidence tag.
- If (b) or (c), the fact recorded is defined as *one boolean, through the existing `painFlag`
  chokepoint*, with a sentence saying it does not create a second definition of the trigger.
- The ruling states explicitly whether W1's list still ships in full under it. (The PM's position: yes,
  always. A tap is not a reason to narrow the list.)

Depends on: — (may run with W1, same document, but **must not delay it**)

---

**W3 · Implement the list — owner: `backend-engineer`**

Scope — in: `PHAT.PAIN_WORDS` in `logic.js`, and the comment block above `painFlag` that documents it.
Nothing else. The array is the single source; `PAIN_RE` stays compiled from it so the suite pins the
list and not a regex literal (§13.6).

**The engineer adds no stem, no spelling and no phrase that is not written in §24.** If a word seems
missing, stop and report it; do not add it. Every stem hazard in §24's table is honoured literally —
the five existing ones (`painting`, `number`, `achieve`, `stability`, `teardrop`) do not regress.

Out: `S1_LINES`, `S1_PROVENANCE`, `S1A_DAYS`, `PAIN_DAYS`, `painState`, `painWindow`, `verdictFor`'s
threading, and every suppression site. The scope of Rule S1 does not move in this order. Out: any
control (W6). Out: any store write — **this order writes zero bytes to any `phat:*` key.**

Acceptance criteria:
- `painFlag` returns `true` for both specimen notes, verbatim, including the hyphen and spacing of the
  12 Sep one.
- `PHAT.PAIN_WORDS` is frozen, exported, and compiles to the regex §24 prints, character-exact.
- The five existing stem hazards still return `false`: `painting`, `rep number`, `achieve`,
  `stability`, `teardrop`.
- `DEMO_NOTES` (`logic.js:11157`) — all five — still return `false`. Sample data must never fabricate a
  pain notice (the comment at `:11155` is a standing contract).
- `logic.js` diff is the array, its comment, and nothing else. No other exported behaviour changes.

Depends on: W1

---

**W4 · Pin it, and pin the class — owner: `qa-engineer`**

Scope — in: `tests.html`.

1. **Red-first, on the shipped tree.** Both specimen notes as assertions, run against `logic.js` from
   `git cat-file blob main:logic.js` at `97a8b32` under the same harness. They must go **red** there and
   green on W3's tree. This is the repo's standing proof discipline and it is not optional here.
2. **The real-note corpus.** Every note string in `CHADY_EXPORT` (`tests.html`, hash 1528318698 — his
   server's own bytes) asserted against `painFlag` with a **stated expected boolean per note**, each
   one traceable to a line in §24. This is the test that would have caught this and did not exist.
3. **A tripwire for the class (B-157).** A meta-test that fails if a note string appears in a shipped
   fixture without a ruled expectation. The failure this order fixes was not a wrong assertion — it was
   **no assertion at all on real prose**, while 900+ tests pinned the word list against itself.
4. **Retroactivity, asserted as behaviour** (§4): with his real export and the new list,
   `painState(sessions, "d1b")` is `active: true` with `date: "2026-09-22"`; and
   `painWindow(sessions, "2026-09-29", 7)` is **not** active, because `from = today − 6 = 2026-09-23`
   and 22 Sep is outside it. Both numbers are the PM's reading of `logic.js:8968`–`8993`; **verify them,
   do not assume them**, and report if either is wrong.
5. **Over-trigger measurement.** Run the new list over `DEMO_NOTES` and over every note in the suite's
   fixtures and report the count of new matches. A number, in the report, not a judgement.
6. **Zero stored bytes.** Before/after byte comparison of `phat:v1:log`, `bw`, `plans`, `prefs` across a
   full render with his export loaded. Nothing this order does may write.

Out: fixing anything W3 got wrong — report it. Out: any new fixture note not from his real data.

Acceptance criteria: the six items above, each with its number in the report. Suite green,
unconditionally (B-146's discipline: run it on more than one weekday). Zero skips, three meta-tripwires
intact.

Depends on: W3

---

**W5 · Copy and control — owner: `ux-designer`. Conditional.**

Runs **only** if W1 rules `S1_LINES[0]` must change, or W2 rules (b) or (c).

Scope: the replacement literal, if any, in §24's voice and CLAUDE.md §4's (terse, second person,
imperative, no hype). If W2 ruled (b): the control's words, position, size (≥ 44 px), and what it looks
like when it is on — on a card, one-handed, mid-set, with chalky hands.

**One thing UX owns whether or not the copy changes:** the notice is about to appear on `d1b` for a note
written on 22 Sep, with no announcement. Is that acceptable as-is? `S1_PROVENANCE` — `From your last
session on this.` — already exists and may be the whole answer. Rule it in a sentence.

Out: any change to `S1_LINES[1]` (the referral sentence) unless the coach asks for one.

Depends on: W1, W2

---

**W6 · The control — owner: `frontend-engineer`. Conditional on W2 = (b) or (c).**

Scope: render it, wire it into the existing `painFlag` boolean, persist it wherever the note persists —
**the same entry, the same draft key, the same reload guarantee**. Out: a new store, a new key, a new
definition of the trigger.

Acceptance criteria:
- With the control on and three sets entered, reload the page: the draft is offered back with all three
  sets **and** the control still on; declining discards both together.
- The control's state survives a save and reads back on the next render of that exercise.
- The card at 400 px wide still fits the note field, the sets and the control with the target ≥ 44 px.

Depends on: W5

---

**W7 · Verify the conditional half — owner: `qa-engineer`.** Depends on: W6. Only if W6 ran.

**W8 · Ship — owner: `release-engineer`.** Depends on: W4 (or W7 if it ran).

Scope: merge to `main`, deploy all 61 files, byte-verify. **`sw.js` VERSION:** the file list does not
change and no cached entry must be discarded, so by the header rule v7 **stays** — and the v7 refresh
carries the new `logic.js`. Verify by fetching `/logic.js` and requiring a string from the new list in
the body, never a build status.

---

## 4. The retroactivity ruling — his two notes do start firing, and that is correct

**Ruled by the PM; W1 confirms or rebuts in one line.**

**They fire, immediately, with no migration and no rewrite.** Here is the exact mechanism, because the
question was asked as if a stored verdict existed:

1. **No verdict is stored anywhere.** The app recomputes advice at render time from the note and the
   sets. So *"it would change advice he has already been given"* is a category error — nothing given is
   changed. What changes is what the card says the **next** time he opens it.
2. **`painState` is ordinal, not dated** (`logic.js:9060`, and the comment above it says so
   deliberately): it reads the most recent logged entry for that exercise. `d1b`'s most recent is
   22 Sep. So the notice appears on `d1b` the next time that card renders and **persists until he logs
   `d1b` again without such a note** — which is the designed behaviour and the honest one. He said
   *still not recovered* seven days ago and has not said otherwise.
3. **`painWindow` is dated and has already expired.** `from = today − (days − 1)` = 23 Sep on a 7-day
   window, so 22 Sep is outside it: V1's accessory offer is **not** retroactively suppressed. W4 item 4
   pins this.
4. **The stall-report clause (S2c, 21 days) is inside its window** and would gain its one factual line
   until ~13 Oct. That is a factual sentence, in the conservative direction, on a report he has not
   triggered. Accepted.
5. **S1a's 21-day restatement will fire on its own** if he never logs `d1b` again: on ~13 Oct the copy
   changes **once** to name the date. Designed, and it is why S1a exists.

**Suppressing the retroactive firing would need a date gate that does not exist and that the coach
explicitly refused** (§13.5: *"NO SECOND WINDOW"*, one definition of the trigger in the file). Building
one to avoid a notice about an arm he twice said was not right would be the wrong side to be wrong on.

## 5. B-116 is **not** answered by this, and saying it is would close the wrong question

**I disagree with the reading, and the disagreement is worth two sentences.** B-116 is *warm-up sets:
logged, marked, or omitted?* The two notes are him narrating a **substitution**, which is B-111 / B-136
— and that question was already answered on 2026-09-28 by his behaviour and closed into WO-014 as `sw`
on the entry. The notes are new evidence for a question that is already shut.

**What they do add is real and is recorded**, and it is bigger than either question:

- **He uses the note field as a session narrative, not as a comment.** He wrote what he did instead, and
  why, in prose, because there was nowhere else. That is why WO-014's swap matters and it is confirmed,
  not inferred.
- **He substitutes for injury, not for convenience.** Both notes say so. That is a fact about what a
  plan must tolerate and it belongs to WO-018 (named alternates per slot — raised, not decided).
- **It is evidence toward B-116, not an answer.** A man who logs a movement he did not intend to do is
  plausibly a man who logs his warm-ups too — `[Likely]` — but *logged, marked, or omitted* is a design
  ruling nobody has made, and the five-set 20 → 70 kg ramp on `d1a` is still read by every engine as
  prescribed work. **B-116 stays open, with this evidence on its row.** It is one sentence from him and
  it has now been owed through four work orders.

## 6. What this changes about WO-015 (the repair), which is not yet written

Three amendments, to be folded in when WO-015 is drafted:

1. **The notes are evidence and they close `d1b`'s reading.** `d1b` was held on one more sentence from
   him because *"pull-ups, nothing added"* contradicted the stored bytes. **Two notes, ten days apart,
   both say pulldown**, and the 22 Sep ramp 65 / 75 / 85 / 95 is a stack. The held question is answered
   by his own prose. What remains outstanding is only **the stack's unit** — kg or lb.
2. **The repair must not touch `note`, byte for byte**, and the fingerprint gate should **include** the
   note string. It is the most distinctive run of bytes in either entry, and it makes the gate stronger
   at zero cost.
3. **A question WO-015 must answer rather than inherit: are these two entries swaps?** Schema 7 now has
   the field (`mv` / `sw`) that did not exist when the entries were written, and he has told us in prose
   that they were substitutions. Coach §21 ruled *"no rule in this section reads a note to infer a
   swap"* — and that ruling is about **code inferring silently**, not about a human-ruled, Chady-
   confirmed, fingerprint-gated one-off. The distinction is worth stating once, because it is the
   difference between a store rewrite driven by prose and a correction driven by a person. **The PM does
   not rule it here.** It is WO-015's to specify and the coach's to sanction.

## 7. Risks

| Risk | Sev | Mitigation |
|---|---|---|
| **Over-trigger.** A wider list holds loads on ordinary notes, he stops writing notes, and all 21+ words go blind | P1 — it is the failure §13.5 was designed around | The frequency argument is the coach's to apply word by word (W1 items 2–3); W4 item 5 **measures** the new list over every fixture note and reports a number |
| **The engineer adds a stem while "tidying"** — the exact mistake §13.5 names five times | P1 | W3's scope is "no word not in §24"; W4 pins the compiled regex character-exact against the document |
| A negated phrase needs a parser and someone builds one | P2 | Phrases are alternations, not parsing. `gave way` is the shipped precedent. If §24 asks for negation *scope*, stop and re-scope — do not implement a parser quietly |
| `S1_LINES[0]` says `pain` under a trigger that is not pain | P2 | W1 item 5 rules it; UX writes any replacement, nobody else |
| The notice appears on `d1b` with no explanation, mid-gym | P3 | W5's one sentence. `S1_PROVENANCE` likely already covers it |
| **Data at risk: none.** This order writes zero bytes to any store | — | W4 item 6 asserts it |
| **Migration needed: none.** No schema change, no stored shape change | — | — |
| Three lanes want `logic.js` (this, WO-015, WO-018 T2) | P2 | Main session serialises or uses worktrees; this one is smallest and goes first. Commit named paths, never `-A` (CLAUDE.md §4b) |

## 8. Needs from Chady

Nothing blocks this order. Two things are owed and one is now seventeen days old:

1. **How is the forearm?** Not a product question. If it is still not right seven days later, the
   fifth session should not open on `d1b` at all. The app has been silent about this for two sessions
   and one person should not be.
2. **B-116**, fourth asking: the five-set ramp 20 → 70 kg on `d1a` — warm-ups **logged, marked, or left
   out**? One sentence.
3. **WO-015, unchanged:** is the lat pulldown stack in **kg or lb**? His answer closes the repair table.
