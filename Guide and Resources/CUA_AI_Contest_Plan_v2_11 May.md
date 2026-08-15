**An Elegant AI Vibe Coding Competition**

_"How Crazy Can You Get?"_

Implement an AI Solution to a Problem or Opportunity

# 1\. Program Overview

The Competition launches a hands-on alternative to traditional business-plan assignments. Students will identify a problem or opportunity and build an AI-powered application.

The solution can be theoretical and not necessarily functional beyond the confines of the test application (e.g., an Uber duplicate does not actually need a real car service, but rather a simulated demo).

Participants will create, deploy, and demonstrate a solution using development tools. The competition emphasizes practical skill-building, real-world AI integration, and version-controlled progress.

## Core Objective

Equip students with immediately usable AI development skills across disciplines, including:

- Accounting (financial accounting, managerial accounting, auditing)
- Marketing (consumer behavior, marketing strategy, digital marketing)
- Economics (microeconomics, macroeconomics, managerial economics)
- Operations Management / Supply Chain Management
- Human Resource Management
- Entrepreneurship (new venture creation, innovation)
- Business Analytics / Data Analytics / Management Information Systems (MIS)
- International Business / Global Business
- Business Law / Ethics
- Strategic Management
- Sales
- Project Management
- Corporate Finance or Investment
- Nonprofit Management or Social Entrepreneurship

# 2\. Competition Focus & Scope

Students choose any issue they want to address.

Projects must result in a real, working application, but do not have to connect to the real world.

Emphasis on functional AI features that deliver value (automation, analytics, user-facing intelligence).

## Example Project Ideas

Students are free to create their own. Examples include:

- AI copywriter / content generator
- Financial analytics dashboard with predictive insights
- AI homework solver
- Tutoring assistant for a topic with display of concepts (not just a chatbot, but a visual learning system)
- Mock Uber-style service with intelligent routing/price
- Building an F1 engine, chassis, simulating a lap time based on inputs/outputs
- Build a predictive model for political elections
- Create from scratch a Learning Management System or CRM with Analytics
- Build a marketing management system with analytics for nonprofits or college enrollments
- Track marine life through the Strait of Hormuz
- Predict the legislative process to grant personhood for your AI Agent
- Find fraud in Medicare/Medicaid funding
- How to build a customer base for a neighborhood pub
- Develop an over-the-counter, oral drug for Cystic Fibrosis
- Craft a care plan for ADHD
- Earthquake prediction
- Marriage predictability model
- Build a Social Security replacement
- Any other AI solution that addresses a real-world or fantasy need

# 3\. Technical Requirements

- Backend Framework: Laravel (PHP) or Framework of Student's Choosing
- Frontend must be accessible through a publicly accessible website, with some form of access control (i.e., a login)
- Cloud Infrastructure: Students spin up their own servers using the AWS Free Tier
- AI Development Tools: Heavy use of AI coding assistants (e.g., Claude Code or equivalent) is encouraged and expected
- Version Control & Transparency: All projects must live in public GitHub repositories to show iterative progress, commits, and version history
- Deployment: Live, accessible demo required by submission deadline

## API Literacy & Recommended Resources

Understanding APIs is as fundamental as understanding AI - they go hand in hand. Students are expected to learn how to authenticate to, call, and handle responses from external APIs as part of their project work.

The following APIs are recommended as starting points. Free or low-cost options are prioritized to minimize barriers:

| **API / Service**      | **Category**            | **Notes**                                                                                                 |
| ---------------------- | ----------------------- | --------------------------------------------------------------------------------------------------------- |
| Anthropic / Claude API | AI / LLM                | Powers AI features. Free tier available; CUA may have university-wide access - check with your professor. |
| OpenAI API             | AI / LLM                | Alternative LLM provider. Free trial credits available for new accounts.                                  |
| DataForSEO             | SEO & Web Data          | Inexpensive data API for search rankings, keywords, SERPs. Student dev keys may be available.             |
| Outstand               | Social Media            | Social content and analytics API. Check for student or dev tier pricing.                                  |
| Alpha Vantage          | Financial Data          | Free tier for stock market data, suitable for financial analytics projects.                               |
| OpenWeatherMap         | Weather / Environment   | Free tier available. Good for logistics, agriculture, or environmental projects.                          |
| REST Countries         | Geography / Public Data | Completely free. Useful for international business or global tracking projects.                           |
| NASA Open APIs         | Science / Public Data   | Free. Wide range of datasets (satellite, climate, astronomy).                                             |

## Security Fundamentals

Basic security practices are part of the judging criteria and must be incorporated into every project. Students who are unfamiliar with these concepts are encouraged to use their AI coding assistant to learn as they build.

Required security practices:

