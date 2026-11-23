# CX Portal – Review pack for the Internal Audit and Marketing Lead

**From:** Manaf Obeidat, Delivery & CX Manager
**Date:** 23 November 2026
**What I need from you:** open the portal, go through your screens, and send me your requirements and corrections (section 6 lists the questions).

---

## 1. Open the portal

- **Link:** https://claude.ai/artifact/UJudX9bpSaBWGK42QVhbFe
- **Sign in as yourself:** `audit@psi.sample` (any password, the prototype does not check it).
- **To see what Marketing sees:** sign out and sign in as `marketing@psi.sample`.
- **On your first visit** a short guided tour opens. You can follow it or close it.

Good to know:

- Everything is **sample data**. Nothing is sent to anyone and no real customer is shown.
- What you change (a verdict, a criterion, a target) is kept in **your own browser only**. Nobody else sees it, and you cannot break anything.
- Reloading the page takes you back to the start page. Your changes stay.
- The portal works in English and Arabic (EN / ع at the top right).

---

## 2. Your screens

As the Internal Audit and Marketing Lead you see these pages:

| Where | Page | What it is for you |
|---|---|---|
| Workspace | My inbox | Your to-do list. You get a line when campaigns are ready to audit. |
| Workspace | 1 · Customers (Find a person, Who is leaving, Personas) | Look up a customer's full history, the customers drifting away, and the personas. |
| Workspace | 6 · CX indicators | NPS, CSAT and CES per product. |
| Settings and reference | **Marketing campaigns** | **The main page for you. See section 3.** |
| Settings and reference | Public mentions | What is said about PSI on Facebook, Instagram, LinkedIn and Google reviews. |
| Settings and reference | Weekly sample | 50 outputs of the AI team each week for you to check (no customer names). |
| Settings and reference | Monthly CX pack | The monthly report. |
| Settings and reference | Standards register | The standards the portal scores against. |
| Settings and reference | Rules as configuration | The numbers the portal applies (thresholds, hours, caps). |
| Settings and reference | Surveys | Survey results, questions, timing and campaigns. |
| Settings and reference | Who handles what | Who receives each kind of problem, per product. **You can edit it**, together with the CX manager. |
| Settings and reference | Data feeds, CRM mapping | Where the numbers come from. |
| Settings and reference | The AI team | What each AI agent does, and a replay of them working. |

---

## 3. Marketing campaigns: how it works

Open **Settings and reference → Marketing campaigns**. It has five tabs.

### 3.1 Results (you and Marketing)

- Choose a **campaign** by name or code, or look at all campaigns side by side.
- Choose an **environment** (Dubai, Abu Dhabi, PSI Assets, PSI-AI) or all of them. One campaign can bring leads to several environments, and each environment has its own CRM. The **By environment** table inside each campaign shows the split.
- For each campaign you see:
  - **From the marketing platform:** type, target segment, persona, the person responsible, channels, budget, dates, and what was sent: sent, delivered, opened, clicked.
  - **From the CRM** (every lead carries the campaign code as a tag): leads it brought, leads with the tag, won, still in progress, lost, contacted with no answer, **nobody contacted them**, how we contacted them (call, WhatsApp, email, visit), average time to first contact, and leads and wins by week.
  - **The conversion rate** (won ÷ leads) and the cost per lead.
- The CRM is read **every hour**. The time of the last read is shown at the top.
- **Register a campaign:** until the marketing platform is connected, Marketing or you can enter a campaign by hand. Its code must be exactly the tag on its leads in the CRM.
- **Unknown codes:** if leads in the CRM carry a campaign code that no campaign in the list has, a warning appears with a "Register it" button.
- Export to CSV.

### 3.2 Audit after the run (you only)

- There is **no approval before a campaign runs**. You audit the **results** after the campaign.
- **A long tracking window:**
  - The audit opens **30 days after the campaign ends**, so the leads have time to convert.
  - You then have **14 days** to give the verdict.
  - The CRM keeps being read for **90 days** after the end.
  - All three numbers can be changed on the Criteria tab.
