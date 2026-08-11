  
**Business Development Module**

Requirements Specification, Linknbit Internal Portal

Prepared for: Linknbit Development Team

Prepared by: Business Development Department

Date: July 29, 2026

# **Table of Contents**

1. # Overview & Purpose    1.1 Objectives    1.2 Scope 

2. # User Roles & Permissions 

3. # Module Breakdown    3.1 Lead & Pipeline Management    	3.1.1 Activity Log (per lead)    	3.1.2 Meetings    3.2 Channel-wise Outreach Tracking    3.3 Daily Team Updates    3.4 Task Management Board    3.5 KPI & Revenue Dashboard    3.6 Won-Deal Handoff to Project Management    3.7 Reporting & Analytics 

4. # Notifications & Reminders

# **1\. Overview & Purpose**

Linknbit's internal portal currently manages tasks and workflows for delivery teams (design, development, project management) but has no dedicated space for Business Development (BD). As the BD department has only recently been formalized, activity is currently tracked ad hoc across spreadsheets, platform dashboards (Upwork/Fiverr/LinkedIn), and personal notes.

This document specifies a new Business Development module for the portal, so the BD department's leads, outreach activity, targets, and results can be tracked in one place, alongside the rest of the company's work, and visible to leadership.

## **1.1 Objectives**

* Give the BD team one system to log leads, opportunities, and outreach activity across every channel (Upwork, Fiverr, LinkedIn, email, cold calling, website/SEO).

* Make the sales pipeline visible, what stage every opportunity is in, who owns it, and what's next.

* Track outreach volume and results per channel, so the team can see what's actually working.

* Set and monitor revenue targets and KPIs for the department and for individual BD reps.

* Hand off won deals cleanly into the existing Project Management module.

* Give leadership (Founder/CEO, COO) a real-time dashboard instead of manual status updates.

* Keep a clear meeting record, what's scheduled, who ran each meeting, and the outcome.

* Give the BD Manager daily visibility into who is working on what, on which platform, and a task board to assign and track work.

## **1.2 Scope**

This spec covers a self-contained module inside the existing portal. It assumes the portal already provides: user accounts & roles, a task management system, and notifications, this module should reuse those wherever possible rather than duplicating them (see Section 8, Integration).

# 

# **2\. User Roles & Permissions**

| Role | Typical User | Access Level |
| :---- | :---- | :---- |
| BD Representative | Individual doing outreach (e.g. current BD hire) | Full access to their own leads, activities & tasks. Read-only on team-wide dashboard. |
| BD Manager / Lead | Head of Business Development | Full access to all BD data. Can reassign leads, set targets, edit pipeline stages, view full dashboard & reports. |
| Leadership | Founder/CEO, COO | Read-only access to dashboard, KPIs, and reports. No edit access to individual leads. |
| Admin | Portal admin | Full configuration access, pipeline stages, channels, KPI targets, field customization. |

*Note: today the BD department may be a single person, so this module should work cleanly for one user but scale to a team without rework, role-based permissions should exist from the start even if only one BD rep account is active initially.*

# **3\. Module Breakdown**

The BD module is made up of seven connected parts:

* Lead & Pipeline Management (including meeting tracking)

* Channel-wise Outreach Tracking

* Daily Team Updates

* Task Management Board

* KPI & Revenue Dashboard

* Won-Deal Handoff to Project Management

* Reporting & Analytics

## **3.1 Lead & Pipeline Management**

A CRM-style record for every prospect the BD team is engaging with, from first contact through to won or lost.

### 

### **Pipeline Stages**

New Lead  →  Contacted  →  Qualified  →  Proposal Sent  →  Negotiation  →  Won / Lost

Each stage change should be timestamped and logged automatically, so the time spent in each stage (and total sales-cycle length) can be reported on.

### **Lead Record, Fields**