- Access Control: Every application must include a login / authentication system. No publicly accessible pages containing user data or sensitive logic.
- Separate PII from public-facing systems: Personal Identifiable Information (names, emails, addresses, financial data) must never be exposed in front-end code, URLs, or public API responses.
- Environment variables: API keys and credentials must never be hard-coded. Store them in .env files and exclude from GitHub using .gitignore.
- Input validation: Sanitize all user inputs to prevent SQL injection and cross-site scripting (XSS).
- HTTPS: All deployed applications should serve traffic over HTTPS (AWS and most cloud providers offer this by default).

_Students are not expected to build enterprise-grade security systems. However, demonstrating awareness of these principles will be rewarded in scoring under Code Quality, Documentation & GitHub Transparency._

# 4\. Incentives for Participation

To drive high engagement across all skill levels:

- \$5,000 cash prize to the winning individual
- First-class trip for 2 nights to Miami for the winner plus a guest of the student's choosing - includes first-class flights from domestic US or Canada, 5-star hotel stay, and dinner at a Michelin-level restaurant with prize sponsors
- Remote internship opportunities with industry partners

These incentives are designed to make the competition attractive to both technically advanced students and those just beginning their AI journey.

# 5\. Curriculum Integration & Academic Support

There are no entry fees, no tuition, and no course credit awarded for this competition.

Only current CUA undergraduate students are eligible.

Goal: blend technical implementation skills with business acumen so students learn both how to build AI solutions and why they matter in real organizations.

# 6\. Engagement Strategy

- Primary channel: CUA undergraduate students in the Busch School.
- Messaging will highlight practical projects and real student success stories to appeal to diverse skill levels and backgrounds
- Focus on "build something real that solves a real problem" rather than "win a business-plan contest"

# 7\. Expected Outcomes

- All projects remain student-owned; the competition serves as a learning and portfolio-building experience
- Students gain tangible, resume-worthy AI development experience
- Faculty observe improved readiness for real-world AI applications beyond pure coding
- Successful pilot creates a repeatable model that can be expanded university-wide
- Participants leave with deployed applications, GitHub portfolios, and exposure to industry-standard tools and workflows

# 8\. Judging Criteria

Projects will be evaluated by a panel of faculty judges (including technical and business school representatives). Each criterion uses a 1-10 scale. Total possible score: 100 points. Ties are broken by judges' discussion focusing on Innovation & Impact.

| **Criterion**                                     | **Weight** | **Description & What Judges Assess**                                                                                                                                                                                                                                                                   |
| ------------------------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Problem/Opportunity Identification & Relevance    | 20%        | How clearly and convincingly the student(s) define a real-world problem or opportunity. Is the chosen issue meaningful, well-researched, and relevant to users or organizations? Does the AI solution directly address it with measurable value?                                                       |
| Functionality & Technical Execution               | 25%        | Does the application work as a live, deployed solution? Judges will test core features, error handling, and overall reliability. Effective use of chosen framework, AWS Free Tier, and AI tools will be heavily rewarded. Bonus for security, robustness, creative API usage, and handling edge cases. |
| AI Integration & Innovation                       | 20%        | How creatively and effectively is AI incorporated to solve the problem? Judges assess originality, sophistication, and how AI enhances the solution beyond basic functionality. Encourages thoughtful prompting and integration rather than "AI for AI's sake."                                        |
| Code Quality, Documentation & GitHub Transparency | 15%        | Clean structure, security practices (access controls, PII separation, environment variables), readability, and version control discipline. Public GitHub repository must show iterative progress. Documentation should make the project easy to understand and reproduce.                              |
| User Experience (UX), Design & Polish             | 10%        | How intuitive, accessible, and professional is the interface? Even simple UIs score well if user-centered and functional. Judges consider responsiveness and overall polish.                                                                                                                           |
| Business/Real-World Impact & Presentation         | 10%        | Potential for the solution to create real value. Quality of the final demo/pitch: clear explanation of the problem, solution, technical choices, and lessons learned.                                                                                                                                  |

## Scoring Guidelines

- 1-3 (Poor): Major gaps; application barely functions or problem is unclear
- 4-6 (Adequate): Meets basic requirements but lacks depth, polish, or innovation
- 7-8 (Strong): Solid execution with good AI use, clear progress, and real potential
- 9-10 (Outstanding): Exceptional in multiple areas - innovative, highly functional, transparent development, and compelling impact

## Additional Notes

All projects must comply with competition rules: original work, access controls, public GitHub, AWS Free Tier usage, etc.

Judges may award bonus points (up to 5 total) for exceptional elements such as ethical AI considerations, accessibility features, or cross-disciplinary applications.

Diversity of Skill Levels: Judges will consider the student's starting point. A beginner who builds a functional AI feature with clear learning demonstrated may outperform a more advanced student with a less thoughtful project.

Evaluation Process: Judges will review the live deployed application, GitHub repository, and a short presentation/demo (5-10 minutes). Submissions include a one-page summary highlighting problem, solution, AI usage, and key learnings.

Judges may revise and update contest rules in this rapidly changing environment.