- For each campaign you see every criterion with **the measured value, the target for this campaign, and Met or Not met**.
  - You can change the target for this campaign only.
  - You can switch off a criterion that does not apply to it.
  - Some criteria are marked by you by hand (for example "Message as approved").
- **Verdict:** Successful or Not successful, with your notes for Marketing.

### 3.3 Audit history (you and Marketing)

- Every verdict is kept **with the numbers exactly as they were on the day you gave it**: leads, won, conversion, cost per lead, each criterion with its value and target, who gave it, the date, and the notes. It reads the same a year later, even if the CRM changes.
- Filter by year and by verdict, open any line for the detail, and export to CSV.
- The verdict also shows on the Results table (Audit column) and on the campaign itself.
- Two sample audits from 2025 are there to show what a year of history looks like.

### 3.4 Criteria (you only)

These are the default criteria and targets today. All of them can be edited, removed or added to:

| Criterion | Measured as | Default target |
|---|---|---|
| Converts | Won leads ÷ all leads | at least 2% |
| Leads were followed up fast | Contacted within 24 hours | at least 85% |
| No lead was left behind | Leads nobody contacted | at most 10% |
| Within the cost limit | Budget ÷ leads | at most AED 400 |
| Reached the right people | Recipients matching the segment | at least 80% |
| Traceable in the CRM | Leads carrying the campaign code | at least 95% |
| Message as approved | Marked by you | — |

### 3.5 Where the numbers come from (you and Marketing)

The two sources, and how a new campaign arrives:

1. Marketing creates the campaign on the marketing platform, with a code.
2. The portal reads it from the platform within the hour.
3. Every lead it brings carries that code in the CRM, and the portal follows the leads every hour.

**Rule from the Chairman:** every lead that comes from a campaign carries the campaign's code as a tag in the CRM, from the moment the lead is created. **Not yet verified** in the live CRM: we will check it in each environment.

---

## 4. What Marketing sees

The Marketing manager (`marketing@psi.sample`) sees **Results**, **Audit history** and **Where the numbers come from**. Marketing does not see the audit tab or the criteria, and cannot give or change a verdict.

---

## 5. What is not built yet

- The connections to the **marketing platform** and to the **four CRMs** (one per environment) are not live. The page shows sample numbers until IT connects them.
- Notifications by email or WhatsApp are not set up yet (only the portal inbox).

---

## 6. Questions for you

Please answer by number. Short answers are fine, and screenshots help.

**Criteria and targets**
1. Are the seven criteria the right ones? What would you add or remove?
2. Are the default targets right? Should they differ **by product** (Real Estate, After-Sales, PSI Club…) or **by campaign type** (paid social, email, WhatsApp, events, Google)?
3. Is a two-level verdict (Successful / Not successful) enough, or do you need a third level (for example "Partly successful") or a score?

**Timing**
4. Is "audit opens 30 days after the end, 14 days to decide, CRM tracked for 90 days" right for real estate, where a deal can take months?

**Data**
5. Which **marketing platform** does Marketing use, and who owns it on their side?
6. What is the format of the **campaign code**, and who creates it?
7. Which CRM status counts as **"won"** (reservation, signed SPA, payment)?
8. If one lead is touched by **two campaigns**, which one gets the credit (first touch, last touch, or both)?
9. Do you need the **actual spend** (not only the budget) to judge the cost per lead?

**Access and follow-up**
10. Besides you and Marketing, who should see the results or the verdicts (CEOs per environment, the Chairman)?
11. Should Marketing be able to **reply** to a verdict in the portal (agree, explain, add an action plan)?
12. Do you want a reminder when a campaign's audit opens or is overdue (email, WhatsApp, inbox only)?

**Anything else**
13. Anything on your other screens (Personas, Public mentions, Weekly sample, Who handles what) that should change?

Thank you.
Manaf
