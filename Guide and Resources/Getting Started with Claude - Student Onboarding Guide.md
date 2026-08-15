**Getting Started with Claude**

_A Step-by-Step Onboarding Guide for the CUA AI Vibe Coding Competition_

Prepared for student contestants • Catholic University of America • 11 May 2026

# Welcome, Contestant

Welcome to the CUA AI Vibe Coding Competition. Whether you wrote your first line of code last week or you have been programming since middle school, this guide will walk you through everything you need to do, in order, to go from "I have an idea" to "I have a deployed AI-powered application." The most important tool in your toolkit will be Claude, Anthropic's AI assistant. The most important skill will be learning how to collaborate with Claude well.

This guide assumes nothing. We will start at the beginning. By the end you will have a working development environment, a Claude account, a GitHub repository, an AWS server, and the confidence to start building something real. Take it slow, follow each step, and resist the urge to skip ahead. The contest rewards transparent, iterative progress, not heroic late-night coding sessions in the final week.

Total time to complete this onboarding: roughly four to six hours, spread across two or three sittings. You do not need to do it all at once, and you should not try to.

# What You Will Need Before You Begin

Before you start, gather the following. A laptop running macOS, Windows, or Linux that you can install software on. A Chromebook will not work for the development portion of the competition, although you can still use Claude.ai in a browser to brainstorm.

Your CUA student email address. Some services give educational discounts when you use a verified university email, and the GitHub Student Developer Pack alone is worth several hundred dollars in free credits.

A working credit or debit card. AWS requires a card on file even for the Free Tier. You will not be charged anything if you stay within Free Tier limits, but you must have a card to register. A phone that can receive text messages, because both AWS and GitHub will text you a verification code at some point.

A quiet block of time. Plan for at least ninety minutes of uninterrupted setup the first day. Notifications, roommates, and short-form video apps will all derail you. Close them. And finally, a notebook, either paper or digital, where you will write down account IDs, command snippets, and the small lessons that will save you in week six. Treat this notebook like a piece of professional infrastructure.

# Step 1: Create Your Claude Account

Open a web browser and go to claude.ai. Click the Sign Up button. You can sign up with a Google account, an Apple account, or with an email address and password. We strongly recommend signing up with your CUA email so every receipt, password reset, and verification email lands in one inbox you actually check.

Choose a strong password. If you do not already use a password manager such as Bitwarden, 1Password, or Apple Keychain, this is a fine moment to start. Reusing passwords across accounts is the single most common reason students lose access to their projects mid-semester.

After creating your account you will be asked to verify your email. Open your inbox, click the link, and return to claude.ai.

Claude has a free tier and several paid tiers. The free tier gives you a generous number of messages per day with the latest model and is enough to get this guide done. As your project ramps up you will quickly find yourself wanting more capacity. The Pro plan unlocks longer context windows, higher daily message limits, and access to features such as Projects and Artifacts. Most serious contestants will want Pro at some point during the competition.

If your budget is tight, do this: start free, build until you hit a wall, then upgrade. There is no prize for paying earlier than you needed to.

Spend five minutes inside Claude.ai before doing anything else. Type "Explain version control to me as if I am a freshman in business school" and read the answer. Then ask a follow-up. Then ask Claude to give you the same answer in three sentences. Get a feel for how Claude responds, how it handles follow-ups, and how the conversation drifts when you change topics. This intuition matters more than any tutorial.

# Step 2: Understand the Three Ways You Will Use Claude

Anthropic offers Claude through three different surfaces, and you will likely use all three during this competition. Knowing which one to reach for is half the battle.

The first is Claude.ai itself, the chat interface you just signed into. Reach for it when you are thinking, brainstorming, drafting, or learning. Use it to argue with yourself about your project idea, to explain unfamiliar concepts, to draft your README, to write your final pitch, and to review your code paragraph by paragraph. Claude.ai is your conversation partner.