| Field | Type | Notes |
| :---- | :---- | :---- |
| Lead ID | Auto | System-generated, unique |
| Company / Client Name | Text | Required |
| Contact Person | Text | Name & job title |
| Contact Email / Phone / LinkedIn | Text/URL |  |
| Source Channel | Dropdown | Upwork, Fiverr, LinkedIn (Individual), LinkedIn (Company), Email Outreach, Cold Call, Website/SEO Inbound, Referral, Other |
| Service Interested In | Multi-select | Web Dev, App Dev, UX/UI Design, Branding, Digital Marketing, Project Management, Business Analysis, Workflow Automation |
| Industry | Dropdown / Text | Used to cross-check against the ICP |
| ICP Fit | Dropdown | Strong Fit / Partial Fit / Not a Fit |
| Estimated Deal Value | Currency | Editable as the opportunity is scoped |
| Pipeline Stage | Dropdown | See stages above |
| Deal Status | Dropdown | Open / Closed \- Won / Closed \- Lost, a simple quick-filter flag (derived from Pipeline Stage) so anyone can see at a glance whether a client is closed or still in progress |
| Client Status (post-close) | Dropdown | Active Client / On Hold / Inactive / Churned, tracked after a deal is Won, so the team can see whether the client relationship is still active |
| Priority | Dropdown | Hot / Warm / Cold |
| Assigned BD Rep | User reference | Pulled from existing portal user list |
| Date Added | Date | Auto-set on creation |
| Last Contacted | Date | Auto-updates from logged activity |
| Next Follow-up Date | Date | Drives reminders, see Section 7 |
| Lost Reason | Dropdown | Only shown when stage \= Lost (e.g. Budget, Timing, Went with competitor, No response) |
| Activity Log | Linked list | Chronological feed of calls, emails, messages, meetings, see 3.1.1 |
| Attachments | Files | Proposals, quotes, contracts |

### **3.1.1 Activity Log (per lead)**

Every touchpoint on a lead, a call, email, LinkedIn message, or meeting, should be logged as an entry against that lead, not just as a free-text note, so it can be counted and reported on.

| Field | Type | Notes |
| :---- | :---- | :---- |
| Activity Type | Dropdown | Call, Email, LinkedIn Message, Meeting, Proposal Sent, Note |
| Date/Time | Datetime | Auto-set, editable |
| Outcome | Dropdown | Connected, No Response, Follow-up Needed, Meeting Booked, etc. |
| Notes | Text | Free text |
| Logged By | User reference | Auto-set to logged-in user |

### **3.1.2 Meetings**

Meetings get their own structured record rather than living only as a free-text activity note, so the team always knows what's scheduled, who's running it, and what came out of it.

| Field | Type | Notes |
| :---- | :---- | :---- |
| Meeting Date/Time | Datetime | Scheduled date and time |
| Meeting Type | Dropdown | Discovery Call, Proposal Walkthrough, Negotiation, Kickoff, Other |
| Hosted / Taken By | User reference | The BD rep who ran the meeting, required |
| Internal Attendees | Multi-select | Other Linknbit staff who joined (e.g. COO, a team lead brought in to speak to scope) |
| Client Attendees | Text | Names/roles on the client side |
| Platform | Dropdown | Zoom, Google Meet, Phone Call, In-Person, Other |
| Outcome / Summary | Text | What was discussed and decided |
| Next Step / Follow-up Date | Date | Feeds the lead's Next Follow-up Date and reminders |
| Linked Lead | Lead reference | Auto-linked to the client record |

A team-wide meeting schedule/calendar view should sit on top of this data, filterable by rep, so the BD Manager can see at a glance who is meeting which client, and when, across the whole department.

## **3.2 Channel-wise Outreach Tracking**

Beyond individual leads, the module should track aggregate outreach volume per channel, since that's what shows whether the team is hitting activity targets, not every outreach message becomes a lead record.

### **Freelance Platforms, Upwork & Fiverr**

* Proposals sent (date, job title/link, bid amount, connects used)

* Response rate (replies ÷ proposals sent)

* Interviews / calls scheduled

* Contracts won and value

* Which team member's profile was used (ties to individual freelancer positioning)

### **LinkedIn**

* Connection requests sent, individual profiles and company page, tracked separately

* InMails / direct messages sent

* Response rate and meetings booked

* Follower/engagement growth on the company page (optional, if available)

### **Email Marketing**

* Campaign name, list/segment, and send date

* Sent, opened, replied, bounced counts

* Sequence step (for multi-touch email sequences)

### **Cold Calling**

* Calls made, connected, voicemail left, follow-up scheduled

* Call outcome and notes

### **Website / SEO (Inbound)**

* Form submissions / inbound inquiries

* Source page or referring keyword, where available from analytics

*Each of these feeds the same underlying "Activity" data used in the KPI dashboard (Section 3.5), channel is just one dimension to filter and report by.*

## **3.3 Daily Team Updates**

A daily check-in so the BD Manager can see who worked on what, on which platform, today, without having to open every individual lead record. This sits above the lead-level Activity Log: it's a quick daily summary, not a replacement for it.

