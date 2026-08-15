**Set up your AWS Free Tier**

Step-by-step for first-time coders

_About 30 minutes. You will need a credit or debit card. AWS does not charge it if you follow this guide._

# Before you start

Amazon Web Services (AWS) is the company that runs about a third of the entire internet. The **Free Tier** is their offer to new accounts: certain services are free for 12 months, up to a usage limit. The contest only asks you to use Free Tier resources.

Three rules to follow before you go any further:

- **Use a card with a low limit, or a debit card.** AWS requires a payment method to verify you. You will not be charged if you follow this guide. But mistakes do happen - better the card you use have a small limit.
- **Set billing alerts immediately.** This is the single most important step. We will do it together below.
- **Turn off services you are not using.** AWS bills by the hour. Forgetting to stop a server is the most common way students rack up surprise bills.

**If you see a charge**

Email **<yoest@cua.edu>** immediately. AWS will almost always refund a first-time accidental charge if you ask within 30 days, but you have to ask. Do not panic-delete things - that often makes it worse.

# Part 1 - Create your AWS account

1. Open a browser tab and go to **aws.amazon.com**.
2. Click the orange **Create an AWS Account** button in the top-right corner.
3. Enter your **@cua.edu email address** and pick an AWS account name. The account name can be your real name.
4. AWS will email you a verification code. Type it in.
5. Set a root user password. Use a password manager if you have one. Save this somewhere safe.
6. **Contact information:** pick "Personal" (not Business), fill in your name, phone number, and address. Use your campus address if you live on campus.
7. **Payment information:** enter your credit or debit card. AWS may put a \$1 hold on it to verify - that hold disappears within a few days.
8. **Identity verification:** AWS will send a code to your phone via text or voice call. Enter it.
9. **Support plan:** Pick the **Basic Support - Free** option. The other plans cost money.
10. Click **Complete sign up**. AWS takes a few minutes (sometimes up to 24 hours) to activate your account. You will get an email when it is ready.

# Part 2 - Set billing alerts (do this immediately)

This is the most important section in this guide. Skip it and you risk a surprise bill. Do it now, before you launch anything.

1. Sign in to AWS as the **root user** (the email you just signed up with). Go to **console.aws.amazon.com**.
2. In the top-right of any AWS page, click your account name, then **Billing and Cost Management**.
3. In the left sidebar, click **Billing preferences**.
4. Turn on **Receive AWS Free Tier alerts** and enter your email. AWS will email you when you hit 85% of any Free Tier limit.
5. Turn on **Receive Billing alerts** as well. Save.
6. Now go back to the AWS console search bar at the top and type **CloudWatch**. Click the CloudWatch service.
7. In the CloudWatch sidebar, click **Alarms**, then **Billing**. If a banner asks you to enable billing metrics, do it.
8. Click **Create alarm**, then **Select metric**, then **Billing**, then **Total Estimated Charge**, pick the **USD** metric, and click **Select metric**.
9. Set the threshold: **"Greater than \$1"**. Yes, one dollar. You will be warned the moment anything starts costing money. Click **Next**.
10. On the next page, create a new SNS topic, give it a name like billing-alerts, enter your CUA email, and click **Create topic**.
11. Name the alarm over-1-dollar, click through to the end, and click **Create alarm**.
12. **Check your email.** AWS will send a confirmation email - you must click the link in it to start receiving alerts. If you skip this you will not get the alarm.

**What did you just do?**

You set an alarm that emails you the moment your AWS bill goes above \$1. Since the contest only uses Free Tier resources, your bill should stay at \$0. If you ever get that email, log in and figure out what's running.

# Part 3 - Enable MFA on the root account

Multi-factor authentication (MFA) means even if someone steals your password, they still cannot get into your account without your phone. Required by the contest.

1. Top right of the AWS console, click your account name, then **Security credentials**.
2. Find the **Multi-factor authentication (MFA)** section and click **Assign MFA device**.
3. Name the device something like my-phone. Choose **Authenticator app**.
4. Install **Google Authenticator** or **Microsoft Authenticator** on your phone if you don't have one.
5. Open the authenticator app, tap the + icon, and scan the QR code shown by AWS.
6. Type two consecutive codes from the app into AWS to prove it works. Click **Add MFA**.

# Part 4 - Launch your free server (EC2 instance)

An **EC2 instance** is a virtual computer that lives in an AWS data center. You will use it to host your contest app. The t2.micro and t3.micro instance types are free for 750 hours per month for your first 12 months - that is enough to run one instance non-stop.