The second is Claude Code, a command-line tool that runs in your terminal and can read, write, and execute code in your project directory. Reach for it when you are building. Claude Code can create files, run tests, fix bugs, and operate inside a real codebase. This is the tool that will turn the contest's "vibe coding" promise into actual lines of working software.

The third is the Claude API, which lets your application itself call Claude as part of its features. Reach for it when your finished product needs to do something intelligent at runtime, like summarize a document a user uploaded, classify a support ticket, or generate a personalized recommendation. Most contest projects will use the API for the AI features the judges will evaluate.

For the next several steps we will set up Claude Code, because that is what unlocks vibe coding.

# Step 3: Install Claude Code

Claude Code runs on your local machine and talks to Anthropic's servers in the cloud. To install it, you need a recent version of Node.js. Open a terminal.

On macOS, press Command-Space, type Terminal, and press Enter. On Windows, install Windows Terminal from the Microsoft Store and open it. Then install Windows Subsystem for Linux by running the command "wsl --install" in PowerShell as administrator and rebooting if prompted. Then open Ubuntu from your Start menu and use that as your terminal. On Linux, use whatever terminal your distribution gave you.

Inside the terminal, type the following and press Enter:

node --version

If you see a version number that starts with v18 or higher, you are set. If you see "command not found," you need to install Node.js. Go to nodejs.org and download the LTS version. Run the installer and follow the prompts. Close and reopen your terminal, then run the version check again to confirm.

Next, install Claude Code itself. In your terminal, run:

npm install -g @anthropic-ai/claude-code

You will see a long list of packages scrolling by. When it returns to a fresh prompt, you are done. Confirm by running:

claude --version

If you see a version number, congratulations. Claude Code is on your machine.

If you see a permission error on macOS or Linux, you may need to either prefix the install command with "sudo" and provide your computer password, or, better, configure npm to install global packages into your home directory. The Claude Code documentation at docs.claude.com has a short page on this. Do not skip the documentation; it is genuinely helpful.

# Step 4: Authenticate Claude Code

Claude Code needs to know which Claude account it is using. Inside any directory, run:

claude

The first time you run it, it will open a browser window that asks you to log in to your Anthropic account. Log in with the same account you created in Step 1. Approve the device, return to the terminal, and you should see Claude's prompt waiting for you.

Try a tiny test. Inside the Claude prompt, type something like: "Create a new directory called hello-cua, put a single file called hello.txt inside it that contains the line I am ready to compete, and then list the files to confirm."

Claude Code will ask permission to run the commands. Read what it is about to do, press Enter to allow it, and watch the magic. When it finishes, you have just had your first AI pair-programming session. Type "exit" or press Control-D to leave.

A note on safety: Claude Code is powerful. It can delete files, push code, and run installers. By default it will ask before doing destructive things. Do not develop the habit of mashing Enter without reading the proposed action. Treat every prompt the way you would treat an email from your bank - pause, read, then act.

# Step 5: Have a Real Conversation with Claude About Your Idea

Before you write a single line of project code, spend an hour at claude.ai discussing what you actually want to build. The contest gives you total freedom, and total freedom is paralyzing. Use Claude to narrow it down.

Open a new conversation and paste in the contest description, including the example project ideas. Then ask Claude something like: "I am a junior accounting major at the Catholic University of America. I have intermediate Excel skills and have written tiny Python scripts for class. Out of the example project ideas, suggest the three that best play to my strengths while still being technically interesting. For each, describe the problem, the user, the AI feature, and the rough architecture."

Read Claude's answer. Push back. Ask follow-up questions. "What if I am more interested in marketing?" "Which one would be hardest? Which one would teach me the most?" Iterate until you have a single sentence that describes your project. Write that sentence in your notebook. It will anchor every decision you make for the next several weeks.

Then ask Claude to help you write a one-paragraph project brief: the problem, the user, the proposed solution, and the role AI will play. Save this brief in a text file called PROJECT.md. You will commit it to GitHub in the next major milestone.

