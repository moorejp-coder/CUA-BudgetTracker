**Final Submission Checklist**

AI Vibe Coding Competition - "How Crazy Can You Get?"

**_Hard deadline: 11:59 PM Saturday, June 13, 2026_**

**Read this first**

You have **six deliverables** to submit, and you should not submit them until your app has passed all of the **"Before you submit" checks** below. If you start your final-day push only on Saturday afternoon, you will hit a bug at 10 PM you cannot fix in time. Begin Thursday.

# Three-day timeline

- **Thursday June 11** - feature freeze (no new code), README polish, screenshots captured, repo cleanup pass.
- **Friday June 12** - one-page summary written and saved as PDF. Demo run-through (out loud, on the clock). AWS billing sanity check.
- **Saturday June 13** - final QA pass on the live site (all checks below), then send the submission email by midnight. Earlier is better - email Prof. Yoest by 9 PM Saturday so you have a buffer for delivery problems.

# Before you submit: pre-flight checks

These are the checks judges will do the moment they open your project. Do them yourself first. Each row gets a checkbox.

## Your live app

| **Live app - pre-flight checks** | | |
| --- | | | --- | --- |
| ☐ | **Loads in incognito** | Open the live URL in a browser you've never used. No console errors, no broken images, no "site not found." |
| ☐ | **Login works for a fresh test user** | Create a new test account end-to-end. The signup → login → first action path must work without you. |
| ☐ | **Primary AI feature works** | Walk through your main user flow. The AI feature does what your README promises. No 500 errors, no infinite loading spinners. |
| ☐ | **Error handling on bad input** | Try: empty form, weird characters, a 100-character input. App gives a clean message - never a stack trace. |
| ☐ | **Works on phone** | Open the URL on your phone. You don't need to win design awards, but layout shouldn't be broken. |
| ☐ | **Page load under 5 seconds** | Reload the site. If you're staring at a blank page longer than that, judges will too. |

## Your GitHub repository

| **GitHub repo - pre-flight checks** | | |
| --- | | | --- | --- |
| ☐ | **README current** | Reads like documentation, not a sketch. Includes setup steps, env var list, link to live URL, at least one screenshot or demo GIF. |
| ☐ | **No secrets in history** | Run git log --all -p \| grep -i "api_key\\\|secret\\\|password" in your repo. Should return nothing sensitive. If it does, **rotate those keys immediately** and email Prof. Yoest. |
| ☐ | **License file present** | LICENSE file at the root of the repo. MIT is fine. |
| ☐ | **Clean commit history** | Open your commit list on GitHub. Messages should be readable. No commits named "asdf" or "fix." Rename with git commit --amend if needed. |
| ☐ | **Final commit pushed** | Make one last commit titled something like "Final submission - June 13, 2026." Confirms intent and timestamp. |

## Your one-page summary

| **One-page summary - pre-flight checks** | | |
| --- | | | --- | --- |
| ☐ | **Problem (1 paragraph)** | What is the problem, who has it, and why does it matter? Be specific. "Students struggle with X" is too vague. |
| ☐ | **Solution (1 paragraph)** | What does your app do? How does AI make it work? Name the model or API you used. |
| ☐ | **Key technical choices (3-5 bullets)** | Backend framework, hosting, AI provider, anything unusual. Why you chose each. |
| ☐ | **Lessons learned (3-5 bullets)** | Honest reflections. What surprised you. What you'd do differently. This is the most-read section by judges. |
| ☐ | **One page only** | 11 pt font, 1 inch margins. If it overflows, cut adjectives, not content. |

# The six deliverables

Every item below must be in your submission email to **<yoest@cua.edu>** by **11:59 PM Saturday, June 13**. Anything missing = automatic point loss.

| **The six required deliverables** | | |
| --- | | | --- | --- |
| ☐ | **Live URL** | Your deployed app's public URL. Test it in a **private / incognito window** to confirm it loads without your session. Login page must appear. |
| ☐ | **GitHub repo URL** | Public repo. Open it in a browser logged out and confirm the README, source code, and commit history are all visible. |
| ☐ | **One-page summary** | PDF or .docx attached to your submission email. Problem, solution, AI usage, key technical choices, lessons learned. One page. Not two. |
| ☐ | **Demo time slot** | 5-10 minute live demo scheduled with Prof. Yoest. Pick a slot during judging week and put it in your submission email. |
| ☐ | **AWS running confirmation** | Written confirmation in your email that your AWS instance will stay running through the entire judging period. Do not stop your instance to save credits. |
| ☐ | **Test login credentials** | Include a **judge-only test username and password** in your submission email so judges can log in without creating an account. |

# Your submission email

Send a single email to **<yoest@cua.edu>**. Copy the template below and fill in the brackets.

**Subject and body - copy and paste this**

**Subject:** AI Contest Final Submission - \[Your Full Name\] Prof. Yoest - Submitting my final project for the AI Vibe Coding Competition. All six deliverables below. **1\. Live URL:** \[<https://your-app-url.com\>] **2\. GitHub repo:** \[<https://github.com/yourname/yourrepo\>] **3\. One-page summary:** Attached as PDF. **4\. Demo time slot:** I am available \[list 2-3 time windows during judging week\]. **5\. AWS confirmation:** My EC2 instance will remain running through the entire judging period. I have set billing alerts and will not stop the instance. **6\. Judge test credentials:** Username: judge1 | Password: \[generated password\]. This account has full access. Quick notes for the judges: \[optional - anything they should know before opening the app, such as "the analytics page takes 10 seconds to load on first visit because it calls the LLM"\]. Thank you for running the contest. \[Your name\] \[Your phone - in case of judging-day issues\]

# After you hit send

- Take a screenshot of your sent email and save it. If anything goes wrong with delivery, that's your proof of submission time.
- **Do not push any more code to your repo** after submission. The judges will look at the timestamp of the last commit. Late commits look bad.
- Leave your AWS instance running. Do not pause, stop, or terminate it until Prof. Yoest tells you judging is over.
- Reply to confirmation: if Prof. Yoest does not acknowledge your email within 24 hours, resend it. Do not assume it arrived.
- Practice your demo one more time before judging day. The technical work is done; the talk is what wins.

## One last thing

If something is broken on Saturday and you cannot fix it, email Prof. Yoest **before** the deadline anyway. A partial submission with a clear note about what is broken is worth dramatically more than a missed deadline. Judges respect honesty. They do not respect silence.

Good luck.