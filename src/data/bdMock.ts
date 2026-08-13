import type {
  Lead,
  BdMeeting,
  BdDailyUpdate,
  BdTarget,
  BdActivity,
  BdActivityType,
  BdActivityOutcome,
  BdChannel,
  BdTask,
  BdProject,
} from '../types'

/**
 * Temporary mock data for the Business Development module, replaced file-by-file
 * once the real tables land (see the BD SRS).
 *
 * Dates are computed relative to today rather than hardcoded. A pipeline is read
 * through its dates — "next follow-up", "last contacted", "meetings this week" —
 * so fixed dates would make the whole module look broken within a month of being
 * written. The rest of src/data/mock.ts predates this module and is anchored to
 * a fixed date instead.
 */

/** ISO date (no time) `n` days from today; negative is in the past. */
function day(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

/** ISO datetime `n` days from today at `hour`:`minute` local time. */
function at(n: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

/* =========================================================
   THE BD TEAM
   ========================================================= */

export const BD_REPS = [
  { id: 'bd1', name: 'Ayesha Siddiqui', role: 'BD Manager' },
  { id: 'bd2', name: 'Faisal Nadeem', role: 'Business Development' },
  { id: 'bd3', name: 'Maryam Khan', role: 'Business Development' },
] as const

/* =========================================================
   LEADS
   ========================================================= */

export const LEADS: Lead[] = [
  {
    id: 'l1',
    company: 'Nordic Freight Systems',
    contactName: 'Henrik Sølvberg',
    contactTitle: 'Operations Director',
    email: 'henrik@nordicfreight.no',
    channel: 'linkedin',
    services: ['Web Dev', 'Workflow Automation'],
    industry: 'Logistics',
    icpFit: 'strong',
    value: 4200000,
    stage: 'negotiation',
    temperature: 'hot',
    ownerId: 'bd1',
    ownerName: 'Ayesha Siddiqui',
    addedOn: day(-38),
    lastContacted: day(-1),
    nextFollowUp: day(1),
    activityCount: 17,
  },
  {
    id: 'l2',
    company: 'Halcyon Dental Group',
    contactName: 'Dr. Priya Raman',
    contactTitle: 'Managing Partner',
    email: 'p.raman@halcyondental.co.uk',
    channel: 'upwork',
    services: ['Branding', 'Web Dev'],
    industry: 'Healthcare',
    icpFit: 'strong',
    value: 1850000,
    stage: 'proposal_sent',
    temperature: 'hot',
    ownerId: 'bd2',
    ownerName: 'Faisal Nadeem',
    addedOn: day(-21),
    lastContacted: day(-3),
    nextFollowUp: day(0),
    activityCount: 11,
  },
  {
    id: 'l3',
    company: 'Tayyab Textiles',
    contactName: 'Rehan Tayyab',
    contactTitle: 'Chief Executive',
    email: 'rehan@tayyabtextiles.pk',
    channel: 'referral',
    services: ['App Dev', 'Business Analysis'],
    industry: 'Manufacturing',
    icpFit: 'strong',
    value: 3600000,
    stage: 'qualified',
    temperature: 'hot',
    ownerId: 'bd1',
    ownerName: 'Ayesha Siddiqui',
    addedOn: day(-12),
    lastContacted: day(-2),
    nextFollowUp: day(2),
    activityCount: 8,
  },
  {
    id: 'l4',
    company: 'Verde Organics',
    contactName: 'Camila Duarte',
    contactTitle: 'Head of Growth',
    email: 'camila@verdeorganics.com',
    channel: 'fiverr',
    services: ['Digital Marketing', 'UX/UI Design'],
    industry: 'Retail / FMCG',
    icpFit: 'partial',
    value: 780000,
    stage: 'contacted',
    temperature: 'warm',
    ownerId: 'bd3',
    ownerName: 'Maryam Khan',
    addedOn: day(-7),
    lastContacted: day(-4),
    nextFollowUp: day(3),
    activityCount: 4,
  },
  {
    id: 'l5',
    company: 'Meridian Legal',
    contactName: 'Alastair Voss',
    contactTitle: 'Practice Manager',
    email: 'a.voss@meridianlegal.com',
    channel: 'email',
    services: ['Web Dev', 'Project Management'],
    industry: 'Professional Services',
    icpFit: 'partial',
    value: 1250000,
    stage: 'contacted',
    temperature: 'warm',
    ownerId: 'bd2',
    ownerName: 'Faisal Nadeem',
    addedOn: day(-9),
    lastContacted: day(-6),
    nextFollowUp: day(4),
    activityCount: 5,
  },
  {
    id: 'l6',
    company: 'Blue Harbor Logistics',
    contactName: 'Marcus Ferreira',
    contactTitle: 'VP Technology',
    email: 'marcus@blueharbor.io',
    channel: 'linkedin',
    services: ['Workflow Automation'],
    industry: 'Logistics',
    icpFit: 'strong',
    value: 2400000,
    stage: 'qualified',
    temperature: 'warm',
    ownerId: 'bd1',
    ownerName: 'Ayesha Siddiqui',
    addedOn: day(-16),
    lastContacted: day(-5),
    nextFollowUp: day(5),
    activityCount: 7,
  },
  {
    id: 'l7',
    company: 'Orbit Study Abroad',
    contactName: 'Nadia Farooq',
    contactTitle: 'Founder',
    email: 'nadia@orbitstudy.pk',
    channel: 'inbound',
    services: ['Web Dev', 'Digital Marketing'],
    industry: 'Education',
    icpFit: 'partial',
    value: 620000,
    stage: 'new',
    temperature: 'warm',
    ownerId: 'bd3',
    ownerName: 'Maryam Khan',
    addedOn: day(-2),
    lastContacted: day(-2),
    nextFollowUp: day(1),
    activityCount: 1,
  },
  {
    id: 'l8',
    company: 'Lumen Solar',
    contactName: 'Bilal Sheikh',
    contactTitle: 'Commercial Head',
    email: 'bilal@lumensolar.pk',
    channel: 'cold_call',
    services: ['Branding', 'Web Dev'],
    industry: 'Energy',
    icpFit: 'partial',
    value: 950000,
    stage: 'new',
    temperature: 'cold',
    ownerId: 'bd2',
    ownerName: 'Faisal Nadeem',
    addedOn: day(-3),
    lastContacted: day(-3),
    nextFollowUp: day(6),
    activityCount: 2,
  },
  {
    id: 'l9',
    company: 'Crestline Realty',
    contactName: 'Dana Whitfield',
    contactTitle: 'Marketing Lead',
    email: 'dana@crestlinerealty.com',
    channel: 'upwork',
    services: ['UX/UI Design', 'Web Dev'],
    industry: 'Real Estate',
    icpFit: 'strong',
    value: 1400000,
    stage: 'proposal_sent',
    temperature: 'warm',
    ownerId: 'bd3',
    ownerName: 'Maryam Khan',
    addedOn: day(-18),
    lastContacted: day(-8),
    nextFollowUp: day(-1),
    activityCount: 9,
  },
  {
    id: 'l10',
    company: 'Peak Fitness Collective',
    contactName: 'Jordan Reyes',
    contactTitle: 'Co-Founder',
    email: 'jordan@peakfitness.co',
    channel: 'fiverr',
    services: ['App Dev', 'Branding'],
    industry: 'Fitness & Wellness',
    icpFit: 'partial',
    value: 2100000,
    stage: 'won',
    temperature: 'hot',
    ownerId: 'bd1',
    ownerName: 'Ayesha Siddiqui',
    addedOn: day(-52),
    lastContacted: day(-4),
    nextFollowUp: null,
    activityCount: 23,
  },
  {
    id: 'l11',
    company: 'Sana Jewellers',
    contactName: 'Sana Iqbal',
    contactTitle: 'Owner',
    email: 'sana@sanajewellers.pk',
    channel: 'inbound',
    services: ['Branding', 'Digital Marketing'],
    industry: 'Retail / FMCG',
    icpFit: 'strong',
    value: 890000,
    stage: 'won',
    temperature: 'hot',
    ownerId: 'bd3',
    ownerName: 'Maryam Khan',
    addedOn: day(-44),
    lastContacted: day(-9),
    nextFollowUp: null,
    activityCount: 15,
  },
  {
    id: 'l12',
    company: 'Fahad Motors',
    contactName: 'Fahad Rasheed',
    contactTitle: 'Director',
    email: 'fahad@fahadmotors.pk',
    channel: 'cold_call',
    services: ['Web Dev'],
    industry: 'Automotive',
    icpFit: 'none',
    value: 400000,
    stage: 'lost',
    temperature: 'cold',
    ownerId: 'bd2',
    ownerName: 'Faisal Nadeem',
    addedOn: day(-33),
    lastContacted: day(-14),
    nextFollowUp: null,
    lostReason: 'Budget',
    activityCount: 6,
  },
  {
    id: 'l13',
    company: 'Aurora Interiors',
    contactName: 'Elena Marchetti',
    contactTitle: 'Studio Director',
    email: 'elena@auroreinteriors.it',
    channel: 'linkedin',
    services: ['UX/UI Design'],
    industry: 'Architecture & Interiors',
    icpFit: 'partial',
    value: 700000,
    stage: 'lost',
    temperature: 'cold',
    ownerId: 'bd3',
    ownerName: 'Maryam Khan',
    addedOn: day(-29),
    lastContacted: day(-19),
    nextFollowUp: null,
    lostReason: 'Went with competitor',
    activityCount: 5,
  },
  {
    id: 'l14',
    company: 'Kestrel Analytics',
    contactName: 'Tom Bridgewater',
    contactTitle: 'CTO',
    email: 'tom@kestrelanalytics.com',
    channel: 'email',
    services: ['App Dev', 'Business Analysis', 'Workflow Automation'],
    industry: 'SaaS',
    icpFit: 'strong',
    value: 5400000,
    stage: 'negotiation',
    temperature: 'hot',
    ownerId: 'bd1',
    ownerName: 'Ayesha Siddiqui',
    addedOn: day(-26),
    lastContacted: day(0),
    nextFollowUp: day(2),
    activityCount: 19,
  },
]

/* =========================================================
   MEETINGS
   ========================================================= */

export const BD_MEETINGS: BdMeeting[] = [
  {
    id: 'm1',
    leadId: 'l14',
    company: 'Kestrel Analytics',
    scheduledAt: at(0, 16, 30),
    durationMinutes: 45,
    type: 'negotiation',
    hostId: 'bd1',
    hostName: 'Ayesha Siddiqui',
    internalAttendees: ['Ahmad Karimi'],
    clientAttendees: 'Tom Bridgewater (CTO), Rachel Lim (Head of Product)',
    platform: 'zoom',
    nextStep: 'Send revised SOW with the phased delivery option',
  },
  {
    id: 'm2',
    leadId: 'l2',
    company: 'Halcyon Dental Group',
    scheduledAt: at(1, 14, 0),
    durationMinutes: 30,
    type: 'proposal',
    hostId: 'bd2',
    hostName: 'Faisal Nadeem',
    internalAttendees: ['Sara Qureshi'],
    clientAttendees: 'Dr. Priya Raman (Managing Partner)',
    platform: 'meet',
  },
  {
    id: 'm3',
    leadId: 'l3',
    company: 'Tayyab Textiles',
    scheduledAt: at(2, 11, 0),
    durationMinutes: 60,
    type: 'discovery',
    hostId: 'bd1',
    hostName: 'Ayesha Siddiqui',
    internalAttendees: ['Ahmad Karimi', 'Usman Tariq'],
    clientAttendees: 'Rehan Tayyab (CEO), Imran Baig (IT Manager)',
    platform: 'in_person',
  },
  {
    id: 'm4',
    leadId: 'l7',
    company: 'Orbit Study Abroad',
    scheduledAt: at(3, 15, 30),
    durationMinutes: 30,
    type: 'discovery',
    hostId: 'bd3',
    hostName: 'Maryam Khan',
    internalAttendees: [],
    clientAttendees: 'Nadia Farooq (Founder)',
    platform: 'meet',
  },
  {
    id: 'm5',
    leadId: 'l1',
    company: 'Nordic Freight Systems',
    scheduledAt: at(4, 13, 0),
    durationMinutes: 45,
    type: 'negotiation',
    hostId: 'bd1',
    hostName: 'Ayesha Siddiqui',
    internalAttendees: ['Zain Malik'],
    clientAttendees: 'Henrik Sølvberg (Operations Director)',
    platform: 'zoom',
  },
  {
    id: 'm6',
    leadId: 'l1',
    company: 'Nordic Freight Systems',
    scheduledAt: at(-1, 16, 0),
    durationMinutes: 45,
    type: 'proposal',
    hostId: 'bd1',
    hostName: 'Ayesha Siddiqui',
    internalAttendees: ['Ahmad Karimi'],
    clientAttendees: 'Henrik Sølvberg (Operations Director)',
    platform: 'zoom',
    outcome: 'Walked through the automation scope. Pricing accepted in principle; they want the rollout split across two quarters.',
    nextStep: 'Reissue the quote as two phases',
  },
  {
    id: 'm7',
    leadId: 'l9',
    company: 'Crestline Realty',
    scheduledAt: at(-3, 18, 0),
    durationMinutes: 30,
    type: 'proposal',
    hostId: 'bd3',
    hostName: 'Maryam Khan',
    internalAttendees: ['Bilal Ahmed'],
    clientAttendees: 'Dana Whitfield (Marketing Lead)',
    platform: 'meet',
    outcome: 'Design direction landed well. Decision is waiting on their Q4 budget sign-off.',
    nextStep: 'Follow up once their board meets',
  },
  {
    id: 'm8',
    leadId: 'l10',
    company: 'Peak Fitness Collective',
    scheduledAt: at(-5, 12, 0),
    durationMinutes: 60,
    type: 'kickoff',
    hostId: 'bd1',
    hostName: 'Ayesha Siddiqui',
    internalAttendees: ['Sara Qureshi', 'Ahmad Karimi'],
    clientAttendees: 'Jordan Reyes (Co-Founder), Alex Mbeki (Ops)',
    platform: 'zoom',
    outcome: 'Contract signed. Handed over to delivery with the brand guidelines and app wireframes.',
    nextStep: 'Project kickoff with Sara as PM',
  },
  {
    id: 'm9',
    leadId: 'l6',
    company: 'Blue Harbor Logistics',
    scheduledAt: at(-6, 17, 0),
    durationMinutes: 30,
    type: 'discovery',
    hostId: 'bd1',
    hostName: 'Ayesha Siddiqui',
    internalAttendees: [],
    clientAttendees: 'Marcus Ferreira (VP Technology)',
    platform: 'phone',
    outcome: 'Good fit on the automation side. They are comparing three vendors and will shortlist in two weeks.',
    nextStep: 'Send the case study pack',
  },
]

/* =========================================================
   CHANNEL PERFORMANCE
   ========================================================= */

/**
 * Period-over-period movement, which is the one channel figure that cannot be
 * derived from the activity list — it needs the previous period's totals, and
 * the prototype only holds the current one. Everything else on the Outreach
 * page (sent, replies, meetings, leads, won, revenue) is now computed from
 * activities and leads, so the numbers cannot drift from the pipeline.
 */
export const CHANNEL_TREND: Record<BdChannel, number> = {
  upwork: 18, linkedin: 32, fiverr: -9, email: 12, cold_call: -14, inbound: 41, referral: 5,
}

/* =========================================================
   DAILY UPDATES
   ========================================================= */

export const BD_DAILY_UPDATES: BdDailyUpdate[] = [
  {
    id: 'du1',
    repId: 'bd1',
    repName: 'Ayesha Siddiqui',
    date: day(0),
    submittedAt: at(0, 17, 40),
    platforms: ['linkedin', 'email'],
    summary:
      'Ran the Kestrel negotiation call — they are asking for phased billing, revised SOW going out tomorrow. Sent 14 LinkedIn connects into the logistics list and followed up with Nordic on the two-quarter split.',
    proposalsSent: 0,
    callsMade: 3,
    meetingsHeld: 1,
    leadsAdded: 0,
  },
  {
    id: 'du2',
    repId: 'bd2',
    repName: 'Faisal Nadeem',
    date: day(0),
    submittedAt: at(0, 18, 5),
    platforms: ['upwork', 'cold_call'],
    summary:
      'Twelve Upwork proposals out, mostly on the healthcare and legal job feeds. Two replies already. Cold-called the Lumen Solar list, got through to the commercial head and booked a slot for next week.',
    proposalsSent: 12,
    callsMade: 18,
    meetingsHeld: 0,
    leadsAdded: 2,
  },
  {
    id: 'du3',
    repId: 'bd3',
    repName: 'Maryam Khan',
    date: day(0),
    submittedAt: null,
    platforms: [],
    summary: '',
    proposalsSent: 0,
    callsMade: 0,
    meetingsHeld: 0,
    leadsAdded: 0,
  },
  {
    id: 'du4',
    repId: 'bd1',
    repName: 'Ayesha Siddiqui',
    date: day(-1),
    submittedAt: at(-1, 17, 20),
    platforms: ['linkedin', 'inbound'],
    summary:
      'Nordic proposal walkthrough went well — pricing accepted, scope needs splitting. Picked up the Orbit Study Abroad enquiry from the website form and passed it to Maryam.',
    proposalsSent: 0,
    callsMade: 2,
    meetingsHeld: 1,
    leadsAdded: 1,
  },
  {
    id: 'du5',
    repId: 'bd2',
    repName: 'Faisal Nadeem',
    date: day(-1),
    submittedAt: at(-1, 19, 10),
    platforms: ['upwork', 'email'],
    summary:
      'Nine proposals on Upwork, and started the second touch of the legal-sector email sequence — 120 sent, 4 replies so far.',
    proposalsSent: 9,
    callsMade: 4,
    meetingsHeld: 0,
    leadsAdded: 1,
  },
  {
    id: 'du6',
    repId: 'bd3',
    repName: 'Maryam Khan',
    date: day(-1),
    submittedAt: at(-1, 18, 45),
    platforms: ['fiverr', 'linkedin'],
    summary:
      'Crestline came back asking to wait on their board. Cleared the Fiverr inbox and sent six briefs back with scoping questions.',
    proposalsSent: 6,
    callsMade: 1,
    meetingsHeld: 1,
    leadsAdded: 0,
  },
]

/* =========================================================
   TARGETS
   ========================================================= */

export const BD_TARGETS: BdTarget[] = [
  {
    repId: 'bd1',
    repName: 'Ayesha Siddiqui',
    revenueTarget: 6000000,
    revenueActual: 5100000,
    outreachTarget: 200,
    outreachActual: 176,
    meetingsTarget: 20,
    meetingsActual: 23,
    wins: 3,
    losses: 1,
  },
  {
    repId: 'bd2',
    repName: 'Faisal Nadeem',
    revenueTarget: 4000000,
    revenueActual: 1750000,
    outreachTarget: 250,
    outreachActual: 268,
    meetingsTarget: 16,
    meetingsActual: 11,
    wins: 1,
    losses: 3,
  },
  {
    repId: 'bd3',
    repName: 'Maryam Khan',
    revenueTarget: 4000000,
    revenueActual: 3890000,
    outreachTarget: 180,
    outreachActual: 141,
    meetingsTarget: 16,
    meetingsActual: 14,
    wins: 2,
    losses: 2,
  },
]

/** Monthly revenue against target, for the dashboard trend chart. PKR. */
export const BD_REVENUE_TREND = [
  { month: 'Mar', target: 10000000, actual: 6400000 },
  { month: 'Apr', target: 10000000, actual: 8900000 },
  { month: 'May', target: 12000000, actual: 11200000 },
  { month: 'Jun', target: 12000000, actual: 9700000 },
  { month: 'Jul', target: 14000000, actual: 15300000 },
  { month: 'Aug', target: 14000000, actual: 10740000 },
]

/** Stage-by-stage conversion for the funnel on the reports page. */
export const BD_FUNNEL = [
  { stage: 'New Lead',      count: 142 },
  { stage: 'Contacted',     count: 98 },
  { stage: 'Qualified',     count: 54 },
  { stage: 'Proposal Sent', count: 31 },
  { stage: 'Negotiation',   count: 18 },
  { stage: 'Won',           count: 11 },
]

/* =========================================================
   ACTIVITY — every unit of BD effort, touchpoint or batch
   ========================================================= */

/** Shorthand: a single touchpoint on a lead. */
const touch = (
  id: string, leadId: string, channel: BdChannel, type: BdActivityType,
  at: string, note: string, byId: string, byName: string,
  outcome?: BdActivityOutcome, meetingsBooked = 0,
): BdActivity => ({
  id, leadId, channel, type, at, note, byId, byName, outcome,
  volume: 1, responses: 0, meetingsBooked, leadsCreated: 0,
})

/** Shorthand: a batch of cold outreach, not yet attached to any prospect. */
const batch = (
  id: string, channel: BdChannel, at: string, byId: string, byName: string,
  volume: number, responses: number, meetingsBooked: number, leadsCreated: number, note = '',
): BdActivity => ({
  id, leadId: null, channel, type: 'note', at, note, byId, byName,
  volume, responses, meetingsBooked, leadsCreated,
})

export const BD_ACTIVITIES: BdActivity[] = [
  touch('a1',  'l14', 'email',     'meeting',      at(0, 16, 30),  'Negotiation call. Phased billing requested — revised SOW due tomorrow.', 'bd1', 'Ayesha Siddiqui', 'follow_up', 1),
  touch('a2',  'l14', 'email',     'email',        at(-2, 10, 15), 'Sent the integration scope breakdown Tom asked for.', 'bd1', 'Ayesha Siddiqui', 'connected'),
  touch('a3',  'l14', 'email',     'stage_change', at(-6, 9, 0),   'Moved from Proposal Sent to Negotiation.', 'bd1', 'Ayesha Siddiqui'),
  touch('a4',  'l14', 'email',     'proposal',     at(-9, 14, 0),  'Proposal issued — PKR 5.4M across three phases.', 'bd1', 'Ayesha Siddiqui', 'connected'),
  touch('a5',  'l14', 'email',     'call',         at(-14, 11, 30),'Discovery call booked for the following week.', 'bd1', 'Ayesha Siddiqui', 'meeting_booked', 1),

  touch('a6',  'l1',  'linkedin',  'meeting',      at(-1, 16, 0),  'Proposal walkthrough. Pricing accepted; wants the rollout split across two quarters.', 'bd1', 'Ayesha Siddiqui', 'follow_up', 1),
  touch('a7',  'l1',  'linkedin',  'linkedin',     at(-5, 12, 0),  'Henrik replied to the case-study post and asked for pricing.', 'bd1', 'Ayesha Siddiqui', 'connected'),
  touch('a8',  'l1',  'linkedin',  'proposal',     at(-8, 15, 30), 'Automation proposal sent.', 'bd1', 'Ayesha Siddiqui'),

  touch('a9',  'l2',  'upwork',    'email',        at(-3, 9, 45),  'Chased the proposal. No reply yet.', 'bd2', 'Faisal Nadeem', 'no_response'),
  touch('a10', 'l2',  'upwork',    'proposal',     at(-7, 13, 0),  'Branding + site proposal sent via Upwork.', 'bd2', 'Faisal Nadeem', 'connected'),
  touch('a11', 'l2',  'upwork',    'call',         at(-11, 16, 0), 'Intro call — three practices, wants one brand across all.', 'bd2', 'Faisal Nadeem', 'meeting_booked', 1),

  touch('a12', 'l3',  'referral',  'call',         at(-2, 11, 0),  'Rehan wants the team on site for the discovery session.', 'bd1', 'Ayesha Siddiqui', 'meeting_booked', 1),
  touch('a13', 'l3',  'referral',  'note',         at(-10, 10, 0), 'Referred by the Sana Jewellers contact. Warm intro.', 'bd1', 'Ayesha Siddiqui'),

  touch('a14', 'l9',  'upwork',    'meeting',      at(-3, 18, 0),  'Design direction landed. Waiting on their Q4 budget sign-off.', 'bd3', 'Maryam Khan', 'follow_up', 1),
  touch('a15', 'l9',  'upwork',    'proposal',     at(-12, 11, 0), 'Proposal sent — PKR 1.4M.', 'bd3', 'Maryam Khan'),

  touch('a16', 'l12', 'cold_call', 'note',         at(-14, 15, 0), 'Budget came in at a third of the quote. Closing as lost.', 'bd2', 'Faisal Nadeem', 'not_interested'),
  touch('a17', 'l6',  'linkedin',  'call',         at(-5, 17, 0),  'Comparing three vendors, shortlisting in two weeks.', 'bd1', 'Ayesha Siddiqui', 'follow_up'),
  touch('a18', 'l7',  'inbound',   'email',        at(-2, 9, 30),  'Website enquiry — replied within the hour with the discovery link.', 'bd3', 'Maryam Khan', 'connected'),

  // Batches — effort with no named prospect behind it (yet).
  batch('a19', 'upwork',    at(0, 17, 0),  'bd2', 'Faisal Nadeem',   12,  2, 0, 2, 'Healthcare and legal job feeds.'),
  batch('a20', 'linkedin',  at(0, 15, 0),  'bd1', 'Ayesha Siddiqui', 14,  3, 1, 0, 'Logistics list — Nordics.'),
  batch('a21', 'cold_call', at(0, 12, 0),  'bd2', 'Faisal Nadeem',   18,  4, 1, 0, 'Lumen Solar list.'),
  batch('a22', 'email',     at(-1, 14, 0), 'bd2', 'Faisal Nadeem',  120,  4, 0, 1, 'Legal-sector sequence, second touch.'),
  batch('a23', 'fiverr',    at(-1, 11, 0), 'bd3', 'Maryam Khan',      6,  2, 0, 0),
  batch('a24', 'inbound',   at(-2, 10, 0), 'bd3', 'Maryam Khan',      3,  3, 1, 1, 'Website form — Orbit Study Abroad.'),
]

/* =========================================================
   BD PROJECTS — outreach campaigns and initiatives
   ========================================================= */

export const BD_PROJECTS: BdProject[] = [
  {
    id: 'p1',
    name: 'Logistics Outbound Campaign',
    description: 'Nordics and Benelux operations directors, LinkedIn-led with an email second touch.',
    ownerId: 'bd1', ownerName: 'Ayesha Siddiqui',
    status: 'in_progress', progress: 62, deadline: day(24),
    channels: ['linkedin', 'email'],
    members: [{ id: 'bd1', name: 'Ayesha Siddiqui' }, { id: 'bd3', name: 'Maryam Khan' }],
    taskCount: 4,
  },
  {
    id: 'p2',
    name: 'Q3 Upwork Push',
    description: 'Twenty proposals a week against the healthcare and legal job feeds.',
    ownerId: 'bd2', ownerName: 'Faisal Nadeem',
    status: 'ongoing', progress: 48, deadline: day(38),
    channels: ['upwork', 'fiverr'],
    members: [{ id: 'bd2', name: 'Faisal Nadeem' }],
    taskCount: 3,
  },
  {
    id: 'p3',
    name: 'Enterprise Deal Desk',
    description: 'Proposal and SOW work on the deals above PKR 3M.',
    ownerId: 'bd1', ownerName: 'Ayesha Siddiqui',
    status: 'in_progress', progress: 75, deadline: day(9),
    channels: ['referral'],
    members: [{ id: 'bd1', name: 'Ayesha Siddiqui' }, { id: 'bd2', name: 'Faisal Nadeem' }],
    taskCount: 3,
  },
  {
    id: 'p4',
    name: 'Inbound & Case Studies',
    description: 'Website enquiries, plus the case studies that feed the portfolio.',
    ownerId: 'bd3', ownerName: 'Maryam Khan',
    status: 'blocked', progress: 20, deadline: day(-2),
    channels: ['inbound'],
    members: [{ id: 'bd3', name: 'Maryam Khan' }],
    taskCount: 2,
  },
  {
    id: 'p5',
    name: 'Cold Calling Pilot',
    description: 'Four-week trial across the energy and automotive lists.',
    ownerId: 'bd2', ownerName: 'Faisal Nadeem',
    status: 'on_hold', progress: 35, deadline: day(15),
    channels: ['cold_call'],
    members: [{ id: 'bd2', name: 'Faisal Nadeem' }],
    taskCount: 0,
  },
  {
    id: 'p6',
    name: 'H1 Referral Programme',
    description: 'Warm intros from delivered accounts. Closed out in July.',
    ownerId: 'bd1', ownerName: 'Ayesha Siddiqui',
    status: 'completed', progress: 100, deadline: day(-12),
    channels: ['referral'],
    members: [{ id: 'bd1', name: 'Ayesha Siddiqui' }, { id: 'bd3', name: 'Maryam Khan' }],
    taskCount: 0,
  },
]

/* =========================================================
   BD TASKS
   ========================================================= */

export const BD_TASKS: BdTask[] = [
  {
    id: 't1',
    projectId: 'p3', projectName: 'Enterprise Deal Desk',
    title: 'Send revised Kestrel SOW with phased billing',
    description: 'Split the PKR 5.4M into three quarterly phases. Ahmad to confirm the delivery split before it goes out.',
    assigneeId: 'bd1', assigneeName: 'Ayesha Siddiqui',
    status: 'in_progress', priority: 'critical', dueDate: day(1),
    leadId: 'l14', leadCompany: 'Kestrel Analytics', channel: 'email', recurrence: 'once',
    createdBy: 'Ayesha Siddiqui',
    checklist: [
      { id: 'c1', label: 'Confirm phase split with delivery', done: true },
      { id: 'c2', label: 'Rebuild pricing table', done: false },
      { id: 'c3', label: 'Send + log activity', done: false },
    ],
  },
  {
    id: 't2',
    projectId: 'p2', projectName: 'Q3 Upwork Push',
    title: 'Send 20 Upwork proposals this week',
    assigneeId: 'bd2', assigneeName: 'Faisal Nadeem',
    status: 'in_progress', priority: 'medium', dueDate: day(3),
    channel: 'upwork', recurrence: 'weekly',
    createdBy: 'Ayesha Siddiqui',
    checklist: [],
  },
  {
    id: 't3',
    projectId: 'p3', projectName: 'Enterprise Deal Desk',
    title: 'Reissue Nordic quote as two phases',
    assigneeId: 'bd1', assigneeName: 'Ayesha Siddiqui',
    status: 'todo', priority: 'high', dueDate: day(2),
    leadId: 'l1', leadCompany: 'Nordic Freight Systems', recurrence: 'once',
    createdBy: 'Ayesha Siddiqui',
    checklist: [],
  },
  {
    id: 't4',
    projectId: 'p2', projectName: 'Q3 Upwork Push',
    title: 'Follow up with Halcyon Dental on the proposal',
    description: 'Third touch. If no reply by Friday, move to Contacted and drop the priority.',
    assigneeId: 'bd2', assigneeName: 'Faisal Nadeem',
    status: 'todo', priority: 'high', dueDate: day(0),
    leadId: 'l2', leadCompany: 'Halcyon Dental Group', channel: 'email', recurrence: 'once',
    createdBy: 'Faisal Nadeem',
    checklist: [],
  },
  {
    id: 't5',
    projectId: 'p1', projectName: 'Logistics Outbound Campaign',
    title: 'Build the logistics-sector LinkedIn list',
    description: '150 operations directors across Nordics and Benelux.',
    assigneeId: 'bd3', assigneeName: 'Maryam Khan',
    status: 'blocked', priority: 'medium', dueDate: day(-1),
    channel: 'linkedin', recurrence: 'once',
    createdBy: 'Ayesha Siddiqui',
    checklist: [
      { id: 'c4', label: 'Sales Navigator seat approved', done: false },
    ],
  },
  {
    id: 't6',
    projectId: 'p3', projectName: 'Enterprise Deal Desk',
    title: 'Prep the Tayyab Textiles discovery deck',
    assigneeId: 'bd1', assigneeName: 'Ayesha Siddiqui',
    status: 'review', priority: 'medium', dueDate: day(1),
    leadId: 'l3', leadCompany: 'Tayyab Textiles', recurrence: 'once',
    createdBy: 'Ayesha Siddiqui',
    checklist: [],
  },
  {
    id: 't7',
    projectId: 'p2', projectName: 'Q3 Upwork Push',
    title: 'Clear the Fiverr brief inbox',
    assigneeId: 'bd3', assigneeName: 'Maryam Khan',
    status: 'completed', priority: 'low', dueDate: day(-1),
    channel: 'fiverr', recurrence: 'daily',
    createdBy: 'Maryam Khan',
    checklist: [],
  },
  {
    id: 't8',
    projectId: 'p5', projectName: 'Cold Calling Pilot',
    title: 'Cold-call the Lumen Solar commercial team',
    assigneeId: 'bd2', assigneeName: 'Faisal Nadeem',
    status: 'completed', priority: 'medium', dueDate: day(-1),
    leadId: 'l8', leadCompany: 'Lumen Solar', channel: 'cold_call', recurrence: 'once',
    createdBy: 'Faisal Nadeem',
    checklist: [],
  },
  {
    id: 't9',
    projectId: 'p1', projectName: 'Logistics Outbound Campaign',
    title: 'Second touch — legal-sector email sequence',
    assigneeId: 'bd2', assigneeName: 'Faisal Nadeem',
    status: 'in_progress', priority: 'low', dueDate: day(4),
    channel: 'email', recurrence: 'weekly',
    createdBy: 'Ayesha Siddiqui',
    checklist: [],
  },
  {
    id: 't10',
    projectId: 'p1', projectName: 'Logistics Outbound Campaign',
    title: 'Chase Crestline after their board meets',
    assigneeId: 'bd3', assigneeName: 'Maryam Khan',
    status: 'approved', priority: 'low', dueDate: day(6),
    leadId: 'l9', leadCompany: 'Crestline Realty', recurrence: 'once',
    createdBy: 'Maryam Khan',
    checklist: [],
  },
  {
    id: 't11',
    projectId: 'p4', projectName: 'Inbound & Case Studies',
    title: 'Write the Peak Fitness case study',
    description: 'Now the deal is closed — use it on LinkedIn and in the Upwork portfolio.',
    assigneeId: 'bd3', assigneeName: 'Maryam Khan',
    status: 'todo', priority: 'medium', dueDate: day(8),
    leadId: 'l10', leadCompany: 'Peak Fitness Collective', recurrence: 'once',
    createdBy: 'Ayesha Siddiqui',
    checklist: [],
  },
  {
    id: 't12',
    projectId: 'p1', projectName: 'Logistics Outbound Campaign',
    title: 'Monthly channel review with leadership',
    assigneeId: 'bd1', assigneeName: 'Ayesha Siddiqui',
    status: 'todo', priority: 'medium', dueDate: day(12),
    recurrence: 'monthly',
    createdBy: 'Ayesha Siddiqui',
    checklist: [],
  },
]