# Step 6: Decide Whether to Use Laravel or Another Framework

The contest rules state that the backend should be Laravel in PHP, or a framework of your choosing. Laravel is a strong default. It is one of the most widely used web frameworks in the world, the documentation is excellent, and Claude knows Laravel intimately. If you have no strong reason to choose otherwise, choose Laravel.

If you already know a different framework such as Django, Express, Next.js, or Rails, and you can explain in one sentence why it suits your project better, use it. The judges care that the application works, not that you used a particular language. What they will penalize is choosing an exotic framework purely to look cool, getting stuck on basic setup, and shipping nothing.

To install Laravel, you need PHP and Composer, which is PHP's package manager. Ask Claude.ai: "I am on macOS, or Windows with WSL, or Ubuntu - walk me through installing PHP 8.2 or higher, Composer, and the Laravel installer, with copy-paste commands for my specific operating system. After each command, tell me how to verify it worked before moving on."

Follow the steps Claude gives you. When you hit an error, and you will, paste the error back into Claude and ask for help. This is the core vibe-coding loop: try, hit a snag, paste the snag, fix the snag, try again. Get good at this loop. It is the loop you will use a thousand times during this competition.

When you can run "laravel new my-project" and end up inside a working Laravel directory that boots in your browser, you are done with this step.

# Step 7: Set Up GitHub

GitHub is where your code will live publicly. The contest requires a public repository with a clear, honest commit history. The judges will look at your commits to see how you worked, not just what you ended up with.

Go to github.com and sign up for a free account. Use your CUA email so you qualify for the GitHub Student Developer Pack at education.github.com/pack. The pack bundles dozens of free credits and tools that will save you real money. Apply for the pack now; verification can take a day or two.

Install Git on your computer if it is not already there. On macOS, running "git --version" in your terminal will offer to install it for you. On Windows with WSL it is already installed. On Ubuntu, run "sudo apt install git."

Configure Git with your name and email so your commits are attributed to you:

git config --global user.name "Your Name"

git config --global user.email "<you@cua.edu>"

Next, set up authentication. The modern way is with an SSH key. Ask Claude: "Walk me through generating an SSH key on my machine, adding it to my SSH agent, and registering it on GitHub. After each command, tell me how to verify it worked."

Follow the steps. When you can run "ssh -T <git@github.com>" and see a friendly greeting from GitHub, you are authenticated.

Now create your competition repository. On github.com, click New Repository. Name it something descriptive, such as cua-medicare-fraud-detector. Make it public, add a README file, and add a .gitignore file using the Laravel template, or whatever matches your stack. Click Create.

Back in your terminal, navigate to your project directory and connect it to GitHub:

git remote add origin <git@github.com>:your-username/your-repo.git

git branch -M main

git add .

git commit -m "Initial commit: Laravel scaffold + project brief"

git push -u origin main

Refresh GitHub and you should see your code. Drop your PROJECT.md file from the previous step into the repository, commit it, and push.

From this point forward, treat commits as a public diary of your project. Commit at least once per work session. Write commit messages that explain why, not just what. "Add user model" is fine; "Add user model with email verification because contest rules require access control" is better.

# Step 8: Set Up AWS Free Tier

The contest requires that you deploy your app on the AWS Free Tier. Free Tier gives every new AWS customer a year of small servers, databases, and storage at no cost, plus some services that are always free in small amounts.

Go to aws.amazon.com and click Create an AWS Account. Use a personal email if possible. AWS has a long history of accidentally locking out students who used a university email and then graduated, lost the account, and lost their projects with it. Confirm with your professor if you are unsure.

Enter your name, address, and credit card. AWS will place a small temporary hold and refund it. Choose the Basic Support plan, which is free. Verify your phone with a text message.

