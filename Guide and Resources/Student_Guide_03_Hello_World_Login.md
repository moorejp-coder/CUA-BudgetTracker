**Deploy a "Hello World" page behind a login**

Vibe-coding the first deploy with an AI assistant

_About 2 hours total, spread over two sessions. AI assistant required._

# The big idea

This is the milestone where many students freeze: "I don't actually know how to code, so how do I deploy anything?"

The answer is the same answer that justifies the entire contest. You **use an AI assistant** - Claude Code, GitHub Copilot, Cursor, or similar - and you tell it what you want in plain English. Then you copy the commands it gives you and run them. You verify each step works before moving to the next.

This guide gives you the prompts to feed your AI assistant, plus the verification checks to confirm each step worked. By the end you will have a real web app, with a real login screen, running on your AWS server, at a URL you can share.

**What you need before you start**

\- A working **AI coding assistant** (Claude Code is recommended - claude.com/code)

\- Your **GitHub repo** from Guide #1

\- Your **AWS EC2 instance running** from Guide #2

\- Roughly 2 hours of uninterrupted time

# Session 1 - Build a Laravel app with auth on your laptop

First we get a working app on your own computer. Then in Session 2, we move it to AWS.

## Step 1.1 - Install the basics on your laptop

You need three things installed: **PHP**, **Composer** (PHP's package manager), and **Node.js**. The easiest way is to ask your AI assistant to install them for you. Open Claude Code (or your assistant), and paste:

**Prompt for your AI assistant**

I'm on \[Mac / Windows / Linux - pick one\]. Install PHP 8.3, Composer, Node.js 20, and Git on my laptop. Verify each one works by running its --version command. Walk me through any errors.

Your assistant will give you commands to run. Run them one at a time. After each command, paste the output back into the chat so the assistant can confirm it worked.

**Verification check**

Open a terminal and run:

php --version - should print 8.3.x or higher

composer --version - should print Composer 2.x

node --version - should print v20.x or higher

git --version - should print git 2.x

All four must work before you move on.

## Step 1.2 - Create a new Laravel project

**Prompt for your AI assistant**

Help me create a new Laravel 11 project named \`contest-app\` in my home directory. Then install Laravel Breeze for authentication using the Blade stack. Then run the development server and tell me what URL to open. Give me commands one at a time and wait for me to confirm each one worked.

Your assistant will walk you through (roughly) these commands:

composer create-project laravel/laravel contest-app

cd contest-app

composer require laravel/breeze --dev

php artisan breeze:install blade

npm install && npm run build

php artisan migrate

php artisan serve

The last command will print a URL like **<http://127.0.0.1:8000>**. Open that URL in your browser.

**Verification check**

You should see a Laravel welcome page with **Login** and **Register** links in the top-right corner. Click **Register**, create a test account with any email and password, and confirm you land on a dashboard page. **You now have a working web app with real authentication.**

## Step 1.3 - Push your project to your GitHub repo

**Prompt for your AI assistant**

I have a local Laravel project at ~/contest-app. I already have an empty GitHub repo at <https://github.com/\[your-username\]/\[your-repo\>]. Help me push my Laravel project to that repo. Include a sensible .gitignore for Laravel (don't commit .env, vendor/, node_modules/, or storage logs). Then verify the push worked by listing what's on GitHub.

**Verification check**

Open your GitHub repo URL in a browser. You should see Laravel files: app/, routes/, composer.json, artisan. You should NOT see .env or vendor/. If you see .env in the file list, **stop and fix it immediately** - that file contains secrets.

# Session 2 - Deploy the app to your AWS server

Now we move the app from your laptop to your AWS EC2 instance so it has a real public URL.

## Step 2.1 - Connect to your AWS server

1. Sign in to the AWS console and open **EC2**.
2. Click your instance, then click **Connect**, then **EC2 Instance Connect**, then **Connect**.
3. You should now see a black terminal in your browser, logged in as ubuntu.

## Step 2.2 - Install the web server and PHP on AWS

**Prompt for your AI assistant (paste this in Claude Code on your laptop)**

I have a fresh Ubuntu 24.04 EC2 instance, connected through EC2 Instance Connect in my browser. I want to deploy a Laravel app to it. Give me, one at a time, the exact commands to:

1\. Install Nginx, PHP 8.3 with the extensions Laravel needs, Composer, Node.js 20, and Git.

2\. Clone my GitHub repo at <https://github.com/\[your-username\]/\[your-repo\>] into /var/www/contest-app.

3\. Set up the Laravel .env file with APP_KEY generated and SQLite as the database (to keep things simple).

4\. Run migrations.

5\. Configure Nginx to serve the app from the EC2 public address.

6\. Set the right file permissions so Laravel can write to storage/ and bootstrap/cache/.

Walk me through each command and tell me how to verify it worked before moving on. If something fails, help me debug from the error message.

Run each command your assistant gives you in the EC2 Instance Connect terminal. After each one, paste the output back to the assistant so it can confirm success or fix errors.

**When you hit an error**

Copy the **entire error message** - every line - and paste it back to your AI assistant. Tell it what command you just ran. Do not try to silently move past errors. Nine times out of ten the fix is a missing package or a permission issue, both of which the assistant will solve in one or two messages.

## Step 2.3 - Open port 80 on the EC2 firewall

If you didn't allow HTTP traffic when you launched the instance, do it now:

1. In the AWS console, go to **EC2** → your instance.
2. Click the **Security** tab → click the security group link.
3. Click **Edit inbound rules** → **Add rule** → Type **HTTP** → Source **Anywhere-IPv4** (0.0.0.0/0) → **Save**.

## Step 2.4 - Visit your live URL

1. Go back to the **EC2 Instances** page and copy your instance's **Public IPv4 DNS** (looks like ec2-54-123-45-67.compute-1.amazonaws.com).
2. Paste that into a new browser tab. Press Enter.
3. You should see your Laravel app's welcome page, with **Login** and **Register** links in the top right corner - the same page you saw on your laptop in Session 1.

**Verification check - the contest milestone**

Click **Register** on the live URL. Create a test account. Log in. You see the dashboard. **That is your "Hello World deployed with login" milestone, complete.**

If any of these don't work, paste the error or screenshot back to your AI assistant and keep going.

# Final touches

- **Update your README** on GitHub. Add a section titled "Live URL" with your EC2 public address.
- **Commit and push.** From your laptop, run git add . && git commit -m "Deploy v1: login working on AWS" && git push. This is the commit that proves the milestone to judges.
- **Take a screenshot** of your live login page. Save it in a docs/ folder in your repo. You'll use it later in your README and your one-page summary.
- **Email Prof. Yoest** with the subject **"AI Contest - Hello World + Login live"** and your live URL plus test credentials he can use to log in.

# If you get stuck

- **The page loads on my laptop but not on AWS.** Almost always a Nginx config or PHP-FPM issue. Paste your /etc/nginx/sites-available/contest-app file and the output of sudo systemctl status nginx to your AI assistant.
- **I see a Laravel error page on AWS but the message is blank.** Edit .env on the server, set APP_DEBUG=true temporarily to see the real error, then set it back to false once you've fixed it.
- **The page is loading really slowly.** First load on a fresh t2.micro is sometimes slow. If it's still slow after a few hits, ask your AI assistant to enable OPcache.
- **My assistant gave me a command that didn't work.** Paste the exact error back to it. It will iterate. Don't switch tools mid-debug - that loses context.
- **Everything is broken.** Email **<yoest@cua.edu>** with subject **"Deploy stuck"** and include: your repo URL, your EC2 DNS, the error you're seeing, and a screenshot. 15-minute screen share, problem solved.

## You're past the hardest milestone

Most students who deploy their first login screen finish the contest. Most who don't, drop out. You just crossed that line. From here on out, every feature you add is just "more of this" - write code with the AI, push to GitHub, the live URL updates.