| Field | Type | Notes |
| :---- | :---- | :---- |
| Date | Date | Defaults to today |
| BD Rep | User reference | Auto-set to the logged-in user |
| Platform(s) Worked On | Multi-select | Upwork, Fiverr, LinkedIn, Email, Cold Calling, Website/SEO, Meetings, Other |
| Summary of Work | Text | Short free-text recap of what was done |
| Key Numbers | Auto-calculated | Optional roll-up from that day's logged activity, proposals sent, calls made, meetings held, leads added |
| Submission Status | Auto | Submitted / Missed, lets the BD Manager see who has and hasn't checked in for the day |

A "Team Daily Feed" view should show every rep's update for the day in one chronological list, effectively a written daily standup the BD Manager (and leadership) can scan in under a minute.

## **3.4 Task Management Board**

A kanban-style board for assigning and tracking BD work, sitting inside the existing portal task system rather than as a separate to-do list, see Section 8 for how this connects.

### **Board Columns**

To Do  →  In Progress  →  Blocked / Waiting  →  Done  (configurable by the BD Manager)

### **Task Fields**

| Field | Type | Notes |
| :---- | :---- | :---- |
| Title | Text | e.g. "Send 20 Upwork proposals this week", "Follow up with \[Client\]", "Prep proposal for \[Client\]" |
| Description | Text | Optional detail |
| Assignee | User reference | Who the task is assigned to |
| Status / Column | Dropdown | To Do / In Progress / Blocked / Done, updated by dragging the card, or from the dropdown |
| Priority | Dropdown | Low / Medium / High |
| Due Date | Date |  |
| Linked Lead | Lead reference | Optional, connects the task to a specific client record |
| Platform / Channel Tag | Dropdown | Optional, Upwork, Fiverr, LinkedIn, Email, Cold Calling, SEO, General |
| Recurrence | Dropdown | One-off / Daily / Weekly / Monthly, for standing outreach quotas |
| Created By / Created Date | Auto |  |

* Board can be filtered by assignee, platform, or linked lead.

* Moving a card between columns updates the task's status and is reflected anywhere else that task appears (e.g. the assignee's task list).

* Tasks live under a "Business Development" project/category in the portal's existing task system, see Section 8\.

## **3.5 KPI & Revenue Dashboard**

A live dashboard for the BD Manager and leadership, built from the Lead and Activity data above.

| Metric | Description |
| :---- | :---- |
| Revenue Target vs Actual | Monthly & quarterly, set by BD Manager, tracked against Won deals |
| Pipeline Value | Sum of open deal values, optionally weighted by stage probability |
| Win Rate | Won ÷ (Won \+ Lost), overall and broken down by channel |
| Average Deal Size | Average value of Won deals |
| Average Sales Cycle | Average days from New Lead to Won |
| Leads by Channel | Funnel view, leads generated, and conversion at each stage, per channel |
| Outreach Volume | Proposals/messages/calls sent per rep per channel, vs. target |
| Team Leaderboard | Per-rep breakdown of activity and results (once team grows beyond one person) |
| Daily Update Compliance | % of reps who submitted their daily update, per day/week |

Targets (revenue and activity quotas) should be configurable by the BD Manager per month/quarter, so the dashboard is always comparing actuals against a current target rather than a hard-coded number.

## **3.6 Won-Deal Handoff to Project Management**

When a lead's stage changes to Won, the module should trigger a handoff so the deal doesn't have to be manually re-entered into the delivery side of the portal.

* Auto-create (or pre-fill) a new project/client record in the existing Project Management module

* Carry over: client contact info, agreed scope, budget/value, contract/attachments

* Prompt the BD rep to assign a Project Manager, or auto-notify the PM team

* Lead record stays visible in BD history (read-only) for reporting, linked to the resulting project

## **3.7 Reporting & Analytics**

* Auto-generated weekly BD performance summary (activity \+ pipeline movement)

* Channel comparison report (leads, cost/effort if tracked, win rate, revenue by channel)

* Funnel/conversion visualization from New Lead through Won

* Custom date-range filtering on all reports and the dashboard

* Export to PDF/Excel for leadership updates

# **4\. Notifications & Reminders**

| Trigger | Notification |
| :---- | :---- |
| Follow-up date reached | Reminder to the assigned BD rep |
| Lead stage changes | Alert to BD Manager (configurable which stages) |
| Lead marked Won | Notification to Project Management team for handoff |
| Weekly quota check-in | Digest to each rep and the BD Manager on progress vs. target |
| Lead inactive N days | Flag to BD rep and Manager if a lead has had no logged activity (configurable threshold) |
| Meeting coming up | Reminder to the host and any internal attendees ahead of a scheduled meeting |
| Daily update not submitted | End-of-day reminder to the rep; flag to BD Manager if still missing the next morning |
| Task moved to Blocked | Alert to the BD Manager |