Once inside the AWS console, you have entered the deep end. The console is intentionally vast. Do not try to learn everything. Instead, ask Claude.ai: "I just created an AWS account. I want to deploy a Laravel application using only Free Tier services. Walk me through, first, setting up an IAM user with appropriate permissions instead of using the root user; second, launching a single t2.micro or t3.micro EC2 instance running Ubuntu; third, configuring its security group so I can SSH in and serve HTTP; and fourth, installing PHP, Composer, and Nginx on the server. Tell me each step and tell me how to verify each one worked before moving on."

Follow the steps. Expect this stretch to take two to three hours the first time. Take breaks. When you can SSH into your EC2 instance from your local terminal and see the Linux command prompt, celebrate. You have a real server on the public internet.

A critical safety note: turn on AWS billing alerts before doing anything else. Go to Billing Preferences and enable alerts at one dollar, five dollars, and twenty dollars. Free Tier limits are generous but not infinite, and a misconfigured project can rack up unexpected charges. The alerts give you a smoke detector.

# Step 9: Connect Your Project to Your Server

Now you have a Laravel project on your laptop, a GitHub repo holding it, and an EC2 server in the cloud. The next step is wiring them together so a "git push" gets your code into production.

Ask Claude Code, from inside your project directory: "Help me write a deploy.sh script that, when I run it from my laptop, SSHs into my EC2 instance, pulls the latest code from GitHub, runs composer install, runs database migrations, and restarts the web server. Walk me through the script line by line so I understand it. Suggest one improvement I could make later for better deploys, but do not implement it yet."

Notice the prompt structure. We asked for behavior, asked for explanation, and asked for a future improvement separately so it does not bloat today's work. This is how to talk to Claude when you are coding: ask for what you want now, ask for understanding, and explicitly defer what you do not want now.

Run the script. Watch your code reach the server. Open the EC2 instance's public IP in your browser. If you see the Laravel welcome page, you are deployed.

Commit the deploy.sh script, but make sure it does not contain any secrets. Server passwords and API keys belong in a .env file that is in your .gitignore, never in tracked code. Ask Claude Code to scan your repo for accidentally committed secrets before every push.

# Step 10: Plan Your Build with Claude

You now have a deployed but empty application. Time to build the actual project. Open a fresh chat at claude.ai and have a planning conversation. Paste in your project brief, your tech stack, and your timeline. Then ask Claude to break the project into milestones you can finish each week. For each milestone, ask for the GitHub issues you should open, the user-facing functionality the milestone delivers, and the riskiest item you should tackle first. Ask Claude to be honest about what you might not finish.

Read the plan critically. Push back where it feels too ambitious. Cut features rather than skip transparency. Save the milestones in a file called ROADMAP.md and commit it. Open the issues on GitHub.

This is the moment most contestants get into trouble: they skip the plan, jump into code, build half a thing, and then panic in week seven. Plan first.

# Step 11: Build, Commit, and Repeat

You will spend the next several weeks in a loop. Open a GitHub issue. Discuss it briefly with Claude.ai to clarify scope. Switch to Claude Code in your project directory. Tell it what you want, in one sentence. Watch it propose changes. Read the changes before approving. Run the application locally. If it works, commit with a message that names the issue, for example "Closes #4: add user registration with email verification." If it does not work, paste the error into Claude Code and iterate. When the issue is done, push to GitHub, run your deploy script, and verify the change is live on your EC2 server. Close the issue.

A few habits will save you a great deal of pain. First, commit frequently and in small chunks. The judges will inspect your commit history. A repo with eighty thoughtful commits over eight weeks tells a story; a repo with four giant commits in week seven tells a different one.

Second, write tests for the riskiest parts of your code. You do not need one hundred percent coverage. You do need a test for the AI feature that determines whether your app is impressive or embarrassing.

Third, document as you go. After each milestone, ask Claude to update your README with a clear description of what the app does and how someone else could run it locally. Do this every milestone, not at the end.

Fourth, when you are stuck, write the bug down in plain English before asking Claude to help. Half the time, the act of writing it down will reveal the answer.

# Step 12: Integrate the Claude API into Your Application

