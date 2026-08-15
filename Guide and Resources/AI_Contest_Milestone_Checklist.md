**AI Vibe Coding Competition**

Four-Week Milestone Checklist

_Build window: May 17 - June 13, 2026_

## How to use this document

This is a dual-purpose checklist. Students use the rows to track their own progress. Faculty (Prof. Yoest) use the right-hand column to record signoff, dates, or notes at each weekly gate.

The 'How crazy can you get?' competition is built around iterative, transparent progress. The point of these milestones is not paperwork - it is to make sure each student is shipping something real every week, not vanishing for three weeks and surfacing with a brittle demo on June 13.

- Green light to advance: most rows in a week's table have a faculty signoff.
- Yellow flag: 2+ rows in a week are blank by the weekly demo - schedule a check-in.
- Red flag: no commits to GitHub in a 5-day window - intervene immediately.

# Week 1 - May 17 to May 23

## Foundation and scaffolding

The goal of Week 1 is to remove every excuse for not building. By Saturday May 23, the student should have a public repo, a live URL, and a login screen they can show their grandmother.

| **Deliverable**                     | **What it looks like**                                                                                                                                                | **Done?** | **Faculty signoff / notes** |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------- |
| **Thesis one-pager committed**      | README.md in the GitHub repo states the problem, the proposed AI solution, the target user, and 3-5 success criteria. Approved by faculty before any code is written. |           |                             |
| **Public GitHub repo created**      | Repo is public; .gitignore committed; MIT or similar license; initial commit on main. Repo URL sent to faculty.                                                       |           |                             |
| **AWS Free Tier account active**    | Account stood up under the student's name; billing alerts set at \$1 and \$5; root account MFA enabled.                                                               |           |                             |
| **Tech stack locked**               | Backend: Laravel (or alternative explicitly approved). Frontend approach noted. Required APIs listed (e.g., DataForSEO, Outstand, Claude API). Any paid keys flagged. |           |                             |
| **Hello-world deployed with login** | A blank page served from AWS, behind a working login screen, reachable at a public URL. Auth doesn't need to be production-grade yet, but the gate must work.         |           |                             |
| **First 5+ meaningful commits**     | Commits have real messages (not 'update'). History shows scaffolding progress, not a single drop.                                                                     |           |                             |

# Week 2 - May 24 to May 30

## Core build and first AI call

Week 2 is when the project becomes real. Data model is committed, one user flow works end-to-end, and the LLM is wired in - even crudely. A working pipeline now beats a clever pipeline next week.

| **Deliverable**                | **What it looks like**                                                                                                                         | **Done?** | **Faculty signoff / notes** |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------- |
| **Data model + schema**        | Database migrations committed. Entity relationships documented in README or a /docs file. PII fields flagged for separation.                   |           |                             |
| **Core feature scaffolding**   | At least one primary user flow works end-to-end without AI (e.g., create account -> create record -> view record).                             |           |                             |
| **First AI call wired up**     | App makes a real call to an LLM or API and renders the response to the user. Doesn't need to be the final feature - proves the pipeline works. |           |                             |
| **Secrets handled correctly**  | API keys in .env, not in the repo. .env.example committed. No keys in commit history (check with git log -p).                                  |           |                             |
| **10+ commits across 3+ days** | Iterative progress visible; not a single weekend dump.                                                                                         |           |                             |
| **Week 2 demo to faculty**     | 5-minute screen share or in-person walkthrough of what works and what's broken. Faculty gate before Week 3.                                    |           |                             |

# Week 3 - May 31 to June 6

## AI features, security, and UX

Week 3 is the depth week. The primary AI feature should be doing the work the thesis promised. Access control, PII separation, and error handling get hardened. This is the week judges' 'AI Integration & Innovation' score (20%) is earned.

| **Deliverable**                 | **What it looks like**                                                                                                                               | **Done?** | **Faculty signoff / notes** |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------- |
| **Primary AI feature complete** | The intelligent feature that justifies the project (prediction, generation, classification, analytics) works end-to-end on real or realistic inputs. |           |                             |
| **Access control hardened**     | Login is real (hashed passwords, sessions or tokens, logout works). Authorization enforced on protected routes - not just hidden UI.                 |           |                             |
| **PII separation**              | Any user data is isolated from public-facing endpoints. No PII in URLs, logs, or client-side code.                                                   |           |                             |
| **Error handling + edge cases** | App doesn't crash on empty inputs, bad inputs, or API failures. User sees a sensible message, not a stack trace.                                     |           |                             |
| **UX pass**                     | App is usable by someone who didn't build it. Forms have labels, buttons say what they do, mobile layout doesn't break catastrophically.             |           |                             |
| **README expanded**             | Setup instructions, env vars listed, screenshots or a demo GIF, link to live URL.                                                                    |           |                             |

# Week 4 - June 7 to June 13

## Polish, package, submit

Week 4 is freeze and finish. Code freeze midweek. The remainder is documentation, the one-pager, demo rehearsal, and making sure the live URL still works on judging day.

| **Deliverable**                  | **What it looks like**                                                                                                            | **Done?** | **Faculty signoff / notes** |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------- | --------------------------- |
| **Final feature freeze**         | By Wednesday June 10: no new features. Only bug fixes, copy edits, and documentation after this point.                            |           |                             |
| **One-page summary written**     | PDF or markdown: problem, solution, AI usage, key technical choices, what was learned. Submitted to faculty by Friday June 12.    |           |                             |
| **5-10 minute demo prepared**    | Slides optional. Must cover: the problem, a live walkthrough, the AI feature in action, lessons learned. Practiced at least once. |           |                             |
| **Live URL still works**         | Faculty and judges should be able to log in and use the app at any time during judging week. AWS instance not paused.             |           |                             |
| **GitHub repo cleaned up**       | README current, no broken links, commit history readable, no secrets in history, license file present.                            |           |                             |
| **Submission package delivered** | Single email or form submission containing: live URL, GitHub URL, one-page summary, scheduled demo time. Due Saturday June 13.    |           |                             |

# Final submission checklist - due Saturday June 13

Submitted as a single package to Prof. Yoest:

- Live URL (publicly accessible, behind login)
- Public GitHub repository URL
- One-page summary (problem, solution, AI usage, lessons learned)
- Scheduled 5-10 minute demo slot
- Confirmation that AWS instance will remain running through judging week

## Faculty gate summary

Quick reference for weekly check-ins:

- End of Week 1: repo + AWS + login screen exist, or escalate.
- End of Week 2: first AI call works end-to-end, or scope down.
- End of Week 3: primary AI feature complete, or reassign judging weight.
- End of Week 4: all four submission items in hand by Saturday.

Bonus points (up to 5) are available at judging for ethical AI considerations, accessibility, or cross-disciplinary applications. Mention this to students at the Week 3 check-in - too early and it distracts; too late and they cannot incorporate it.