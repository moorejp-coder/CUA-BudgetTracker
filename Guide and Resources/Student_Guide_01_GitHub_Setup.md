**Set up your GitHub repository**

Step-by-step for first-time coders

_About 20 minutes. No software to install. Everything happens in your web browser._

# What you're about to do, and why

GitHub is a free website that holds your code in public. The contest requires a public repository ("repo") because the judges need to see your work as it grows - every save, every edit, with a timestamp. That's the "transparency" line in the rubric.

Here is the good news: you do not need to know how to code, install anything, or use a command line to finish this step. You just click buttons in a browser. By the end of this guide you will have:

- A free GitHub account.
- A public repository named after your project.
- Three required files inside it: a **README**, a **.gitignore**, and a **LICENSE**.
- A URL you can send to Prof. Yoest.

**Heads up before you start**

Use your **@cua.edu email address** when you sign up. GitHub gives students free upgrades through the GitHub Student Developer Pack, and you'll want those later.

# Part 1 - Create your free GitHub account

## If you already have a GitHub account, skip to Part 2

1. Open a new browser tab and go to **github.com**.
2. Click the **Sign up** button in the top-right corner of the page.
3. Enter your **@cua.edu email address**. Click Continue.
4. Create a password. GitHub will tell you if it is strong enough - if it is not, add a number or symbol until the meter turns green.
5. Pick a **username**. This will be visible to everyone. Use something professional - your real name or initials plus a number is fine (for example: jsmith2026). You cannot change this easily later, so do not pick a joke.
6. Solve the puzzle GitHub gives you (it is testing that you are a real person), then click **Create account**.
7. Check your CUA email. GitHub will send a code. Type the code into the GitHub page to verify.
8. When GitHub asks how many team members or what your interests are, you can pick anything or click "Skip personalization." These choices do not matter for the contest.

**Did it work?**

You should now see a page that says "Welcome to GitHub" or a dashboard with a green **New** button on the left side. If yes, you're in.

# Part 2 - Create your project repository

A "repository" (or "repo") is the folder that holds your project on GitHub. You will create one repo per project.

1. On your GitHub homepage, click the green **New** button on the left side. If you do not see it, click the **+** icon in the top-right corner of any GitHub page and choose **New repository**.
2. **Repository name:** Type a short, lowercase, hyphenated name that describes your project. Examples: ai-tutor, smart-attendance, fundraising-helper. You can change this later, so do not overthink it.
3. **Description (optional but recommended):** One sentence. Example: "AI-powered tutor for managerial accounting - CUA contest project."
4. **Visibility:** Click **Public**. This is required by the contest. (Private repos exist for a reason, but yours is not one of them.)
5. **Initialize this repository with:** Check the box that says **Add a README file**. This creates the first page anyone sees when they visit your repo.
6. **Add .gitignore:** Click the dropdown that says "None." In the search box, type the name of your backend framework - Laravel, Node, or Python are common. Pick the one that matches your stack. If you have not decided yet, pick Node for now - you can change it later.
7. **Choose a license:** Click the dropdown that says "None." Pick **MIT License**. This says: "anyone can use my code, but it is not my fault if it breaks." It is the standard student-project choice.
8. Click the green **Create repository** button at the bottom of the page.

**What you just did, in plain English**

GitHub automatically saved ("committed") your README, .gitignore, and LICENSE files to a branch called **main**. That's your **initial commit on main** - the contest milestone is already done. You didn't have to type a single line of code.

# Part 3 - Fill in your README

Your README is the front page of your repo. Right now it is mostly empty. Fix that - judges and faculty will read it first.

1. On your repo's home page, click on the file named **README.md**.
2. Click the pencil icon (top-right of the file view) to edit it.
3. Delete what is there. Paste in the template below, then fill in the four sections.

**README template - copy and paste this**

**\# \[Your project name\]** **Problem.** One sentence: what problem are you solving and for whom? **Solution.** One sentence: what does your app do, and how does AI help? **Target user.** Who would actually use this? Be specific. **Success criteria.** Three to five bullets the judges could measure: speed, accuracy, cost, user satisfaction, etc.

1. Scroll to the bottom of the edit page. You will see a **Commit changes** box. Leave the default commit message ("Update README.md") or write a better one like "Add project description."
2. Click the green **Commit changes** button.

# Part 4 - Send your URL to Prof. Yoest

1. Click on the name of your repo at the top of the page to go back to the home view.
2. Look at your browser's address bar. The URL will look like: <https://github.com/your-username/your-repo-name>. Highlight it and copy it.
3. Send a short email to **<yoest@cua.edu>**:

**Email template - copy and paste this**

**Subject:** AI Contest - repo created Prof. Yoest - my contest repo is up. URL: \[paste your GitHub URL here\]. Thesis question is in the README. Happy to revise if you want changes. Thanks, \[Your name\]

# If you get stuck

- **I can't find the .gitignore dropdown.** It is on the same "Create a new repository" page, near the bottom, just above the License dropdown. Scroll down.
- **I picked the wrong .gitignore template (or wrong license).** Don't worry - you can change either by clicking on the file in your repo and editing it. Nothing is permanent.
- **My repo is private - how do I make it public?** On your repo page click **Settings** (top right), scroll all the way down to "Danger Zone," and click **Change repository visibility**. Set it to Public.
- **Should I worry about putting my code online for everyone?** Yes, but the rule is simple: never put passwords, API keys, or personal information into your repo. Those go in a separate .env file that the .gitignore template already keeps out. We will cover that in Week 2.
- **I'm completely lost.** Email <yoest@cua.edu> with the words "GitHub stuck." I'd rather spend 15 minutes on a quick screen share than have you give up on the contest over a button you couldn't find.

## You are done with this milestone. Onward

Next milestone: AWS Free Tier account. That guide is on its way.