Most of the example project ideas - the AI tutor, the fraud detector, the routing engine, the political prediction model - need your app to talk to an AI model at runtime. You do this by calling the Claude API.

Go to console.anthropic.com, sign in with the same account, and click into the API section. Create an API key. Treat this key like a password: never commit it to GitHub, never paste it into a public chat, never email it to yourself in plain text. Store it in your .env file on your laptop and on your server, both of which are excluded from Git.

In Laravel, install Anthropic's PHP client, or the community-maintained one Claude can recommend, with Composer. Wrap your API calls in a service class so the rest of your code does not have to know how the AI gets its answers. Add error handling for rate limits, timeouts, and content the model declines to generate. Log every API call with enough detail to debug - request, response, latency, cost - but never log your users' personal data.

Set a monthly spend cap on your Anthropic account. The API meters by tokens, and a runaway loop can get expensive in minutes. The cap is your second smoke detector after AWS billing alerts.

When you demo, expect the judges to ask: how did you decide which model to use, what prompt strategies did you try, how did you handle hallucinations, and how do you protect user data? Be ready to answer all four.

# Step 13: Add Access Control

The contest requires a login. Even if your app does nothing personal, the judges want to see that you understand authentication is part of building real software. Laravel's Breeze and Jetstream starter kits give you a working login, registration, and password reset in a single command. Install whichever one matches your project's appetite for fancy.

Once login works, sit with Claude Code and walk through three threat models: what happens if an attacker guesses a user's password, what happens if your API key leaks, and what happens if your database backup is stolen. For each, write down what you would do, even if you do not have time to implement it. The judges will reward awareness almost as much as implementation.

If your project handles anything that could be considered personal information, separate it from your public-facing parts the way the planning emails described: public website on one server, private user data on another, and a controlled API between them. This is the kind of thoughtful architecture choice that wins points in the rubric.

# Step 14: Polish, Document, and Prepare to Demo

In the final two weeks, stop adding features and start polishing. The judging rubric awards ten percent for user experience and ten percent for business impact and presentation. These points are easier to win than another AI feature.

Have Claude.ai review your README. Have a friend who is not in tech try to use your app and watch silently while they fumble. Fix what they fumble on. Run Lighthouse on your deployed site and ask Claude to interpret the results.

Prepare a five- to ten-minute demo. Open Claude.ai and ask: "I have a five-minute demo of my project. Here is the problem I solve, here is the user, here is the AI feature, and here is the architecture. Help me write a demo script with timestamps. The first thirty seconds must hook a non-technical judge. The last thirty seconds must leave them remembering one specific thing."

Practice the demo three times. Record yourself once and watch it back. You will hate the first viewing. Fix the worst three things. The second viewing will be better.

Finally, write a one-page summary that names the problem, the solution, the AI usage, and the three biggest things you learned. The contest requires it. Most contestants will treat it as a chore. Treat it as your closing argument.

# Best Practices for Working with Claude

Be specific. "Make this better" gets you generic advice. "This Laravel route is returning a 500 error when a user submits an empty form. Here is the code, here is the error, what is the most likely cause and how do I fix it?" gets you a fix.

Show your work. Paste the actual error, the actual code, and the actual output. Claude is uncannily good at debugging when given enough to look at, and uncannily bad at it when asked to guess.

Push back. If Claude gives you an answer that smells off, ask "are you sure?" or "what would have to be true for that to be wrong?" The conversation gets better when you challenge it.

Use the right tool. Brainstorming and decisions go in claude.ai. File creation and editing go in Claude Code. Runtime intelligence goes through the API. Mixing them up wastes time.

Save what works. When a prompt produces a great result, copy it into a file called PROMPTS.md in your repository. By the end of the competition you will have a personal prompt library worth keeping.

Trust but verify. Claude can confidently produce code that does not work or facts that are not true. Run the code. Check the facts. Use Claude as a brilliant colleague, not as an oracle.

# Common Problems and How to Untangle Them

