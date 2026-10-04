# Week 1 retro (written Sunday 2026-10-04, week still open until Oct 7)

Built from `runs/`, `events/` and GitHub. 32 conductor run records so far.

## Numbers per task

| Task | PR | Parts | Fix rounds | QA rounds | Bugs | Start to merge |
|---|---|---|---|---|---|---|
| #1 Day 01 Monorepo | #8 | pilot, no parts | 0 | 1 (passed) | 0 | 2026-09-30 10:07 to 10-02 14:24 UTC, about 52 h. Merged by the owner by hand. About 45 h of that was waiting for a merge the conductor was not allowed to do. |
| #2 Day 02 Session format | #12 | 4 | 1 | 1 (passed) | 0 | 10-02 13:46 to 10-03 19:22 UTC, about 30 h. Merged by Auto-merge, about 2.5 h after its 20:40 local slot (GitHub cron delay). |
| #3 Day 03 DOM snapshot | #13 | 5 | Part 4: 2 rounds. Final review: 1 round (opened 10-04) | not started | - | open since 10-02 21:02 UTC |
| #4 to #7 | - | - | - | - | - | queued |

Agent time vs waiting time on #3 (launch comment to implementation commit, then commit to verification):
- Part 1: launch 20:58, commit about 21:02. Verified 21:58 (1 h wait).
- Part 2: 21:58 to 22:03. Verified 22:57 (1 h wait).
- Part 3: 22:57 to 23:05. Verified 04:57 next day (6 h wait, no night slot after 03:00 local).
- Part 4: 04:57 to 05:06. Verified 16:58 (12 h wait, no slot between morning and evening).
- Part 4 fixes: 16:58 to 17:00, 17:57 to 17:59. Each about 2 to 5 minutes.
- Part 5: 18:58 to 19:02. Verified 19:58.
- Final review: judged clean at 20:00 UTC on 10-03, could not be posted for 9 h (permissions), then reopened by this run with one real defect.
Cursor needs 2 to 8 minutes per part. Almost all elapsed time is waiting for the conductor or the owner.

## Where agents failed, by cause

- Weak spec / privacy edge cases (2 fix rounds on #3 Part 4): masked select leaked the chosen option first through `selected`, then through a star string with the length of one option. See PR #13 comments 5971333951 and 5971907875. Root cause: the issue did not say what a masked select must not record, and the first fix request named only one leak.
- Scope gap left for later (#3 Part 3, now a final fix): inlined same-origin CSS keeps relative `url(...)`, so assets break on replay. The Part 3 review saw it and marked it "not blocking". The final review on 10-04 made it blocking because it breaks the Definition of done item "Relative URLs become absolute". Lesson: a reviewer note that conflicts with the Definition of done should be fixed in that part, not deferred.
- Agent left PR as draft (#3 Part 5): caused by conflicting instructions (issue Requirement vs conductor 2.3), not by the agent.
- No CI flakes this week. No wrong-scope pushes. Commits were authored as the owner with the co-author trailer every time after the setup session.

## What the conductor got wrong or found unclear

- Merge and force-push are blocked for scheduled sessions. The chain stood still for about 2 days (09-30 to 10-02). Fixed by making merges a workflow step (auto-merge.yml) and by stacking.
- Reviews, labels and pushes to main were denied by the session permission classifier on 10-03 from 20:00 UTC. Four night runs in a row could not post the final review or request QA. On 10-04 a COMMENT review and a `@cursor` comment went through, a lesson commit to main went through, but a push of `qa/scenarios/day-02.md` to main was denied again.
- GitHub refuses a REQUEST_CHANGES review on a PR opened by the same account. All PRs are opened as the owner, so 2.3 must use a COMMENT review.
- The previous run judged the final review of #13 clean. A slower read today found the CSS URL defect. One-pass final reviews late at night are too shallow for 2,600-line PRs.
- `add_repo` is never available in scheduled sessions (logged in almost every run). The 0.2 fallback works.
- Run type at slot borders (21:57) was ambiguous once.
- AGENTS.md forbids touching `qa/scenarios/`, conductor 2.5.1 requires it.

## Lessons in 90-lessons.mdc and repeats

- [#2] run `pnpm build` before push. No repeat since.
- [#3] mask every copy of a masked value. Followed by a second leak of the same kind one round later, which became the next lesson.
- [#3] a masked value must not be matchable. No repeat after it.
- [#3] (10-04) resolve URLs inside inlined content against its source URL. New.

## Owner interventions

- Merged PR #8 by hand (10-02 14:24), because the conductor could not.
- Manual audit session on 10-02 (runs/2026-10-02/1350-manual-audit.json) that moved merging to auto-merge.yml and added stacking.
- Turned off Vercel authentication during setup so QA could open previews.
- Still needed: request QA on #13 if the conductor is blocked again, and add `qa/scenarios/day-02.md`.

## Proposed changes

This project only:
- Split big foundational tasks. PR #12 was about 3,600 lines and #13 about 2,600, against an 800-line target. Evidence: both PRs. Proposal: at most 3 parts per issue, or a separate issue for validation and privacy.
- Write privacy outcomes as explicit Requirements ("a masked select records no value and no selected option"). Evidence: 2 fix rounds on #3 Part 4.
- Write URL rules for every place a URL can hide (attributes, srcset with `data:` URLs, CSS `url()`, `@import`). Evidence: #3 Part 3 notes and today's final fix.

Reusable template:
- Give scheduled conductor sessions explicit permission for reviews, labels and docs commits to the default branch, or move those writes into a workflow the conductor triggers. Evidence: 10-03 20:00 UTC to 10-04 05:00 UTC stall, denied push today.
- In 2.3, say "post a COMMENT review" instead of REQUEST_CHANGES when the PR author is the owner account. Evidence: 422 today.
- Add a daytime slot (13:00 and 17:00 local) or trigger a verification run on `cursor[bot]` replies. Evidence: 6 h and 12 h idle gaps for #3 Parts 3 and 4.
- A reviewer note that touches a Definition of done item is never "for later". Evidence: CSS URL issue deferred on 10-03, blocking on 10-04.
- Remove "Mark the PR as ready" from part Requirements; the conductor owns it. Evidence: #3 Part 5.
- In AGENTS.md, say the `qa/scenarios/` ban applies to coding agents only. Evidence: conflict logged 10-03.
- Night runs that only repeat a known blocker should only refresh `status/current`. Evidence: about 15 identical "stuck" records on 09-30 and 10-01.