1. In the AWS console search bar at the top, type **EC2** and click the EC2 service.
2. In the top-right, make sure the region dropdown shows something close to you. **"US East (N. Virginia)"** (us-east-1) is the default and works fine for a contest project.
3. On the EC2 Dashboard, click the orange **Launch instance** button.
4. **Name:** type something like contest-server.
5. **Application and OS Images:** click **Ubuntu**. Pick **Ubuntu Server 24.04 LTS** (or whatever is the most recent LTS - it will say "Free tier eligible" next to it).
6. **Instance type:** pick **t2.micro** or **t3.micro**. Both say "Free tier eligible." Do not pick anything bigger - those cost money.
7. **Key pair:** click **Create new key pair**. Name it contest-key, pick **RSA** and **.pem**, then click **Create key pair**. Your browser will download a file. Save it somewhere safe - you cannot download it again. You may not need it for the basic path (Instance Connect works without it), but it is required to create the instance.
8. **Network settings:** click **Edit**. Check the boxes for **Allow HTTPS traffic from the internet** and **Allow HTTP traffic from the internet**. Leave SSH allowed only from "My IP."
9. **Configure storage:** leave the default (8 GB gp3). This is within Free Tier.
10. On the right side, the **Summary** panel shows estimated cost. It should say something close to **\$0.00**. If it doesn't, scroll back and find what you changed.
11. Click the orange **Launch instance** button.
12. Wait about a minute. Click **View all instances**. Your server will show **Instance state: Running**.

# Part 5 - Connect to your server (no SSH knowledge needed)

1. On the **Instances** page, click your instance to select it.
2. Click the **Connect** button at the top.
3. Click the **EC2 Instance Connect** tab (it should be the default).
4. Leave the username as ubuntu. Click the orange **Connect** button.
5. A black-and-white terminal will open in your browser. You are now inside your server. Type whoami and press Enter - it should print ubuntu.

**What did you just do?**

You launched a real Linux server in an Amazon data center and logged into it from your browser. This is the same kind of server that runs Netflix, Airbnb, and most of the websites you use. You are paying \$0 for it.

# Part 6 - Note your public address and send it to faculty

1. Go back to the **Instances** page in EC2.
2. Click your instance. In the details pane below, find **Public IPv4 address** (looks like 54.123.45.67) and **Public IPv4 DNS** (looks like ec2-54-123-45-67.compute-1.amazonaws.com).
3. Copy the **Public IPv4 DNS** value - this is the address you will eventually point your app at.
4. Email **<yoest@cua.edu>** with subject **"AI Contest - AWS server up"** and paste the DNS address.

# Daily habits to avoid charges

- **Check the billing dashboard once a week.** Console → top-right account name → Billing Dashboard. If the number isn't \$0.00, investigate.
- **Do not launch a second instance** unless you stop the first. The Free Tier is 750 hours/month total across all t2/t3.micro instances. Two running instances = double charges after the first 350 hours.
- **Do not enable extra services for fun.** If you see something interesting in the AWS console (SageMaker, Bedrock, anything with "AI" in the name), check pricing before clicking enable. Many AWS services are not on the Free Tier.
- **Stop, don't terminate.** If you want to pause to save Free Tier hours, click **Instance state → Stop instance**. "Terminate" deletes the server permanently. Stopped instances don't burn hours but the storage is still counted (well within Free Tier).

# If you get stuck

- **AWS says my account is "under review."** Normal. New accounts can take up to 24 hours to activate. Check your email - they sometimes ask for clarifying info.
- **My credit card was declined.** Try a different card. AWS sometimes rejects prepaid cards. A regular debit or credit card works.
- **I don't see Instance Connect as an option.** Your instance must be running for Instance Connect to appear. Refresh the page and wait 60 seconds after launching.
- **I got a billing alert email.** Don't panic. Sign in, go to Billing Dashboard, find what service is charging you, and turn it off. Email Prof. Yoest with what you find.
- **I lost my .pem key file.** You don't need it if you're using Instance Connect. If you need real SSH access later, you can create a new key pair and rotate it on the instance.
- **I'm completely lost.** Email **<yoest@cua.edu>** with the words **"AWS stuck."** A 15-minute screen share is faster than two days of forum searching.

## You are done with this milestone. Onward

Next milestone: get a "Hello World" page deployed at your AWS DNS address behind a login. That guide is up next.