If Claude Code refuses to run a command, read the message. It is usually flagging a destructive action you can either approve, modify, or skip. Do not bypass these checks; they exist to protect your project.

If your AWS bill starts to creep up, log into the console and check Cost Explorer. Common culprits are leaving an EC2 instance running twenty-four hours a day above the Free Tier hours, oversized EBS volumes, and forgotten NAT gateways. Stop, but do not delete, the instance when you are not actively working.

If GitHub rejects your push because the branch has diverged, do not force-push. Fetch, rebase, resolve conflicts, and try again. If you do not know what those words mean, ask Claude to explain them before doing anything.

If your Claude API responses suddenly look different, check whether you upgraded the model. Newer models behave differently and may need different prompts. Pin the exact model string in your service class and only change it deliberately.

If you feel like you are drowning, talk to your professor before the next class. The contest is hard. Asking for help is part of the job, and starting that conversation a week early is worth more than any all-nighter.

# How to Prompt Claude So It Actually Helps You

The single biggest predictor of how productive you will be in this competition is the quality of your prompts. Two students can hand the same problem to Claude and walk away with completely different outcomes - one with clean working code and a clear understanding of what changed, the other with a half-broken file and no idea why. The difference is rarely the AI. It is almost always the prompt.

A good prompt has four parts: context, goal, constraints, and format. Context tells Claude what world you are operating in: the framework, the file you are editing, the user you are serving, and the relevant history. Goal states the single concrete outcome you want from this turn of the conversation. Constraints list the things Claude must avoid, the patterns it must respect, and the budget it must stay inside. Format describes how you want the answer back - code only, code plus explanation, a numbered checklist, a single paragraph.

Compare a weak prompt - "fix my login" - with a strong one: "Here is my Laravel auth controller. When a user submits a wrong password three times, the lockout middleware throws a 500 instead of returning a friendly 429. Find the cause and propose the smallest fix that keeps the existing tests passing. Show me the diff first; do not write any files yet." The strong prompt names the file, the symptom, the boundary condition, the constraint, and the format. Claude can act on it. The weak one forces Claude to guess, and guesses turn into yak shaves.

A useful trick: when Claude's first answer is not quite right, do not start over. Instead, name what was off and ask for an iteration. "That works but it changes a public method signature, which I cannot do - propose a fix that keeps the signature stable." You will get a better answer in one turn than you would by rewriting your prompt from scratch.

Another trick: when you do not know enough to write a good prompt, ask Claude to write the prompt for you. "I want to add rate limiting to my API but I do not know what questions to ask. What information would you need from me to give a good answer?" Claude will list the missing context. Fill it in, and now you have a good prompt.

# A Quick Glossary of Terms You Will Hear

API. An application programming interface - a way for one piece of software to ask another for data or behavior. The Claude API is the way your application talks to Claude at runtime.

Backend. The part of your application that runs on the server. Databases, business logic, and API endpoints all live here. Laravel is a backend framework.

Frontend. The part of your application that runs in the user's browser. HTML, CSS, and JavaScript that produce the screens the user sees and clicks.

Repository, or repo. A folder of code tracked by Git. Your competition repo is the public folder on GitHub where your project lives.

Commit. A snapshot of your code at a specific moment, with a message explaining what changed. The commit history is the public diary of your project.

Branch. A parallel line of development in your repo. Most contestants will live on a single main branch; some will create branches for experiments and merge them back when they work.

EC2. Amazon's cloud servers. A t2.micro EC2 instance is a small Linux machine that costs nothing on Free Tier and is plenty for a contest project.

Environment variable, or env var. A piece of configuration kept outside your code, usually in a file named .env. API keys, database passwords, and anything else secret should live here, not in your repository.

Token. The Claude API's unit of measurement. Roughly three quarters of a word. Both the prompt you send and the response you get back count against your budget.

Hallucination. When an AI confidently states something that is not true. Claude hallucinates less than older models, but it still hallucinates. Verify before trusting.

