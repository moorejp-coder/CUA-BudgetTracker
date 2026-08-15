**AI Contest: AWS Setup & Hello-World Deployment**

_Step-by-Step Instructions for Contestants_

This guide walks you through the two milestones for this stage of the contest:

- AWS Free Tier active - account created, billing alerts at \$1 and \$5, MFA on the root account.
- Hello-world deployed + login - any page served from AWS at a public URL, gated by a working login screen.

Follow the steps in order. Expect the full setup to take about 60-90 minutes.

# Part 1: AWS Free Tier Active

## Step 1: Create an AWS Account

1. Go to **<https://aws.amazon.com>** and click **Create an AWS Account** in the top right.
2. Enter your email address, choose an AWS account name (e.g., your full name or yourname-contest), and create a password.
3. Choose **Personal** account type when prompted.
4. Enter your contact information.
5. Enter a valid credit or debit card. AWS requires this even for the Free Tier. You will not be charged if you stay within Free Tier limits.
6. Complete the phone or SMS verification step.
7. Choose the **Basic Support - Free** plan.
8. Wait for the account activation email (usually within a few minutes, sometimes up to 24 hours).

## Step 2: Enable MFA on the Root Account

The root account has unrestricted access to everything. Securing it with MFA is non-negotiable.

1. Sign in to the AWS Console at **<https://console.aws.amazon.com>** using your root email and password.
2. In the top right, click your account name and select **Security credentials**.
3. Under **Multi-factor authentication (MFA)**, click **Assign MFA device**.
4. Choose a device name (e.g., yourname-phone).
5. Select **Authenticator app** as the MFA type.
6. Install an authenticator app on your phone if you don't have one (Google Authenticator, Authy, and 1Password all work).
7. Open the app and scan the QR code shown in the AWS Console.
8. Enter two consecutive 6-digit codes from the app to confirm setup.
9. Click **Add MFA**.

_From now on, every root login will require your password plus the code from your authenticator app._

## Step 3: Set Up Billing Alerts at \$1 and \$5

This protects you from accidental charges.

1. In the AWS Console, search **Billing** in the top search bar and open **Billing and Cost Management**.
2. In the left sidebar, click **Billing preferences**.
3. Enable **Receive AWS Free Tier alerts** and enter your email.
4. Enable **Receive Billing Alerts** and save.
5. Search **CloudWatch** in the top search bar and open it.
6. Make sure your region is set to **US East (N. Virginia) / us-east-1** in the top right. Billing metrics only live in this region.
7. In the left sidebar, click **Alarms** → **All alarms** → **Create alarm**.
8. Click **Select metric** → **Billing** → **Total Estimated Charge** → check **USD** → **Select metric**.
9. Under Conditions, set **Threshold type: Static**, **Whenever EstimatedCharges is Greater than 1**, then click Next.
10. Under Notification, create a new SNS topic (e.g., billing-alerts), enter your email, and click Create topic.
11. Click Next, name the alarm **Billing-Alert-1USD**, click Next, then **Create alarm**.
12. Check your email and click the confirmation link from AWS to subscribe to the SNS topic.
13. Repeat the alarm creation steps to create a second alarm at **\$5**, named **Billing-Alert-5USD**.

# Part 2: Hello-World Deployed + Login

You need any page served from AWS at a public URL, protected by a working login screen. The simplest, Free-Tier-friendly path is AWS Amplify Hosting with Amazon Cognito for authentication.

## Step 4: Build a Minimal Hello-World App

You can use any framework, but here's the fastest path using a basic React app.

1. Install Node.js if you don't have it: **<https://nodejs.org>** (LTS version).
2. Open a terminal and run:

npx create-react-app hello-contest

cd hello-contest

1. Open **src/App.js** in any editor and replace its contents with the snippet below.

function App() {

return (

&lt;div style={{ padding: 40, fontFamily: "sans-serif" }}&gt;

&lt;h1&gt;Hello, world!&lt;/h1&gt;

&lt;p&gt;You are logged in.&lt;/p&gt;

&lt;/div&gt;

);

}

export default App;

1. Test locally by running **npm start**. You should see Hello, world! at <http://localhost:3000>.
2. Stop the local server (Ctrl+C) and install the auth libraries:

npm install aws-amplify @aws-amplify/ui-react

## Step 5: Set Up a Cognito User Pool (Login)

1. In the AWS Console, search **Cognito** and open it.
2. Click **Create user pool**.
3. Application type: **Single-page application (SPA)**.
4. Name your application (e.g., hello-contest-app).
5. For sign-in identifiers, select **Email**.
6. For required attributes, leave defaults.
7. Click **Create user directory**.
8. After creation, note the **User Pool ID** and **App Client ID** from the overview page. You'll need them in the next step.

## Step 6: Wire Up Authentication in Your App

1. In your project, create a file **src/aws-config.js** with the contents below, replacing both IDs with the ones from Step 5.

export const awsConfig = {

Auth: {

Cognito: {

userPoolId: "YOUR_USER_POOL_ID",

userPoolClientId: "YOUR_APP_CLIENT_ID",

}

}

};

1. Replace **src/App.js** with the authenticated version below.

import { Amplify } from "aws-amplify";

import { Authenticator } from "@aws-amplify/ui-react";

import "@aws-amplify/ui-react/styles.css";

import { awsConfig } from "./aws-config";

Amplify.configure(awsConfig);

function App() {

return (

&lt;Authenticator&gt;

{({ signOut, user }) => (

&lt;div style={{ padding: 40, fontFamily: "sans-serif" }}&gt;

&lt;h1&gt;Hello, {user?.signInDetails?.loginId}!&lt;/h1&gt;

&lt;p&gt;You are logged in.&lt;/p&gt;

&lt;button onClick={signOut}&gt;Sign out&lt;/button&gt;

&lt;/div&gt;

)}

&lt;/Authenticator&gt;

);

}

export default App;

1. Test locally with **npm start**. You should see a login screen. Click Create Account, sign up with your email, confirm with the code emailed to you, then log in. You should see Hello, \[your email\]!

## Step 7: Deploy to AWS Amplify Hosting

1. Create a free GitHub account if you don't have one, and push your project to a new private GitHub repository. If you're not familiar with git, search 'push existing project to GitHub' for a quick guide.
2. In the AWS Console, search **Amplify** and open it.
3. Click **Deploy an app** → **GitHub** as the source.
4. Authorize AWS Amplify to access your GitHub account, then select your repository and branch (usually **main**).
5. Amplify will auto-detect that it's a React app. Accept the default build settings.
6. Click **Save and deploy**.
7. Wait 3-5 minutes for the build and deploy to finish.
8. Amplify will give you a public URL that looks like **<https://main.d1a2b3c4.amplifyapp.com>**.

## Step 8: Verify Everything Works

1. Open the Amplify URL in an incognito/private browser window.
2. Confirm you see the login screen.
3. Sign up with a new email, confirm the verification code, and log in.
4. Confirm you see Hello, \[email\]!

**You're done. Submit the public Amplify URL as proof of completion.**

# Quick Checklist

- AWS account created and activated
- MFA enabled on the root account
- Billing alarm at \$1 created and email confirmed
- Billing alarm at \$5 created and email confirmed
- Hello-world page deployed to a public AWS URL
- Login screen works (sign up, confirm, log in)

# Important Security Notes

- Never share your root credentials or MFA codes.
- Sign out of the root account when not actively using it. Ideally, create an IAM user for daily work (beyond the scope of this step but recommended).
- If you hit a billing alert, investigate immediately. The Free Tier is generous but not unlimited.