Rate limit. The maximum number of requests you can make in a given window. Hit one, and the API will return an error. Plan your code to back off and retry rather than crash.

# A Suggested Four-Week Schedule

Most students will compete inside a roughly eight-week window. The exact weeks will depend on your section, but the shape of the work tends to look the same regardless. Use this schedule as a default and adjust the dates to match your section.

**Setup**. Finish this entire onboarding guide. Have your Claude account, Claude Code, GitHub repo, and AWS server all working. Push at least three small commits, even if all they do is edit the README. The goal is to prove that your full pipeline - from your laptop to GitHub to your live server - works end to end.

**Ideation** and planning. Pick your project, write your brief, and produce your roadmap. Open all your GitHub issues. Most students who fail this contest fail by skipping week two.

**Application**. Build the boring scaffolding: user accounts, the home page, the database schema, the deploy script. None of this is the AI feature. All of it is required before the AI feature can do anything useful.

**AI feature** itself. Wire up the Claude API. Build the user-facing experience around it. Test it with real inputs. Iterate on the prompts. Measure how often it gets the right answer and what it does when it does not.

**Polish**, security, and documentation. Improve the design. Tighten the access control. Update the README and the one-page summary. Run through the demo end to end.

**Demo**, the submission, and rest. Do not push new features unless you are fixing a bug that breaks the demo. New features at the last minute are how good projects fall apart in front of judges.

# Pre-Submission Checklist

Before you submit, walk through this list out loud with another contestant or with Claude.ai. If you cannot answer yes to every item, fix it before submitting.

My GitHub repository is public, has a clear README that explains what the project does, lists the technologies used, and explains how to run it locally. The repo has at least one commit per work session and the messages explain the why, not just the what.

My application is deployed and accessible at a public URL. The URL works on a phone as well as a laptop. Logging in works. Logging out works. Resetting a forgotten password works.

My AI feature does something a non-AI feature could not. A judge can use it in less than thirty seconds and immediately see what is intelligent about it. I can explain in one sentence what the AI is doing and why I chose to do it that way.

My .env file is not in the repository. My API keys are not in the repository. I have run a search across my entire commit history to confirm that no secret was ever accidentally committed.

My AWS billing alerts are on. My Anthropic API spend cap is set. I will not wake up to a surprise bill the morning after the demo.

My one-page summary is written, proofread, and saved as a PDF in the repository. My demo script exists, has timestamps, and I have rehearsed it at least three times.

My one biggest risk has a backup plan. If the live demo fails, I have a recorded video of the working flow on my laptop and I can switch to it without panic.

# You Are Ready

You now have a Claude account, Claude Code installed, a GitHub repository, an AWS server, and a plan. Most of your classmates are still staring at the contest description wondering where to start. You are about to start.

The judges will not remember which framework you used, what color your buttons were, or whether your model was the absolute latest. They will remember whether your project solved a real problem, whether your demo made them care, and whether your commit history showed someone who learned out loud.

Build something you would actually use. Commit early and often. Talk to Claude like a colleague, not a search engine. And come back to this guide whenever you feel lost - you will not be the only one.

Good luck. We are looking forward to seeing what you ship.

## One Last Word on Mindset

The contest is built around an idea your professors believe in: that the students who learn to collaborate fluently with AI will be among the most valuable young hires in any field they choose. Not because AI replaces accountants, marketers, or operations leaders - it does not - but because the people who can describe a problem precisely, decompose it, hand off the right pieces, and verify the result will get more done in a week than their peers do in a month. This contest is a laboratory for that skill.

So when you get stuck, do not retreat into the parts of the work that feel safe. Lean into the parts that feel uncomfortable. Ask a question you are afraid is dumb. Ship a feature that is rougher than you would like. Watch a stranger try your app and resist the urge to defend it. Each of these moments is where the actual learning lives, and the actual learning is what you will carry into your career long after the prize money is spent and the trip to Miami is just a photo on your phone.

Now close this document, open your terminal, and start at Step 1.