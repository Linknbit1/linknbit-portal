
// ══════════════════════════════════════════════════════
//  DATA
// ══════════════════════════════════════════════════════
const CAT_COLORS={
  Work:{bg:'rgba(90,180,255,.12)',fg:'#5AB4FF'},
  Event:{bg:'rgba(255,190,71,.12)',fg:'#FFBE47'},
  Help:{bg:'rgba(79,255,176,.12)',fg:'#4FFFB0'},
  Idea:{bg:'rgba(200,160,255,.12)',fg:'#C8A0FF'},
  Social:{bg:'rgba(255,120,180,.12)',fg:'#FF78B4'},
  Ops:{bg:'rgba(160,160,160,.12)',fg:'#A0A0A0'},
  'Work excellence':{bg:'rgba(90,180,255,.12)',fg:'#5AB4FF'},
  'Helped a teammate':{bg:'rgba(79,255,176,.12)',fg:'#4FFFB0'},
  'Organised an event':{bg:'rgba(255,190,71,.12)',fg:'#FFBE47'},
  'Shared a great idea':{bg:'rgba(200,160,255,.12)',fg:'#C8A0FF'},
  'Went above and beyond':{bg:'rgba(232,255,71,.12)',fg:'#E8FF47'},
  'Team spirit':{bg:'rgba(255,120,180,.12)',fg:'#FF78B4'},
};
const BEN_COLORS={
  green:{bg:'rgba(79,255,176,.12)',fg:'#4FFFB0',bar:'#4FFFB0'},
  teal:{bg:'rgba(0,200,180,.12)',fg:'#00C8B4',bar:'#00C8B4'},
  amber:{bg:'rgba(255,190,71,.12)',fg:'#FFBE47',bar:'#FFBE47'},
  blue:{bg:'rgba(90,180,255,.13)',fg:'#5AB4FF',bar:'#5AB4FF'},
  purple:{bg:'rgba(200,160,255,.12)',fg:'#C8A0FF',bar:'#C8A0FF'},
  coral:{bg:'rgba(255,130,100,.12)',fg:'#FF8264',bar:'#FF8264'},
  pink:{bg:'rgba(255,120,180,.12)',fg:'#FF78B4',bar:'#FF78B4'},
};
const DIFF_C={Easy:{bg:'rgba(79,255,176,.12)',fg:'#4FFFB0'},Medium:{bg:'rgba(255,190,71,.12)',fg:'#FFBE47'},Hard:{bg:'rgba(255,90,90,.12)',fg:'#FF5A5A'}};
const PTC={10:{bg:'rgba(79,255,176,.12)',fg:'#4FFFB0'},15:{bg:'rgba(79,255,176,.12)',fg:'#4FFFB0'},20:{bg:'rgba(90,180,255,.12)',fg:'#5AB4FF'},25:{bg:'rgba(90,180,255,.12)',fg:'#5AB4FF'},30:{bg:'rgba(200,160,255,.12)',fg:'#C8A0FF'},50:{bg:'rgba(255,190,71,.12)',fg:'#FFBE47'}};

const AVATARS=['🦁','🐯','🦊','🐺','🦅','🦋','🐉','🦄','🤖','👾','🎮','⚡','🔥','💎','🌙','⭐','🏆','💀','🎯','🚀','🦸','🧙','🥷','🎲','🌊','🌋','🦂','👑'];

// Penalty config
const PEN_LEVELS={
  1:{label:'Level 1 — Minor Warning',icon:'🟡',xp:-10,color:'amber',desc:'Minor infraction or reminder'},
  2:{label:'Level 2 — Formal Warning',icon:'🟠',xp:-25,color:'orange',desc:'Repeated or moderate issue'},
  3:{label:'Level 3 — Severe Strike',icon:'🔴',xp:-50,color:'red',desc:'Serious violation or misconduct'},
};

let employees = [
  {id:'ADMIN-001',name:'Admin User',  role:'admin',   dept:'Management', coins:0,  rep:0,  badges:[],avIdx:0,avEmoji:'👑',penalties:[],streak:0,lastStandup:null,weeklyShoutouts:0,lastShoutoutWeek:null},
  {id:'EMP-001',  name:'Ahmed Raza',  role:'employee',dept:'Engineering',coins:340,rep:820,badges:['Work excellence','Great ideas'],avIdx:0,avEmoji:'🦁',penalties:[],streak:8,lastStandup:null,weeklyShoutouts:0,lastShoutoutWeek:null},
  {id:'EMP-002',  name:'Sara Khan',   role:'employee',dept:'Marketing',  coins:290,rep:650,badges:['Event organiser','Team helper'],avIdx:1,avEmoji:'🦋',penalties:[],streak:5,lastStandup:null,weeklyShoutouts:0,lastShoutoutWeek:null},
  {id:'EMP-003',  name:'Bilal Mahmood',role:'employee',dept:'Engineering',coins:210,rep:490,badges:['Work excellence'],avIdx:2,avEmoji:'🤖',penalties:[],streak:3,lastStandup:null,weeklyShoutouts:0,lastShoutoutWeek:null},
  {id:'EMP-004',  name:'Nadia Hussain',role:'employee',dept:'HR',        coins:185,rep:410,badges:['Great ideas'],avIdx:3,avEmoji:'🌙',penalties:[],streak:2,lastStandup:null,weeklyShoutouts:0,lastShoutoutWeek:null},
  {id:'EMP-005',  name:'Usman Tariq', role:'employee',dept:'Operations', coins:140,rep:310,badges:['Event organiser'],avIdx:4,avEmoji:'⚡',penalties:[],streak:1,lastStandup:null,weeklyShoutouts:0,lastShoutoutWeek:null},
];

let feed = [
  {from:'Admin User',   to:'Ahmed Raza',   msg:'Delivered the client dashboard 2 days ahead of schedule.',        cat:'Work excellence',  time:'2h ago'},
  {from:'Nadia Hussain',to:'Sara Khan',    msg:'Organised the entire Eid lunch — everyone had an amazing time.',   cat:'Organised an event',time:'1d ago'},
  {from:'Ahmed Raza',   to:'Usman Tariq',  msg:'Set up the cricket match and kept the whole team energised.',      cat:'Team spirit',      time:'2d ago'},
  {from:'Sara Khan',    to:'Nadia Hussain',msg:'Helped 3 colleagues finish their tasks while completing her own.', cat:'Helped a teammate',time:'3d ago'},
];

let tasks = [
  {id:1,title:'Organise Friday lunch order',  desc:'Collect orders and place group order by 12pm.',              cat:'Event',pts:20,diff:'Easy',  dur:2, claimed:false,claimedBy:'',claimedById:'',claimedAt:null},
  {id:2,title:'Write onboarding doc',          desc:'Create a one-page guide covering tools and key contacts.',    cat:'Work', pts:30,diff:'Medium',dur:5, claimed:false,claimedBy:'',claimedById:'',claimedAt:null},
  {id:3,title:'Lead the weekly standup',       desc:"Run this Friday's standup. Keep it under 15 minutes.",       cat:'Help', pts:15,diff:'Easy',  dur:1, claimed:true, claimedBy:'Ahmed Raza',claimedById:'EMP-001',claimedAt:new Date(Date.now()-43200000).toISOString()},
  {id:4,title:'Suggest a process improvement', desc:'Identify a bottleneck and write a short proposal.',           cat:'Idea', pts:30,diff:'Medium',dur:7, claimed:false,claimedBy:'',claimedById:'',claimedAt:null},
  {id:5,title:'Set up projector for client demo',desc:'Test AV, cables, slides the day before.',                  cat:'Ops',  pts:10,diff:'Easy',  dur:1, claimed:false,claimedBy:'',claimedById:'',claimedAt:null},
  {id:6,title:'Organise a team activity',      desc:'Plan a fun outing — cricket, games, anything works!',         cat:'Social',pts:50,diff:'Hard', dur:14,claimed:false,claimedBy:'',claimedById:'',claimedAt:null},
];

// Community tasks (posted by employees)
let communityTasks = [
  {id:101,title:'Help me review my presentation',desc:'I need someone to go through my Q2 slides and give feedback before Thursday.',cat:'Help',pts:20,postedBy:'Sara Khan',postedById:'EMP-002',claimed:false,claimedBy:'',claimedById:'',claimedAt:null,createdAt:new Date(Date.now()-86400000).toISOString()},
  {id:102,title:'Cover my Monday 9am call',desc:'I have a doctor appointment. Can someone join the team sync and take notes?',cat:'Help',pts:30,postedBy:'Usman Tariq',postedById:'EMP-005',claimed:false,claimedBy:'',claimedById:'',claimedAt:null,createdAt:new Date(Date.now()-3600000).toISOString()},
];

// Duels
let duels = [
  {id:1,challenger:'Ahmed Raza',challengerId:'EMP-001',opponent:'Bilal Mahmood',opponentId:'EMP-003',
   dur:3,stake:25,startXpChallenger:340,startXpOpponent:210,status:'active',
   startedAt:new Date(Date.now()-86400000).toISOString(),endsAt:new Date(Date.now()+172800000).toISOString()},
];
let nextDuelId = 2;

// Team Battles
const TEAM_MAP = {
  'Design':'🎨', 'Engineering':'💻', 'Marketing':'📣',
  'HR':'🧑‍💼','Operations':'⚙️','Finance':'💰','Management':'👑'
};
const GUILD_TEAMS = {
  'Devs':   {label:'Dev Team',     emoji:'💻', color:'#5AB4FF', depts:['Engineering']},
  'Design': {label:'Design Team',  emoji:'🎨', color:'#C8A0FF', depts:['Design']},
  'Mkt':    {label:'Marketing',    emoji:'📣', color:'#FF78B4', depts:['Marketing']},
};

let sprints = [
  {id:1,name:'Client Portal Redesign',desc:'Revamp the client-facing portal UI before the Q2 demo. Deliver polished screens and a working prototype.',
   teams:['Design'],xpPerContributor:75,status:'active',
   startedAt:new Date(Date.now()-86400000).toISOString(),
   endsAt:new Date(Date.now()+86400000*6).toISOString(),
   contributors:[]},
  {id:2,name:'Fix API Response Time',desc:'Identify and resolve latency issues on the mobile app. Target: under 200ms p95.',
   teams:['Devs','Design'],xpPerContributor:60,status:'active',
   startedAt:new Date(Date.now()-86400000*2).toISOString(),
   endsAt:new Date(Date.now()+86400000*5).toISOString(),
   contributors:[{id:'EMP-001',name:'Ahmed Raza',note:'Profiled endpoints — found 3 bottlenecks in auth middleware.',loggedAt:'1d ago'}]},
];
let nextSprintId = 3;
let pendingContributeId = null;
let activeSprintTeam = 'All';

let benefits = [
  {id:1,name:'Cash bonus',         desc:'Monthly salary bonus. Amount based on XP tier.',          icon:'💰',color:'green', pts:500,freq:'Quarterly',claimedBy:[]},
  {id:2,name:'Early leave Friday', desc:'Leave up to 2 hours early on any Friday of your choice.',  icon:'🏠',color:'teal',  pts:150,freq:'Monthly',  claimedBy:[]},
  {id:3,name:'Extra casual leave', desc:'One additional day of casual leave added to your balance.', icon:'🌴',color:'blue',  pts:200,freq:'Monthly',  claimedBy:[]},
  {id:4,name:'Team lunch on us',   desc:'Office covers lunch for you and up to 3 teammates.',        icon:'🍽️',color:'amber', pts:120,freq:'Monthly',  claimedBy:[]},
  {id:5,name:'Work from home week',desc:'Work fully remote for an entire week, no questions asked.', icon:'💻',color:'purple',pts:350,freq:'Quarterly',claimedBy:[]},
  {id:6,name:'Learning budget',    desc:'PKR 5,000 credit for any course, book, or workshop.',       icon:'📚',color:'coral', pts:300,freq:'Annually', claimedBy:[]},
];

let monthlyArchive = {
  '2026-03':{shoutouts:38,tasks:14,benefits:5,topEarner:'Ahmed Raza',totalPts:920,members:[
    {name:'Ahmed Raza',pts:310,tasks:5,benefits:2},{name:'Sara Khan',pts:265,tasks:4,benefits:1},
    {name:'Bilal Mahmood',pts:190,tasks:3,benefits:1},{name:'Nadia Hussain',pts:155,tasks:2,benefits:1},{name:'Usman Tariq',pts:120,tasks:2,benefits:0}
  ]},
  '2026-02':{shoutouts:29,tasks:10,benefits:3,topEarner:'Sara Khan',totalPts:710,members:[
    {name:'Ahmed Raza',pts:280,tasks:4,benefits:1},{name:'Sara Khan',pts:295,tasks:5,benefits:2},
    {name:'Bilal Mahmood',pts:145,tasks:2,benefits:0},{name:'Nadia Hussain',pts:130,tasks:2,benefits:0},{name:'Usman Tariq',pts:95,tasks:1,benefits:0}
  ]},
};

// Lottery state
let lotterySpinHistory = [];

// Daily standups
let standups = [
  {id:1,empId:'EMP-001',empName:'Ahmed Raza',date:'2026-04-14',
   done:'Completed the auth middleware refactor and pushed to staging. Wrote unit tests for all 3 new endpoints.',
   blockers:'Waiting on design team to confirm the error state UI before I can finalise the error boundary component.',
   tomorrow:'Merge auth PR, start on the dashboard API integration, attend the client call at 3pm.'},
  {id:2,empId:'EMP-002',empName:'Sara Khan',date:'2026-04-14',
   done:'Finalised Q2 campaign brief and sent to all stakeholders. Updated the brand guidelines deck with new logo usage rules.',
   blockers:'No major blockers. Need approval from Ahmed on the API data format for the campaign dashboard.',
   tomorrow:'Kick off social media content calendar for May, review analytics from the March campaign.'},
];
let nextStandupId = 3;
let adminUpdateFilter = 'all';

// Attendance preview state. WordPress should verify these checks server-side.
let attendanceSettings = {
  start:'08:00',
  onTimeUntil:'09:30',
  end:'11:00',
  onTimeReward:3,
};
let attendanceOfficePreview = false;
let nextAttendanceRequestId = 3;
let attendanceRecords = [
  {id:1,empId:'EMP-002',date:localDateISO(),time:'09:07',status:'present',method:'Office network',verified:true,reward:3},
  {id:2,empId:'EMP-004',date:localDateISO(),time:'09:42',status:'late',method:'Office network',verified:true,reward:0},
];
let attendanceRequests = [
  {id:1,empId:'EMP-003',date:localDateISO(-1),reason:'Client meeting started before I could check in.',status:'pending',createdAt:'Yesterday'},
  {id:2,empId:'EMP-005',date:localDateISO(),reason:'Reception Wi-Fi was down when I arrived.',status:'approved',createdAt:'Today'},
];

// ── Team Performance ──────────────────────────────────
const PERF_CATEGORIES = [
  {id:'revenue',   label:'Revenue & Delivery',  icon:'💰', weight:25, desc:'Billable output, project delivery, targets met'},
  {id:'quality',   label:'Quality of Work',      icon:'✅', weight:20, desc:'Output standard, minimal rework, client-ready'},
  {id:'client',    label:'Client Satisfaction',  icon:'😊', weight:20, desc:'Positive feedback, repeat requests, client trust'},
  {id:'teamwork',  label:'Teamwork & Attitude',  icon:'🤝', weight:15, desc:'Collaboration, communication, energy under pressure'},
  {id:'ownership', label:'Ownership & Initiative',icon:'🎯',weight:10, desc:'Responsibility, flags problems early, brings solutions'},
  {id:'consistency',label:'Consistency & Attendance',icon:'📋',weight:10, desc:'Reliability, standups, punctuality, no surprises'},
];

let performanceHistory = {
  '2026-03': {
    'Devs':   {revenue:4,quality:4,client:3,teamwork:4,ownership:4,consistency:3},
    'Design': {revenue:3,quality:5,client:4,teamwork:3,ownership:3,consistency:4},
    'Mkt':    {revenue:3,quality:3,client:4,teamwork:4,ownership:3,consistency:3},
  },
  '2026-02': {
    'Devs':   {revenue:3,quality:3,client:3,teamwork:3,ownership:3,consistency:4},
    'Design': {revenue:4,quality:4,client:3,teamwork:4,ownership:3,consistency:3},
    'Mkt':    {revenue:4,quality:3,client:4,teamwork:3,ownership:4,consistency:4},
  },
};
let activePerformanceMonth = '2026-04';
let activePerformanceTeam = 'Devs';
let perfDraftScores = {}; // teamKey -> {catId -> rating}

// ── Notifications ────────────────────────────────────────────────────────────
let notifications = {
  'EMP-001':[
    {id:1,icon:'⭐',text:'Admin User gave you a shoutout for Work excellence! +25 XP',time:'2h ago',read:false,panel:'e-leaderboard'},
    {id:2,icon:'⚔️',text:'Bilal Mahmood accepted your duel challenge! 3-day battle is live.',time:'1d ago',read:false,panel:'e-leaderboard'},
    {id:3,icon:'📋',text:'You were assigned "Fix login crash on Android 13" in Mobile App v2.',time:'2d ago',read:true,panel:'e-projects'},
  ],
  'EMP-002':[
    {id:1,icon:'⭐',text:'Nadia Hussain gave you a shoutout for Organised an event! +25 XP',time:'1d ago',read:false,panel:'e-leaderboard'},
    {id:2,icon:'📋',text:'You were assigned "Design new homepage hero section" in Website Redesign.',time:'2d ago',read:true,panel:'e-projects'},
  ],
  'EMP-003':[
    {id:1,icon:'⚔️',text:'Ahmed Raza challenged you to a 3-day duel! Open Arena to respond.',time:'1d ago',read:false,panel:'e-leaderboard'},
    {id:2,icon:'📋',text:'You were assigned "Add push notification support" in Mobile App v2.',time:'2d ago',read:true,panel:'e-projects'},
  ],
  'EMP-004':[
    {id:1,icon:'⭐',text:'Sara Khan gave you a shoutout for Helped a teammate! +25 XP',time:'3d ago',read:true,panel:'e-leaderboard'},
    {id:2,icon:'📋',text:'You were assigned "Write about us page copy" in Website Redesign.',time:'3d ago',read:true,panel:'e-projects'},
  ],
  'EMP-005':[
    {id:1,icon:'📋',text:'You were assigned "Set up paid ad creatives" in Q2 Marketing Campaign.',time:'2d ago',read:false,panel:'e-projects'},
  ],
  'ADMIN-001':[],
};
let nextNotifId = 10;

// ── Chat ─────────────────────────────────────────────────────────────────────
let chatChannels = [
  {id:'general',     type:'public', name:'general',     icon:'#',  desc:'Company-wide — everyone'},
  {id:'announcements',type:'public',name:'announcements',icon:'📢',desc:'Important updates from admins'},
];
// Project channels auto-built from projects array at runtime

let chatMessages = {
  'general':[
    {id:1,authorId:'ADMIN-001',authorName:'Admin User',text:'Welcome to Linknbit War Room! 🎮 Use this channel for announcements.',time:'Apr 10',threads:[]},
    {id:2,authorId:'EMP-001',  authorName:'Ahmed Raza', text:'Thanks! Excited to get started 🚀',time:'Apr 10',threads:[]},
    {id:3,authorId:'EMP-002',  authorName:'Sara Khan',  text:'Same here! When does the first team battle kick off?',time:'Apr 11',threads:[]},
    {id:4,authorId:'ADMIN-001',authorName:'Admin User', text:'Battles are already live — check the Teams section!',time:'Apr 11',threads:[]},
  ],

  'proj-1':[
    {id:1,authorId:'ADMIN-001',authorName:'Admin User',text:'Project kicked off! Homepage hero is the priority. Sara take the lead.',time:'Apr 10'},
    {id:2,authorId:'EMP-002',  authorName:'Sara Khan', text:'On it! I will have 3 variants ready by Thursday.',time:'Apr 10'},
  ],
  'proj-2':[
    {id:1,authorId:'ADMIN-001',authorName:'Admin User',text:'This is the hub for Mobile App v2. All updates here please.',time:'Apr 8'},
    {id:2,authorId:'EMP-001',  authorName:'Ahmed Raza',text:'Profiled all endpoints. Found the bottlenecks. Will fix today.',time:'Apr 14'},
  ],
  'proj-3':[
    {id:1,authorId:'ADMIN-001',authorName:'Admin User',text:'Q2 campaign brief is locked. Lets execute!',time:'Apr 5'},
  ],
};
// DM messages keyed by sorted pair of IDs e.g. "EMP-001:EMP-002"
let dmMessages = {};
chatMessages['announcements']=[
  {id:1,authorId:'ADMIN-001',authorName:'Admin User',text:'Linknbit War Room is now live! Check your panels, claim quests, and start earning XP. 🎮',time:'Apr 10',threads:[]},
  {id:2,authorId:'ADMIN-001',authorName:'Admin User',text:'First team sprint has been launched. Design Team — Client Portal Redesign is active. Log your contributions!',time:'Apr 11',threads:[]},
];
// Pre-seed some task thread messages
chatMessages['task-1']=[
  {id:1,authorId:'ADMIN-001',authorName:'Admin User',text:'Sara — please use the new brand colour palette only. No legacy greys.',time:'Apr 12'},
  {id:2,authorId:'EMP-002',authorName:'Sara Khan',text:'Got it! Will send you 3 variants by Thursday for review.',time:'Apr 12'},
];
chatMessages['task-4']=[
  {id:1,authorId:'ADMIN-001',authorName:'Admin User',text:'Ahmed this is blocking the client demo. Top priority.',time:'Apr 14'},
  {id:2,authorId:'EMP-001',authorName:'Ahmed Raza',text:'Reproduced the crash. The JWT refresh token is not being invalidated on Android 13. Fix in progress.',time:'Apr 14'},
  {id:3,authorId:'ADMIN-001',authorName:'Admin User',text:'How long do you need?',time:'Apr 14'},
  {id:4,authorId:'EMP-001',authorName:'Ahmed Raza',text:'2-3 hours max. Will push to staging tonight.',time:'Apr 14'},
];

let activeChatChannel = 'general';
let activeDMUser = null;
let activeTaskThread = null; // taskId or null
let chatUnread = {}; // channelId -> count
let nextChatMsgId = 100;
let nextNotifDropId = 0;
let activeThreadMsgId = null;
let activeThreadChannel = null;
let threadUnread = {}; // 'chKey:msgId' -> count of new replies since last view

// Projects
const PROJ_COLORS=['#5AB4FF','#4FFFB0','#FFBE47','#C8A0FF','#FF78B4','#E8FF47','#FF8264'];
const PRIORITIES=['Low','Medium','High','Urgent'];
// Default columns — each project gets its own copy
const DEFAULT_COLUMNS=[
  {id:'todo',      label:'To Do',      color:'#8A8A96'},
  {id:'inprogress',label:'In Progress',color:'#FFBE47'},
  {id:'done',      label:'Done',       color:'#4FFFB0'},
];
function getProjectColumns(projectId){
  const p=projects.find(x=>x.id===projectId);
  if(!p||!p.columns||!p.columns.length) return DEFAULT_COLUMNS.map(c=>({...c}));
  return p.columns;
}
function getStatusMeta(colId, projectId){
  const cols=getProjectColumns(projectId||activeProjectId||0);
  const col=cols.find(c=>c.id===colId);
  if(!col) return {label:colId,color:'var(--muted)',border:'var(--border)'};
  return {label:col.label, color:col.color, border:col.color+'44'};
}
let nextColId=1;

let projects = [
  {id:1,name:'Website Redesign',desc:'Full redesign of the company website — new branding, responsive layout, updated copy.',color:'#5AB4FF',team:'Design',createdBy:'ADMIN-001',createdAt:'2026-04-10'},
  {id:2,name:'Mobile App v2',desc:'Build the second version of the mobile app with new dashboard, notifications and performance improvements.',color:'#4FFFB0',team:'Devs',createdBy:'ADMIN-001',createdAt:'2026-04-08'},
  {id:3,name:'Q2 Marketing Campaign',desc:'Plan and execute the Q2 campaign across social, email, and paid channels.',color:'#FFBE47',team:'Mkt',createdBy:'ADMIN-001',createdAt:'2026-04-05'},
];
let nextProjectId = 4;

let projectTasks = [
  {id:1,projectId:1,title:'Design new homepage hero section',desc:'Create 3 hero variants to present to stakeholders. Must include headline, subhead, CTA button and illustration.',assigneeId:'EMP-002',assigneeName:'Sara Khan',priority:'High',status:'inprogress',due:'2026-04-20',xp:30,createdBy:'ADMIN-001',comments:[{author:'Admin User',text:'Use the new brand colours only.',time:'2d ago'}]},
  {id:2,projectId:1,title:'Write about us page copy',desc:'Draft new copy for the About Us page. 400-600 words, reflecting updated company mission.',assigneeId:'EMP-004',assigneeName:'Nadia Hussain',priority:'Medium',status:'todo',due:'2026-04-22',xp:20,createdBy:'ADMIN-001',comments:[]},
  {id:3,projectId:1,title:'Mobile responsiveness audit',desc:'Test all pages on iOS and Android. Document any layout issues.',assigneeId:'',assigneeName:'Unassigned',priority:'Low',status:'todo',due:'2026-04-25',xp:15,createdBy:'EMP-001',comments:[]},
  {id:4,projectId:2,title:'Fix login crash on Android 13',desc:'Users on Android 13 report app crash on login. Reproduce and patch.',assigneeId:'EMP-001',assigneeName:'Ahmed Raza',priority:'Urgent',status:'inprogress',due:'2026-04-17',xp:40,createdBy:'ADMIN-001',comments:[{author:'Ahmed Raza',text:'Reproduced. Issue is in the JWT token handler. Working on fix.',time:'5h ago'}]},
  {id:5,projectId:2,title:'Add push notification support',desc:'Integrate FCM for push notifications. Cover order updates and reminders.',assigneeId:'EMP-003',assigneeName:'Bilal Mahmood',priority:'High',status:'todo',due:'2026-04-28',xp:35,createdBy:'ADMIN-001',comments:[]},
  {id:6,projectId:2,title:'Write API docs for v2 endpoints',desc:'Document all new v2 endpoints in Postman collection and README.',assigneeId:'',assigneeName:'Unassigned',priority:'Medium',status:'done',due:'2026-04-15',xp:25,createdBy:'EMP-003',comments:[]},
  {id:7,projectId:3,title:'Draft email campaign copy',desc:'Write subject lines and body copy for 3-email drip sequence targeting Q2 prospects.',assigneeId:'EMP-002',assigneeName:'Sara Khan',priority:'High',status:'todo',due:'2026-04-19',xp:20,createdBy:'ADMIN-001',comments:[]},
  {id:8,projectId:3,title:'Set up paid ad creatives',desc:'Design 5 ad variants for LinkedIn and Instagram. 1080x1080 and 1200x628 formats.',assigneeId:'EMP-005',assigneeName:'Usman Tariq',priority:'Medium',status:'inprogress',due:'2026-04-21',xp:25,createdBy:'ADMIN-001',comments:[]},
];
let nextProjectTaskId = 9;
let activeProjectId = null;
let projectView = 'kanban'; // 'kanban' or 'list'
let projectTaskDetail = null;
let taskPageId = null; // when non-null, task detail is full-page
let taskActivityTab = 'comments'; // 'comments' or 'activity'
let pendingAttachments = []; // files staged for current comment

let selectedBet = 10;
let tempAvatarIdx = 0;

// ══════════════════════════════════════════════════════
//  SESSION STATE
// ══════════════════════════════════════════════════════
let currentUser = null;
let activePanel = '';
let sidebarMode = 'game';
let activeWorkTab = 'projects';
let lbTab = 'monthly'; // 'monthly' or 'alltime' // projects | standup | reports (admin also has daily)
let activeTaskFilter = 'All';
let activeCTaskFilter = 'All';
let activeMonth = '2026-04';
let editEmpId = null, editTaskId = null, editBenId = null;
let deleteAction = null, claimBenId = null;
let nextEmpNum = 6, nextTaskId = 7, nextBenId = 7, nextCtaskId = 103;

// ══════════════════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function escAttr(s){return esc(s).replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function localDateISO(offsetDays=0){
  const d=new Date();
  d.setDate(d.getDate()+offsetDays);
  const tz=d.getTimezoneOffset()*60000;
  return new Date(d.getTime()-tz).toISOString().slice(0,10);
}
function fmtDate(iso){
  return new Date(iso+'T12:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'2-digit',month:'short'});
}
function safeUrl(raw,{image=false}={}){
  try{
    const url=new URL(String(raw||'').trim(), window.location.href);
    const ok=image?['http:','https:']:['http:','https:','mailto:','tel:'];
    return ok.includes(url.protocol)?url.href:'';
  }catch(e){return''}
}
function sanitizeRichHTML(html){
  const template=document.createElement('template');
  template.innerHTML=String(html||'');
  const allowed=new Set(['p','br','strong','b','em','i','u','ul','ol','li','blockquote','pre','code','a','img','h3']);
  const clean=node=>{
    if(node.nodeType===Node.TEXT_NODE)return document.createTextNode(node.textContent);
    if(node.nodeType!==Node.ELEMENT_NODE)return document.createTextNode('');
    const tag=node.tagName.toLowerCase();
    if(!allowed.has(tag)){
      const frag=document.createDocumentFragment();
      node.childNodes.forEach(child=>frag.appendChild(clean(child)));
      return frag;
    }
    const el=document.createElement(tag);
    if(tag==='a'){
      const href=safeUrl(node.getAttribute('href'));
      if(href){el.setAttribute('href',href);el.setAttribute('target','_blank');el.setAttribute('rel','noopener noreferrer');}
    }
    if(tag==='img'){
      const src=safeUrl(node.getAttribute('src'),{image:true});
      if(!src)return document.createTextNode('');
      el.setAttribute('src',src);
      el.setAttribute('alt',node.getAttribute('alt')||'image');
      el.setAttribute('loading','lazy');
    }
    node.childNodes.forEach(child=>el.appendChild(clean(child)));
    return el;
  };
  const out=document.createElement('div');
  template.content.childNodes.forEach(child=>out.appendChild(clean(child)));
  return out.innerHTML;
}
function ini(n){return String(n).split(' ').map(w=>w[0]||'').join('').toUpperCase().slice(0,2)}
function avEmoji(emp){return emp.avEmoji||AVATARS[emp.avIdx%AVATARS.length]||'⭐'}
function pill(t,bg,fg){return`<span class="pill" style="background:${bg};color:${fg}">${esc(t)}</span>`}
function toast(msg,ok=true){const t=$('toast');t.textContent=msg;t.style.borderColor=ok?'rgba(79,255,176,.3)':'rgba(255,90,90,.3)';t.style.color=ok?'var(--text)':'var(--red)';t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),3200)}
function closeModal(id){$(id).classList.remove('open')}
function openModal(id){$(id).classList.add('open')}
document.querySelectorAll('.modal-bg').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open')}));
function timeLeft(task){
  if(!task.claimed||!task.claimedAt)return null;
  const d=new Date(task.claimedAt).getTime()+(task.dur*86400000)-Date.now();
  const h=Math.round(d/3600000);
  if(h<0)return{label:'Overdue',cls:'tl-urgent'};
  if(h<24)return{label:h+'h left',cls:'tl-urgent'};
  const days=Math.ceil(h/24);
  return{label:days+'d left',cls:days<=2?'tl-soon':'tl-ok'};
}
function fmtMonth(m){const[y,mo]=m.split('-');return new Date(+y,+mo-1).toLocaleDateString('en-GB',{month:'long',year:'numeric'})}
function genId(role){
  if(role==='admin')return'ADMIN-00'+(employees.filter(e=>e.role==='admin').length+1);
  nextEmpNum++;return'EMP-'+String(nextEmpNum).padStart(3,'0');
}
function levelFor(rep){return Math.max(1,Math.floor((rep||0)/200)+1)}
function repPctFor(rep){return(((rep||0)%200)/200)*100}
function earnCoins(emp, amount){
  if(!emp)return;
  emp.coins=(emp.coins||0)+amount;
  if(emp.id===currentUser?.id){currentUser.coins=emp.coins;updateTopbar();}
}
function earnRep(emp, amount){
  if(!emp)return;
  emp.rep=(emp.rep||0)+amount;
  if(emp.id===currentUser?.id){currentUser.rep=emp.rep;updateTopbar();}
}
function earnBoth(emp, coins, rep){
  rep=rep||coins;
  earnCoins(emp,coins);
  earnRep(emp,rep);
}
function getCurrentWeek(){
  const d=new Date();
  const jan=new Date(d.getFullYear(),0,1);
  return Math.ceil(((d-jan)/86400000+jan.getDay()+1)/7);
}
function canGiveShoutout(emp){
  const week=getCurrentWeek()+'-'+new Date().getFullYear();
  return !emp||(emp.weeklyShoutouts||0)===0||(emp.lastShoutoutWeek!==week);
}
function markShoutoutGiven(emp){
  const week=getCurrentWeek()+'-'+new Date().getFullYear();
  if(emp.lastShoutoutWeek!==week){emp.weeklyShoutouts=0;emp.lastShoutoutWeek=week;}
  emp.weeklyShoutouts=(emp.weeklyShoutouts||0)+1;
}
function updateTopbar(){
  if(!currentUser)return;
  $('tb-pts').textContent=(currentUser.coins||0)+'🪙';
  const repEl=$('tb-rep');
  if(repEl)repEl.textContent=(currentUser.rep||0)+'⭐';
  const lvEl=$('tb-level');
  if(lvEl)lvEl.textContent='Lv.'+levelFor(currentUser.rep||0);
  const barEl=$('tb-xp-bar');
  if(barEl)barEl.style.width=repPctFor(currentUser.rep||0)+'%';
}

// ══════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════
let loginRole = 'employee';
function setLoginRole(r){
  loginRole=r;
  document.querySelectorAll('.login-tab').forEach((t,i)=>t.classList.toggle('active',['employee','admin'][i]===r));
  $('login-hint').textContent=r==='admin'?'Preview mode: enter an admin ID. WordPress will provide real authentication later.':'Preview mode: enter a member ID. WordPress will provide real authentication later.';
  $('l-id').placeholder=r==='admin'?'ADMIN-001':'EMP-001';
}
function doLogin(){
  const id=$('l-id').value.trim().toUpperCase();
  const err=$('login-error');
  const user=employees.find(e=>e.id===id);
  if(!user){err.textContent='Unknown ID. Use one of the preview roster IDs.';err.style.display='block';return}
  if(loginRole==='admin'&&user.role!=='admin'){err.textContent='This account does not have admin access.';err.style.display='block';return}
  if(loginRole==='employee'&&user.role==='admin'){err.textContent='Please use the Admin tab to log in.';err.style.display='block';return}
  err.style.display='none';
  currentUser=user;
  $('login-screen').style.display='none';
  $('shell').classList.add('visible');
  buildShell();
}
function doLogout(){
  currentUser=null;
  $('shell').classList.remove('visible');
  $('login-screen').style.display='flex';
  $('l-id').value='';$('l-pass').value='';
}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&$('login-screen').style.display!=='none')doLogin()});

// ══════════════════════════════════════════════════════
//  SHELL BUILD
// ══════════════════════════════════════════════════════
function buildShell(){
  const isAdmin=currentUser.role==='admin';
  const emoji=avEmoji(currentUser);
  $('tb-role-badge').textContent=isAdmin?'Admin':'Member';
  $('tb-role-badge').className='tb-role '+(isAdmin?'admin':'employee');
  $('tb-av').style.cssText='background:transparent';
  $('tb-av').textContent=emoji;
  $('tb-name').textContent=currentUser.name;
  if(!isAdmin){
    $('tb-pts').style.display='inline';
    $('tb-rep').style.display='inline';
    $('tb-xp-wrap').style.display='flex';
    updateTopbar();
  }
  buildSidebar(isAdmin);
  refreshNotifBadge();
  refreshChatBadge();
  switchPanel(isAdmin?'a-dashboard':'e-leaderboard');
}

function buildSidebar(isAdmin){
  renderSidebar(isAdmin);
}

function renderSidebar(isAdmin){
  const sb=$('sidebar');
  if(isAdmin){
    sb.innerHTML=`
      <div class="sb-section">Overview</div>
      <div class="sb-item" data-panel="a-dashboard"><span class="sb-icon">⌂</span>Dashboard</div>
      <div class="sb-section">People</div>
      <div class="sb-item" data-panel="a-employees"><span class="sb-icon">◌</span>Team Members</div>
      <div class="sb-item" data-panel="a-attendance"><span class="sb-icon">◷</span>Attendance</div>
      <div class="sb-item" data-panel="a-penalties"><span class="sb-icon">!</span>Penalties</div>
      <div class="sb-section">Work</div>
      <div class="sb-item" data-panel="a-tasks"><span class="sb-icon">✓</span>Quest Board</div>
      <div class="sb-item" data-panel="a-teams"><span class="sb-icon">▦</span>Sprints</div>
      <div class="sb-item" data-panel="a-daily"><span class="sb-icon">☷</span>Daily Updates</div>
      <div class="sb-section">Rewards</div>
      <div class="sb-item" data-panel="a-shoutouts"><span class="sb-icon">★</span>Shoutouts</div>
      <div class="sb-item" data-panel="a-benefits"><span class="sb-icon">◇</span>Rewards Catalog</div>
      <div class="sb-item" data-panel="a-leaderboard"><span class="sb-icon">#</span>Leaderboard</div>
      <div class="sb-section">Insights</div>
      <div class="sb-item" data-panel="a-performance"><span class="sb-icon">◍</span>Team Performance</div>
      <div class="sb-item" data-panel="a-reports"><span class="sb-icon">↗</span>Reports</div>
    `;
  }else{
    sb.innerHTML=`
      <div class="sb-section">Overview</div>
      <div class="sb-item" data-panel="e-leaderboard"><span class="sb-icon">#</span>Leaderboard</div>
      <div class="sb-item" data-panel="e-teams"><span class="sb-icon">▦</span>Sprints</div>
      <div class="sb-item" data-panel="e-performance"><span class="sb-icon">◍</span>Team Performance</div>
      <div class="sb-section">Work</div>
      <div class="sb-item" data-panel="e-attendance"><span class="sb-icon">◷</span>Attendance</div>
      <div class="sb-item" data-panel="e-tasks"><span class="sb-icon">✓</span>Quest Board</div>
      <div class="sb-item" data-panel="e-community"><span class="sb-icon">◎</span>Team Requests</div>
      <div class="sb-item" data-panel="e-standup"><span class="sb-icon">☷</span>Daily Standup</div>
      <div class="sb-section">Recognition</div>
      <div class="sb-item" data-panel="e-shoutout"><span class="sb-icon">★</span>Give Shoutout</div>
      <div class="sb-item" data-panel="e-benefits"><span class="sb-icon">◇</span>Rewards</div>
      <div class="sb-section">Account</div>
      <div class="sb-item" data-panel="e-profile"><span class="sb-icon">◌</span>Profile</div>
      <div class="sb-item" data-panel="e-penalties"><span class="sb-icon">!</span>Penalties</div>
      <div class="sb-item" data-panel="e-rules"><span class="sb-icon">?</span>Guidelines</div>
    `;
  }
  sb.querySelectorAll('.sb-item[data-panel]').forEach(i=>i.addEventListener('click',()=>switchPanel(i.dataset.panel)));
}

function setSidebarMode(mode){
  sidebarMode=mode;
  renderSidebar(currentUser.role==='admin');
  // re-apply active state
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.toggle('active',i.dataset.panel===activePanel));
}

function switchPanel(name){
  activePanel=name;
  document.querySelectorAll('.sb-item').forEach(i=>i.classList.toggle('active',i.dataset.panel===name));
  const mc=$('main-content');
  mc.innerHTML='';
  const div=document.createElement('div');
  div.className='panel active';
  mc.appendChild(div);
  const fns={
    'a-dashboard':renderAdminDashboard,'a-employees':renderAdminEmployees,
    'a-tasks':renderAdminTasks,'a-benefits':renderEmpBenefitsShop,
    'a-shoutouts':renderAdminShoutouts,'a-leaderboard':renderAdminLeaderboard,
    'a-reports':renderAdminReports,'a-penalties':renderAdminPenalties,
    'a-performance':renderAdminPerformance,
    'a-attendance':renderAdminAttendance,
    'a-teams':renderAdminTeams,
    'a-daily':renderAdminDaily,
    'a-notifications':renderNotifications,'a-chat':renderChat,
    'e-leaderboard':renderEmpLeaderboard,
    'e-tasks':renderEmpTasks,'e-benefits':renderEmpBenefitsShop,
    'e-shoutout':renderEmpShoutout,'e-profile':renderEmpProfile,
    'e-rules':renderEmpRules,
    'e-community':renderEmpCommunity,'e-penalties':renderEmpPenalties,
    'e-attendance':renderEmpAttendance,
    'e-teams':renderEmpTeams,
    'e-performance':renderEmpPerformance,
    'e-standup':renderEmpStandup,
    'e-notifications':renderNotifications,'e-chat':renderChat,
  };
  if(fns[name])fns[name](div);
}

function getPanel(){return $('main-content').querySelector('.panel.active')}

// ══════════════════════════════════════════════════════
//  ADMIN PANELS
// ══════════════════════════════════════════════════════
function renderAdminDashboard(el){
  const totalPts=employees.filter(e=>e.role==='employee').reduce((s,e)=>s+(e.coins||0),0);
const totalRep=employees.filter(e=>e.role==='employee').reduce((s,e)=>s+(e.rep||0),0);
  const openTasks=tasks.filter(t=>!t.claimed).length;
  const claimedBen=benefits.reduce((s,b)=>s+b.claimedBy.length,0);
  const totalPenalties=employees.reduce((s,e)=>s+(e.penalties||[]).length,0);
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">Dashboard</div><div class="page-sub">Team overview for ${fmtMonth('2026-04')}</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" onclick="switchPanel('a-attendance')">◷ Attendance</button>
        <button class="btn btn-accent" onclick="openModal('modal-shoutout');renderShoutoutModal()">⭐ Give shoutout</button>
      </div>
    </div>
    <div class="stats">
      <div class="stat"><div class="stat-val">${employees.filter(e=>e.role==='employee').length}</div><div class="stat-lbl">Active Members</div></div>
      <div class="stat"><div class="stat-val">${feed.length}</div><div class="stat-lbl">Shoutouts fired</div><div class="stat-sub up">↑ 4 vs last month</div></div>
      <div class="stat"><div class="stat-val">${tasks.filter(t=>t.claimed).length}/${tasks.length}</div><div class="stat-lbl">Quests active</div></div>
      <div class="stat"><div class="stat-val">${openTasks}</div><div class="stat-lbl">Open quests</div></div>
      <div class="stat"><div class="stat-val">${claimedBen}</div><div class="stat-lbl">Rewards claimed</div></div>
      <div class="stat"><div class="stat-val">${totalPts}</div><div class="stat-lbl">Total XP awarded</div></div>
      <div class="stat"><div class="stat-val">${totalPenalties}</div><div class="stat-lbl">Penalties issued</div></div>
      <div class="stat"><div class="stat-val">${communityTasks.length}</div><div class="stat-lbl">Bounties</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:1.5rem">
      <div class="tbl-wrap">
        <div style="padding:12px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border)">🏆 Top warriors</div>
        ${[...employees].filter(e=>e.role==='employee').sort((a,b)=>(b.coins||0)-(a.coins||0)).slice(0,5).map((e,i)=>{
          return`<div style="display:flex;align-items:center;gap:10px;padding:9px 14px;border-top:1px solid var(--border)">
            <span style="font-family:var(--mono);font-size:12px;color:var(--muted);min-width:18px">${i+1}</span>
            <span style="font-size:20px">${avEmoji(e)}</span>
            <span style="font-size:13px;flex:1">${esc(e.name)}</span>
            <span style="font-family:var(--mono);font-size:13px;color:var(--accent);font-weight:600">${e.coins||0}🪙</span>
          </div>`;
        }).join('')}
      </div>
      <div class="tbl-wrap">
        <div style="padding:12px 14px;font-size:13px;font-weight:600;border-bottom:1px solid var(--border)">📣 Recent shoutouts</div>
        ${feed.slice(0,4).map(f=>{const cs=CAT_COLORS[f.cat]||CAT_COLORS.Work;return`
          <div style="padding:9px 14px;border-top:1px solid var(--border)">
            <div style="font-size:12px;color:var(--muted)"><strong style="color:var(--text)">${esc(f.to)}</strong> from ${esc(f.from)}</div>
            <div style="font-size:12px;margin-top:2px;color:var(--muted)">${esc(f.msg.slice(0,55))}${f.msg.length>55?'…':''}</div>
            <span class="pill" style="background:${cs.bg};color:${cs.fg};margin-top:4px;display:inline-block">${esc(f.cat)}</span>
          </div>`;}).join('')}
      </div>
    </div>`;
}

function renderAdminEmployees(el){
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Team Members</div><div class="page-sub">Manage departments, roles, and member records</div></div>
      <button class="btn btn-accent" onclick="openAddEmployee()">+ Add member</button>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>ID</th><th>Member</th><th>Department</th><th>Role</th><th>Coins</th><th>Level</th><th>Penalties</th><th>Actions</th></tr></thead>
      <tbody>${employees.map(e=>{
        const rolePill=e.role==='admin'?`<span class="pill pill-accent">Admin</span>`:`<span class="pill pill-blue">Member</span>`;
        const pens=(e.penalties||[]).length;
        const strikeColor=pens>=3?'var(--red)':pens>=1?'var(--amber)':'var(--hint)';
        return`<tr>
          <td><span style="font-family:var(--mono);font-size:12px;color:var(--muted)">${esc(e.id)}</span></td>
          <td><div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:20px">${avEmoji(e)}</span>
            <strong>${esc(e.name)}</strong></div></td>
          <td>${esc(e.dept)}</td>
          <td>${rolePill}</td>
          <td><span style="font-family:var(--mono);font-weight:600;color:var(--accent)">${e.coins||0} 🪙</span> <span style="font-size:10px;color:var(--purple)">${e.rep||0} ⭐</span></td>
          <td><span class="pill pill-purple">Lv.${levelFor(e.rep||0)}</span></td>
          <td><span style="color:${strikeColor};font-weight:600">${pens} ${pens>0?'⚠️':''}</span></td>
          <td><div class="tbl-actions">
            <button class="ia" onclick="openEditEmployee('${e.id}')" title="Edit">✏️</button>
            <button class="ia danger" onclick="deleteEmployee('${e.id}')" title="Remove">🗑</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function renderAdminPenalties(el){
  const empList=employees.filter(e=>e.role==='employee');
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Penalty Panel</div><div class="page-sub">Issue and manage member warnings</div></div>
      <button class="btn btn-danger" onclick="openIssuePenalty()">⚠️ Issue penalty</button>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:1.5rem">
      ${Object.entries(PEN_LEVELS).map(([lv,cfg])=>{
        const total=employees.reduce((s,e)=>(e.penalties||[]).filter(p=>p.level==lv).length+s,0);
        const colors={1:'var(--amber)',2:'var(--orange)',3:'var(--red)'};
        return`<div class="stat" style="border-color:${colors[lv]}22">
          <div class="stat-val" style="color:${colors[lv]}">${total}</div>
          <div class="stat-lbl">${cfg.icon} ${cfg.label.split('—')[1].trim()}</div>
          <div class="stat-sub neu">${cfg.xp} XP per issue</div>
        </div>`;
      }).join('')}
    </div>
    ${empList.map(e=>{
      const pens=e.penalties||[];
      if(!pens.length)return'';
      return`<div style="margin-bottom:1rem">
        <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px;display:flex;align-items:center;gap:8px">
          <span style="font-size:18px">${avEmoji(e)}</span>${esc(e.name)} — ${pens.length} strike${pens.length>1?'s':''}
        </div>
        ${pens.map((p,i)=>{
          const cfg=PEN_LEVELS[p.level];
          const lvCls={1:'pen-lv1',2:'pen-lv2',3:'pen-lv3'}[p.level];
          return`<div class="pen-card">
            <div class="pen-level ${lvCls}">${cfg.icon}</div>
            <div class="pen-body">
              <div class="pen-title">${cfg.label}</div>
              <div class="pen-reason">${esc(p.reason)}</div>
              <div class="pen-meta">
                <span class="pill pill-muted">${cfg.xp} XP</span>
                <span style="font-size:10px;color:var(--hint)">${p.date}</span>
              </div>
            </div>
            <button class="ia danger" onclick="removePenalty('${e.id}',${i})" title="Remove penalty">🗑</button>
          </div>`;
        }).join('')}
      </div>`;
    }).join('')||'<div class="empty">No penalties issued yet. Keep the team clean! 🏅</div>'}`;
}

function openIssuePenalty(){
  $('pen-to').innerHTML=employees.filter(e=>e.role==='employee').map(e=>`<option value="${e.id}">${esc(e.name)}</option>`).join('');
  $('pen-reason').value='';
  $('pen-level').value='1';
  openModal('modal-penalty');
}

function issuePenalty(){
  const toId=$('pen-to').value;
  const level=parseInt($('pen-level').value);
  const reason=$('pen-reason').value.trim();
  if(!reason){toast('Please provide a reason.',false);return}
  const emp=employees.find(e=>e.id===toId);
  if(!emp)return;
  const cfg=PEN_LEVELS[level];
  if(!emp.penalties)emp.penalties=[];
  emp.penalties.push({level,reason,date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),xp:cfg.xp});
  emp.coins=Math.max(0,(emp.coins||0)+cfg.xp);
  if(currentUser&&currentUser.id===toId){currentUser.coins=emp.coins;updateTopbar();}
  closeModal('modal-penalty');
  pushNotif(emp.id,'⚠️',`You received a ${cfg.label} penalty: ${reason.slice(0,80)}. ${cfg.xp} XP deducted.`,'e-penalties');
  toast(`⚠️ ${cfg.icon} Penalty issued to ${emp.name}. ${cfg.xp} XP deducted.`,false);
  switchPanel('a-penalties');
}

function removePenalty(empId, idx){
  const emp=employees.find(e=>e.id===empId);
  if(!emp||!emp.penalties)return;
  const pen=emp.penalties[idx];
  if(!pen)return;
  emp.coins=(emp.coins||0)+Math.abs(pen.xp);// restore Coins
  emp.penalties.splice(idx,1);
  if(currentUser&&currentUser.id===empId){currentUser.coins=emp.coins;updateTopbar();}
  toast('Penalty removed. XP restored.');
  switchPanel('a-penalties');
}

function renderAdminTasks(el){
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Quest Board</div><div class="page-sub">Create and manage work items members can claim</div></div>
      <button class="btn btn-accent" onclick="openAddTask()">+ Create quest</button>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Quest</th><th>Category</th><th>XP</th><th>Difficulty</th><th>Duration</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody>${tasks.map(t=>{
        const cs=CAT_COLORS[t.cat]||CAT_COLORS.Work;
        const dc=DIFF_C[t.diff]||DIFF_C.Medium;
        const tl=timeLeft(t);
        const status=t.claimed
          ?`<div style="font-size:12px"><strong style="color:var(--text)">${esc(t.claimedBy)}</strong><br><span class="tl ${tl?.cls||'tl-ok'}">${tl?.label||'active'}</span></div>`
          :`<span class="pill pill-muted">Open</span>`;
        return`<tr>
          <td><div style="font-weight:500;font-size:13px">${esc(t.title)}</div><div style="font-size:11px;color:var(--muted)">${esc(t.desc.slice(0,45))}…</div></td>
          <td>${pill(t.cat,cs.bg,cs.fg)}</td>
          <td><span style="font-family:var(--mono);color:var(--accent);font-weight:600">+${t.pts} XP</span></td>
          <td>${pill(t.diff,dc.bg,dc.fg)}</td>
          <td><span style="font-size:12px;color:var(--muted)">${t.dur}d</span></td>
          <td>${status}</td>
          <td><div class="tbl-actions">
            <button class="ia" onclick="openEditTask(${t.id})">✏️</button>
            <button class="ia danger" onclick="deleteTask(${t.id})">🗑</button>
          </div></td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`;
}

function renderAdminShoutouts(el){
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">⭐ Shoutout Log</div><div class="page-sub">All recognition activity</div></div>
      <div style="display:flex;gap:8px">
        <button class="btn btn-ghost" onclick="openAttendanceModal()">🏅 Award Attendance</button>
        <button class="btn btn-accent" onclick="openModal('modal-shoutout');renderShoutoutModal()">⭐ Give shoutout</button>
      </div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>To</th><th>From</th><th>Achievement</th><th>Message</th><th>When</th></tr></thead>
      <tbody>${feed.map(f=>{const cs=CAT_COLORS[f.cat]||CAT_COLORS.Work;return`<tr>
        <td><strong>${esc(f.to)}</strong></td><td>${esc(f.from)}</td>
        <td>${pill(f.cat,cs.bg,cs.fg)}</td>
        <td><span style="font-size:12px;color:var(--muted)">${esc(f.msg.slice(0,60))}${f.msg.length>60?'…':''}</span></td>
        <td><span style="font-size:11px;color:var(--hint)">${f.time}</span></td>
      </tr>`}).join('')}</tbody>
    </table></div>`;
}

function renderAdminLeaderboard(el){
  const sorted=[...employees].filter(e=>e.role==='employee').sort((a,b)=>(b.coins||0)-(a.coins||0));
  const max=sorted[0]?(sorted[0].coins||0):1;
  const rk=['gold','silver','bronze','','',''];
  const rl=['🥇','🥈','🥉'];
  el.innerHTML=`<div class="page-hdr"><div><div class="page-title">🏆 Hall of Fame</div><div class="page-sub">XP ranking for ${fmtMonth('2026-04')}</div></div></div>
  ${sorted.map((e,i)=>{
    const pct=Math.round(((e.coins||0)/max)*100);
    const monthlyCoins=e.coins||0;
    const unl=benefits.filter(b=>monthlyCoins>=b.pts).length;
    return`<div class="lb-item">
      <div class="lb-rank ${rk[i]||''}">${i<3?rl[i]:i+1}</div>
      <div class="lb-av">${avEmoji(e)}</div>
      <div class="lb-info">
        <div class="lb-name">${esc(e.name)} <span style="font-size:11px;color:var(--muted)">${esc(e.dept)}</span>
          <span class="pill pill-purple" style="font-size:10px">Lv.${levelFor(e.rep||0)}</span>
          ${unl?`<span class="pill pill-green" style="font-size:10px">${unl} reward${unl>1?'s':''}</span>`:''}
        </div>
        <div class="lb-meta">${(e.badges||[]).slice(0,3).map(b=>pill(b,CAT_COLORS[b]?.bg||'rgba(160,160,160,.12)',CAT_COLORS[b]?.fg||'#A0A0A0')).join('')}</div>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${pct}%"></div></div>
      </div>
      <div><div class="lb-pts">${monthlyCoins}</div><div class="lb-pts-lbl">Coins</div></div>
    </div>`;
  }).join('')}`;
}

function renderAdminReports(el){
  const months=['2026-04',...Object.keys(monthlyArchive).sort().reverse()];
  const isLive=activeMonth==='2026-04';
  let data;
  if(isLive){
    const emps=employees.filter(e=>e.role==='employee');
    data={shoutouts:feed.length,tasks:tasks.filter(t=>t.claimed).length,benefits:benefits.reduce((s,b)=>s+b.claimedBy.length,0),topEarner:[...emps].sort((a,b)=>(b.coins||0)-(a.coins||0))[0]?.name||'—',totalPts:emps.reduce((s,e)=>s+(e.coins||0),0),members:emps.map(e=>({name:e.name,pts:e.coins||0,tasks:tasks.filter(t=>t.claimedById===e.id).length,benefits:benefits.filter(b=>b.claimedBy.includes(e.id)).length}))};
  }else data=monthlyArchive[activeMonth]||{shoutouts:0,tasks:0,benefits:0,topEarner:'—',totalPts:0,members:[]};
  const prev=monthlyArchive[months[months.indexOf(activeMonth)+1]];
  function chg(c,key){if(!prev)return'';const d=c-prev[key];return d===0?'':`<div class="stat-sub ${d>0?'up':'dn'}">${d>0?'↑':'↓'} ${Math.abs(d)}</div>`}
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">📈 Monthly reports</div><div class="page-sub">XP resets every month — full archive below</div></div>
      <button class="export-btn" onclick="exportCSV()">⬇ Export CSV</button>
    </div>
    <div class="report-months">${months.map(m=>`<button class="rm-chip${activeMonth===m?' on':''}" onclick="activeMonth='${m}';switchPanel('a-reports')">${fmtMonth(m)}${m==='2026-04'?' (live)':''}</button>`).join('')}</div>
    <div class="stats">
      <div class="stat"><div class="stat-val">${data.shoutouts}</div><div class="stat-lbl">Shoutouts</div>${chg(data.shoutouts,'shoutouts')}</div>
      <div class="stat"><div class="stat-val">${data.tasks}</div><div class="stat-lbl">Quests done</div>${chg(data.tasks,'tasks')}</div>
      <div class="stat"><div class="stat-val">${data.benefits}</div><div class="stat-lbl">Rewards claimed</div>${chg(data.benefits,'benefits')}</div>
      <div class="stat"><div class="stat-val">${data.totalPts}</div><div class="stat-lbl">Total XP</div>${chg(data.totalPts,'totalPts')}</div>
    </div>
    <div class="tbl-wrap"><table>
      <thead><tr><th>Player</th><th>XP earned</th><th>Quests claimed</th><th>Rewards redeemed</th></tr></thead>
      <tbody>${data.members.map(m=>`<tr><td><strong>${esc(m.name)}</strong></td><td style="font-family:var(--mono);font-weight:600;color:var(--accent)">${m.pts} XP</td><td>${m.tasks}</td><td>${m.benefits}</td></tr>`).join('')||'<tr><td colspan="4" style="text-align:center;padding:2rem;color:var(--hint)">No data.</td></tr>'}</tbody>
    </table></div>`;
}

// ══════════════════════════════════════════════════════
//  EMPLOYEE PANELS
// ══════════════════════════════════════════════════════
function renderEmpLeaderboard(el){
  const sorted=[...employees].filter(e=>e.role==='employee').sort((a,b)=>(b.coins||0)-(a.coins||0));
  const max=sorted[0]?(sorted[0].coins||0):1;
  const rk=['gold','silver','bronze','','',''];
  const rl=['🥇','🥈','🥉'];
  el.innerHTML=`<div class="page-hdr"><div><div class="page-title">🏆 Hall of Fame</div><div class="page-sub">${fmtMonth('2026-04')} — XP resets monthly. May the best warrior win!</div></div></div>
  ${sorted.map((e,i)=>{
    const pct=Math.round(((e.coins||0)/max)*100);
    const isMe=e.id===currentUser.id;
    const monthlyCoins=e.coins||0;
    const unl=benefits.filter(b=>monthlyCoins>=b.pts).length;
    return`<div class="lb-item" style="${isMe?'border-color:rgba(232,255,71,.25);':''}">
      <div class="lb-rank ${rk[i]||''}">${i<3?rl[i]:i+1}</div>
      <div class="lb-av">${avEmoji(e)}</div>
      <div class="lb-info">
        <div class="lb-name">${esc(e.name)}${isMe?'<span class="pill pill-accent" style="font-size:10px;margin-left:5px">You ⚡</span>':''}
          <span class="pill pill-purple" style="font-size:10px">Lv.${levelFor(e.rep||0)}</span>
          ${unl?`<span class="pill pill-green" style="font-size:10px;margin-left:4px">${unl} reward${unl>1?'s':''}</span>`:''}
        </div>
        <div class="lb-meta">${(e.badges||[]).slice(0,3).map(b=>pill(b,CAT_COLORS[b]?.bg||'rgba(160,160,160,.12)',CAT_COLORS[b]?.fg||'#A0A0A0')).join('')}</div>
        <div class="lb-bar-wrap"><div class="lb-bar" style="width:${pct}%"></div></div>
      </div>
      <div><div class="lb-pts">${monthlyCoins}</div><div class="lb-pts-lbl">Coins</div></div>
    </div>`;
  }).join('')}`;
}

function renderEmpFeed(el){
  el.innerHTML=`<div class="page-hdr"><div><div class="page-title">📣 Activity Feed</div><div class="page-sub">Latest power-ups across the guild</div></div></div>
  ${feed.map(f=>{const toEmp=employees.find(e=>e.name===f.to);const cs=CAT_COLORS[f.cat]||CAT_COLORS.Work;return`
    <div class="feed-item">
      <div class="fi-av">${toEmp?avEmoji(toEmp):'⭐'}</div>
      <div class="fi-body">
        <div class="fi-who"><strong>${esc(f.to)}</strong> got a power-up from ${esc(f.from)}</div>
        <div class="fi-msg">${esc(f.msg)}</div>
        <div class="fi-meta">${pill(f.cat,cs.bg,cs.fg)}<span class="pill pill-green" style="font-size:10px">+25 XP</span><span class="fi-time">${f.time}</span></div>
      </div>
    </div>`}).join('')||'<div class="empty">No activity yet. Be the first to fire a shoutout! 🚀</div>'}`;
}

function renderEmpTasks(el){
  const cats=['All',...new Set(tasks.map(t=>t.cat))];
  const filtered=activeTaskFilter==='All'?tasks:tasks.filter(t=>t.cat===activeTaskFilter);
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">⚔️ Quest Board</div><div class="page-sub">Claim quests to earn XP and level up!</div></div></div>
    <div class="section-row">
      <div class="chips">${cats.map(c=>`<button class="chip${activeTaskFilter===c?' on':''}" onclick="activeTaskFilter='${c}';switchPanel('e-tasks')">${c}</button>`).join('')}</div>
    </div>
    <div class="task-grid">${filtered.map(t=>{
      const cs=CAT_COLORS[t.cat]||CAT_COLORS.Work;
      const dc=DIFF_C[t.diff]||DIFF_C.Medium;
      const ps=PTC[t.pts]||{bg:'rgba(200,160,255,.12)',fg:'#C8A0FF'};
      const tl=timeLeft(t);
      const isMineClaim=t.claimedById===currentUser.id;
      const isOverdue=tl?.label==='Overdue';
      let footHtml;
      if(t.claimed){
        footHtml=`<div class="t-claim-info"><strong>${esc(t.claimedBy)}</strong> is on this quest${tl?`<span class="tl ${tl.cls}" style="margin-left:6px">${tl.label}</span>`:''}</div>
        <span class="t-btn done">🗡 In progress</span>`;
      }else{
        footHtml=`<div class="t-claim-info" style="color:var(--hint)">⏱ ${t.dur} day${t.dur>1?'s':''} to complete</div>
        <button class="t-btn" onclick="claimTask(${t.id})">⚔️ Accept quest</button>`;
      }
      return`<div class="task-card${t.claimed?' claimed':''}${isOverdue?' overdue':''}${isMineClaim?' my-claimed':''}">
        <div class="t-top"><div class="t-title">${esc(t.title)}</div><span class="pill" style="background:${ps.bg};color:${ps.fg};font-family:var(--mono);font-weight:600">+${t.pts} XP</span></div>
        <div class="t-desc">${esc(t.desc)}</div>
        <div class="t-meta">${pill(t.cat,cs.bg,cs.fg)}${pill(t.diff,dc.bg,dc.fg)}</div>
        <div class="t-foot">${footHtml}</div>
      </div>`;
    }).join('')||'<div class="empty" style="grid-column:1/-1">No quests here. Check another category!</div>'}</div>`;
}

function claimTask(id){
  const t=tasks.find(x=>x.id===id);
  if(!t||t.claimed)return;
  t.claimed=true;t.claimedBy=currentUser.name;t.claimedById=currentUser.id;t.claimedAt=new Date().toISOString();
  const diffCoins={Easy:15,Medium:30,Hard:60}[t.diff]||t.pts;
  const emp=employees.find(e=>e.id===currentUser.id);
  earnBoth(emp,diffCoins,diffCoins);
  updateTopbar();
  toast(`⚔️ Quest accepted! +${diffCoins} Coins & Rep earned. You have ${t.dur} day${t.dur>1?'s':''} to complete it!`);
  switchPanel('e-tasks');
}

function openClaimBenefit(id){
  const b=benefits.find(x=>x.id===id);if(!b)return;
  claimBenId=id;
  const bC=b.cost||b.pts;$('claim-ben-msg').textContent=`Purchasing "${b.name}" will use ${bC} Coins 🪙. You have ${currentUser.coins||0} Coins — after purchase: ${(currentUser.coins||0)-bC} Coins.`;
  openModal('modal-claim-ben');
}
function confirmClaimBenefit(){
  const b=benefits.find(x=>x.id===claimBenId);if(!b)return;
  const bCost=b.cost||b.pts;
  if((currentUser.coins||0)<bCost){toast('Not enough Coins! 🪙',false);closeModal('modal-claim-ben');return}
  currentUser.coins=(currentUser.coins||0)-bCost;
  const emp=employees.find(e=>e.id===currentUser.id);
  if(emp)emp.coins=currentUser.coins;
  b.claimedBy.push(currentUser.id);
  closeModal('modal-claim-ben');
  updateTopbar();
  toast(`🛒 "${b.name}" purchased! ${b.cost||b.pts} Coins spent. Enjoy! 🎉`);
  switchPanel('e-benefits');
}

function renderEmpShoutout(el){
  const others=employees.filter(e=>e.role==='employee'&&e.id!==currentUser.id);
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">Give Shoutout</div><div class="page-sub">Recognise a teammate for visible, helpful work.</div></div></div>
    <div class="shout-wrap"><div class="shout-card">
      <div style="background:rgba(232,255,71,.08);border:1px solid rgba(232,255,71,.15);border-radius:var(--r-sm);padding:10px 14px;margin-bottom:14px;font-size:12px;color:var(--muted)">
        <strong style="color:var(--accent)">Recognition tip:</strong> Keep it specific so teammates know what behavior to repeat.
      </div>
      <div class="f-row"><label>Who are you powering up?</label>
        <select id="emp-f-person">${others.map(e=>`<option value="${e.id}">${avEmoji(e)} ${esc(e.name)}</option>`).join('')}</select>
      </div>
      <div class="f-row"><label>Achievement unlocked</label>
        <select id="emp-f-cat"><option>Work excellence</option><option>Helped a teammate</option><option>Organised an event</option><option>Shared a great idea</option><option>Went above and beyond</option><option>Team spirit</option></select>
      </div>
      <div class="f-row"><label>What epic move did they pull?</label>
        <textarea id="emp-f-msg" placeholder="Tell the guild what they did and why it deserves recognition..."></textarea>
      </div>
      <button class="btn btn-accent btn-block" onclick="empSubmitShoutout()">🚀 Fire the power-up!</button>
    </div></div>`;
}

function empSubmitShoutout(){
  const toId=$('emp-f-person').value;
  const cat=$('emp-f-cat').value;
  const msg=$('emp-f-msg').value.trim();
  if(!msg){toast('Tell us what they did, warrior!',false);return}
  if(!canGiveShoutout(currentUser)){toast('You already gave your shoutout this week! One per week keeps it meaningful. 🎯',false);return}
  const toEmp=employees.find(e=>e.id===toId);
  const coinsBefore=toEmp?.coins||0;
  if(toEmp){
    earnBoth(toEmp,50,50);
    if(!toEmp.badges.includes(cat))toEmp.badges.push(cat);
  }
  // giver earns +5
  earnBoth(currentUser,5,5);
  const emp=employees.find(e=>e.id===currentUser.id);
  if(emp){emp.coins=currentUser.coins;emp.rep=currentUser.rep;}
  markShoutoutGiven(currentUser);
  const empSelf=employees.find(e=>e.id===currentUser.id);
  if(empSelf){empSelf.weeklyShoutouts=currentUser.weeklyShoutouts;empSelf.lastShoutoutWeek=currentUser.lastShoutoutWeek;}
  feed.unshift({from:currentUser.name,to:toEmp?.name||'',msg,cat,time:'Just now'});
  $('emp-f-msg').value='';
  updateTopbar();
  const newUnlocked=benefits.filter(b=>toEmp&&coinsBefore<b.cost&&(toEmp.coins||0)>=b.cost);
  if(toEmp) pushNotif(toEmp.id,'⭐',`${currentUser.name} gave you a shoutout for ${cat}! +50 🪙 +50 ⭐`,'e-leaderboard');
  toast(`🚀 Shoutout fired! +50 Coins & Rep to ${toEmp?.name}. You earned +5 too!`);
  switchPanel('e-leaderboard');
}

// ─── COMMUNITY TASKS ─────────────────────────────────
function renderEmpCommunity(el){
  const cats=['All',...new Set(communityTasks.map(t=>t.cat))];
  const filtered=activeCTaskFilter==='All'?communityTasks:communityTasks.filter(t=>t.cat===activeCTaskFilter);
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">🎯 Bounties</div><div class="page-sub">Post a task, fund it with Coins — a teammate claims it and earns the bounty.</div></div>
      <button class="btn btn-accent" onclick="openCommunityTask()">+ Post a quest</button>
    </div>
    <div style="background:rgba(90,180,255,.08);border:1px solid rgba(90,180,255,.15);border-radius:var(--r-sm);padding:11px 14px;margin-bottom:1rem;font-size:12px;color:var(--muted)">
      🤝 <strong style="color:var(--blue)">How it works:</strong> Any player can post a bounty and fund it with their own XP. Another player claims it, completes the task, and earns the bounty. The poster's XP is deducted when posted.
    </div>
    <div style="margin-bottom:1rem">
      <div class="chips">${cats.map(c=>`<button class="chip${activeCTaskFilter===c?' on':''}" onclick="activeCTaskFilter='${c}';switchPanel('e-community')">${c}</button>`).join('')}</div>
    </div>
    <div class="task-grid">${filtered.map(t=>{
      const cs=CAT_COLORS[t.cat]||CAT_COLORS.Help;
      const ps=PTC[t.pts]||{bg:'rgba(200,160,255,.12)',fg:'#C8A0FF'};
      const isMe=t.postedById===currentUser.id;
      const isMineClaim=t.claimedById===currentUser.id;
      const poster=employees.find(e=>e.id===t.postedById);
      let footHtml;
      if(isMe&&!t.claimed){
        footHtml=`<div class="t-claim-info" style="color:var(--purple)">📋 Your quest (awaiting hero)</div>
          <button class="t-btn" style="color:var(--red);border-color:rgba(255,90,90,.3)" onclick="cancelCommunityTask(${t.id})">Cancel</button>`;
      }else if(t.claimed){
        footHtml=`<div class="t-claim-info"><strong>${esc(t.claimedBy)}</strong> is on it!${isMineClaim?' (You 🫵)':''}</div>
          <span class="t-btn done">🗡 In progress</span>`;
      }else{
        footHtml=`<div class="t-claim-info" style="color:var(--hint)">🎯 Bounty available!</div>
          <button class="t-btn" onclick="claimCommunityTask(${t.id})">🤝 Take the quest</button>`;
      }
      return`<div class="ctask-card${isMe?' mine':''}">
        <div class="t-top"><div class="t-title">${esc(t.title)}</div><span class="pill" style="background:${ps.bg};color:${ps.fg};font-family:var(--mono);font-weight:600">+${t.pts} XP</span></div>
        <div class="t-desc">${esc(t.desc)}</div>
        <div class="ctask-owner">
          <span class="av-tiny">${poster?avEmoji(poster):'❓'}</span>
          Posted by <strong style="color:var(--text)">${esc(t.postedBy)}</strong>${isMe?' (you)':''}
          ${pill(t.cat,cs.bg,cs.fg)}
        </div>
        <div class="t-foot">${footHtml}</div>
      </div>`;
    }).join('')||`<div class="empty" style="grid-column:1/-1">No bounties yet! Be the first to post one and get help from a teammate. 🤝</div>`}</div>`;
}

function openCommunityTask(){
  $('ctask-modal-title').textContent='📋 Post a bounty';
  $('ct-title').value='';$('ct-desc').value='';$('ct-pts').value=20;$('ct-cat').value='Help';
  $('ct-balance-warn').style.display='none';
  openModal('modal-ctask');
  $('ct-pts').onchange=function(){
    const pts=parseInt(this.value);
    $('ct-balance-warn').style.display=( (currentUser.coins||0)<pts)?'block':'none';
  };
}

function saveCommunityTask(){
  const title=$('ct-title').value.trim();
  if(!title){toast('Quest needs a title!',false);return}
  const pts=parseInt($('ct-pts').value);
  if((currentUser.coins||0)<pts){toast('Not enough Coins to fund this bounty! 🪙',false);return}
  currentUser.coins=(currentUser.coins||0)-pts;
  const empCT=employees.find(e=>e.id===currentUser.id);
  if(empCT)empCT.coins=currentUser.coins;
  updateTopbar();
  communityTasks.unshift({
    id:nextCtaskId++,
    title,
    desc:$('ct-desc').value.trim()||'Help needed!',
    cat:$('ct-cat').value,
    pts,
    postedBy:currentUser.name,
    postedById:currentUser.id,
    claimed:false,claimedBy:'',claimedById:'',claimedAt:null,
    createdAt:new Date().toISOString()
  });
  closeModal('modal-ctask');
  toast(`🤝 Quest posted! ${pts} XP held as bounty. A hero will come!`);
  switchPanel('e-community');
}

function claimCommunityTask(id){
  const t=communityTasks.find(x=>x.id===id);
  if(!t||t.claimed||t.postedById===currentUser.id)return;
  t.claimed=true;t.claimedBy=currentUser.name;t.claimedById=currentUser.id;t.claimedAt=new Date().toISOString();
  toast(`🤝 Quest accepted! Help ${esc(t.postedBy)} and earn ${t.pts} XP!`);
  // note: XP is awarded when the poster marks it done — for now we auto-award
  const empCC=employees.find(e=>e.id===currentUser.id);
  earnBoth(empCC,t.pts,t.pts);
  updateTopbar();
  switchPanel('e-community');
}

function cancelCommunityTask(id){
  const t=communityTasks.find(x=>x.id===id);
  if(!t||t.claimed)return;
  communityTasks=communityTasks.filter(x=>x.id!==id);
  const empRefund=employees.find(e=>e.id===currentUser.id);
  if(empRefund){empRefund.coins=(empRefund.coins||0)+t.pts;currentUser.coins=empRefund.coins;}
  updateTopbar();
  toast('Quest cancelled. XP refunded.');
  switchPanel('e-community');
}

// ─── LOTTERY ─────────────────────────────────────────
function renderEmpLottery(el){
  const MULT_CONFIG=[
    {mult:0,  prob:0.6, label:'No win',  emoji:'💨'},
    {mult:1,  prob:0.2, label:'1× back', emoji:'🔄'},
    {mult:2,  prob:0.15,label:'2× win',  emoji:'💰'},
    {mult:3,  prob:0.05,label:'3× win',  emoji:'🔥'},
  ];
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">🎰 Fortune Wheel</div><div class="page-sub">Spend your XP and test your luck — 1 in 10 chance to win big!</div></div></div>
    <div class="lottery-wrap">
      <div class="lottery-card">
        <div style="font-size:13px;color:var(--muted);margin-bottom:1rem">Your Coins: <strong style="color:var(--accent);font-family:var(--mono)" id="lot-bal">${currentUser.coins||0} 🪙</strong></div>
        <div class="reel-wrap">
          <div class="reel" id="reel0">🎲</div>
          <div class="reel" id="reel1">🎲</div>
          <div class="reel" id="reel2">🎲</div>
        </div>

        <div style="font-size:12px;color:var(--muted);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Choose your bet</div>
        <div class="bet-btns">
          <button class="bet-btn${selectedBet===10?' active':''}" onclick="setBet(10)">10 XP</button>
          <button class="bet-btn${selectedBet===20?' active':''}" onclick="setBet(20)">20 XP</button>
          <button class="bet-btn${selectedBet===50?' active':''}" onclick="setBet(50)">50 XP</button>
        </div>

        <div class="mult-grid">
          ${MULT_CONFIG.map(m=>`<div class="mult-card">
            <div style="font-size:20px">${m.emoji}</div>
            <div class="mult-val" style="color:${m.mult===0?'var(--hint)':m.mult===3?'var(--accent)':'var(--text)'}">${m.mult===0?'Bust':m.mult+'×'}</div>
            <div class="mult-prob">${Math.round(m.prob*100)}% chance</div>
          </div>`).join('')}
        </div>

        <button class="btn btn-accent btn-block" id="spin-btn" onclick="doSpin()" style="margin-bottom:1rem">🎰 Spin the Fortune Wheel!</button>
        <div class="lottery-result" id="lot-result"></div>
      </div>

      <div class="spin-hist" id="spin-hist-wrap">
        <div style="font-size:13px;font-weight:600;margin-bottom:8px">📜 Spin history</div>
        ${lotterySpinHistory.length===0?'<div class="empty" style="padding:1rem">No spins yet. Go for it! 🎯</div>':
          lotterySpinHistory.slice(0,10).map(s=>`<div class="sh-item">
            <span>${s.win?'✅':'❌'}</span>
            <span>Bet <strong style="color:var(--accent)">${s.bet} XP</strong></span>
            <span>${s.win?`+${s.earned} XP (${s.mult}×)`:'-'+s.bet+' XP (bust)'}</span>
            <span style="margin-left:auto;color:var(--hint)">${s.time}</span>
          </div>`).join('')}
      </div>
    </div>`;
}

function setBet(val){
  selectedBet=val;
  switchPanel('e-lottery');
}

function doSpin(){
  if((currentUser.coins||0)<selectedBet){toast('Not enough Coins to bet! 🪙',false);return}
  const MULT_CONFIG=[
    {mult:0,  prob:0.6, emojis:['💨','❌','😤']},
    {mult:1,  prob:0.2, emojis:['🔄','💫','⚡']},
    {mult:2,  prob:0.15,emojis:['💰','🎯','🌟']},
    {mult:3,  prob:0.05,emojis:['🔥','👑','💎']},
  ];
  const r0=$('reel0'),r1=$('reel1'),r2=$('reel2'),btn=$('spin-btn'),res=$('lot-result');
  btn.disabled=true;btn.textContent='Spinning...';
  [r0,r1,r2].forEach(r=>r.classList.add('spinning'));
  res.className='lottery-result';res.textContent='';

  setTimeout(()=>{
    // Pick outcome
    const rand=Math.random();
    let cumulative=0;
    let chosen=MULT_CONFIG[0];
    for(const cfg of MULT_CONFIG){cumulative+=cfg.prob;if(rand<cumulative){chosen=cfg;break;}}

    const em0=chosen.emojis[Math.floor(Math.random()*chosen.emojis.length)];
    const em1=chosen.emojis[Math.floor(Math.random()*chosen.emojis.length)];
    const em2=chosen.emojis[Math.floor(Math.random()*chosen.emojis.length)];

    [r0,r1,r2].forEach(r=>r.classList.remove('spinning'));
    r0.textContent=em0;r1.textContent=em1;r2.textContent=em2;

    const won=chosen.mult>0;
    const earned=Math.floor(selectedBet*chosen.mult);

    if(won){
      currentUser.coins=(currentUser.coins||0)+earned-selectedBet;
      [r0,r1,r2].forEach(r=>r.classList.add('win'));
      res.className='lottery-result win';
      if(chosen.mult===3)res.textContent=`🏆 JACKPOT! You won ${earned} XP! (${chosen.mult}×)`;
      else if(chosen.mult===2)res.textContent=`🎉 Winner! You doubled up: +${earned-selectedBet} XP!`;
      else res.textContent=`🔄 Break even! Got your ${selectedBet} XP back.`;
    }else{
      currentUser.coins=(currentUser.coins||0)-selectedBet;
      res.className='lottery-result lose';
      res.textContent=`💨 Bust! Lost ${selectedBet} XP. Try again, warrior!`;
    }

    const empSpin=employees.find(e=>e.id===currentUser.id);
    if(empSpin)empSpin.coins=currentUser.coins;
    updateTopbar();
    $('lot-bal').textContent=(currentUser.coins||0)+' 🪙';

    lotterySpinHistory.unshift({bet:selectedBet,mult:chosen.mult,win:won,earned:won?earned:0,time:'Just now'});
    btn.disabled=false;btn.textContent='🎰 Spin the Fortune Wheel!';

    setTimeout(()=>{
      [r0,r1,r2].forEach(r=>r.classList.remove('win'));
    },3000);
  },1200);
}

// ─── PENALTIES (employee view) ───────────────────────
function renderEmpPenalties(el){
  const pens=currentUser.penalties||[];
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">My Penalties</div><div class="page-sub">Warnings or penalties issued by admins</div></div></div>
    ${pens.length===0?`
      <div style="background:rgba(79,255,176,.06);border:1px solid rgba(79,255,176,.15);border-radius:var(--r-lg);padding:2rem;text-align:center">
        <div style="font-size:36px;margin-bottom:8px">🏅</div>
        <div style="font-size:15px;font-weight:600;color:var(--green)">Clean record!</div>
        <div style="font-size:12px;color:var(--muted);margin-top:4px">No strikes on your account. Keep it up, champion!</div>
      </div>
    `:pens.map(p=>{
      const cfg=PEN_LEVELS[p.level];
      const lvCls={1:'pen-lv1',2:'pen-lv2',3:'pen-lv3'}[p.level];
      return`<div class="pen-card">
        <div class="pen-level ${lvCls}">${cfg.icon}</div>
        <div class="pen-body">
          <div class="pen-title">${cfg.label}</div>
          <div class="pen-reason">${esc(p.reason)}</div>
          <div class="pen-meta">
            <span class="pill pill-muted">${cfg.xp} XP deducted</span>
            <span style="font-size:10px;color:var(--hint)">${p.date}</span>
          </div>
        </div>
      </div>`;
    }).join('')}
    <div style="margin-top:1.5rem;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-md);padding:1rem">
      <div style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:8px;text-transform:uppercase;letter-spacing:.4px">Penalty Scale</div>
      ${Object.entries(PEN_LEVELS).map(([lv,cfg])=>`
        <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">
          <span style="font-size:18px">${cfg.icon}</span>
          <div style="flex:1"><div style="font-size:12px;font-weight:500">${cfg.label}</div><div style="font-size:11px;color:var(--muted)">${cfg.desc}</div></div>
          <span class="pill pill-muted" style="font-family:var(--mono)">${cfg.xp} XP</span>
        </div>`).join('')}
    </div>`;
}

// ─── GAME RULES ───────────────────────────────────────
function renderEmpRules(el){
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">Guidelines</div><div class="page-sub">How recognition, rewards, and monthly points work</div></div></div>
    <div class="terms-body">

      <div class="terms-section">
        <div class="terms-h">🎮 <span class="t-num">01</span> Welcome to Linknbit War Room</div>
        <ul class="terms-list">
          <li>Linknbit War Room is a <strong>gamified recognition and productivity platform</strong> for our team.</li>
          <li>Every action you take earns you <strong>XP (experience points)</strong>, which you can spend on real rewards.</li>
          <li>The system runs on <strong>monthly cycles</strong>. XP resets every month, so the leaderboard is always competitive.</li>
          <li>All members start fresh each month — past performance doesn't carry over, only lessons do.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">⚡ <span class="t-num">02</span> Earning XP</div>
        <ul class="terms-list">
          <li><strong>Receiving a Shoutout:</strong> +25 XP per shoutout you receive from a teammate or admin.</li>
          <li><strong>Completing a Quest:</strong> +10 to +50 XP depending on quest difficulty and duration.</li>
          <li><strong>Bounty (Claiming):</strong> Earn the bounty XP posted by your teammate when you help them.</li>
          <li><strong>Fortune Wheel wins:</strong> Spin and multiply your bet — max 3× your bet on a lucky spin.</li>
          <li>XP is awarded in real-time and reflected immediately on the leaderboard.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">⚔️ <span class="t-num">03</span> Quests (Tasks)</div>
        <ul class="terms-list">
          <li>Quests are posted by <strong>admins</strong> and are available to all members.</li>
          <li>Each quest has a <strong>difficulty level</strong> (Easy, Medium, Hard) and a <strong>time limit</strong>.</li>
          <li>Once you <strong>accept a quest</strong>, it is yours alone — others cannot claim it.</li>
          <li>Complete your quest within the deadline. <strong>Overdue quests</strong> are flagged in red — finish ASAP.</li>
          <li>XP is awarded on quest completion. Do not claim quests you cannot realistically finish.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">🤝 <span class="t-num">04</span> Bounties</div>
        <ul class="terms-list">
          <li>Any member can post a request to get help from a teammate.</li>
          <li>When you post, you <strong>fund the bounty from your own XP</strong>. The XP is deducted immediately.</li>
          <li>Another member can claim your request and earns the bounty on completion.</li>
          <li>You can cancel a quest you posted (if unclaimed) and get your XP refunded.</li>
          <li>Do not post requests that are inappropriate, offensive, or outside working hours.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">🎰 <span class="t-num">05</span> Fortune Wheel (Lottery)</div>
        <ul class="terms-list">
          <li>The Fortune Wheel lets you <strong>bet XP</strong> for a chance to multiply it.</li>
          <li>Available bet amounts: <strong>10, 20, or 50 XP</strong>.</li>
          <li>Possible outcomes: <strong>Bust (0×)</strong>, Break even (1×), Double (2×), or Triple (3×) your bet.</li>
          <li>Odds: 60% bust · 20% break-even · 15% double · 5% triple.</li>
          <li>The Fortune Wheel is purely for fun. Do not bet XP you cannot afford to lose.</li>
          <li>The wheel outcome is random and cannot be influenced or predicted.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">⭐ <span class="t-num">06</span> Shoutouts</div>
        <ul class="terms-list">
          <li>Shoutouts are <strong>public recognition messages</strong> given to teammates for doing something great.</li>
          <li>You can give a shoutout to <strong>any colleague except yourself</strong>.</li>
          <li>Shoutouts must be <strong>genuine and work-related</strong>. Spam or fake shoutouts are not allowed.</li>
          <li>The recipient earns <strong>+25 XP</strong> and an achievement badge on their profile.</li>
          <li>Admins may remove shoutouts that are inappropriate.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">🎁 <span class="t-num">07</span> Rewards Shop</div>
        <ul class="terms-list">
          <li>Accumulated XP can be <strong>redeemed for real perks</strong> listed in the Reward Shop.</li>
          <li>Each reward has an <strong>XP cost and a frequency</strong> (Monthly, Quarterly, etc.). You may only redeem each once per frequency period.</li>
          <li>Rewards are <strong>approved and fulfilled by admins</strong>. Redemption is a formal request.</li>
          <li>XP spent on rewards is <strong>permanently deducted</strong>. Redemptions are non-reversible.</li>
          <li>Availability of rewards is subject to change. Admins may add, remove, or modify rewards at any time.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">⚠️ <span class="t-num">08</span> Penalties & Strikes</div>
        <ul class="terms-list">
          <li>Penalties are issued by <strong>admins only</strong> for rule violations or performance concerns.</li>
          <li><strong>Level 1 (Minor Warning):</strong> −10 XP. Issued for minor infractions like late tasks or minor misconduct.</li>
          <li><strong>Level 2 (Formal Warning):</strong> −25 XP. Issued for repeated violations or more serious issues.</li>
          <li><strong>Level 3 (Severe Strike):</strong> −50 XP. Reserved for serious misconduct or repeated Level 2 violations.</li>
          <li>Members can view their own penalties under <strong>Penalties</strong> in the sidebar.</li>
          <li>Penalties may be removed by admins if resolved or issued in error.</li>
          <li>Receiving 3 or more penalties in a month may have consequences beyond the platform.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">🏆 <span class="t-num">09</span> Levels & Titles</div>
        <ul class="terms-list">
          <li>Your <strong>Level</strong> is calculated from your total XP: every 100 XP = 1 level.</li>
          <li>Levels are visible on the leaderboard and your profile.</li>
          <li>Titles and avatar frames are cosmetic — they do not affect gameplay or reward eligibility.</li>
          <li>The leaderboard shows your <strong>relative rank</strong> against all active members this month.</li>
        </ul>
      </div>

      <div class="terms-section">
        <div class="terms-h">📋 <span class="t-num">10</span> General Rules</div>
        <ul class="terms-list">
          <li>All activity on this platform is <strong>visible to admins</strong>.</li>
          <li>Attempts to <strong>game the system</strong> (fake completions, collusion, exploiting bugs) will result in penalties and potential removal.</li>
          <li>Treat every feature of this platform with the same <strong>professionalism</strong> you bring to your work.</li>
          <li>Admins reserve the right to adjust rules, rewards, and penalties at any time.</li>
          <li>This platform is for fun and motivation — enjoy it, compete hard, and lift your team up. 💪</li>
        </ul>
      </div>

      <div style="background:rgba(232,255,71,.06);border:1px solid rgba(232,255,71,.15);border-radius:var(--r-md);padding:1rem 1.25rem;text-align:center">
        <div style="font-size:13px;color:var(--muted)">By using Linknbit War Room, you agree to play fair, support your team, and have fun.</div>
        <div style="font-size:11px;color:var(--hint);margin-top:4px">Last updated: April 2026 · Admins can update rules at any time.</div>
      </div>
    </div>`;
}

// ─── PROFILE ─────────────────────────────────────────
function renderEmpProfile(el){
  const e=currentUser;
  const myTasks=tasks.filter(t=>t.claimedById===e.id);
  const myBen=benefits.filter(b=>b.claimedBy.includes(e.id));
  const rank=[...employees].filter(x=>x.role==='employee').sort((a,b)=>(b.coins||0)-(a.coins||0)).findIndex(x=>x.id===e.id)+1;
  const myShouts=feed.filter(f=>f.to===e.name).length;
  const givenShouts=feed.filter(f=>f.from===e.name).length;
  const streak=[1,1,1,0,1,1,0];
  const myPens=(e.penalties||[]).length;
  const activity=[
    ...feed.filter(f=>f.to===e.name).slice(0,3).map(f=>({txt:`Received power-up from <strong>${esc(f.from)}</strong>: ${esc(f.msg.slice(0,40))}…`,time:f.time})),
    ...myTasks.slice(0,2).map(t=>{const tl=timeLeft(t);return{txt:`Accepted quest: <strong>${esc(t.title)}</strong>${tl?` — ${tl.label}`:''}`,time:'recently'}}),
    ...myBen.slice(0,2).map(b=>({txt:`Redeemed reward: <strong>${esc(b.name)}</strong>`,time:'this month'})),
  ].slice(0,6);

  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">🎮 My Profile</div><div class="page-sub">${fmtMonth('2026-04')}</div></div>
      <button class="btn btn-ghost" onclick="openAvatarModal()">🎭 Change avatar</button>
    </div>
    <div class="profile-grid">
      <div class="profile-card">
        <div class="p-av" style="border-color:var(--accent)" id="profile-av">${avEmoji(e)}</div>
        <div class="p-name">${esc(e.name)}</div>
        <div class="p-dept">${esc(e.dept)} · Rank #${rank}</div>
        <div style="font-family:var(--mono);font-size:11px;color:var(--hint)">${esc(e.id)}</div>
        <div style="display:flex;gap:6px;align-items:center;margin-top:4px">
          <span class="pill pill-purple">Lv.${levelFor(e.rep||0)}</span>
          ${myPens>0?`<span class="pill pill-amber">${myPens} strike${myPens>1?'s':''}</span>`:'<span class="pill pill-green">Clean ✓</span>'}
        </div>
        <div style="display:flex;gap:14px;justify-content:center;width:100%;margin:4px 0">
          <div style="text-align:center">
            <div class="p-pts" style="font-size:28px;color:var(--accent)">${e.coins||0}</div>
            <div class="p-pts-lbl">🪙 Coins</div>
          </div>
          <div style="text-align:center">
            <div class="p-pts" style="font-size:28px;color:var(--purple)">${e.rep||0}</div>
            <div class="p-pts-lbl">⭐ Rep</div>
          </div>
        </div>
        <div style="width:100%">
          <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:3px">
            <span>Level ${levelFor(e.rep||0)}</span><span>${(e.rep||0)%200}/200 Rep to next</span>
          </div>
          <div style="height:5px;background:var(--bg3);border-radius:5px;overflow:hidden">
            <div style="height:100%;width:${repPctFor(e.rep||0)}%;background:linear-gradient(90deg,var(--purple),var(--accent));border-radius:5px;transition:width .6s"></div>
          </div>
        </div>
        <div class="p-stats">
          <div class="pst"><div class="pst-v">${myShouts}</div><div class="pst-l">Power-ups rx</div></div>
          <div class="pst"><div class="pst-v">${givenShouts}</div><div class="pst-l">Given</div></div>
          <div class="pst"><div class="pst-v">${myTasks.length}</div><div class="pst-l">Quests</div></div>
          <div class="pst"><div class="pst-v">${myBen.length}</div><div class="pst-l">Rewards</div></div>
        </div>
        <div style="width:100%;text-align:left">
          <div style="font-size:10px;color:var(--muted);margin-bottom:5px;font-weight:600;text-transform:uppercase;letter-spacing:.4px">7-day quest streak</div>
          <div class="streak-row">${streak.map((d,i)=>`<div class="streak-dot ${d?'done':''}">${['M','T','W','T','F','S','S'][i]}</div>`).join('')}</div>
        </div>
      </div>
      <div class="p-right">
        <div class="p-section">
          <div class="p-sec-title">🏅 Achievement badges</div>
          <div style="display:flex;flex-wrap:wrap;gap:5px">${(e.badges||[]).map(b=>{const cs=CAT_COLORS[b]||{bg:'rgba(160,160,160,.12)',fg:'#A0A0A0'};return`<span class="pill" style="background:${cs.bg};color:${cs.fg};font-size:12px;padding:3px 10px">${esc(b)}</span>`}).join('')||'<span style="font-size:12px;color:var(--hint)">No badges yet — complete quests!</span>'}</div>
        </div>
        <div class="p-section">
          <div class="p-sec-title">⚔️ Active quests</div>
          ${myTasks.length?myTasks.map(t=>{const tl=timeLeft(t);const ps=PTC[t.pts]||{bg:'rgba(200,160,255,.12)',fg:'#C8A0FF'};return`<div style="display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid var(--border)"><span style="font-size:13px;flex:1">${esc(t.title)}</span><span class="pill" style="background:${ps.bg};color:${ps.fg};font-family:var(--mono)">+${t.pts} XP</span>${tl?`<span class="tl ${tl.cls}">${tl.label}</span>`:''}</div>`}).join(''):`<div style="font-size:12px;color:var(--hint)">No quests active. Hit the Quest Board! ⚔️</div>`}
        </div>
        <div class="p-section">
          <div class="p-sec-title">🎁 Redeemed rewards</div>
          ${myBen.length?myBen.map(b=>{const c=BEN_COLORS[b.color]||BEN_COLORS.green;return`<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)"><span style="font-size:17px">${b.icon}</span><span style="font-size:13px;flex:1">${esc(b.name)}</span><span class="pill" style="background:${c.bg};color:${c.fg};font-family:var(--mono)">${b.cost||b.pts} 🪙</span></div>`}).join(''):`<div style="font-size:12px;color:var(--hint)">No rewards redeemed yet. Earn more Coins! 🪙</div>`}
        </div>
        <div class="p-section">
          <div class="p-sec-title">📜 Recent activity</div>
          ${activity.length?activity.map(a=>`<div class="act-row"><div class="act-dot"></div><div class="act-txt">${a.txt}</div><div class="act-time">${a.time}</div></div>`).join(''):'<div style="font-size:12px;color:var(--hint)">No activity yet. Go do something epic! 🚀</div>'}
        </div>
      </div>
    </div>`;
}

// ─── AVATAR MODAL ─────────────────────────────────────
function openAvatarModal(){
  tempAvatarIdx=AVATARS.indexOf(currentUser.avEmoji)||currentUser.avIdx||0;
  const grid=$('av-grid-options');
  grid.innerHTML=AVATARS.map((em,i)=>`<div class="av-opt${em===currentUser.avEmoji?' selected':''}" onclick="selectAvatar(${i})">${em}</div>`).join('');
  openModal('modal-avatar');
}
function selectAvatar(idx){
  tempAvatarIdx=idx;
  document.querySelectorAll('.av-opt').forEach((el,i)=>el.classList.toggle('selected',i===idx));
}
function saveAvatar(){
  const emoji=AVATARS[tempAvatarIdx];
  currentUser.avEmoji=emoji;
  currentUser.avIdx=tempAvatarIdx;
  const emp=employees.find(e=>e.id===currentUser.id);
  if(emp){emp.avEmoji=emoji;emp.avIdx=tempAvatarIdx;}
  $('tb-av').textContent=emoji;
  closeModal('modal-avatar');
  toast('🎭 Avatar updated! Looking good, warrior!');
  switchPanel('e-profile');
}

// ══════════════════════════════════════════════════════
//  ADMIN CRUD ACTIONS
// ══════════════════════════════════════════════════════

function openAddEmployee(){
  editEmpId=null;
  $('emp-modal-title').textContent='Add team member';
  ['e-first','e-last','e-pass'].forEach(i=>$(i).value='');
  $('e-dept').value='Engineering';$('e-role').value='employee';
  $('e-id-display').textContent='Member ID will be auto-generated';
  openModal('modal-emp');
}
function openEditEmployee(id){
  const e=employees.find(x=>x.id===id);if(!e)return;
  editEmpId=id;
  $('emp-modal-title').textContent='Edit member';
  const parts=e.name.split(' ');
  $('e-first').value=parts[0]||'';$('e-last').value=parts.slice(1).join(' ')||'';
  $('e-dept').value=e.dept;$('e-role').value=e.role;$('e-pass').value='';
  $('e-id-display').textContent=`Member ID: ${e.id}`;
  openModal('modal-emp');
}
function saveEmployee(){
  const first=$('e-first').value.trim(),last=$('e-last').value.trim();
  const dept=$('e-dept').value,role=$('e-role').value;
  if(!first||!last){toast('Name is required.',false);return}
  if(editEmpId){
    const e=employees.find(x=>x.id===editEmpId);
    if(e){Object.assign(e,{name:first+' '+last,dept,role});}
    toast('Member updated.');
  }else{
    const id=genId(role);
    const defaultEmoji=AVATARS[employees.length%AVATARS.length];
    employees.push({id,name:first+' '+last,role,dept,coins:0,rep:0,badges:[],avIdx:employees.length%AVATARS.length,avEmoji:defaultEmoji,penalties:[],streak:0,lastStandup:null,weeklyShoutouts:0,lastShoutoutWeek:null});
    toast(`${first} added. ID: ${id}`);
  }
  closeModal('modal-emp');switchPanel('a-employees');
}
function deleteEmployee(id){
  const e=employees.find(x=>x.id===id);if(!e)return;
  deleteAction=()=>{employees=employees.filter(x=>x.id!==id);switchPanel('a-employees');toast('Member removed.');};
  $('del-modal-title').textContent='Remove member?';
  $('del-modal-msg').textContent=`This will permanently remove ${e.name} from the roster.`;
  openModal('modal-delete');
}

function openAddTask(){
  editTaskId=null;$('task-modal-title').textContent='Create quest';
  ['t-title','t-desc'].forEach(i=>$(i).value='');
  $('t-cat').value='Work';$('t-pts').value=20;$('t-diff').value='Medium';$('t-dur').value=3;
  openModal('modal-task');
}
function openEditTask(id){
  const t=tasks.find(x=>x.id===id);if(!t)return;
  editTaskId=id;$('task-modal-title').textContent='Edit quest';
  $('t-title').value=t.title;$('t-desc').value=t.desc;
  $('t-cat').value=t.cat;$('t-pts').value=t.pts;$('t-diff').value=t.diff;$('t-dur').value=t.dur;
  openModal('modal-task');
}
function saveTask(){
  const title=$('t-title').value.trim();
  if(!title){toast('Quest title is required.',false);return}
  const data={title,desc:$('t-desc').value.trim()||'Complete this quest.',cat:$('t-cat').value,pts:parseInt($('t-pts').value),diff:$('t-diff').value,dur:parseInt($('t-dur').value)};
  if(editTaskId){Object.assign(tasks.find(x=>x.id===editTaskId),data);toast('Quest updated!');}
  else{tasks.push({id:nextTaskId++,...data,claimed:false,claimedBy:'',claimedById:'',claimedAt:null});toast('⚔️ Quest posted!');}
  closeModal('modal-task');switchPanel('a-tasks');
}
function deleteTask(id){
  deleteAction=()=>{tasks=tasks.filter(x=>x.id!==id);switchPanel('a-tasks');toast('Quest deleted.');};
  $('del-modal-title').textContent='Delete quest?';
  $('del-modal-msg').textContent='This will permanently remove the quest.';
  openModal('modal-delete');
}

function openAddBenefit(){
  editBenId=null;$('ben-modal-title').textContent='Add reward';
  ['b-name','b-desc','b-pts','b-icon'].forEach(i=>$(i).value='');
  $('b-color').value='green';$('b-freq').value='Monthly';
  openModal('modal-benefit');
}
function openEditBenefit(id){
  const b=benefits.find(x=>x.id===id);if(!b)return;
  editBenId=id;$('ben-modal-title').textContent='Edit reward';
  $('b-name').value=b.name;$('b-desc').value=b.desc;$('b-pts').value=b.pts;
  $('b-icon').value=b.icon;$('b-color').value=b.color;$('b-freq').value=b.freq;
  openModal('modal-benefit');
}
function saveBenefit(){
  const name=$('b-name').value.trim(),pts=parseInt($('b-pts').value);
  if(!name){toast('Name required.',false);return}if(!pts){toast('XP cost required.',false);return}
  const data={name,desc:$('b-desc').value.trim()||'Complete quests to earn this.',pts,icon:$('b-icon').value.trim()||'🎁',color:$('b-color').value,freq:$('b-freq').value};
  if(editBenId){Object.assign(benefits.find(x=>x.id===editBenId),data);toast('Reward updated!');}
  else{benefits.push({id:nextBenId++,...data,claimedBy:[]});toast('🎁 Reward added to shop!');}
  closeModal('modal-benefit');switchPanel('a-benefits');
}
function deleteBenefit(id){
  deleteAction=()=>{benefits=benefits.filter(x=>x.id!==id);switchPanel('a-benefits');toast('Reward removed.');};
  $('del-modal-title').textContent='Delete reward?';
  $('del-modal-msg').textContent='This will permanently remove this reward.';
  openModal('modal-delete');
}
function confirmDeleteAction(){if(deleteAction){deleteAction();deleteAction=null;}closeModal('modal-delete');}

function renderShoutoutModal(){
  $('ms-to').innerHTML=employees.filter(e=>e.role==='employee').map(e=>`<option value="${e.id}">${avEmoji(e)} ${esc(e.name)}</option>`).join('');
}
function adminGiveShoutout(){
  const toId=$('ms-to').value,cat=$('ms-cat').value,msg=$('ms-msg').value.trim();
  if(!msg){toast('Message required.',false);return}
  const toEmp=employees.find(e=>e.id===toId);
  if(toEmp){earnBoth(toEmp,75,75);if(!toEmp.badges.includes(cat))toEmp.badges.push(cat);}
  feed.unshift({from:currentUser.name,to:toEmp?.name||'',msg,cat,time:'Just now'});
  $('ms-msg').value='';
  closeModal('modal-shoutout');
  if(toEmp) pushNotif(toEmp.id,'⭐',`${currentUser.name} gave you a shoutout for ${cat}! +75 🪙 +75 ⭐`,'e-leaderboard');
  toast(`⭐ Shoutout fired! +75 Coins & Rep to ${toEmp?.name}!`);
  switchPanel('a-shoutouts');
}

// ══════════════════════════════════════════════════════
//  SHOP (replaces old benefits render for both admin & employee)
// ══════════════════════════════════════════════════════
const SHOP_CATS=['All','Leave','Food','Remote','Learning','Bonus'];
const SHOP_RARITY=['common','common','rare','common','epic','legendary'];
const RARITY_LABELS=['Common','Common','Rare','Common','Epic','Legendary'];
let activeShopCat='All';

function getBenefitRarity(b){
  if(b.pts>=400)return'legendary';
  if(b.pts>=300)return'epic';
  if(b.pts>=200)return'rare';
  return'common';
}
function getBenefitCategory(b){
  const n=b.name.toLowerCase();
  if(n.includes('leave')||n.includes('remote')||n.includes('home'))return'Remote';
  if(n.includes('lunch')||n.includes('food'))return'Food';
  if(n.includes('learn')||n.includes('course')||n.includes('budget'))return'Learning';
  if(n.includes('bonus')||n.includes('cash'))return'Bonus';
  return'Leave';
}
function getBenefitBannerColor(b){
  const c=BEN_COLORS[b.color]||BEN_COLORS.green;
  return`background:${c.bg};color:${c.fg}`;
}

function renderEmpBenefitsShop(el){
  const isAdmin=currentUser.role==='admin';
  const my=currentUser.coins||0;
  const filtered=activeShopCat==='All'?benefits:benefits.filter(b=>getBenefitCategory(b)===activeShopCat);
  const affordable=benefits.filter(b=>(b.cost||b.pts)<=my&&!b.claimedBy.includes(currentUser.id)).length;
  const owned=benefits.filter(b=>b.claimedBy.includes(currentUser.id)).length;
  const nextReward=[...benefits].filter(b=>!b.claimedBy.includes(currentUser.id)).sort((a,b)=>(a.cost||a.pts)-(b.cost||b.pts)).find(b=>(b.cost||b.pts)>my);

  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Rewards</div><div class="page-sub">Redeem coins for workplace perks and benefits.</div></div>
      ${isAdmin?`<button class="btn btn-accent" onclick="openAddBenefit()">+ Add item</button>`:''}
    </div>

    <div class="shop-hero">
      <div class="reward-wallet">
        <div class="reward-wallet-label">Available balance</div>
        <div class="shop-balance">
          <div class="shop-bal-num">${my}</div>
          <div class="shop-bal-lbl">coins</div>
        </div>
        <div class="reward-wallet-note">${nextReward?`${nextReward.pts-my} coins until ${esc(nextReward.name)}`:'You can afford every available reward.'}</div>
      </div>
      <div class="reward-stat-grid">
        <div class="reward-stat"><strong>${affordable}</strong><span>Available now</span></div>
        <div class="reward-stat"><strong>${owned}</strong><span>Redeemed</span></div>
        <div class="reward-stat"><strong>${benefits.length}</strong><span>Total rewards</span></div>
      </div>
    </div>

    <div class="reward-toolbar">
      <div>
        <div class="reward-toolbar-title">Catalog</div>
        <div class="reward-toolbar-sub">${filtered.length} item${filtered.length===1?'':'s'} shown</div>
      </div>
      <div class="shop-cats">
        ${SHOP_CATS.map(c=>`<button class="shop-cat${activeShopCat===c?' on':''}" onclick="activeShopCat='${c}';switchPanel('${currentUser.role==='admin'?'a':'e'}-benefits')">${c}</button>`).join('')}
      </div>
    </div>

    <div class="reward-grid">
      ${filtered.map(b=>shopItemHTML(b,my,false)).join('')
        ||'<div class="empty" style="grid-column:1/-1">No rewards in this category.</div>'}
    </div>

    ${isAdmin?`<div style="margin-top:1.5rem" class="tbl-wrap"><table>
      <thead><tr><th>Item</th><th>Cost</th><th>Frequency</th><th>Redeemed By</th><th>Actions</th></tr></thead>
      <tbody>${benefits.map(b=>{const c=BEN_COLORS[b.color]||BEN_COLORS.green;const cl=b.claimedBy.map(id=>employees.find(e=>e.id===id)?.name||id).join(', ')||'—';
        return`<tr><td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">${b.icon}</span><strong>${esc(b.name)}</strong></div></td>
        <td style="font-family:var(--mono);color:${c.fg};font-weight:600">${b.pts}</td>
        <td><span class="pill pill-muted">${b.freq}</span></td>
        <td style="font-size:12px;color:var(--muted)">${esc(cl)}</td>
        <td><div class="tbl-actions"><button class="ia" onclick="openEditBenefit(${b.id})">✏️</button><button class="ia danger" onclick="deleteBenefit(${b.id})">🗑</button></div></td>
        </tr>`;}).join('')}</tbody></table></div>`:''}`;
}

function shopItemHTML(b,myXp,isFeatured){
  const c=BEN_COLORS[b.color]||BEN_COLORS.green;
  const rarity=getBenefitRarity(b);
  const myClaimed=b.claimedBy.includes(currentUser.id);
  const bCost=b.cost||b.pts;
  const unlocked=myXp>=bCost;
  const pct=Math.min(100,Math.round((myXp/bCost)*100));
  const rarityLabel={common:'Standard',rare:'Select',epic:'Premium',legendary:'Signature'}[rarity];
  const stateClass=myClaimed?'owned':unlocked?'available':'locked';

  return`<div class="reward-card ${stateClass}">
    <div class="reward-card-main">
      <div class="reward-icon" style="${getBenefitBannerColor(b)}">${b.icon}</div>
      <div class="reward-info">
        <div class="reward-card-top">
          <div>
            <div class="reward-name">${esc(b.name)}</div>
            <div class="reward-frequency">${b.freq}</div>
          </div>
          <span class="shop-item-rarity rarity-${rarity}">${rarityLabel}</span>
        </div>
        <div class="reward-desc">${esc(b.desc)}</div>
        <div class="reward-progress">
          <div class="reward-progress-label"><span>${unlocked?'Ready to redeem':'Progress'}</span><span>${pct}%</span></div>
          <div class="shop-prog-bar"><div class="shop-prog-fill" style="width:${pct}%;background:${c.bar}"></div></div>
        </div>
      </div>
    </div>
    <div class="reward-card-foot">
      <div><div class="reward-cost">${bCost}</div><div class="reward-cost-label">coins</div></div>
      ${b.claimedBy.length?`<span class="pill pill-muted">${b.claimedBy.length} redeemed</span>`:''}
      ${myClaimed
        ?`<button class="shop-btn shop-btn-owned" disabled>Redeemed</button>`
        :unlocked
        ?`<button class="shop-btn shop-btn-buy" onclick="openClaimBenefit(${b.id})">Redeem</button>`
        :`<button class="shop-btn shop-btn-locked" disabled>${bCost-myXp} short</button>`}
    </div>
  </div>`;
}

// ══════════════════════════════════════════════════════
//  ARENA — 1v1 DUELS
// ══════════════════════════════════════════════════════
function getDuelXpEarned(duel,playerId){
  const emp=employees.find(e=>e.id===playerId);
  if(!emp)return 0;
  const startXp=playerId===duel.challengerId?duel.startXpChallenger:duel.startXpOpponent;
  return Math.max(0,(emp.coins||0)-startXp);
}

function renderAdminArena(el){
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">🏟️ Arena — Duel Monitor</div><div class="page-sub">All active and completed 1v1 duels</div></div>
    </div>
    ${renderDuelsList(true)}`;
}

function renderEmpArena(el){
  const myDuels=duels.filter(d=>d.challengerId===currentUser.id||d.opponentId===currentUser.id);
  const activeDuels=duels.filter(d=>d.status==='active');
  const alreadyInDuel=myDuels.some(d=>d.status==='active');
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">🏟️ Arena — 1v1 Duels</div><div class="page-sub">Challenge a colleague — most XP earned wins the stake!</div></div>
      ${!alreadyInDuel?`<button class="btn btn-accent" onclick="openChallengeModal()">⚔️ Issue a Challenge</button>`
      :`<span class="pill pill-amber" style="padding:8px 14px">⚔️ You have an active duel</span>`}
    </div>

    <div class="arena-hero">
      <div style="font-size:32px;margin-bottom:6px">⚔️</div>
      <div style="font-size:16px;font-weight:700;margin-bottom:4px">Battle for XP Supremacy</div>
      <div style="font-size:13px;color:var(--muted)">Challenge any player to a 1v1 duel. Earn the most XP during the duel period and take their stake. Only one active duel at a time.</div>
    </div>

    ${myDuels.length?`<div style="font-size:12px;font-weight:700;color:var(--accent);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">Your Duels</div>
    ${myDuels.map(d=>duelCardHTML(d)).join('')}`:''}

    ${activeDuels.filter(d=>d.challengerId!==currentUser.id&&d.opponentId!==currentUser.id).length?`
    <div style="font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin:1rem 0 8px">Live Duels Around You</div>
    ${activeDuels.filter(d=>d.challengerId!==currentUser.id&&d.opponentId!==currentUser.id).map(d=>duelCardHTML(d)).join('')}`:''}

    ${duels.length===0?'<div class="empty">No duels yet. Be the first to issue a challenge! ⚔️</div>':''}`;
}

function renderDuelsList(isAdmin){
  if(duels.length===0)return'<div class="empty">No duels have been issued yet.</div>';
  return duels.map(d=>duelCardHTML(d,isAdmin)).join('');
}

function duelCardHTML(d,isAdmin=false){
  const ch=employees.find(e=>e.id===d.challengerId);
  const op=employees.find(e=>e.id===d.opponentId);
  const chXp=getDuelXpEarned(d,d.challengerId);
  const opXp=getDuelXpEarned(d,d.opponentId);
  const chLeading=chXp>=opXp;
  const endsAt=new Date(d.endsAt);
  const msLeft=endsAt-Date.now();
  const daysLeft=Math.max(0,Math.ceil(msLeft/86400000));
  const hoursLeft=Math.max(0,Math.ceil(msLeft/3600000));
  const timeStr=daysLeft>1?`${daysLeft}d left`:hoursLeft>0?`${hoursLeft}h left`:'Ending soon';
  const statusPill=d.status==='active'
    ?`<span class="pill pill-green">🔴 LIVE</span>`
    :d.status==='done'
    ?`<span class="pill pill-muted">Completed</span>`
    :`<span class="pill pill-amber">Pending</span>`;

  return`<div class="duel-card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <div style="font-size:13px;font-weight:600">${esc(d.challenger)} vs ${esc(d.opponent)}</div>
      <div style="display:flex;gap:6px;align-items:center">
        ${statusPill}
        ${d.status==='active'?`<span class="duel-timer">⏱ ${timeStr}</span>`:''}
        ${d.stake?`<span class="duel-stake">💰 ${d.stake*2} XP pot</span>`:''}
      </div>
    </div>
    <div class="duel-vs">
      <div class="duel-player${d.status==='active'&&chLeading?' winner':''}">
        <div class="duel-avatar">${ch?avEmoji(ch):'❓'}</div>
        <div class="duel-name">${esc(d.challenger)}</div>
        <div class="duel-xp">${chXp}</div>
        <div class="duel-xp-lbl">XP earned</div>
        ${d.status==='active'&&chLeading?'<span class="pill pill-green" style="font-size:10px;margin-top:4px">Leading 🔥</span>':''}
      </div>
      <div class="duel-vstext">VS</div>
      <div class="duel-player${d.status==='active'&&!chLeading?' winner':''}">
        <div class="duel-avatar">${op?avEmoji(op):'❓'}</div>
        <div class="duel-name">${esc(d.opponent)}</div>
        <div class="duel-xp">${opXp}</div>
        <div class="duel-xp-lbl">XP earned</div>
        ${d.status==='active'&&!chLeading?'<span class="pill pill-green" style="font-size:10px;margin-top:4px">Leading 🔥</span>':''}
      </div>
    </div>
    <div class="duel-meta">
      <span class="pill pill-muted">${d.dur} day duel</span>
      ${d.stake?`<span class="pill pill-accent" style="font-family:var(--mono)">Stake: ${d.stake} XP each</span>`:'<span class="pill pill-muted">No stake</span>'}
      ${isAdmin&&d.status==='active'?`<button class="btn btn-ghost" style="padding:3px 10px;font-size:11px" onclick="endDuel(${d.id})">End duel</button>`:''}
    </div>
  </div>`;
}

function openChallengeModal(){
  const others=employees.filter(e=>e.role==='employee'&&e.id!==currentUser.id);
  $('ch-opponent').innerHTML=others.map(e=>`<option value="${e.id}">${avEmoji(e)} ${esc(e.name)} (${e.coins||0} 🪙)</option>`).join('');
  $('ch-stake-warn').style.display='none';
  $('ch-stake').onchange=function(){
    const s=parseInt(this.value);
    $('ch-stake-warn').style.display=s>0&&(currentUser.coins||0)<s?'block':'none';
  };
  openModal('modal-challenge');
}

function issueChallenge(){
  const opId=$('ch-opponent').value;
  const dur=parseInt($('ch-dur').value);
  const stake=parseInt($('ch-stake').value);
  if(stake>0&&(currentUser.coins||0)<stake){toast('Not enough Coins for this stake! 🪙',false);return}
  const op=employees.find(e=>e.id===opId);
  if(!op)return;
  if(stake>0){
    currentUser.coins=(currentUser.coins||0)-stake;
    const empD=employees.find(e=>e.id===currentUser.id);
    if(empD)empD.coins=currentUser.coins;
    updateTopbar();
  }
  const now=Date.now();
  duels.push({
    id:nextDuelId++,
    challenger:currentUser.name,challengerId:currentUser.id,
    opponent:op.name,opponentId:op.id,
    dur,stake,
    startXpChallenger:currentUser.coins||0,
    startXpOpponent:op.coins||0,
    status:'active',
    startedAt:new Date(now).toISOString(),
    endsAt:new Date(now+dur*86400000).toISOString()
  });
  closeModal('modal-challenge');
  pushNotif(op.id,'⚔️',`${currentUser.name} challenged you to a ${dur}-day duel! Open Arena to respond.`,'e-leaderboard');
  toast(`⚔️ Challenge issued to ${op.name}! ${dur}-day duel begins now. May the best warrior win!`);
  switchPanel('e-leaderboard');
}

function endDuel(id){
  const d=duels.find(x=>x.id===id);
  if(!d||d.status!=='active')return;
  const chXp=getDuelXpEarned(d,d.challengerId);
  const opXp=getDuelXpEarned(d,d.opponentId);
  const winnerId=chXp>=opXp?d.challengerId:d.opponentId;
  const winner=employees.find(e=>e.id===winnerId);
  if(winner&&d.stake){
    winner.coins=(winner.coins||0)+d.stake*2;
    if(currentUser.id===winnerId){currentUser.coins=winner.coins;updateTopbar();}
  }
  d.status='done';
  toast(`🏆 Duel ended! ${winner?.name||'Player'} wins${d.stake?' and takes '+d.stake*2+' XP!':'!'}`);
  switchPanel('a-arena');
}

// ══════════════════════════════════════════════════════
//  TEAMS & PROJECT SPRINTS
// ══════════════════════════════════════════════════════
function getTeamMembers(teamKey){
  const t=GUILD_TEAMS[teamKey];
  return employees.filter(e=>e.role==='employee'&&t.depts.includes(e.dept));
}
function getTeamCurrentXp(teamKey){
  return getTeamMembers(teamKey).reduce((s,e)=>s+(e.coins||0),0);
}
function sprintDeadline(sprint){
  const ms=new Date(sprint.endsAt)-Date.now();
  if(sprint.status==='done')return{label:'Completed',cls:'tl-ok'};
  if(ms<=0)return{label:'Overdue',cls:'tl-urgent'};
  const d=Math.ceil(ms/86400000);
  const h=Math.ceil(ms/3600000);
  if(h<24)return{label:h+'h left',cls:'tl-urgent'};
  return{label:d+'d left',cls:d<=2?'tl-soon':'tl-ok'};
}

function sprintProgress(sprint){
  if(sprint.status==='done')return 100;
  const start=new Date(sprint.startedAt).getTime();
  const end=new Date(sprint.endsAt).getTime();
  const total=Math.max(1,end-start);
  return Math.max(0,Math.min(100,Math.round(((Date.now()-start)/total)*100)));
}

function renderSprintStats(filterTeam){
  const list=filterTeam&&filterTeam!=='All'?sprints.filter(s=>s.teams&&s.teams.includes(filterTeam)):sprints;
  const active=list.filter(s=>s.status==='active');
  const done=list.filter(s=>s.status==='done');
  const contributors=list.reduce((sum,s)=>sum+(s.contributors||[]).length,0);
  const pendingXp=active.reduce((sum,s)=>sum+((s.contributors||[]).length*s.xpPerContributor),0);
  return`<div class="sprint-stats">
    <div class="sprint-stat"><span>${active.length}</span><small>Active sprints</small></div>
    <div class="sprint-stat"><span>${done.length}</span><small>Completed</small></div>
    <div class="sprint-stat"><span>${contributors}</span><small>Contributions</small></div>
    <div class="sprint-stat"><span>${pendingXp}</span><small>Pending XP</small></div>
  </div>`;
}

function renderSprintTeamTabs(){
  const tabs=['All',...Object.keys(GUILD_TEAMS)];
  return`<div class="sprint-tabs">
    ${tabs.map(key=>{
      const meta=key==='All'?{emoji:'▦',label:'All teams'}:GUILD_TEAMS[key];
      const count=key==='All'?sprints.length:sprints.filter(s=>s.teams&&s.teams.includes(key)).length;
      return`<button class="sprint-tab${activeSprintTeam===key?' on':''}" onclick="activeSprintTeam='${key}';switchPanel('a-teams')">
        <span>${meta.emoji}</span><strong>${meta.label}</strong><small>${count}</small>
      </button>`;
    }).join('')}
  </div>`;
}

function renderAdminTeams(el){
  const filteredTeam=activeSprintTeam==='All'?null:activeSprintTeam;
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Sprint War Room</div><div class="page-sub">Launch focused initiatives, track contribution signals, and close work with XP awards.</div></div>
      <button class="btn btn-accent" onclick="openSprintModal()">Launch sprint</button>
    </div>
    ${renderSprintStats(activeSprintTeam)}
    ${renderSprintTeamTabs()}
    ${renderTeamCards(filteredTeam)}
    <div class="sprint-section-head"><div><strong>${filteredTeam?GUILD_TEAMS[filteredTeam].label:'All sprint work'}</strong><span>${filteredTeam?'Focused team queue':'Every active and recently completed sprint'}</span></div></div>
    ${renderSprintCards(true,filteredTeam)}`;
}

function renderEmpTeams(el){
  const myTeamKey=Object.keys(GUILD_TEAMS).find(k=>GUILD_TEAMS[k].depts.includes(currentUser.dept));
  const mySprints=sprints.filter(s=>s.teams&&s.teams.includes(myTeamKey)&&s.status==='active');
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Sprint War Room</div><div class="page-sub">Your team’s active initiatives and contribution status.</div></div>
    </div>
    ${myTeamKey?`<div class="my-sprint-hero">
      <div class="my-sprint-badge">${GUILD_TEAMS[myTeamKey].emoji}</div>
      <div><div class="my-sprint-kicker">Your team</div><strong>${GUILD_TEAMS[myTeamKey].label}</strong><span>${mySprints.length} active sprint${mySprints.length!==1?'s':''}</span></div>
    </div>`:''}
    ${renderSprintStats(myTeamKey)}
    ${renderTeamCards(myTeamKey)}
    <div class="sprint-section-head"><div><strong>Your sprint queue</strong><span>Log your contribution before the deadline.</span></div></div>
    ${renderSprintCards(false,myTeamKey)}`;
}

function renderTeamCards(filterTeam){
  const entries=Object.entries(GUILD_TEAMS).filter(([key])=>!filterTeam||key===filterTeam);
  return`<div class="sprint-team-grid">
    ${entries.map(([key,team])=>{
      const members=getTeamMembers(key);
      const totalXp=getTeamCurrentXp(key);
      const sorted=[...members].sort((a,b)=>(b.coins||0)-(a.coins||0));
      const activeSprints=sprints.filter(s=>s.teams&&s.teams.includes(key)&&s.status==='active').length;
      return`<div class="team-card sprint-team-card">
        <div class="team-header">
          <div class="team-badge" style="background:${team.color}20;color:${team.color}">${team.emoji}</div>
          <div class="sprint-team-title">
            <div class="team-name">${team.label}</div>
            <div>${members.length} member${members.length!==1?'s':''} · ${activeSprints} active sprint${activeSprints!==1?'s':''}</div>
          </div>
          <div class="sprint-team-score">
            <div style="color:${team.color}">${totalXp}</div>
            <span>team coins</span>
          </div>
        </div>
        <div class="team-members">
          ${sorted.map(e=>`<div class="team-member-chip">
            <span style="font-size:16px">${avEmoji(e)}</span>
            <span>${esc(e.name)}</span>
            <span style="font-family:var(--mono);font-size:11px;color:var(--accent)">${e.coins||0}🪙</span>
          </div>`).join('')||`<span style="font-size:12px;color:var(--hint)">No members yet.</span>`}
        </div>
      </div>`;
    }).join('')}
  </div>`;
}

function renderSprintCards(isAdmin, filterTeam){
  const list=(isAdmin&&!filterTeam?sprints:sprints.filter(s=>s.teams&&s.teams.includes(filterTeam))).sort((a,b)=>(a.status==='done')-(b.status==='done')||new Date(a.endsAt)-new Date(b.endsAt));
  if(!list.length)return`<div class="empty">${isAdmin?'No sprints in this queue yet. Launch one above.':'No active sprints for your team yet. An admin will launch one soon.'}</div>`;
  const maxContrib=Math.max(1,...list.map(s=>(s.contributors||[]).length));
  return list.map(sprint=>{
    const sprintTeams=(sprint.teams||[sprint.team]).map(t=>GUILD_TEAMS[t]).filter(Boolean);
    const team=sprintTeams[0]||{emoji:'▦',label:'All Teams',color:'var(--accent)'};
    const teamBadges=sprintTeams.map(t=>`<span class="sprint-team-pill" style="--team-color:${t.color}">${t.emoji} ${t.label}</span>`).join('')||'<span class="sprint-team-pill">All Teams</span>';
    const dl=sprintDeadline(sprint);
    const contribs=sprint.contributors||[];
    const myContrib=contribs.find(c=>c.id===currentUser.id);
    const progress=sprintProgress(sprint);
    const contribPct=Math.min(100,Math.round((contribs.length/maxContrib)*100));
    return`<div class="sprint-card-modern ${sprint.status==='done'?'done':'active'}">
      <div class="sprint-card-head">
        <div class="sprint-title-wrap">
          <div class="sprint-icon" style="background:${team.color}20;color:${team.color}">${team.emoji}</div>
          <div>
            <div class="sprint-status-row">
              <span class="sprint-status ${sprint.status}">${sprint.status==='done'?'Completed':'Active'}</span>
              <span class="tl ${dl.cls}">${dl.label}</span>
            </div>
            <div class="sprint-title">${esc(sprint.name)}</div>
          </div>
        </div>
        <div class="sprint-actions">
          ${isAdmin&&sprint.status==='active'?`<button class="btn btn-accent" onclick="completeSprint(${sprint.id})">Close sprint</button>`:''}
          ${!isAdmin&&sprint.status==='active'&&!myContrib?`<button class="btn btn-accent" onclick="openContributeModal(${sprint.id})">Log contribution</button>`:''}
          ${!isAdmin&&myContrib?`<span class="pill pill-green">Contributed</span>`:''}
        </div>
      </div>
      <div class="sprint-desc">${esc(sprint.desc)}</div>
      <div class="sprint-meta-row">
        ${teamBadges}
        <span class="sprint-xp">+${sprint.xpPerContributor} XP</span>
      </div>
      <div class="sprint-progress-grid">
        <div>
          <div class="sprint-progress-label"><span>Timeline</span><strong>${progress}%</strong></div>
          <div class="sprint-track"><div style="width:${progress}%;background:${team.color}"></div></div>
        </div>
        <div>
          <div class="sprint-progress-label"><span>Contributors</span><strong>${contribs.length}</strong></div>
          <div class="sprint-track"><div style="width:${contribPct}%;background:var(--accent)"></div></div>
        </div>
      </div>
      <div class="sprint-contributors">
        <div class="sprint-contrib-head">Contribution log ${sprint.status==='active'?'<span>XP awarded on close</span>':''}</div>
        ${contribs.length?contribs.map(c=>{
          const emp=employees.find(e=>e.id===c.id);
          return`<div class="sprint-contrib-row">
            <span class="sprint-contrib-av">${emp?avEmoji(emp):'?'}</span>
            <div>
              <div class="sprint-contrib-name">${esc(c.name)} <span>${c.loggedAt}</span></div>
              <div class="sprint-contrib-note">${esc(c.note)}</div>
            </div>
          </div>`;
        }).join(''):`<div class="sprint-empty-log">No contributions logged yet.</div>`}
      </div>
    </div>`;
  }).join('');
}

function toggleAllTeams(cb){
  ['sp-team-devs','sp-team-design','sp-team-mkt'].forEach(id=>{
    document.getElementById(id).checked=cb.checked;
  });
}

function openSprintModal(){
  $('sp-name').value='';$('sp-desc').value='';$('sp-xp').value=50;$('sp-dur').value=7;
  ['sp-team-devs','sp-team-design','sp-team-mkt','sp-team-all'].forEach(id=>document.getElementById(id).checked=false);
  openModal('modal-sprint');
}

function launchSprint(){
  const name=$('sp-name').value.trim();
  if(!name){toast('Sprint needs a name!',false);return}
  const teamMap={devs:'Devs',design:'Design',mkt:'Mkt'};
  const teams=Object.keys(teamMap).filter(k=>document.getElementById('sp-team-'+k).checked).map(k=>teamMap[k]);
  if(!teams.length){toast('Assign to at least one team!',false);return}
  const xp=parseInt($('sp-xp').value)||50;
  const dur=parseInt($('sp-dur').value);
  const teamLabels=teams.map(t=>GUILD_TEAMS[t]?.emoji+' '+GUILD_TEAMS[t]?.label).join(', ');
  sprints.unshift({
    id:nextSprintId++,name,
    desc:$('sp-desc').value.trim()||'Complete this project sprint.',
    teams,xpPerContributor:xp,status:'active',
    startedAt:new Date().toISOString(),
    endsAt:new Date(Date.now()+dur*86400000).toISOString(),
    contributors:[]
  });
  closeModal('modal-sprint');

  toast(`🚀 "${name}" launched for ${teamLabels}! ${dur} day${dur!==1?'s':''} to deliver.`);
  switchPanel('a-teams');
}

function openContributeModal(sprintId){
  pendingContributeId=sprintId;
  const sprint=sprints.find(s=>s.id===sprintId);
  $('contribute-sprint-name').textContent=sprint?`Sprint: ${sprint.name}`:'';
  $('contribute-note').value='';
  openModal('modal-contribute');
}

function confirmContribute(){
  const note=$('contribute-note').value.trim();
  if(!note){toast('Please describe your contribution.',false);return}
  const sprint=sprints.find(s=>s.id===pendingContributeId);
  if(!sprint){closeModal('modal-contribute');return}
  if(sprint.contributors.find(c=>c.id===currentUser.id)){toast('You already logged a contribution.',false);return}
  sprint.contributors.push({id:currentUser.id,name:currentUser.name,note,loggedAt:'Just now'});
  closeModal('modal-contribute');
  toast('📝 Contribution logged! An admin will pick winners when done.');
  switchPanel('e-teams');
}

function completeSprint(id){
  // GM opens winner picker modal
  const sprint=sprints.find(s=>s.id===id);
  if(!sprint||sprint.status==='done')return;
  pendingContributeId=id;
  const contribs=sprint.contributors||[];
  $('winners-sprint-desc').textContent=`"${sprint.name}" — ${sprint.xpPerContributor} XP per selected winner`;
  const list=$('winners-checklist');
  if(contribs.length===0){
    list.innerHTML='<div style="font-size:12px;color:var(--hint)">No one logged a contribution. You can still close the sprint without awarding XP.</div>';
    $('winners-xp-preview').textContent='';
  } else {
    list.innerHTML=contribs.map(c=>{
      const emp=employees.find(e=>e.id===c.id);
      return`<label style="display:flex;align-items:flex-start;gap:10px;cursor:pointer;padding:6px 0;border-bottom:1px solid var(--border)">
        <input type="checkbox" class="winner-cb" value="${c.id}" checked style="margin-top:3px;width:15px;height:15px;accent-color:var(--accent)">
        <div>
          <div style="font-size:13px;font-weight:600">${emp?avEmoji(emp)+' ':''} ${esc(c.name)}</div>
          <div style="font-size:11px;color:var(--muted)">${esc(c.note)}</div>
        </div>
      </label>`;
    }).join('');
    // live preview
    const updatePreview=()=>{
      const n=document.querySelectorAll('.winner-cb:checked').length;
      $('winners-xp-preview').textContent=n?`${n} winner${n!==1?'s':''} × ${sprint.xpPerContributor} XP = ${n*sprint.xpPerContributor} XP total`:'No winners selected';
    };
    updatePreview();
    list.querySelectorAll('.winner-cb').forEach(cb=>cb.addEventListener('change',updatePreview));
  }
  openModal('modal-winners');
}

function confirmWinners(){
  const sprint=sprints.find(s=>s.id===pendingContributeId);
  if(!sprint)return;
  const selected=[...document.querySelectorAll('.winner-cb:checked')].map(cb=>cb.value);
  sprint.status='done';
  selected.forEach(empId=>{
    const empW=employees.find(e=>e.id===empId);
    if(empW){earnBoth(empW,sprint.xpPerContributor,sprint.xpPerContributor);}
  });
  updateTopbar();

  closeModal('modal-winners');
  const msg=selected.length
    ?`👑 Sprint complete! ${selected.length} winner${selected.length!==1?'s':''} each earned +${sprint.xpPerContributor} XP!`
    :`✅ Sprint "${sprint.name}" closed. No XP awarded.`;
  toast(msg);
  switchPanel('a-teams');
}

// ══════════════════════════════════════════════════════
//  DAILY STANDUP
// ══════════════════════════════════════════════════════
const STANDUP_LIMITS = {done:500, blockers:300, tomorrow:400};
const STANDUP_MINS   = {done:50,  blockers:20,  tomorrow:50};

function todayStr(){
  return new Date().toISOString().slice(0,10);
}
function fmtDate(d){
  return new Date(d+'T00:00:00').toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
}

function renderEmpStandup(el){
  const today = todayStr();
  const alreadyPosted = standups.find(s=>s.empId===currentUser.id&&s.date===today);

  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">📋 Daily Standup</div><div class="page-sub">Post your update to earn <strong style="color:var(--accent)">+5 XP</strong> — one per day, keep it honest</div></div>
    </div>

    ${alreadyPosted ? `
    <div class="standup-done-banner">
      <span style="font-size:28px">✅</span>
      <div>
        <div style="font-size:14px;font-weight:700;color:var(--green)">Today's update posted!</div>
        <div style="font-size:12px;color:var(--muted);margin-top:2px">You already submitted your standup for ${fmtDate(today)}. Come back tomorrow for another +5 XP.</div>
      </div>
    </div>
    <div style="font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">Your update today</div>
    ${standupCardHTML(alreadyPosted)}
    ` : `
    <div class="standup-form">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.25rem;padding-bottom:1rem;border-bottom:1px solid var(--border)">
        <span style="font-size:28px">${avEmoji(currentUser)}</span>
        <div>
          <div style="font-size:14px;font-weight:700">${esc(currentUser.name)}</div>
          <div style="font-size:12px;color:var(--muted)">${fmtDate(today)} · +5 XP on submit</div>
        </div>
      </div>

      <div class="standup-field">
        <label><span class="lbl-icon">✅</span> What did you accomplish today?</label>
        <textarea id="su-done" maxlength="${STANDUP_LIMITS.done}" placeholder="Be specific — what tasks did you complete, what did you deliver or make progress on? (min ${STANDUP_MINS.done} chars)" oninput="updateCounter('su-done','su-done-ctr',${STANDUP_LIMITS.done},${STANDUP_MINS.done})"></textarea>
        <div class="char-counter char-ok" id="su-done-ctr">0 / ${STANDUP_LIMITS.done}</div>
      </div>

      <div class="standup-field">
        <label><span class="lbl-icon">🚧</span> Any blockers or challenges?</label>
        <textarea id="su-blockers" maxlength="${STANDUP_LIMITS.blockers}" placeholder="What is slowing you down? Who do you need help from? Write 'None' if all clear. (min ${STANDUP_MINS.blockers} chars)" oninput="updateCounter('su-blockers','su-blockers-ctr',${STANDUP_LIMITS.blockers},${STANDUP_MINS.blockers})"></textarea>
        <div class="char-counter char-ok" id="su-blockers-ctr">0 / ${STANDUP_LIMITS.blockers}</div>
      </div>

      <div class="standup-field">
        <label><span class="lbl-icon">🎯</span> What's the plan for tomorrow?</label>
        <textarea id="su-tomorrow" maxlength="${STANDUP_LIMITS.tomorrow}" placeholder="What will you focus on tomorrow? List your priorities. (min ${STANDUP_MINS.tomorrow} chars)" oninput="updateCounter('su-tomorrow','su-tomorrow-ctr',${STANDUP_LIMITS.tomorrow},${STANDUP_MINS.tomorrow})"></textarea>
        <div class="char-counter char-ok" id="su-tomorrow-ctr">0 / ${STANDUP_LIMITS.tomorrow}</div>
      </div>

      <div id="su-error" style="font-size:12px;color:var(--red);margin-bottom:10px;display:none"></div>
      <button class="btn btn-accent btn-block" onclick="submitStandup()">📋 Submit standup — earn +5 XP</button>
    </div>
    `}

    <div style="font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">Your recent updates</div>
    ${standups.filter(s=>s.empId===currentUser.id&&s.date!==today).slice(0,5).map(s=>standupCardHTML(s)).join('')
      ||'<div class="empty">No previous updates. Start building your streak!</div>'}`;
}

function updateCounter(fieldId, ctrId, max, min){
  const val = $(fieldId).value.length;
  const ctr = $(ctrId);
  ctr.textContent = val + ' / ' + max;
  ctr.className = 'char-counter ' + (val>=max?'char-full':val<min?'char-warn':'char-ok');
}

function submitStandup(){
  const done     = $('su-done').value.trim();
  const blockers = $('su-blockers').value.trim();
  const tomorrow = $('su-tomorrow').value.trim();
  const errEl    = $('su-error');
  errEl.style.display='none';

  const checks = [
    [done,     STANDUP_MINS.done,     'Accomplishments'],
    [blockers, STANDUP_MINS.blockers, 'Blockers'],
    [tomorrow, STANDUP_MINS.tomorrow, 'Tomorrow plan'],
  ];
  for(const [val, min, label] of checks){
    if(val.length < min){
      errEl.textContent = `"${label}" needs at least ${min} characters — please be more detailed.`;
      errEl.style.display='block';
      return;
    }
  }

  const today = todayStr();
  if(standups.find(s=>s.empId===currentUser.id&&s.date===today)){
    errEl.textContent='You already posted today!';errEl.style.display='block';return;
  }

  standups.unshift({id:nextStandupId++,empId:currentUser.id,empName:currentUser.name,date:today,done,blockers,tomorrow});
  const emp=employees.find(e=>e.id===currentUser.id);
  // Update streak
  emp.streak=(emp.streak||0)+1;
  currentUser.streak=emp.streak;
  emp.lastStandup=today;
  // Base earn
  let earned=5;
  earnBoth(emp,5,5);
  // Streak bonuses
  let bonusMsg='';
  if(emp.streak===5){earnBoth(emp,10,10);earned+=10;bonusMsg=' 🔥 5-day streak bonus +10!';}
  else if(emp.streak===10){earnBoth(emp,25,25);earned+=25;bonusMsg=' 🔥 10-day streak bonus +25!';}
  else if(emp.streak===20){earnBoth(emp,60,60);earned+=60;bonusMsg=' 🏆 Full month streak +60!';}
  updateTopbar();
  toast('📋 Standup posted! +5 Coins & Rep.'+bonusMsg);
  switchPanel('e-standup');
}

function standupCardHTML(s){
  const emp=employees.find(e=>e.id===s.empId);
  return`<div class="standup-card">
    <div class="standup-card-header">
      <div class="standup-card-avatar">${emp?avEmoji(emp):'📋'}</div>
      <div class="standup-card-meta">
        <div class="standup-card-name">${esc(s.empName)}</div>
        <div class="standup-card-date">${fmtDate(s.date)}</div>
      </div>
    </div>
    <div class="standup-section">
      <div class="standup-section-lbl" style="color:var(--green)">✅ <span>Accomplished today</span></div>
      <div class="standup-section-txt">${esc(s.done)}</div>
    </div>
    <div class="standup-section">
      <div class="standup-section-lbl" style="color:var(--amber)">🚧 <span>Blockers</span></div>
      <div class="standup-section-txt">${esc(s.blockers)}</div>
    </div>
    <div class="standup-section">
      <div class="standup-section-lbl" style="color:var(--blue)">🎯 <span>Plan for tomorrow</span></div>
      <div class="standup-section-txt">${esc(s.tomorrow)}</div>
    </div>
  </div>`;
}

function renderAdminDaily(el){
  const today = todayStr();
  const allEmps = employees.filter(e=>e.role==='employee');
  const todayUpdates = standups.filter(s=>s.date===today);
  const postedIds = new Set(todayUpdates.map(s=>s.empId));
  const notPosted = allEmps.filter(e=>!postedIds.has(e.id));

  // Build date list for filter tabs
  const dates=[...new Set(standups.map(s=>s.date))].sort().reverse().slice(0,7);
  const filtered = adminUpdateFilter==='all'
    ? standups
    : standups.filter(s=>s.date===adminUpdateFilter);

  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">📋 Daily Updates</div><div class="page-sub">Team standups — who has posted, who hasn't</div></div>
    </div>

    <div class="stats" style="margin-bottom:1.5rem">
      <div class="stat"><div class="stat-val">${todayUpdates.length}</div><div class="stat-lbl">Posted today</div></div>
      <div class="stat"><div class="stat-val" style="color:var(--red)">${notPosted.length}</div><div class="stat-lbl">Not posted today</div></div>
      <div class="stat"><div class="stat-val">${standups.length}</div><div class="stat-lbl">All-time updates</div></div>
    </div>

    ${notPosted.length?`
    <div style="background:rgba(255,90,90,.06);border:1px solid rgba(255,90,90,.15);border-radius:var(--r-md);padding:12px 16px;margin-bottom:1.25rem">
      <div style="font-size:12px;font-weight:700;color:var(--red);margin-bottom:8px">⚠️ No update posted today</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px">
        ${notPosted.map(e=>`<div class="team-member-chip"><span style="font-size:16px">${avEmoji(e)}</span><span>${esc(e.name)}</span></div>`).join('')}
      </div>
    </div>`:'<div style="background:rgba(79,255,176,.06);border:1px solid rgba(79,255,176,.2);border-radius:var(--r-md);padding:12px 16px;margin-bottom:1.25rem;font-size:13px;color:var(--green)">✅ Everyone has posted their update today!</div>'}

    <div style="font-size:12px;font-weight:700;color:var(--muted);letter-spacing:.5px;text-transform:uppercase;margin-bottom:8px">Browse updates</div>
    <div class="admin-update-tabs">
      <button class="au-tab${adminUpdateFilter==='all'?' on':''}" onclick="adminUpdateFilter='all';switchPanel('a-daily')">All</button>
      ${dates.map(d=>`<button class="au-tab${adminUpdateFilter===d?' on':''}" onclick="adminUpdateFilter='${d}';switchPanel('a-daily')">${fmtDate(d)}${d===today?' (today)':''}</button>`).join('')}
    </div>

    ${filtered.map(s=>standupCardHTML(s)).join('')||'<div class="empty">No updates to show.</div>'}`;
}

// ══════════════════════════════════════════════════════
//  PROJECTS
// ══════════════════════════════════════════════════════
const PRI_STYLE={
  Low:{cls:'pri-low',icon:'🔘'},
  Medium:{cls:'pri-medium',icon:'🔵'},
  High:{cls:'pri-high',icon:'🟡'},
  Urgent:{cls:'pri-urgent',icon:'🔴'},
};
// STATUS_META kept as compat fallback for non-project status references
const STATUS_META={
  todo:      {label:'To Do',      color:'#8A8A96',  border:'rgba(138,138,150,.3)'},
  inprogress:{label:'In Progress',color:'#FFBE47',  border:'rgba(255,190,71,.3)'},
  done:      {label:'Done',       color:'#4FFFB0',  border:'rgba(79,255,176,.3)'},
};
function fmtDue(d){
  if(!d)return'';
  const dt=new Date(d+'T00:00:00');
  const diff=Math.ceil((dt-Date.now())/86400000);
  const str=dt.toLocaleDateString('en-GB',{day:'numeric',month:'short'});
  if(diff<0)return`<span style="color:var(--red);font-size:11px">⚠ Overdue (${str})</span>`;
  if(diff===0)return`<span style="color:var(--amber);font-size:11px">Due today</span>`;
  if(diff<=3)return`<span style="color:var(--amber);font-size:11px">Due ${str}</span>`;
  return`<span style="font-size:11px;color:var(--hint)">Due ${str}</span>`;
}

// ── Project list ──────────────────────────────────────
function renderProjects(el){
  const isAdmin=currentUser.role==='admin';
  if(activeProjectId){
    renderProjectBoard(el,isAdmin);
    return;
  }
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">📁 Projects</div><div class="page-sub">Task management — pick a project to open its board</div></div>
      ${isAdmin?'<button class="btn btn-accent" onclick="openNewProjectModal()">+ New project</button>':''}
    </div>
    <div class="proj-list">
      ${projects.map(p=>{
        const tasks=projectTasks.filter(t=>t.projectId===p.id);
        const projCols=getProjectColumns(p.id);const doneColId=projCols[projCols.length-1]?.id||'done';const done=tasks.filter(t=>t.status===doneColId).length;
        const pct=tasks.length?Math.round((done/tasks.length)*100):0;
        return`<div class="proj-card" onclick="openProject(${p.id})">
          <div class="proj-card-top">
            <div style="display:flex;align-items:center;gap:9px">
              <div class="proj-color-dot" style="background:${p.color};width:14px;height:14px;border-radius:4px"></div>
              <div class="proj-card-name">${esc(p.name)}</div>
            </div>
            ${isAdmin?`<div style="display:flex;gap:4px">
              <button class="ia" onclick="event.stopPropagation();openEditProjectModal(${p.id})" title="Edit">✏️</button>
              <button class="ia danger" onclick="event.stopPropagation();deleteProject(${p.id})" title="Delete">🗑</button>
            </div>`:''}
          </div>
          <div class="proj-card-desc">${esc(p.desc)}</div>
          <div style="margin-top:6px">
            <div style="display:flex;justify-content:space-between;font-size:10px;color:var(--muted);margin-bottom:4px">
              <span>${done}/${tasks.length} tasks done</span><span>${pct}%</span>
            </div>
            <div style="height:4px;background:var(--bg3);border-radius:4px;overflow:hidden">
              <div style="height:100%;width:${pct}%;background:${p.color};border-radius:4px;transition:width .5s"></div>
            </div>
          </div>
          <div class="proj-card-footer">
            ${p.team&&GUILD_TEAMS[p.team]?`<span class="pill pill-purple" style="font-size:10px">${GUILD_TEAMS[p.team].emoji} ${GUILD_TEAMS[p.team].label}</span>`:'<span class="pill pill-muted" style="font-size:10px">All Teams</span>'}
            <span style="font-size:10px;color:var(--hint)">${tasks.length} task${tasks.length!==1?'s':''}</span>
          </div>
        </div>`;
      }).join('')||'<div class="empty" style="grid-column:1/-1">No projects yet. Create the first one!</div>'}
    </div>`;
}

function openProject(id){
  activeProjectId=id;
  projectView='kanban';
  activeWorkTab='proj-'+id;
  switchPanel(currentUser.role==='admin'?'a-workhub':'e-workhub');
}

// ── Project board ─────────────────────────────────────
function renderProjectBoard(el,isAdmin){
  const proj=projects.find(p=>p.id===activeProjectId);
  if(!proj){activeProjectId=null;renderProjects(el);return;}
  const tasks=projectTasks.filter(t=>t.projectId===activeProjectId);

  el.innerHTML=`
    <div class="page-hdr">
      <div style="display:flex;align-items:center;gap:10px">
        <button class="btn btn-ghost" style="padding:5px 10px;font-size:12px" onclick="activeProjectId=null;activeWorkTab='standup';switchPanel('${isAdmin?'a':'e'}-workhub')">← Projects</button>
        <div class="proj-color-dot" style="background:${proj.color};width:12px;height:12px;border-radius:3px"></div>
        <div><div class="page-title" style="font-size:17px">${esc(proj.name)}</div><div class="page-sub">${esc(proj.desc)}</div></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <div class="view-toggle">
          <button class="vt-btn${projectView==='kanban'?' active':''}" onclick="projectView='kanban';switchPanel('${isAdmin?'a':'e'}-projects')">⬛ Kanban</button>
          <button class="vt-btn${projectView==='list'?' active':''}" onclick="projectView='list';switchPanel('${isAdmin?'a':'e'}-projects')">☰ List</button>
        </div>
        ${isAdmin?`<button class="btn btn-accent" onclick="openNewTaskModal(${proj.id})">+ Add task</button>`:''}
      </div>
    </div>
    ${projectView==='kanban'?renderKanban(tasks,isAdmin):renderListView(tasks,isAdmin)}`;
}

function renderKanban(tasks,isAdmin){
  const cols=getProjectColumns(activeProjectId);
  // collect tasks with unknown status into first column
  const knownIds=new Set(cols.map(c=>c.id));
  const allTasks=[...tasks];
  return`<div class="kanban-wrap">
    ${cols.map(col=>{
      const colTasks=allTasks.filter(t=>t.status===col.id||(t.status&&!knownIds.has(t.status)&&col===cols[0]));
      return`<div class="kanban-col">
        <div class="kanban-col-header">
          <div class="kanban-col-title-wrap">
            <div class="kanban-col-dot" style="background:${col.color}"></div>
            ${isAdmin
              ?`<input class="kanban-col-title" value="${esc(col.label)}" style="color:${col.color}"
                  onblur="renameColumn(${activeProjectId},'${col.id}',this.value)"
                  onkeydown="if(event.key==='Enter')this.blur()">`
              :`<span class="kanban-col-title" style="color:${col.color};cursor:default;border:none">${esc(col.label)}</span>`}
            <span class="kanban-col-count">${colTasks.length}</span>
          </div>
          ${isAdmin?`<div style="display:flex;gap:2px;align-items:center;flex-shrink:0">
            <div style="position:relative;display:inline-block">
              <button class="col-color-btn" style="background:${col.color}" onclick="toggleColPicker('picker-${col.id}')" title="Change colour"></button>
              <div id="picker-${col.id}" class="col-picker" style="display:none">
                ${['#8A8A96','#5AB4FF','#FFBE47','#4FFFB0','#FF5A5A','#C8A0FF','#FF78B4','#E8FF47','#FF8264','#00C8B4'].map(clr=>`
                  <div class="col-picker-swatch" style="background:${clr}" onclick="setColColor(${activeProjectId},'${col.id}','${clr}');toggleColPicker('picker-${col.id}')"></div>`).join('')}
              </div>
            </div>
            <button class="col-del-btn" onclick="deleteColumn(${activeProjectId},'${col.id}')" title="Delete column">✕</button>
          </div>`:''}
        </div>
        ${colTasks.map(t=>ktaskHTML(t,isAdmin,col.color)).join('')}
        ${isAdmin?`<button onclick="openNewTaskModal(${activeProjectId},'${col.id}')"
          style="width:100%;padding:7px;border:1px dashed rgba(${hexToRgb(col.color)},.3);border-radius:var(--r-sm);background:none;color:var(--hint);font-size:12px;cursor:pointer;font-family:var(--font);transition:all .12s;margin-top:4px"
          onmouseover="this.style.borderColor='${col.color}';this.style.color='${col.color}'"
          onmouseout="this.style.borderColor='rgba(${hexToRgb(col.color)},.3)';this.style.color='var(--hint)'">+ Add task</button>`:''}
      </div>`;
    }).join('')}
    ${isAdmin?`<button class="add-col-btn" onclick="addColumn(${activeProjectId})">
      <span style="font-size:22px">+</span>
      <span style="font-size:11px;font-weight:600">Add column</span>
    </button>`:''}
  </div>`;
}

function hexToRgb(hex){
  hex=hex.replace('#','');
  if(hex.length===3)hex=hex.split('').map(x=>x+x).join('');
  const n=parseInt(hex,16);
  return`${(n>>16)&255},${(n>>8)&255},${n&255}`;
}

function ktaskHTML(t,isAdmin,colColor){colColor=colColor||'var(--accent)';
  const pri=PRI_STYLE[t.priority]||PRI_STYLE.Medium;
  const assigneeEmp=employees.find(e=>e.id===t.assigneeId);
  const isMyTask=t.assigneeId===currentUser.id;
  const isUnassigned=!t.assigneeId;
  const canClaim=!isAdmin&&isUnassigned&&t.status==='todo';
  return`<div class="ktask${isMyTask?' my-claimed':''}" onclick="openTaskDetail(${t.id})" style="${isMyTask?'border-color:rgba(232,255,71,.3)':isUnassigned?'border-style:dashed':''}">
    <div class="ktask-title">${esc(t.title)}</div>
    <div class="ktask-meta">
      <span class="pill ${pri.cls}" style="font-size:10px">${pri.icon} ${t.priority}</span>
      ${t.xp?`<span class="ktask-xp">+${t.xp} XP</span>`:''}
      ${fmtDue(t.due)}
    </div>
    <div class="ktask-assignee" style="justify-content:space-between">
      <div style="display:flex;align-items:center;gap:5px">
        <span style="font-size:16px">${assigneeEmp?avEmoji(assigneeEmp):'👤'}</span>
        <span>${esc(t.assigneeName||'Unassigned')}</span>
      </div>
      ${canClaim?`<button class="t-btn" style="font-size:10px;padding:3px 9px" onclick="event.stopPropagation();claimProjectTask(${t.id})">⚔️ Claim</button>`:''}
    </div>
  </div>`;
}

function renderListView(tasks,isAdmin){
  const sorted=[...tasks].sort((a,b)=>{
    const po={Urgent:0,High:1,Medium:2,Low:3};
    return(po[a.priority]||2)-(po[b.priority]||2);
  });
  return`<div class="proj-list-view">
    <table style="width:100%;border-collapse:collapse">
      <thead><tr>
        <th>Task</th><th>Assignee</th><th>Priority</th><th>Status</th><th>Due</th><th>XP</th><th></th>
      </tr></thead>
      <tbody>
        ${sorted.map(t=>{
          const pri=PRI_STYLE[t.priority]||PRI_STYLE.Medium;
          const sm=getStatusMeta(t.status,t.projectId||activeProjectId);
          const assigneeEmp=employees.find(e=>e.id===t.assigneeId);
          const isMyTask=t.assigneeId===currentUser.id;
          return`<tr style="${isMyTask?'background:rgba(232,255,71,.03)':''}">
            <td style="max-width:260px">
              <div style="font-weight:600;font-size:13px">${esc(t.title)}</div>
              ${t.desc?`<div style="font-size:11px;color:var(--muted)">${esc(t.desc.slice(0,60))}${t.desc.length>60?'…':''}</div>`:''}
            </td>
            <td><div style="display:flex;align-items:center;gap:6px"><span style="font-size:16px">${assigneeEmp?avEmoji(assigneeEmp):'👤'}</span><span style="font-size:12px">${esc(t.assigneeName||'Unassigned')}</span></div></td>
            <td><span class="pill ${pri.cls}">${pri.icon} ${t.priority}</span></td>
            <td><span class="pill" style="border:1px solid ${sm.border};color:${sm.color};background:transparent">${sm.label}</span></td>
            <td>${fmtDue(t.due)||'<span style="color:var(--hint);font-size:11px">—</span>'}</td>
            <td>${t.xp?`<span style="font-family:var(--mono);font-size:12px;color:var(--accent)">+${t.xp}</span>`:'<span style="color:var(--hint)">—</span>'}</td>
            <td style="display:flex;gap:4px;align-items:center">
              <button class="ia" onclick="openTaskDetail(${t.id})" title="Open">↗</button>
              ${!isAdmin&&!t.assigneeId&&t.status==='todo'?`<button class="t-btn" style="font-size:10px;padding:3px 9px;white-space:nowrap" onclick="claimProjectTask(${t.id})">⚔️ Claim</button>`:''}
            </td>
          </tr>`;
        }).join('')||`<tr><td colspan="7" style="text-align:center;padding:2rem;color:var(--hint)">${isAdmin?'No tasks yet. Add the first one!':'No tasks in this project yet.'}</td></tr>`}
      </tbody>
    </table>
  </div>`;
}

// ── Task detail — full page ───────────────────────────
function openTaskDetail(taskId){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t)return;
  taskPageId=taskId;
  projectTaskDetail=taskId;
  pendingAttachments=[];
  taskActivityTab='comments';
  // Render into work-hub-content if available, else main-content
  const target=$('work-hub-content')||$('main-content');
  if(!target)return;
  // hide topbar
  document.getElementById('shell').classList.add('workhub-active');
  renderTaskPage(target,taskId);
}

function renderTaskPage(target, taskId){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t){closeTaskPage();return;}
  const isAdmin=currentUser.role==='admin';
  const pri=PRI_STYLE[t.priority]||PRI_STYLE.Medium;
  const sm=getStatusMeta(t.status,t.projectId||activeProjectId);
  const assigneeEmp=employees.find(e=>e.id===t.assigneeId);
  const isAssignee=t.assigneeId===currentUser.id;
  const proj=projects.find(p=>p.id===t.projectId);
  if(!t.activity)t.activity=[];
  if(!t.descHtml)t.descHtml=t.desc?`<p>${esc(t.desc)}</p>`:'';
  if(!t.comments)t.comments=[];
  const hub=isAdmin?'a-workhub':'e-workhub';

  target.innerHTML=`
  <div class="task-page">
    <!-- LEFT: main content -->
    <div class="task-page-left">
      <!-- Breadcrumb + back -->
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:1rem;font-size:12px;color:var(--muted)">
        <button onclick="closeTaskPage()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:13px;padding:4px 8px;border-radius:var(--r-sm);transition:all .12s;font-family:var(--font)" onmouseover="this.style.background='var(--surface)';this.style.color='var(--text)'" onmouseout="this.style.background='none';this.style.color='var(--muted)'">← Back</button>
        <span>·</span>
        <span style="display:flex;align-items:center;gap:4px"><span style="width:8px;height:8px;border-radius:2px;background:${proj?.color||'#5AB4FF'};display:inline-block"></span>${esc(proj?.name||'Project')}</span>
        <span>·</span><span>${esc(t.title.slice(0,30))}${t.title.length>30?'…':''}</span>
      </div>

      <!-- Title -->
      <textarea class="task-page-title" id="task-title-input" rows="1"
        onkeydown="if(event.key==='Enter'){event.preventDefault()}"
        oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px';saveTaskTitle(${t.id},this.value)"
        ${isAdmin?'':' readonly'}>${esc(t.title)}</textarea>

      <!-- Description -->
      <div style="margin-top:1.25rem">
        <div style="font-size:11px;font-weight:700;color:var(--hint);text-transform:uppercase;letter-spacing:.5px;margin-bottom:6px">Description</div>
        <div class="rich-editor-wrap" id="desc-editor-wrap">
          ${isAdmin?`
          <div class="rich-toolbar">
            <button class="rich-btn" title="Bold" onclick="execRich('bold')" style="font-weight:700">B</button>
            <button class="rich-btn" title="Italic" onclick="execRich('italic')" style="font-style:italic">I</button>
            <button class="rich-btn" title="Underline" onclick="execRich('underline')" style="text-decoration:underline">U</button>
            <div class="rich-sep"></div>
            <button class="rich-btn" title="Heading" onclick="execRich('formatBlock','H3')">H</button>
            <button class="rich-btn" title="Bullet list" onclick="execRich('insertUnorderedList')">• ≡</button>
            <button class="rich-btn" title="Numbered list" onclick="execRich('insertOrderedList')">1 ≡</button>
            <button class="rich-btn" title="Quote" onclick="execRich('formatBlock','BLOCKQUOTE')">"</button>
            <button class="rich-btn" title="Code" onclick="wrapCode()">&#60;/&#62;</button>
            <div class="rich-sep"></div>
            <button class="rich-btn" title="Add link" onclick="addLink()" style="font-size:11px">🔗</button>
            <button class="rich-btn" title="Add image URL" onclick="addImage()" style="font-size:11px">🖼</button>
          </div>`:''}
          <div class="rich-content" id="task-desc-editor" ${isAdmin?'contenteditable="true"':''} data-placeholder="Add a description… (supports rich text, links, images)"
            onblur="saveTaskDesc(${t.id})">${t.descHtml?sanitizeRichHTML(t.descHtml):'<p>No description yet.</p>'}</div>
        </div>
      </div>

      <!-- Activity / Comments -->
      <div class="activity-section">
        <div class="activity-tabs">
          <button class="activity-tab${taskActivityTab==='comments'?' active':''}" onclick="taskActivityTab='comments';renderTaskPage($('work-hub-content')||$('main-content'),${t.id})">💬 Comments (${t.comments.length})</button>
          <button class="activity-tab${taskActivityTab==='activity'?' active':''}" onclick="taskActivityTab='activity';renderTaskPage($('work-hub-content')||$('main-content'),${t.id})">📋 Activity</button>
        </div>

        ${taskActivityTab==='comments'?`
          ${t.comments.map(cm=>{
            const emp=employees.find(e=>e.name===cm.author);
            return`<div class="comment-card">
              <div class="comment-av">${emp?avEmoji(emp):'👤'}</div>
              <div class="comment-bubble">
                <div class="comment-header">
                  <span class="comment-name">${esc(cm.author)}</span>
                  <span class="comment-time">${cm.time}</span>
                </div>
                <div class="comment-body">${cm.html?sanitizeRichHTML(cm.html):esc(cm.text)}</div>
                ${(cm.attachments||[]).length?`<div class="comment-attachments">
                  ${cm.attachments.map(a=>`<div class="attachment-chip"><span class="att-icon">${fileIcon(a.type)}</span><span>${esc(a.name)}</span></div>`).join('')}
                </div>`:''}
              </div>
            </div>`;
          }).join('')||'<div style="font-size:13px;color:var(--hint);padding:1rem 0">No comments yet. Start the conversation!</div>'}

          <!-- Comment composer -->
          <div class="comment-card">
            <div class="comment-av">${avEmoji(currentUser)}</div>
            <div style="flex:1">
              <div class="comment-composer">
                <div class="comment-composer-toolbar">
                  <button class="rich-btn" title="Bold" onclick="execComment('bold')" style="font-weight:700">B</button>
                  <button class="rich-btn" title="Italic" onclick="execComment('italic')" style="font-style:italic">I</button>
                  <button class="rich-btn" title="Bullet list" onclick="execComment('insertUnorderedList')">• ≡</button>
                  <button class="rich-btn" title="Code" onclick="execComment('formatBlock','PRE')">&#60;/&#62;</button>
                  <div class="rich-sep"></div>
                  <button class="rich-btn" title="Add link" onclick="addCommentLink()" style="font-size:11px">🔗</button>
                  <label class="rich-btn" title="Attach file" style="cursor:pointer;font-size:11px">
                    📎<input type="file" multiple style="display:none" onchange="stageAttachments(this.files,${t.id})">
                  </label>
                  <label class="rich-btn" title="Attach image" style="cursor:pointer;font-size:11px">
                    🖼<input type="file" accept="image/*" multiple style="display:none" onchange="stageAttachments(this.files,${t.id})">
                  </label>
                </div>
                <div class="comment-input-area" id="comment-editor" contenteditable="true" data-placeholder="Write a comment…"></div>
                ${pendingAttachments.length?`<div class="attachment-preview-list">
                  ${pendingAttachments.map((a,i)=>`<div class="attachment-chip">${fileIcon(a.type)} ${esc(a.name)} <button onclick="removeAttachment(${i},${t.id})" style="background:none;border:none;cursor:pointer;color:var(--red);font-size:12px;margin-left:4px">×</button></div>`).join('')}
                </div>`:''}
                <div class="comment-footer">
                  <span style="font-size:11px;color:var(--hint)">Enter to new line · Ctrl+Enter to post</span>
                  <button class="btn btn-accent" style="padding:5px 14px;font-size:12px" onclick="postComment(${t.id})">Post comment</button>
                </div>
              </div>
            </div>
          </div>
        `:`
          ${(t.activity||[]).length===0?'<div style="font-size:13px;color:var(--hint);padding:1rem 0">No activity recorded yet.</div>':
            [...t.activity].reverse().map(a=>`<div class="activity-item">
              <div class="activity-dot"></div>
              <div><strong>${esc(a.who)}</strong> ${esc(a.action)} <span style="color:var(--hint)">${a.time}</span></div>
            </div>`).join('')}
        `}
      </div>
    </div>

    <!-- RIGHT: meta panel -->
    <div class="task-page-right">
      <!-- Status -->
      <div class="task-meta-row">
        <div class="task-meta-label">Status</div>
        <div class="task-meta-value">
          ${getProjectColumns(t.projectId||activeProjectId).map(col=>{const active=t.status===col.id;return`
            <button class="status-badge" style="background:${active?col.color+'22':'var(--bg3)'};color:${col.color};border:1px solid ${active?col.color+'44':'var(--border)'}"
              onclick="quickMoveTask(${t.id},'${col.id}')">${esc(col.label)}</button>`;}).join('')}
        </div>
      </div>

      <!-- Priority -->
      <div class="task-meta-row">
        <div class="task-meta-label">Priority</div>
        <div class="task-meta-value">
          ${PRIORITIES.map(p=>{const pc=PRI_STYLE[p];return`
            <button class="meta-btn" style="${t.priority===p?'border-color:var(--accent);color:var(--accent)':''}"
              onclick="quickSetPriority(${t.id},'${p}')">${pc.icon} ${p}</button>`;}).join('')}
        </div>
      </div>

      <!-- Assignee -->
      <div class="task-meta-row">
        <div class="task-meta-label">Assignee</div>
        <div class="task-meta-value">
          ${employees.filter(e=>e.role==='employee').map(e=>`
            <div onclick="${isAdmin?`quickAssign(${t.id},'${e.id}')`:''}" style="display:flex;align-items:center;gap:6px;padding:4px 8px;border-radius:var(--r-sm);background:${t.assigneeId===e.id?'rgba(232,255,71,.1)':'var(--bg3)'};border:1px solid ${t.assigneeId===e.id?'rgba(232,255,71,.3)':'var(--border)'};cursor:${isAdmin?'pointer':'default'};transition:all .12s">
              <span style="font-size:16px">${avEmoji(e)}</span>
              <span style="font-size:12px">${esc(e.name)}</span>
              ${t.assigneeId===e.id?'<span style="font-size:10px;color:var(--accent);margin-left:auto">✓</span>':''}
            </div>`).join('')}
          ${!isAdmin&&!t.assigneeId&&t.status==='todo'?`<button class="btn btn-accent" style="width:100%;padding:6px;font-size:12px;margin-top:4px" onclick="claimProjectTask(${t.id})">⚔️ Claim this task</button>`:''}
        </div>
      </div>

      <!-- Due date -->
      <div class="task-meta-row">
        <div class="task-meta-label">Due date</div>
        <div class="task-meta-value">
          ${isAdmin?`<input type="date" value="${t.due||''}" style="background:var(--bg3);border:1px solid var(--border-s);border-radius:var(--r-sm);padding:5px 8px;font-size:12px;font-family:var(--font);color:var(--text);outline:none" onchange="quickSetDue(${t.id},this.value)">`
          :fmtDue(t.due)||'<span style="color:var(--hint);font-size:12px">Not set</span>'}
        </div>
      </div>

      <!-- XP -->
      <div class="task-meta-row">
        <div class="task-meta-label">XP Reward</div>
        <div class="task-meta-value">
          ${isAdmin?`<input type="number" value="${t.xp||0}" min="0" max="200" style="width:80px;background:var(--bg3);border:1px solid var(--border-s);border-radius:var(--r-sm);padding:5px 8px;font-size:12px;font-family:var(--mono);color:var(--accent);outline:none" onchange="quickSetXP(${t.id},this.value)">`
          :t.xp?`<span style="font-family:var(--mono);font-size:14px;font-weight:700;color:var(--accent)">+${t.xp} XP</span>`:'<span style="color:var(--hint)">None</span>'}
        </div>
      </div>

      <!-- Admin actions -->
      ${isAdmin?`<div class="task-meta-row">
        <div class="task-meta-label">Actions</div>
        <div class="task-meta-value" style="flex-direction:column;gap:5px">
          <button class="btn btn-ghost" style="width:100%;font-size:12px;justify-content:flex-start" onclick="openEditTaskModal(${t.id})">✏️ Edit task</button>
          <button class="btn btn-danger" style="width:100%;font-size:12px;justify-content:flex-start" onclick="deleteProjectTask(${t.id})">🗑 Delete task</button>
        </div>
      </div>`:''}

      <!-- Created info -->
      <div style="margin-top:1rem;font-size:11px;color:var(--hint);line-height:1.8">
        Created by ${esc(employees.find(e=>e.id===t.createdBy)?.name||'Unknown')}<br>
        Project: ${esc(proj?.name||'—')}
      </div>
    </div>
  </div>`;

  // Auto-resize title
  const titleEl=$('task-title-input');
  if(titleEl){titleEl.style.height='auto';titleEl.style.height=titleEl.scrollHeight+'px';}
}

function closeTaskPage(){
  taskPageId=null;
  document.getElementById('shell').classList.remove('workhub-active');
  // go back to the project board
  const isAdmin=currentUser.role==='admin';
  if(activeProjectId){
    activeWorkTab='proj-'+activeProjectId;
    switchPanel(isAdmin?'a-workhub':'e-workhub');
  } else {
    activeWorkTab='standup';
    switchPanel(isAdmin?'a-workhub':'e-workhub');
  }
}

// ── Rich text helpers ─────────────────────────────────
function execRich(cmd,val){
  const ed=$('task-desc-editor');
  if(!ed)return;
  ed.focus();
  document.execCommand(cmd,false,val||null);
}
function execComment(cmd,val){
  const ed=$('comment-editor');
  if(!ed)return;
  ed.focus();
  document.execCommand(cmd,false,val||null);
}
function wrapCode(){
  const sel=window.getSelection();
  if(!sel.rangeCount)return;
  const r=sel.getRangeAt(0);
  const code=document.createElement('code');
  try{r.surroundContents(code);}catch(e){document.execCommand('insertHTML',false,'<code>code</code>');}
}
function addLink(){
  const url=prompt('Enter URL:');
  if(!url)return;
  const href=safeUrl(url);
  if(!href){toast('Use a safe http, https, mailto, or tel link.',false);return;}
  const text=window.getSelection().toString()||url;
  document.execCommand('insertHTML',false,`<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${esc(text)}</a>`);
}
function addImage(){
  const url=prompt('Enter image URL:');
  if(!url)return;
  const src=safeUrl(url,{image:true});
  if(!src){toast('Use a safe http or https image URL.',false);return;}
  const ed=$('task-desc-editor');
  if(ed){ed.focus();document.execCommand('insertHTML',false,`<img src="${escAttr(src)}" alt="image">`);}
}
function addCommentLink(){
  const url=prompt('Enter URL:');
  if(!url)return;
  const href=safeUrl(url);
  if(!href){toast('Use a safe http, https, mailto, or tel link.',false);return;}
  const ed=$('comment-editor');
  if(ed){ed.focus();document.execCommand('insertHTML',false,`<a href="${escAttr(href)}" target="_blank" rel="noopener noreferrer">${esc(url)}</a>`);}
}

// ── Attachments ───────────────────────────────────────
function fileIcon(type){
  if(!type)return'📎';
  if(type.startsWith('image/'))return'🖼';
  if(type.includes('pdf'))return'📄';
  if(type.includes('word')||type.includes('doc'))return'📝';
  if(type.includes('sheet')||type.includes('excel')||type.includes('csv'))return'📊';
  if(type.includes('zip')||type.includes('rar'))return'🗜';
  if(type.includes('video'))return'🎬';
  if(type.includes('audio'))return'🎵';
  return'📎';
}
function stageAttachments(files,taskId){
  for(const f of files){pendingAttachments.push({name:f.name,type:f.type,size:f.size});}
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}
function removeAttachment(idx,taskId){
  pendingAttachments.splice(idx,1);
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}

// ── Post comment ──────────────────────────────────────
function postComment(taskId){
  const t=projectTasks.find(x=>x.id===taskId);
  const ed=$('comment-editor');
  if(!t||!ed)return;
  const html=sanitizeRichHTML(ed.innerHTML.trim());
  const text=ed.innerText.trim();
  if(!text&&!pendingAttachments.length){toast('Write something first!',false);return;}
  if(!t.comments)t.comments=[];
  t.comments.push({
    author:currentUser.name,
    text,html,
    time:'Just now',
    attachments:[...pendingAttachments]
  });
  if(!t.activity)t.activity=[];
  t.activity.push({who:currentUser.name,action:'added a comment',time:'Just now'});
  pendingAttachments=[];
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}

// ── Save desc / title (debounced) ─────────────────────
let _descTimer=null;
function saveTaskDesc(taskId){
  clearTimeout(_descTimer);
  _descTimer=setTimeout(()=>{
    const ed=$('task-desc-editor');
    const t=projectTasks.find(x=>x.id===taskId);
    if(!ed||!t)return;
    t.descHtml=sanitizeRichHTML(ed.innerHTML);
    t.desc=ed.innerText;
  },600);
}
function saveTaskTitle(taskId,val){
  const t=projectTasks.find(x=>x.id===taskId);
  if(t)t.title=val.trim()||t.title;
}

// ── Quick meta updates ────────────────────────────────
function quickMoveTask(taskId,newStatus){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t)return;
  const isDoneCol=(s)=>{const cols=getProjectColumns(t.projectId||activeProjectId);const col=cols.find(c=>c.id===s);return col&&(col.id==='done'||col.label.toLowerCase()==='done'||cols.indexOf(col)===cols.length-1);};
  const wasDone=isDoneCol(t.status);
  t.status=newStatus;
  if(!t.activity)t.activity=[];
  t.activity.push({who:currentUser.name,action:`moved to ${getStatusMeta(newStatus,t.projectId||activeProjectId).label}`,time:'Just now'});
  if(isDoneCol(newStatus)&&!wasDone&&t.xp&&t.assigneeId){
    const emp=employees.find(e=>e.id===t.assigneeId);
    if(emp){earnBoth(emp,t.xp,t.xp);updateTopbar();}
    toast(`✅ Done! ${t.assigneeName} earns +${t.xp} XP!`);
  } else toast(`Status → ${getStatusMeta(newStatus,t.projectId||activeProjectId).label}`);
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}
function quickSetPriority(taskId,pri){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t)return;
  t.priority=pri;
  if(!t.activity)t.activity=[];
  t.activity.push({who:currentUser.name,action:`set priority to ${pri}`,time:'Just now'});
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}
function quickAssign(taskId,empId){
  const t=projectTasks.find(x=>x.id===taskId);
  const emp=employees.find(e=>e.id===empId);
  if(!t||!emp)return;
  t.assigneeId=t.assigneeId===empId?'':empId;
  t.assigneeName=t.assigneeId?emp.name:'Unassigned';
  if(!t.activity)t.activity=[];
  t.activity.push({who:currentUser.name,action:`${t.assigneeId?'assigned to '+emp.name:'unassigned'}`,time:'Just now'});
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}
function quickSetDue(taskId,val){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t)return;
  t.due=val;
  if(!t.activity)t.activity=[];
  t.activity.push({who:currentUser.name,action:`set due date to ${val}`,time:'Just now'});
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}
function quickSetXP(taskId,val){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t)return;
  t.xp=parseInt(val)||0;
  renderTaskPage($('work-hub-content')||$('main-content'),taskId);
}

function claimProjectTask(taskId){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t||t.assigneeId){toast('Task already claimed!',false);return}
  t.assigneeId=currentUser.id;
  t.assigneeName=currentUser.name;
  t.status='inprogress';
  closeModal('modal-task-detail');
  toast(`⚔️ Task claimed! "${t.title}" is now yours. Move it to Done when complete${t.xp?' and earn +'+t.xp+' XP!':'.'}`);
  activeProjectId=null;activeWorkTab='standup';switchPanel(currentUser.role==='admin'?'a-workhub':'e-workhub');
}

function moveTask(taskId,newStatus){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t)return;
  const isDoneCol=(s)=>{const cols=getProjectColumns(t.projectId||activeProjectId);const col=cols.find(c=>c.id===s);return col&&(col.id==='done'||col.label.toLowerCase()==='done'||cols.indexOf(col)===cols.length-1);};
  const wasDone=isDoneCol(t.status);
  t.status=newStatus;
  if(isDoneCol(newStatus)&&!wasDone&&t.xp&&t.assigneeId){
    const emp=employees.find(e=>e.id===t.assigneeId);
    if(emp){
      earnBoth(emp,t.xp,t.xp);updateTopbar();
      toast(`✅ "${t.title}" done! ${t.assigneeName} earns +${t.xp} XP!`);
    }
  } else {
    toast(`Status → ${getStatusMeta(newStatus,t.projectId||activeProjectId).label}`);
  }
  closeModal('modal-task-detail');
  activeProjectId=null;activeWorkTab='standup';switchPanel(currentUser.role==='admin'?'a-workhub':'e-workhub');
}

// addComment replaced by postComment

// ── Project CRUD ──────────────────────────────────────
let editProjectId=null;
function openNewProjectModal(){
  editProjectId=null;
  $('proj-modal-title').textContent='📁 New Project';
  ['proj-name','proj-desc'].forEach(id=>$(id).value='');
  $('proj-team').value='Devs';$('proj-color').value='#5AB4FF';
  openModal('modal-project');
}
function openEditProjectModal(id){
  const p=projects.find(x=>x.id===id);if(!p)return;
  editProjectId=id;
  $('proj-modal-title').textContent='✏️ Edit Project';
  $('proj-name').value=p.name;$('proj-desc').value=p.desc;
  $('proj-team').value=p.team||'';$('proj-color').value=p.color;
  openModal('modal-project');
}
function saveProject(){
  const name=$('proj-name').value.trim();
  if(!name){toast('Project needs a name!',false);return}
  if(editProjectId){
    const p=projects.find(x=>x.id===editProjectId);
    if(p){p.name=name;p.desc=$('proj-desc').value.trim();p.team=$('proj-team').value;p.color=$('proj-color').value;}
    toast('Project updated!');
  } else {
    projects.push({id:nextProjectId++,name,desc:$('proj-desc').value.trim(),color:$('proj-color').value,team:$('proj-team').value,createdBy:currentUser.id,createdAt:new Date().toISOString().slice(0,10)});
    toast('📁 Project created!');
  }
  closeModal('modal-project');
  activeProjectId=null;activeWorkTab='standup';switchPanel(currentUser.role==='admin'?'a-workhub':'e-workhub');
}
function deleteProject(id){
  deleteAction=()=>{
    projects=projects.filter(p=>p.id!==id);
    projectTasks=projectTasks.filter(t=>t.projectId!==id);
    if(activeProjectId===id)activeProjectId=null;
    activeProjectId=null;activeWorkTab='standup';switchPanel('a-workhub');toast('Project deleted.');
  };
  $('del-modal-title').textContent='Delete project?';
  $('del-modal-msg').textContent='This will permanently delete the project and all its tasks.';
  openModal('modal-delete');
}

// ── Task CRUD ─────────────────────────────────────────
let editProjectTaskId=null;
function openNewTaskModal(projectId,defaultStatus='todo'){
  editProjectTaskId=null;
  $('ptask-modal-title').textContent='➕ Add task';
  ['pt-title','pt-desc'].forEach(id=>$(id).value='');
  $('pt-priority').value='Medium';$('pt-xp').value=0;
  $('pt-due').value=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
  $('pt-assignee').dataset.projectId=projectId;
  $('pt-assignee').dataset.defaultStatus=defaultStatus;
  // populate assignees
  const proj=projects.find(p=>p.id==projectId);
  const teamKey=proj?.team;
  const eligible=teamKey&&GUILD_TEAMS[teamKey]?getTeamMembers(teamKey):employees.filter(e=>e.role==='employee');
  $('pt-assignee').innerHTML='<option value="">Unassigned</option>'+eligible.map(e=>`<option value="${e.id}">${avEmoji(e)} ${esc(e.name)}</option>`).join('');
  openModal('modal-ptask');
}
function openEditTaskModal(taskId){
  const t=projectTasks.find(x=>x.id===taskId);if(!t)return;
  editProjectTaskId=taskId;
  $('ptask-modal-title').textContent='✏️ Edit task';
  $('pt-title').value=t.title;$('pt-desc').value=t.desc||'';
  $('pt-priority').value=t.priority;$('pt-xp').value=t.xp||0;
  $('pt-due').value=t.due||'';
  const proj=projects.find(p=>p.id===t.projectId);
  const teamKey=proj?.team;
  const eligible=teamKey&&GUILD_TEAMS[teamKey]?getTeamMembers(teamKey):employees.filter(e=>e.role==='employee');
  $('pt-assignee').innerHTML='<option value="">Unassigned</option>'+eligible.map(e=>`<option value="${e.id}">${avEmoji(e)} ${esc(e.name)}</option>`).join('');
  $('pt-assignee').value=t.assigneeId||'';
  closeModal('modal-task-detail');
  openModal('modal-ptask');
}
function saveProjectTask(){
  const title=$('pt-title').value.trim();
  if(!title){toast('Task needs a title!',false);return}
  const assigneeId=$('pt-assignee').value;
  const assigneeEmp=employees.find(e=>e.id===assigneeId);
  const data={
    title,desc:$('pt-desc').value.trim(),
    assigneeId,assigneeName:assigneeEmp?assigneeEmp.name:'Unassigned',
    priority:$('pt-priority').value,
    due:$('pt-due').value,
    xp:parseInt($('pt-xp').value)||0,
  };
  if(editProjectTaskId){
    const t=projectTasks.find(x=>x.id===editProjectTaskId);
    if(t)Object.assign(t,data);
    toast('Task updated!');
  } else {
    const projectId=parseInt($('pt-assignee').dataset.projectId);
    const defaultStatus=$('pt-assignee').dataset.defaultStatus||(getProjectColumns(projectId)[0]?.id||'todo');
    projectTasks.push({id:nextProjectTaskId++,projectId,...data,status:defaultStatus,createdBy:currentUser.id,comments:[]});
    if(data.assigneeId) pushNotif(data.assigneeId,'📋',`You were assigned "${data.title}" in ${projects.find(p=>p.id==projectId)?.name||'a project'}.`,'e-projects');
    toast('✅ Task added!');
  }
  closeModal('modal-ptask');
  activeProjectId=null;activeWorkTab='standup';switchPanel(currentUser.role==='admin'?'a-workhub':'e-workhub');
}
function deleteProjectTask(taskId){
  closeModal('modal-task-detail');
  deleteAction=()=>{
    projectTasks=projectTasks.filter(t=>t.id!==taskId);
    activeProjectId=null;activeWorkTab='standup';switchPanel(currentUser.role==='admin'?'a-workhub':'e-workhub');toast('Task deleted.');
  };
  $('del-modal-title').textContent='Delete task?';
  $('del-modal-msg').textContent='This will permanently remove this task.';
  openModal('modal-delete');
}

// ══════════════════════════════════════════════════════
//  NOTIFICATIONS
// ══════════════════════════════════════════════════════
function getMyNotifs(){
  return notifications[currentUser?.id] || [];
}
function getUnreadCount(){
  return getMyNotifs().filter(n=>!n.read).length;
}
function pushNotif(empId, icon, text, panel){
  if(!notifications[empId]) notifications[empId]=[];
  notifications[empId].unshift({id:nextNotifId++,icon,text,time:'Just now',read:false,panel});
  if(currentUser&&currentUser.id===empId) refreshNotifBadge();
}
function refreshNotifBadge(){
  const count=getUnreadCount();
  const badge=$('notif-badge');
  if(badge){badge.textContent=count;badge.style.display=count>0?'flex':'none';}
}
function toggleNotifDropdown(){
  const dd=$('notif-dropdown');
  if(!dd)return;
  const open=dd.style.display==='block';
  if(open){dd.style.display='none';}
  else{renderNotifDropdown();dd.style.display='block';}
}
function closeNotifDropdown(){
  const dd=$('notif-dropdown');
  if(dd)dd.style.display='none';
}
document.addEventListener('click',e=>{
  const bell=$('notif-bell');
  const dd=$('notif-dropdown');
  if(bell&&dd&&!bell.contains(e.target)&&!dd.contains(e.target))dd.style.display='none';
});
function renderNotifDropdown(){
  const list=$('notif-dd-list');
  if(!list)return;
  const notifs=getMyNotifs().slice(0,6);
  if(!notifs.length){list.innerHTML='<div class="notif-empty">All caught up! 🎉</div>';return;}
  list.innerHTML=notifs.map(n=>`
    <div class="notif-item-wrap">
      <div class="notif-item${n.read?'':' unread'}" onclick="notifClick('${currentUser.id}',${n.id},'${n.panel||''}')">
        <div class="notif-icon">${n.icon}</div>
        <div class="notif-body">
          <div class="notif-text">${esc(n.text)}</div>
          <div class="notif-time">${n.time}</div>
        </div>
      </div>
    </div>`).join('');
}
function notifClick(empId, notifId, panel){
  const notifs=notifications[empId]||[];
  const n=notifs.find(x=>x.id===notifId);
  if(n)n.read=true;
  refreshNotifBadge();
  closeNotifDropdown();
  if(panel)switchPanel(panel);
}
function markAllRead(){
  const notifs=notifications[currentUser?.id]||[];
  notifs.forEach(n=>n.read=true);
  refreshNotifBadge();
  renderNotifDropdown();
}

function renderNotifications(el){
  const notifs=getMyNotifs();
  const unread=notifs.filter(n=>!n.read);
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">🔔 Notifications</div><div class="page-sub">${unread.length} unread</div></div>
      ${unread.length?`<button class="btn btn-ghost" onclick="markAllRead();switchPanel('${currentUser.role==='admin'?'a':'e'}-notifications')">✓ Mark all read</button>`:''}
    </div>
    ${notifs.length===0?'<div class="empty">No notifications yet. Get active!</div>':
      notifs.map(n=>`
        <div style="display:flex;align-items:flex-start;gap:12px;padding:13px 16px;background:var(--surface);border:1px solid ${n.read?'var(--border)':'rgba(232,255,71,.2)'};border-radius:var(--r-md);margin-bottom:8px;cursor:pointer;transition:border-color .15s" onclick="notifClick('${currentUser.id}',${n.id},'${n.panel||''}')">
          <div style="font-size:22px;flex-shrink:0">${n.icon}</div>
          <div style="flex:1">
            <div style="font-size:13px;color:var(--text);line-height:1.5">${esc(n.text)}</div>
            <div style="font-size:11px;color:var(--hint);margin-top:3px">${n.time}</div>
          </div>
          ${!n.read?'<div style="width:8px;height:8px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:5px"></div>':''}
        </div>`).join('')}`;
}

// Patch toast to also push a notification where relevant
const _origToast = toast;
function toastAndNotify(msg, ok=true, targetId=null, icon='📣', panel=''){
  _origToast(msg, ok);
  if(targetId) pushNotif(targetId, icon, msg.replace(/^[^\w]/,'').trim(), panel);
}

// ══════════════════════════════════════════════════════
//  CHAT
// ══════════════════════════════════════════════════════
function getAllChannels(){
  const projChannels=projects.map(p=>({
    id:'proj-'+p.id,type:'project',name:p.name,icon:'📁',desc:'Project discussion',color:p.color
  }));
  return [...chatChannels,...projChannels];
}
function getDMKey(a,b){return [a,b].sort().join(':');}
function totalChatUnread(){return Object.values(chatUnread).reduce((s,v)=>s+v,0)+Object.values(threadUnread).reduce((s,v)=>s+v,0);}
function refreshChatBadge(){
  const b=$('chat-badge'),t=totalChatUnread();
  if(b){b.textContent=t;b.style.display=t>0?'flex':'none';}
}

// ── Create channel ────────────────────────────────────
function openNewChannelModal(){
  $('new-ch-name').value='';$('new-ch-desc').value='';
  openModal('modal-new-channel');
}
function createChannel(){
  const name=$('new-ch-name').value.trim();
  if(!name){toast('Channel needs a name!',false);return}
  if(chatChannels.find(ch=>ch.id===name)){toast('Channel already exists!',false);return}
  chatChannels.push({id:name,type:'public',name,icon:'#',desc:$('new-ch-desc').value.trim()});
  closeModal('modal-new-channel');
  toast(`#${name} created!`);
  openChannel(name);
}

// ── Navigation ────────────────────────────────────────
function openChannel(id){
  activeChatChannel=id;activeDMUser=null;activeTaskThread=null;
  activeThreadMsgId=null;activeThreadChannel=null;
  delete chatUnread[id];refreshChatBadge();
  switchPanel(currentUser.role==='admin'?'a-chat':'e-chat');
}
function openDM(empId){
  activeDMUser=empId;activeChatChannel=null;activeTaskThread=null;
  activeThreadMsgId=null;activeThreadChannel=null;
  const key=getDMKey(currentUser.id,empId);
  delete chatUnread[key];refreshChatBadge();
  switchPanel(currentUser.role==='admin'?'a-chat':'e-chat');
}
function openTaskThread(taskId){
  activeTaskThread=taskId;activeDMUser=null;activeChatChannel='task-'+taskId;
  activeThreadMsgId=null;activeThreadChannel=null;
  const key='task-'+taskId;
  delete chatUnread[key];refreshChatBadge();
  switchPanel(currentUser.role==='admin'?'a-chat':'e-chat');
}
function openThread(chKey,msgId){
  activeThreadMsgId=msgId;activeThreadChannel=chKey;
  // clear unread for this thread
  delete threadUnread[chKey+':'+msgId];
  refreshChatBadge();
  // re-render main area with thread panel open
  const area=$('chat-main-area');
  if(area){
    const isDM=activeDMUser!=null;
    const isTask=activeTaskThread!=null;
    if(isDM) area.innerHTML=renderDMArea(activeDMUser);
    else if(isTask) area.innerHTML=renderTaskThreadArea(activeTaskThread);
    else area.innerHTML=renderChannelArea(activeChatChannel);
    injectThreadPanel(chKey,msgId);
    setTimeout(()=>{
      const m=$('chat-messages-area');if(m)m.scrollTop=m.scrollHeight;
      const t=$('thread-messages-area');if(t)t.scrollTop=t.scrollHeight;
    },30);
  }
}
function closeThread(){
  activeThreadMsgId=null;activeThreadChannel=null;
  const panel=$('thread-panel');
  if(panel)panel.remove();
}

// ── Render: main chat ─────────────────────────────────
function renderChat(el){
  el.innerHTML='';el.style.padding='0';el.style.margin='0';
  const isAdmin=currentUser.role==='admin';
  const channels=getAllChannels();
  const dmEmps=employees.filter(e=>e.id!==currentUser.id);
  const myTasks=isAdmin
    ?projectTasks.slice(0,8)
    :projectTasks.filter(t=>t.assigneeId===currentUser.id||t.createdBy===currentUser.id);

  let mainHTML;
  if(activeDMUser) mainHTML=renderDMArea(activeDMUser);
  else if(activeTaskThread) mainHTML=renderTaskThreadArea(activeTaskThread);
  else mainHTML=renderChannelArea(activeChatChannel||'general');

  el.innerHTML=`<div class="chat-layout">
    <div class="chat-sidebar">

      <div class="chat-sidebar-section">
        Channels
        ${isAdmin?`<button onclick="openNewChannelModal()" title="Add channel">＋</button>`:''}
      </div>
      ${channels.filter(ch=>ch.type==='public').map(ch=>chatChHTML(ch)).join('')}

      <div class="chat-sidebar-section">Direct Messages</div>
      ${dmEmps.map(e=>{
        const key=getDMKey(currentUser.id,e.id);
        const unread=chatUnread[key]||0;
        const active=activeDMUser===e.id;
        return`<div class="chat-ch${active?' active':''}" onclick="openDM('${e.id}')">
          <span class="chat-ch-icon" style="font-size:16px">${avEmoji(e)}</span>
          <span class="chat-ch-name">${esc(e.name)}</span>
          ${unread?`<span class="chat-ch-badge">${unread}</span>`:''}
        </div>`;
      }).join('')}
    </div>

    <div class="chat-main" id="chat-main-area">${mainHTML}</div>
  </div>`;

  setTimeout(()=>{
    const m=$('chat-messages-area');if(m)m.scrollTop=m.scrollHeight;
    if(activeThreadMsgId&&activeThreadChannel)injectThreadPanel(activeThreadChannel,activeThreadMsgId);
  },30);
}

function chatChHTML(ch){
  const unread=chatUnread[ch.id]||0;
  const active=!activeDMUser&&!activeTaskThread&&activeChatChannel===ch.id;
  return`<div class="chat-ch${active?' active':''}" onclick="openChannel('${ch.id}')">
    <span class="chat-ch-icon">${ch.icon}</span>
    <span class="chat-ch-name">${esc(ch.name)}</span>
    ${unread?`<span class="chat-ch-badge">${unread}</span>`:''}
  </div>`;
}

// ── Render: channel messages ──────────────────────────
function renderChannelArea(chId){
  const allCh=getAllChannels();
  const ch=allCh.find(c=>c.id===chId)||{name:chId,icon:'#',desc:''};
  const msgs=(chatMessages[chId]||[]);
  const isAdmin=currentUser.role==='admin';
  return`
    <div class="chat-header">
      <span style="font-size:20px">${ch.icon}</span>
      <div>
        <div class="chat-header-name">${esc(ch.name)}</div>
        ${ch.desc?`<div class="chat-header-desc">${esc(ch.desc)}</div>`:''}
      </div>
      ${isAdmin&&ch.type==='public'&&ch.id!=='general'&&ch.id!=='announcements'?`
        <button class="ia danger" style="margin-left:auto" onclick="deleteChannel('${ch.id}')" title="Delete channel">🗑</button>`:''}
    </div>
    <div class="chat-messages" id="chat-messages-area">
      ${msgs.length===0?'<div class="empty" style="margin:auto">No messages yet. Start the conversation! 👋</div>':
        renderMessageList(msgs,chId,'channel')}
    </div>
    ${renderInputBox(chId,'channel')}`;
}

// ── Render: DM area ────────────────────────────────────
function renderDMArea(empId){
  const emp=employees.find(e=>e.id===empId);
  const key=getDMKey(currentUser.id,empId);
  const msgs=dmMessages[key]||[];
  return`
    <div class="chat-header">
      <span style="font-size:26px">${emp?avEmoji(emp):'👤'}</span>
      <div>
        <div class="chat-header-name">${emp?esc(emp.name):'Unknown'}</div>
        <div class="chat-header-desc">${emp?esc(emp.dept):''}</div>
      </div>
    </div>
    <div class="chat-messages" id="chat-messages-area">
      ${msgs.length===0?`<div class="empty" style="margin:auto">Start a conversation with ${emp?esc(emp.name):'this person'} 👋</div>`:
        renderDMList(msgs,key)}
    </div>
    ${renderInputBox(key,'dm')}`;
}

// ── Render: task thread area ───────────────────────────
function renderTaskThreadArea(taskId){
  const t=projectTasks.find(x=>x.id===taskId);
  if(!t)return'<div class="empty">Task not found.</div>';
  const proj=projects.find(p=>p.id===t.projectId);
  const assigneeEmp=employees.find(e=>e.id===t.assigneeId);
  const key='task-'+taskId;
  const msgs=chatMessages[key]||[];
  const pri=PRI_STYLE[t.priority]||PRI_STYLE.Medium;
  const sm=getStatusMeta(t.status,t.projectId||activeProjectId);
  return`
    <div class="chat-header">
      <span style="font-size:20px">✅</span>
      <div style="flex:1">
        <div class="chat-header-name">${esc(t.title)}</div>
        <div class="chat-header-desc" style="display:flex;gap:5px;align-items:center;flex-wrap:wrap">
          ${proj?`<span>${esc(proj.name)}</span><span>·</span>`:''}
          <span class="pill ${pri.cls}" style="font-size:9px;padding:1px 6px">${t.priority}</span>
          <span class="pill" style="font-size:9px;padding:1px 6px;border:1px solid ${sm.border};color:${sm.color};background:transparent">${sm.label}</span>
          ${assigneeEmp?`<span>→ ${avEmoji(assigneeEmp)} ${esc(assigneeEmp.name)}</span>`:''}
        </div>
      </div>
      <button class="btn btn-ghost" style="font-size:11px;padding:4px 10px;flex-shrink:0" onclick="activeTaskThread=null;openTaskDetail(${taskId})">↗ Open task</button>
    </div>
    <div class="chat-messages" id="chat-messages-area">
      ${msgs.length===0?'<div class="empty" style="margin:auto">No messages yet — discuss this task here 💬</div>':
        renderMessageList(msgs,key,'channel')}
    </div>
    ${renderInputBox(key,'channel')}`;
}

// ── Render message lists ──────────────────────────────
function renderMessageList(msgs,chKey,type){
  return msgs.map((m,i)=>{
    const emp=employees.find(e=>e.id===m.authorId);
    const showHeader=i===0||msgs[i-1].authorId!==m.authorId||msgs[i-1].time!==m.time;
    const threads=m.threads||[];
    const threadSnippet=threads.length?employees.find(e=>e.id===threads[threads.length-1].authorId):'';
    return`<div class="chat-msg-group" id="msg-${m.id}">
      <div class="chat-msg-avatar">${showHeader?(emp?avEmoji(emp):'👤'):''}</div>
      <div class="chat-msg-body">
        ${showHeader?`<div class="chat-msg-header">
          <span class="chat-msg-author">${esc(m.authorName)}</span>
          <span class="chat-msg-time">${m.time}</span>
        </div>`:''}
        <div class="chat-msg-text">${esc(m.text)}</div>
        ${threads.length?`
        <div class="chat-thread-preview" onclick="openThread('${chKey}',${m.id})" style="position:relative">
          ${threadUnread[chKey+':'+m.id]?`<span style="position:absolute;top:6px;right:8px;width:8px;height:8px;border-radius:50%;background:var(--red);display:block"></span>`:''}
          <div class="chat-thread-count">💬 ${threads.length} repl${threads.length===1?'y':'ies'}${threadUnread[chKey+':'+m.id]?` <span style="color:var(--red);font-size:10px">${threadUnread[chKey+':'+m.id]} new</span>`:''}</div>
          <div class="chat-thread-snippet">${threadSnippet?avEmoji(threadSnippet)+' ':''} ${esc((threads[threads.length-1].text||'').slice(0,60))}</div>
        </div>`:''}
      </div>
      <div class="chat-msg-actions">
        <button onclick="openThread('${chKey}',${m.id})" title="Reply in thread">💬</button>
        <button onclick="addReaction('${chKey}',${m.id})" title="React">😊</button>
      </div>
    </div>`;
  }).join('');
}

function renderDMList(msgs,key){
  return msgs.map((m,i)=>{
    const isMe=m.authorId===currentUser.id;
    const emp=employees.find(e=>e.id===m.authorId);
    const showHeader=i===0||msgs[i-1].authorId!==m.authorId;
    return`<div class="chat-msg-group" style="${isMe?'flex-direction:row-reverse':''}" id="msg-${m.id}">
      <div class="chat-msg-avatar">${showHeader?(emp?avEmoji(emp):'👤'):''}</div>
      <div class="chat-msg-body" style="${isMe?'align-items:flex-end;display:flex;flex-direction:column':''}">
        ${showHeader?`<div class="chat-msg-header" style="${isMe?'flex-direction:row-reverse':''}">
          <span class="chat-msg-author">${esc(m.authorName)}</span>
          <span class="chat-msg-time">${m.time}</span>
        </div>`:''}
        <div class="${isMe?'dm-bubble-me':'dm-bubble-them'} chat-msg-text">${esc(m.text)}</div>
      </div>
    </div>`;
  }).join('');
}

function renderInputBox(chKey,type){
  return`<div class="chat-input-wrap">
    <div class="chat-input-box">
      <textarea class="chat-input" id="chat-input-field"
        placeholder="${type==='dm'?'Send a message…':'Message the channel… (Enter to send, Shift+Enter for new line)'}"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendMessage('${chKey}','${type}')}"
        oninput="this.style.height='auto';this.style.height=Math.min(this.scrollHeight,100)+'px'"></textarea>
      <div class="chat-input-toolbar">
        <span class="chat-input-hint">Enter ↵ to send · Shift+Enter for new line · 💬 to reply in thread</span>
        <button class="chat-send" onclick="sendMessage('${chKey}','${type}')">Send</button>
      </div>
    </div>
  </div>`;
}

// ── Thread panel ──────────────────────────────────────
function injectThreadPanel(chKey,msgId){
  const existing=$('thread-panel');
  if(existing)existing.remove();
  const store=chKey.startsWith(getDMKey(currentUser.id,currentUser.id))?dmMessages:chatMessages;
  const msgStore=chKey.split(':').length===2?dmMessages:chatMessages;
  // find the message
  let parentMsg=null;
  const allMsgs=(chatMessages[chKey]||[]).concat(dmMessages[chKey]||[]);
  parentMsg=allMsgs.find(m=>m.id===msgId);
  if(!parentMsg){closeThread();return}
  if(!parentMsg.threads)parentMsg.threads=[];

  const panel=document.createElement('div');
  panel.id='thread-panel';
  panel.className='chat-thread-panel';
  panel.innerHTML=`
    <div class="thread-panel-header">
      <div>
        <div class="thread-panel-title">Thread</div>
        <div style="font-size:11px;color:var(--muted);margin-top:2px">Replying to ${esc(parentMsg.authorName)}</div>
      </div>
      <button onclick="closeThread()" style="background:none;border:none;cursor:pointer;color:var(--muted);font-size:18px;line-height:1">×</button>
    </div>

    <!-- Parent message -->
    <div style="padding:10px 16px;border-bottom:1px solid var(--border);background:rgba(232,255,71,.04)">
      <div style="display:flex;gap:8px">
        <div style="font-size:18px">${(()=>{const e=employees.find(x=>x.id===parentMsg.authorId);return e?avEmoji(e):'👤';})()}</div>
        <div>
          <div style="font-size:12px;font-weight:700">${esc(parentMsg.authorName)} <span style="font-size:10px;color:var(--hint);font-weight:400">${parentMsg.time}</span></div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px;line-height:1.5">${esc(parentMsg.text)}</div>
        </div>
      </div>
    </div>

    <!-- Thread replies -->
    <div class="thread-panel-messages" id="thread-messages-area">
      ${parentMsg.threads.length===0
        ?'<div style="text-align:center;color:var(--hint);font-size:12px;margin:auto">No replies yet. Start the thread!</div>'
        :parentMsg.threads.map(r=>{
          const re=employees.find(x=>x.id===r.authorId);
          return`<div class="thread-msg">
            <div class="thread-msg-av">${re?avEmoji(re):'👤'}</div>
            <div class="thread-msg-body">
              <div><span class="thread-msg-author">${esc(r.authorName)}</span><span class="thread-msg-time">${r.time}</span></div>
              <div class="thread-msg-text">${esc(r.text)}</div>
            </div>
          </div>`;
        }).join('')}
    </div>

    <!-- Thread reply input -->
    <div class="thread-panel-input">
      <textarea class="thread-input" id="thread-input-field"
        placeholder="Reply in thread…"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendThreadReply('${chKey}',${msgId})}"></textarea>
      <div style="display:flex;justify-content:flex-end;margin-top:6px">
        <button class="chat-send" onclick="sendThreadReply('${chKey}',${msgId})">Reply</button>
      </div>
    </div>`;

  const mainArea=$('chat-main-area');
  if(mainArea)mainArea.appendChild(panel);
  setTimeout(()=>{const t=$('thread-messages-area');if(t)t.scrollTop=t.scrollHeight;},20);
}

function sendThreadReply(chKey,msgId){
  const input=$('thread-input-field');
  if(!input)return;
  const text=input.value.trim();
  if(!text)return;
  const allMsgs=(chatMessages[chKey]||[]).concat(dmMessages[chKey]||[]);
  const parentMsg=(chatMessages[chKey]||[]).find(m=>m.id===msgId)||(dmMessages[chKey]||[]).find(m=>m.id===msgId);
  if(!parentMsg)return;
  if(!parentMsg.threads)parentMsg.threads=[];
  parentMsg.threads.push({id:nextChatMsgId++,authorId:currentUser.id,authorName:currentUser.name,text,time:'Just now'});
  // mark as unread for others viewing the channel
  const tKey=chKey+':'+msgId;
  if(!threadUnread[tKey])threadUnread[tKey]=0;
  threadUnread[tKey]++;
  input.value='';
  // re-render thread panel
  injectThreadPanel(chKey,msgId);
  // also refresh main message area to show updated thread count
  const area=$('chat-main-area');
  if(area){
    const tempPanel=$('thread-panel');
    let isDM=activeDMUser!=null,isTask=activeTaskThread!=null;
    if(isDM) area.innerHTML=renderDMArea(activeDMUser);
    else if(isTask) area.innerHTML=renderTaskThreadArea(activeTaskThread);
    else area.innerHTML=renderChannelArea(activeChatChannel||'general');
    if(tempPanel){const newPanel=document.createElement('div');newPanel.id='thread-panel';newPanel.className='chat-thread-panel';newPanel.innerHTML=tempPanel.innerHTML;area.appendChild(newPanel);}
    injectThreadPanel(chKey,msgId);
    setTimeout(()=>{const m=$('chat-messages-area');if(m)m.scrollTop=m.scrollHeight;},20);
  }
}

function addReaction(chKey,msgId){
  // simple: cycle through a few emojis for fun
  const emojis=['👍','🔥','⭐','✅','🎉'];
  const chosen=emojis[Math.floor(Math.random()*emojis.length)];
  toast(`${chosen} Reacted to message`);
}

function deleteChannel(id){
  deleteAction=()=>{
    chatChannels=chatChannels.filter(ch=>ch.id!==id);
    delete chatMessages[id];
    if(activeChatChannel===id)activeChatChannel='general';
    switchPanel(currentUser.role==='admin'?'a-chat':'e-chat');
    toast(`#${id} deleted.`);
  };
  $('del-modal-title').textContent='Delete channel?';
  $('del-modal-msg').textContent=`This will permanently delete #${id} and all its messages.`;
  openModal('modal-delete');
}

// ── Send message ──────────────────────────────────────
function sendMessage(channelKey,type){
  const input=$('chat-input-field');
  if(!input)return;
  const text=input.value.trim();
  if(!text)return;
  const msg={id:nextChatMsgId++,authorId:currentUser.id,authorName:currentUser.name,text,time:'Just now',threads:[]};
  if(type==='dm'){
    if(!dmMessages[channelKey])dmMessages[channelKey]=[];
    dmMessages[channelKey].push(msg);
  } else {
    if(!chatMessages[channelKey])chatMessages[channelKey]=[];
    chatMessages[channelKey].push(msg);
  }
  input.value='';
  input.style.height='auto';
  const area=$('chat-main-area');
  if(area){
    if(type==='dm') area.innerHTML=renderDMArea(activeDMUser);
    else if(activeTaskThread) area.innerHTML=renderTaskThreadArea(activeTaskThread);
    else area.innerHTML=renderChannelArea(activeChatChannel||'general');
    setTimeout(()=>{const m=$('chat-messages-area');if(m)m.scrollTop=m.scrollHeight;},20);
  }
}


// ══════════════════════════════════════════════════════
//  WORK HUB — tabbed panel
// ══════════════════════════════════════════════════════
function renderWorkHubShell(el, isAdmin){
  const hub = isAdmin ? 'a-workhub' : 'e-workhub';
  const fixedTabs = isAdmin
    ? [{id:'standup',icon:'📋',label:'Daily Updates',render:renderAdminDaily},
       {id:'reports',icon:'📈',label:'Reports',render:renderAdminReports}]
    : [{id:'standup',icon:'📋',label:'Daily Standup',render:renderEmpStandup}];

  const allTabs = [
    ...fixedTabs,
    ...projects.map(p=>({
      id:'proj-'+p.id, label:p.name, color:p.color,
      render:(contentEl2)=>{activeProjectId=p.id;renderProjectBoard(contentEl2,isAdmin);}
    }))
  ];

  if(!allTabs.find(t=>t.id===activeWorkTab)) activeWorkTab=fixedTabs[0].id;
  const activeTab = allTabs.find(t=>t.id===activeWorkTab)||allTabs[0];

  // Build tab bar HTML
  const tabBarHTML = `
    <div class="work-hub-tabbar">
      ${fixedTabs.map(t=>`
        <button class="work-tab${activeWorkTab===t.id?' active':''}" onclick="activeWorkTab='${t.id}';activeProjectId=null;switchPanel('${hub}')">
          ${t.icon} ${t.label}
        </button>`).join('')}
      ${projects.map(p=>{const tid='proj-'+p.id;return`
        <button class="work-tab${activeWorkTab===tid?' active':''}" onclick="activeProjectId=${p.id};activeWorkTab='${tid}';switchPanel('${hub}')">
          <span class="proj-dot" style="background:${p.color}"></span>${esc(p.name)}
        </button>`;}).join('')}
      ${isAdmin?`<button class="work-tab-add" onclick="openNewProjectModal()" title="New project">＋</button>`:''}
    </div>`;

  // Render tab bar + content area into the panel div
  el.innerHTML = tabBarHTML + '<div id="work-hub-content" style="padding:1.5rem 0 0"></div>';

  // Now render the active tab content
  const contentEl = document.getElementById('work-hub-content');
  if(contentEl && activeTab.render) activeTab.render(contentEl);
}

function renderEmpWorkHub(el){ renderWorkHubShell(el, false); }
function renderAdminWorkHub(el){ renderWorkHubShell(el, true); }

// ── Column management ─────────────────────────────────
function ensureProjectColumns(projectId){
  const p=projects.find(x=>x.id===projectId);
  if(!p)return;
  if(!p.columns||!p.columns.length) p.columns=DEFAULT_COLUMNS.map(c=>({...c}));
}

function addColumn(projectId){
  ensureProjectColumns(projectId);
  const p=projects.find(x=>x.id===projectId);
  if(!p)return;
  const label=prompt('Column name:','New Column');
  if(!label)return;
  const id='col-'+(nextColId++)+'-'+Date.now();
  p.columns.push({id,label:label.trim(),color:'#8A8A96'});
  refreshKanban();
}

function renameColumn(projectId,colId,newLabel){
  ensureProjectColumns(projectId);
  const p=projects.find(x=>x.id===projectId);
  if(!p)return;
  const col=p.columns.find(c=>c.id===colId);
  if(col&&newLabel.trim())col.label=newLabel.trim();
  refreshKanban();
}

function setColColor(projectId,colId,color){
  ensureProjectColumns(projectId);
  const p=projects.find(x=>x.id===projectId);
  if(!p)return;
  const col=p.columns.find(c=>c.id===colId);
  if(col)col.color=color;
  refreshKanban();
}

function deleteColumn(projectId,colId){
  ensureProjectColumns(projectId);
  const p=projects.find(x=>x.id===projectId);
  if(!p)return;
  const col=p.columns.find(c=>c.id===colId);
  if(!col)return;
  const tasksInCol=projectTasks.filter(t=>t.projectId===projectId&&t.status===colId);
  if(tasksInCol.length){
    if(!confirm(`"${col.label}" has ${tasksInCol.length} task${tasksInCol.length>1?'s':''}. Delete column and move them to the first column?`))return;
    const firstCol=p.columns.find(c=>c.id!==colId);
    if(firstCol) tasksInCol.forEach(t=>t.status=firstCol.id);
  }
  p.columns=p.columns.filter(c=>c.id!==colId);
  if(!p.columns.length) p.columns=[{id:'todo',label:'To Do',color:'#8A8A96'}];
  refreshKanban();
  toast(`Column "${col.label}" deleted.`);
}

function toggleColPicker(pickerId){
  // close all others first
  document.querySelectorAll('.col-picker').forEach(el=>{if(el.id!==pickerId)el.style.display='none';});
  const el=document.getElementById(pickerId);
  if(el)el.style.display=el.style.display==='none'?'flex':'none';
}

function refreshKanban(){
  const target=$('work-hub-content')||$('main-content');
  if(!target)return;
  const isAdmin=currentUser.role==='admin';
  renderProjectBoard(target,isAdmin);
}

// Close colour pickers on outside click
document.addEventListener('click',e=>{
  if(!e.target.closest('.col-color-btn')&&!e.target.closest('.col-picker')){
    document.querySelectorAll('.col-picker').forEach(el=>el.style.display='none');
  }
});

// ══════════════════════════════════════════════════════
//  ATTENDANCE & MONTHLY RESET
// ══════════════════════════════════════════════════════
function timeToMins(t){
  const [h,m]=String(t||'00:00').split(':').map(Number);
  return (h||0)*60+(m||0);
}
function currentHHMM(){
  const d=new Date();
  return String(d.getHours()).padStart(2,'0')+':'+String(d.getMinutes()).padStart(2,'0');
}
function isWithinAttendanceWindow(){
  const now=timeToMins(currentHHMM());
  return now>=timeToMins(attendanceSettings.start)&&now<=timeToMins(attendanceSettings.end);
}
function isOnTimeCheckin(time){
  return timeToMins(time)<=timeToMins(attendanceSettings.onTimeUntil);
}
function todayAttendanceFor(empId){
  return attendanceRecords.find(r=>r.empId===empId&&r.date===localDateISO());
}
function attendanceStatusMeta(status){
  if(status==='present')return{label:'Present',cls:'green'};
  if(status==='late')return{label:'Late',cls:'amber'};
  if(status==='missed')return{label:'Missed',cls:'red'};
  return{label:'Not checked in',cls:'muted'};
}
function attendanceCheckState(){
  return [
    {ok:!!currentUser,label:'WordPress login',detail:currentUser?currentUser.name:'Not signed in'},
    {ok:attendanceOfficePreview,label:'Office network',detail:attendanceOfficePreview?'Allowed office connection detected':'Preview switch is off'},
    {ok:isWithinAttendanceWindow(),label:'Check-in window',detail:`${attendanceSettings.start} - ${attendanceSettings.end}`},
  ];
}
function renderAttendanceCheckState(){
  const box=$('attendance-checks');
  if(box){
    box.innerHTML=attendanceCheckState().map(c=>`
      <div class="attendance-check ${c.ok?'ok':'wait'}">
        <span>${c.ok?'✓':'•'}</span>
        <div><strong>${esc(c.label)}</strong><small>${esc(c.detail)}</small></div>
      </div>`).join('');
  }
}
function toggleOfficePreview(){
  attendanceOfficePreview=!attendanceOfficePreview;
  renderAttendanceCheckState();
  const btn=$('office-preview-toggle');
  if(btn)btn.textContent=attendanceOfficePreview?'Office connection on':'Simulate office connection';
}
function submitSelfCheckin(){
  if(!currentUser||currentUser.role!=='employee')return;
  if(todayAttendanceFor(currentUser.id)){toast('You are already checked in for today.',false);return}
  const failed=attendanceCheckState().filter(c=>!c.ok);
  if(failed.length){
    toast('Check-in blocked: '+failed[0].label+' is not verified.',false);
    renderAttendanceCheckState();
    return;
  }
  const now=currentHHMM();
  const onTime=isOnTimeCheckin(now);
  const status=onTime?'present':'late';
  const reward=onTime?Number(attendanceSettings.onTimeReward||0):0;
  attendanceRecords.push({
    id:Date.now(),empId:currentUser.id,date:localDateISO(),time:now,status,
    method:'Office network',verified:true,reward
  });
  const emp=employees.find(e=>e.id===currentUser.id);
  if(reward>0&&emp)earnCoins(emp,reward);
  pushNotif('ADMIN-001','◷',`${currentUser.name} checked in ${status}.`,'a-attendance');
  toast(status==='late'?'Checked in as late.':`Checked in on time. +${reward} XP awarded.`);
  switchPanel('e-attendance');
}
function requestAttendanceCorrection(){
  if(!currentUser||currentUser.role!=='employee')return;
  const reasonEl=$('attendance-correction-reason');
  const reason=reasonEl?reasonEl.value.trim():'';
  if(!reason||!reason.trim())return;
  const today=localDateISO();
  const existing=attendanceRequests.find(r=>r.empId===currentUser.id&&r.date===today&&r.status==='pending');
  if(existing){toast('You already have a pending correction request for today.',false);return}
  attendanceRequests.unshift({id:nextAttendanceRequestId++,empId:currentUser.id,date:today,reason:reason.trim(),status:'pending',createdAt:'Just now'});
  pushNotif('ADMIN-001','◷',`${currentUser.name} requested an attendance correction.`,'a-attendance');
  toast('Correction request sent to admin.');
  switchPanel('e-attendance');
}
function markManualAttendance(empId,status){
  const today=localDateISO();
  let record=attendanceRecords.find(r=>r.empId===empId&&r.date===today);
  if(record){
    record.status=status;
    record.method='Admin update';
    record.verified=true;
    record.reward=status==='present'?(record.reward||0):0;
  }else{
    attendanceRecords.push({id:Date.now(),empId,date:today,time:currentHHMM(),status,method:'Admin update',verified:true,reward:0});
  }
  toast('Attendance updated.');
  switchPanel('a-attendance');
}
function saveAttendanceSettings(){
  const start=$('att-start')?.value||attendanceSettings.start;
  const onTimeUntil=$('att-on-time')?.value||attendanceSettings.onTimeUntil;
  const end=$('att-end')?.value||attendanceSettings.end;
  const reward=Math.max(0,Number($('att-reward')?.value||attendanceSettings.onTimeReward||0));
  if(timeToMins(start)>timeToMins(onTimeUntil)||timeToMins(onTimeUntil)>timeToMins(end)){
    toast('Timing must be Start ≤ On-time cutoff ≤ End.',false);
    return;
  }
  attendanceSettings={start,onTimeUntil,end,onTimeReward:reward};
  toast('Attendance timing updated.');
  switchPanel('a-attendance');
}
function decideAttendanceRequest(id,status){
  const req=attendanceRequests.find(r=>r.id===id);
  if(!req)return;
  req.status=status;
  if(status==='approved'){
    let record=attendanceRecords.find(r=>r.empId===req.empId&&r.date===req.date);
    if(record){
      record.status='present';
      record.method='Admin correction';
    }else{
      attendanceRecords.push({id:Date.now(),empId:req.empId,date:req.date,time:'Corrected',status:'present',method:'Admin correction',verified:true,reward:0});
    }
  }
  toast(status==='approved'?'Correction approved.':'Correction rejected.');
  switchPanel('a-attendance');
}
function renderEmpAttendance(el){
  const today=localDateISO();
  const record=todayAttendanceFor(currentUser.id);
  const meta=attendanceStatusMeta(record?.status);
  const history=attendanceRecords.filter(r=>r.empId===currentUser.id).slice(-7).reverse();
  const myRequests=attendanceRequests.filter(r=>r.empId===currentUser.id);
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Attendance</div><div class="page-sub">Self check-in works only from the office connection. On-time check-ins earn +${attendanceSettings.onTimeReward} XP.</div></div>
    </div>
    <div class="attendance-layout">
      <div class="attendance-hero">
        <div>
          <div class="attendance-kicker">${fmtDate(today)}</div>
          <h2>${record?'You are checked in':'Ready to check in?'}</h2>
          <p>${record?`Marked ${meta.label.toLowerCase()} at ${esc(record.time)} by ${esc(record.method)}.${record.reward?` +${record.reward} XP awarded.`:''}`:`Use this when you arrive at the office. Check in by ${attendanceSettings.onTimeUntil} to earn +${attendanceSettings.onTimeReward} XP. WordPress will enforce the real IP/Wi-Fi check server-side.`}</p>
        </div>
        <span class="attendance-badge ${meta.cls}">${esc(meta.label)}</span>
      </div>
      <div class="attendance-card">
        <div class="attendance-card-head">
          <div><strong>Verification checks</strong><span>Check-in window: ${attendanceSettings.start} - ${attendanceSettings.end}. On-time reward until ${attendanceSettings.onTimeUntil}.</span></div>
          <button class="btn btn-ghost" id="office-preview-toggle" onclick="toggleOfficePreview()">${attendanceOfficePreview?'Office connection on':'Simulate office connection'}</button>
        </div>
        <div id="attendance-checks" class="attendance-checks"></div>
        <div class="attendance-actions">
          <button class="btn btn-accent" onclick="submitSelfCheckin()" ${record?'disabled':''}>Check in</button>
        </div>
        <div class="attendance-correction-box">
          <div class="f-row"><label>Correction request</label><textarea id="attendance-correction-reason" placeholder="Explain why admin should correct today's attendance..."></textarea></div>
          <button class="btn btn-ghost" onclick="requestAttendanceCorrection()">Request correction</button>
        </div>
      </div>
      <div class="attendance-card">
        <div class="attendance-card-head"><div><strong>Your attendance history</strong><span>Recent check-ins and correction requests.</span></div></div>
        <div class="attendance-list">
          ${history.length?history.map(r=>{const m=attendanceStatusMeta(r.status);return`
            <div class="attendance-row">
              <div><strong>${fmtDate(r.date)}</strong><span>${esc(r.method)}</span></div>
              <div style="text-align:right"><span class="attendance-badge ${m.cls}">${m.label}</span><small>${esc(r.time)}${r.reward?` · +${r.reward} XP`:''}</small></div>
            </div>`}).join(''):'<div class="empty">No attendance records yet.</div>'}
        </div>
        ${myRequests.length?`<div style="margin-top:12px">${myRequests.map(r=>`
          <div class="attendance-request compact">
            <div><strong>${fmtDate(r.date)} correction</strong><span>${esc(r.reason)}</span></div>
            <span class="attendance-badge ${r.status==='approved'?'green':r.status==='rejected'?'red':'amber'}">${esc(r.status)}</span>
          </div>`).join('')}</div>`:''}
      </div>
    </div>`;
  renderAttendanceCheckState();
}
function renderAdminAttendance(el){
  const today=localDateISO();
  const emps=employees.filter(e=>e.role==='employee');
  const todayRecords=attendanceRecords.filter(r=>r.date===today);
  const present=todayRecords.filter(r=>r.status==='present').length;
  const late=todayRecords.filter(r=>r.status==='late').length;
  const pending=attendanceRequests.filter(r=>r.status==='pending').length;
  const awarded=todayRecords.reduce((sum,r)=>sum+(r.reward||0),0);
  el.innerHTML=`
    <div class="page-hdr">
      <div><div class="page-title">Attendance Control</div><div class="page-sub">Office-only self check-in, correction queue, and monthly attendance rewards</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn btn-ghost" onclick="openAttendanceModal()">Award monthly bonus</button>
      </div>
    </div>
    <div class="attendance-admin-grid">
      <div class="sprint-stat"><span>${present}</span><small>Present today</small></div>
      <div class="sprint-stat"><span>${late}</span><small>Late today</small></div>
      <div class="sprint-stat"><span>${pending}</span><small>Pending corrections</small></div>
      <div class="sprint-stat"><span>${awarded}</span><small>XP awarded today</small></div>
    </div>
    <div class="attendance-settings-card">
      <div class="attendance-card-head">
        <div><strong>Check-in timing</strong><span>Members can check in during the window. Only check-ins at or before the on-time cutoff earn XP.</span></div>
      </div>
      <div class="attendance-settings-grid">
        <div class="f-row"><label>Check-in opens</label><input type="time" id="att-start" value="${escAttr(attendanceSettings.start)}"></div>
        <div class="f-row"><label>On-time cutoff</label><input type="time" id="att-on-time" value="${escAttr(attendanceSettings.onTimeUntil)}"></div>
        <div class="f-row"><label>Check-in closes</label><input type="time" id="att-end" value="${escAttr(attendanceSettings.end)}"></div>
        <div class="f-row"><label>On-time XP</label><input type="number" id="att-reward" value="${attendanceSettings.onTimeReward}" min="0" max="100"></div>
      </div>
      <button class="btn btn-accent" onclick="saveAttendanceSettings()">Save timing</button>
    </div>
    <div class="attendance-policy">
      <strong>Production rule</strong>
      <span>Allow check-in only when the logged-in WordPress user is inside the configured time window and connecting from an approved office IP/Wi-Fi/VPN route.</span>
    </div>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Member</th><th>Department</th><th>Status</th><th>Time</th><th>Verification</th><th>Actions</th></tr></thead>
        <tbody>${emps.map(e=>{const r=todayAttendanceFor(e.id);const m=attendanceStatusMeta(r?.status);return`
          <tr>
            <td><div style="display:flex;align-items:center;gap:8px"><span style="font-size:18px">${avEmoji(e)}</span><strong>${esc(e.name)}</strong></div></td>
            <td>${esc(e.dept)}</td>
            <td><span class="attendance-badge ${m.cls}">${esc(m.label)}</span></td>
            <td>${r?esc(r.time):'—'}</td>
            <td>${r?esc(r.method)+(r.reward?` · +${r.reward} XP`:''):'—'}</td>
            <td><div class="tbl-actions">
              <button class="ia" title="Mark present" onclick="markManualAttendance('${e.id}','present')">✓</button>
              <button class="ia" title="Mark late" onclick="markManualAttendance('${e.id}','late')">!</button>
            </div></td>
          </tr>`}).join('')}</tbody>
      </table>
    </div>
    <div class="attendance-card">
      <div class="attendance-card-head"><div><strong>Correction requests</strong><span>Approve only after confirming the person was in office.</span></div></div>
      ${attendanceRequests.length?attendanceRequests.map(r=>{const emp=employees.find(e=>e.id===r.empId);return`
        <div class="attendance-request">
          <div>
            <strong>${emp?esc(emp.name):esc(r.empId)} · ${fmtDate(r.date)}</strong>
            <span>${esc(r.reason)}</span>
            <small>${esc(r.createdAt)}</small>
          </div>
          <div style="display:flex;gap:6px;align-items:center">
            <span class="attendance-badge ${r.status==='approved'?'green':r.status==='rejected'?'red':'amber'}">${esc(r.status)}</span>
            ${r.status==='pending'?`<button class="btn btn-ghost" onclick="decideAttendanceRequest(${r.id},'rejected')">Reject</button><button class="btn btn-accent" onclick="decideAttendanceRequest(${r.id},'approved')">Approve</button>`:''}
          </div>
        </div>`}).join(''):'<div class="empty">No correction requests.</div>'}
    </div>`;
}
function openAttendanceModal(){
  const emps=employees.filter(e=>e.role==='employee');
  const opts='<option value="">None</option>'+emps.map(e=>`<option value="${e.id}">${avEmoji(e)} ${esc(e.name)}</option>`).join('');
  ['att-1','att-2','att-3','att-4'].forEach(id=>$(id).innerHTML=opts);
  openModal('modal-attendance');
}
function awardAttendance(){
  const awards=[
    {id:$('att-1').value,coins:150},
    {id:$('att-2').value,coins:75},
    {id:$('att-3').value,coins:75},
    {id:$('att-4').value,coins:25},
  ];
  const seen=new Set();
  let count=0;
  awards.forEach(a=>{
    if(!a.id||seen.has(a.id))return;
    seen.add(a.id);
    const emp=employees.find(e=>e.id===a.id);
    if(emp){earnCoins(emp,a.coins);count++;}
  });
  updateTopbar();
  closeModal('modal-attendance');
  toast(`🏅 Attendance bonuses awarded to ${count} player${count!==1?'s':''}!`);
  switchPanel('a-dashboard');
}

function doMonthlyReset(){
  const month=new Date().toISOString().slice(0,7);
  const emps=employees.filter(e=>e.role==='employee');
  // Archive
  monthlyArchive[month]={
    shoutouts:feed.length,tasks:tasks.filter(t=>t.claimed).length,
    benefits:benefits.reduce((s,b)=>s+b.claimedBy.length,0),
    topEarner:[...emps].sort((a,b)=>(b.coins||0)-(a.coins||0))[0]?.name||'—',
    totalPts:emps.reduce((s,e)=>s+(e.coins||0),0),
    members:emps.map(e=>({name:e.name,pts:e.coins||0,rep:e.rep||0,tasks:tasks.filter(t=>t.claimedById===e.id).length,benefits:benefits.filter(b=>b.claimedBy.includes(e.id)).length}))
  };
  // Reset coins only
  emps.forEach(e=>{e.coins=0;});
  if(currentUser.role==='employee'){currentUser.coins=0;updateTopbar();}
  // Reset shoutout limits
  emps.forEach(e=>{e.weeklyShoutouts=0;e.lastShoutoutWeek=null;});
  // Reset benefit claimed lists
  benefits.forEach(b=>{b.claimedBy=[];});
  closeModal('modal-reset');
  toast('🔄 Monthly reset complete! Coins zeroed. Reputation preserved. New month begins!');
  switchPanel('a-dashboard');
}

// ══════════════════════════════════════════════════════
//  LEADERBOARD — DUAL TAB (Monthly Coins + All-time Rep)
// ══════════════════════════════════════════════════════
function renderEmpLeaderboard(el){
  const sorted=[...employees].filter(e=>e.role==='employee').sort(
    lbTab==='monthly'?(a,b)=>(b.coins||0)-(a.coins||0):(a,b)=>(b.rep||0)-(a.rep||0)
  );
  const max=sorted[0]?(lbTab==='monthly'?(sorted[0].coins||0):(sorted[0].rep||0)):1;
  const rk=['gold','silver','bronze','','',''];
  const rl=['🥇','🥈','🥉'];
  el.innerHTML=`
    <div class="page-hdr"><div>
      <div class="page-title">🏆 Hall of Fame</div>
      <div class="page-sub">${lbTab==='monthly'?'Monthly Coins — resets each month':'All-time Reputation — never resets'}</div>
    </div></div>
    <div style="display:flex;gap:4px;background:var(--bg3);border-radius:var(--r-sm);padding:3px;margin-bottom:1.25rem;max-width:340px">
      <button class="login-tab${lbTab==='monthly'?' active':''}" onclick="lbTab='monthly';switchPanel('e-leaderboard')">🪙 Monthly Coins</button>
      <button class="login-tab${lbTab==='alltime'?' active':''}" onclick="lbTab='alltime';switchPanel('e-leaderboard')">⭐ All-time Rep</button>
    </div>
    ${sorted.map((e,i)=>{
      const val=lbTab==='monthly'?(e.coins||0):(e.rep||0);
      const pct=Math.round((val/max)*100);
      const isMe=e.id===currentUser.id;
      return`<div class="lb-item" style="${isMe?'border-color:rgba(232,255,71,.25);':''}">
        <div class="lb-rank ${rk[i]||''}">${i<3?rl[i]:i+1}</div>
        <div class="lb-av">${avEmoji(e)}</div>
        <div class="lb-info">
          <div class="lb-name">${esc(e.name)}${isMe?'<span class="pill pill-accent" style="font-size:10px;margin-left:5px">You ⚡</span>':''}
            <span class="pill pill-purple" style="font-size:10px">Lv.${levelFor(e.rep||0)}</span>
          </div>
          <div class="lb-meta">${(e.badges||[]).slice(0,3).map(b=>pill(b,CAT_COLORS[b]?.bg||'rgba(160,160,160,.12)',CAT_COLORS[b]?.fg||'#A0A0A0')).join('')}</div>
          <div class="lb-bar-wrap"><div class="lb-bar" style="width:${pct}%;background:${lbTab==='monthly'?'var(--accent)':'var(--purple)'}"></div></div>
        </div>
        <div>
          <div class="lb-pts" style="color:${lbTab==='monthly'?'var(--accent)':'var(--purple)'}">${val}</div>
          <div class="lb-pts-lbl">${lbTab==='monthly'?'🪙 Coins':'⭐ Rep'}</div>
          <div style="font-size:10px;color:var(--hint);text-align:right">${lbTab==='monthly'?'Rep: '+(e.rep||0):'Coins: '+(e.coins||0)}</div>
        </div>
      </div>`;
    }).join('')}`;
}

// Also update admin leaderboard
function renderAdminLeaderboard(el){
  const sorted=[...employees].filter(e=>e.role==='employee').sort(
    lbTab==='monthly'?(a,b)=>(b.coins||0)-(a.coins||0):(a,b)=>(b.rep||0)-(a.rep||0)
  );
  const max=sorted[0]?(lbTab==='monthly'?(sorted[0].coins||0):(sorted[0].rep||0)):1;
  const rk=['gold','silver','bronze','','',''];
  const rl=['🥇','🥈','🥉'];
  el.innerHTML=`
    <div class="page-hdr"><div><div class="page-title">🏆 Hall of Fame</div></div>
      <button class="btn btn-danger" style="font-size:12px" onclick="openModal('modal-reset')">🔄 Monthly Reset</button>
    </div>
    <div style="display:flex;gap:4px;background:var(--bg3);border-radius:var(--r-sm);padding:3px;margin-bottom:1.25rem;max-width:340px">
      <button class="login-tab${lbTab==='monthly'?' active':''}" onclick="lbTab='monthly';switchPanel('a-leaderboard')">🪙 Monthly Coins</button>
      <button class="login-tab${lbTab==='alltime'?' active':''}" onclick="lbTab='alltime';switchPanel('a-leaderboard')">⭐ All-time Rep</button>
    </div>
    ${sorted.map((e,i)=>{
      const val=lbTab==='monthly'?(e.coins||0):(e.rep||0);
      const pct=Math.round((val/max)*100);
      return`<div class="lb-item">
        <div class="lb-rank ${rk[i]||''}">${i<3?rl[i]:i+1}</div>
        <div class="lb-av">${avEmoji(e)}</div>
        <div class="lb-info">
          <div class="lb-name">${esc(e.name)} <span style="font-size:11px;color:var(--muted)">${esc(e.dept)}</span>
            <span class="pill pill-purple" style="font-size:10px">Lv.${levelFor(e.rep||0)}</span>
          </div>
          <div class="lb-bar-wrap"><div class="lb-bar" style="width:${pct}%;background:${lbTab==='monthly'?'var(--accent)':'var(--purple)'}"></div></div>
        </div>
        <div>
          <div class="lb-pts" style="color:${lbTab==='monthly'?'var(--accent)':'var(--purple)'}">${val}</div>
          <div class="lb-pts-lbl">${lbTab==='monthly'?'🪙 Coins':'⭐ Rep'}</div>
          <div style="font-size:10px;color:var(--hint);text-align:right">${lbTab==='monthly'?'Rep: '+(e.rep||0):'Coins: '+(e.coins||0)}</div>
        </div>
      </div>`;
    }).join('')}`;
}


// ══════════════════════════════════════════════════════
//  TEAM PERFORMANCE
// ══════════════════════════════════════════════════════
const TEAMS_LIST = ['Devs','Design','Mkt'];
const TEAM_META  = {
  Devs:   {label:'Dev Team',       icon:'💻', color:'#5AB4FF'},
  Design: {label:'Design Team',    icon:'🎨', color:'#C8A0FF'},
  Mkt:    {label:'Marketing Team', icon:'📣', color:'#FFBE47'},
};

function calcPerfScore(scores){
  if(!scores) return 0;
  return Math.round(
    PERF_CATEGORIES.reduce((sum,cat)=>{
      return sum + ((scores[cat.id]||0) * cat.weight);
    }, 0) / 5
  );
}

function getPerfMonths(){
  const months=Object.keys(performanceHistory).sort().reverse();
  if(!months.includes('2026-04')) months.unshift('2026-04');
  return months.slice(0,6);
}

function ensurePerformanceTeam(fallback){
  if(!TEAMS_LIST.includes(activePerformanceTeam))activePerformanceTeam=fallback||TEAMS_LIST[0];
}

function perfStatusLabel(score){
  if(!score)return'Not rated';
  if(score<40)return'Needs attention';
  if(score<60)return'Below target';
  if(score<75)return'On track';
  if(score<90)return'Strong';
  return'Exceptional';
}

function renderPerfMonthTabs(months, panelName){
  return`<div class="perf-control-row">
    <span class="perf-control-label">Month</span>
    ${months.map(m=>`<button class="perf-month-tab${activePerformanceMonth===m?' on':''}" onclick="activePerformanceMonth='${m}';perfDraftScores={};switchPanel('${panelName}')">${fmtMonth(m)}${m==='2026-04'?` <span style="font-size:9px;opacity:.7">live</span>`:''}</button>`).join('')}
  </div>`;
}

function renderPerfTeamTabs(scores, panelName){
  return`<div class="perf-team-tabs">
    ${TEAMS_LIST.map(teamKey=>{
      const tm=TEAM_META[teamKey];
      const score=scores[teamKey]||0;
      return`<button class="perf-team-tab${activePerformanceTeam===teamKey?' on':''}" onclick="activePerformanceTeam='${teamKey}';switchPanel('${panelName}')">
        <span class="perf-team-tab-icon" style="background:${tm.color}22;color:${tm.color}">${tm.icon}</span>
        <span><strong>${tm.label}</strong><small>${score?score+'/100':'Not rated'}</small></span>
      </button>`;
    }).join('')}
  </div>`;
}

function renderPerfFocusedTeam({teamKey,display,scores,isAdmin,isLocked,myTeamKey}){
  const tm=TEAM_META[teamKey];
  const score=scores[teamKey]||0;
  const teamScores=display[teamKey]||{};
  const members=getTeamMembers(teamKey);
  const isDraft=!!(perfDraftScores[teamKey]&&Object.keys(perfDraftScores[teamKey]).length);
  const status=perfStatusLabel(score);
  const scoreColor=score>=80?'var(--green)':score>=60?'var(--accent)':score>=40?'var(--amber)':score?'var(--red)':'var(--hint)';

  return`<div class="perf-focus-card">
    <div class="perf-focus-head">
      <div class="perf-focus-team">
        <div class="perf-focus-icon" style="background:${tm.color}20;color:${tm.color}">${tm.icon}</div>
        <div>
          <div class="perf-focus-eyebrow">${teamKey===myTeamKey?'Your team':'Selected team'}</div>
          <div class="perf-focus-title">${tm.label}</div>
          <div class="perf-focus-members">${members.map(e=>esc(e.name)).join(' · ')||'No members assigned'}</div>
        </div>
      </div>
      <div class="perf-focus-score">
        <div class="perf-score-num" style="color:${scoreColor}">${score||'—'}</div>
        <div class="perf-score-sub">/ 100</div>
        <div class="perf-score-status">${status}</div>
      </div>
    </div>

    <div class="perf-score-track"><div style="width:${score}%;background:${scoreColor}"></div></div>

    <div class="perf-metric-grid">
      ${PERF_CATEGORIES.map(cat=>{
        const val=teamScores[cat.id]||0;
        const pct=Math.round((val/5)*100);
        return`<div class="perf-metric-card">
          <div class="perf-metric-top">
            <span class="perf-metric-icon">${cat.icon}</span>
            <div>
              <div class="perf-metric-title">${cat.label}</div>
              <div class="perf-metric-desc">${cat.desc}</div>
            </div>
            <span class="perf-weight">${cat.weight}%</span>
          </div>
          <div class="perf-rating-row">
            <div class="perf-stars">
              ${[1,2,3,4,5].map(star=>`
                <button class="perf-star-btn ${star<=val?'filled':'empty'}"
                  ${!isAdmin||isLocked?'disabled':''}
                  onclick="${!isAdmin||isLocked?'void(0)':'setRating(\''+teamKey+'\',\''+cat.id+'\','+star+')'}"
                  title="${isLocked||!isAdmin?val+'/5':'Rate '+star+'/5'}">${star<=val?'★':'☆'}</button>`).join('')}
            </div>
            <span class="perf-rating-value">${val||'—'}/5</span>
          </div>
          <div class="perf-mini-track"><div style="width:${pct}%;background:${tm.color}"></div></div>
        </div>`;
      }).join('')}
    </div>

    <div class="perf-focus-foot">
      ${isDraft?`<span class="pill pill-amber">Unsaved changes</span>`:''}
      ${isLocked?`<span class="pill pill-muted">Saved view</span>`:''}
      ${isAdmin&&!isLocked?`<span class="perf-helper">Rate each metric from 1 to 5. The weighted score updates instantly.</span>`:`<span class="perf-helper">Scores are weighted by category importance.</span>`}
    </div>
  </div>`;
}

function renderPerfTeamSummary(scores, winnerTeam, panelName){
  return`<div class="perf-summary-grid">
    ${TEAMS_LIST.map(teamKey=>{
      const tm=TEAM_META[teamKey];
      const score=scores[teamKey]||0;
      return`<button class="perf-summary-card${activePerformanceTeam===teamKey?' on':''}" onclick="activePerformanceTeam='${teamKey}';switchPanel('${panelName}')">
        <span class="perf-summary-dot" style="background:${tm.color}"></span>
        <span class="perf-summary-name">${tm.label}</span>
        <strong>${score||'—'}</strong>
        ${winnerTeam===teamKey&&score>0?'<span class="perf-summary-win">Top</span>':''}
      </button>`;
    }).join('')}
  </div>`;
}

function renderPerfTrendPanel(teamKey, trendMonths){
  if(!trendMonths.length)return'';
  const tm=TEAM_META[teamKey];
  const trendScores=trendMonths.map(m=>calcPerfScore(performanceHistory[m]?.[teamKey]||{}));
  const trendDir=trendScores.length>1?trendScores[trendScores.length-1]-trendScores[0]:0;
  return`<div class="perf-trend-card">
    <div class="perf-section-title">Trend for ${tm.label}</div>
    <div class="perf-trend-bars">
      ${trendScores.map((s,i)=>`<div class="perf-trend-bar">
        <div style="height:${Math.max(6,Math.round(s*0.52))}px;background:${tm.color}"></div>
        <span>${fmtMonth(trendMonths[i]).split(' ')[0]}</span>
        <strong>${s}</strong>
      </div>`).join('')}
    </div>
    <div class="perf-trend-note" style="color:${trendDir>0?'var(--green)':trendDir<0?'var(--red)':'var(--muted)'}">${trendDir>0?'Improved by '+trendDir:trendDir<0?'Dropped by '+Math.abs(trendDir):'Stable'} across the visible period.</div>
  </div>`;
}

function renderAdminPerformance(el){
  const months=getPerfMonths();
  if(!months.includes(activePerformanceMonth)) activePerformanceMonth=months[0];
  ensurePerformanceTeam(TEAMS_LIST[0]);

  const saved=performanceHistory[activePerformanceMonth]||{};
  const isCurrentMonth=!performanceHistory[activePerformanceMonth];
  const display={};
  TEAMS_LIST.forEach(t=>{
    display[t]={...(saved[t]||{}), ...(perfDraftScores[t]||{})};
  });

  const scores={};
  TEAMS_LIST.forEach(t=>scores[t]=calcPerfScore(display[t]));
  const winnerTeam=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const allRated=TEAMS_LIST.every(t=>PERF_CATEGORIES.every(cat=>(display[t]?.[cat.id]||0)>0));
  const trendMonths=Object.keys(performanceHistory).sort().slice(-3);

  el.innerHTML=`
    <div class="page-hdr">
      <div>
        <div class="page-title">Team Performance</div>
        <div class="page-sub">Review one team at a time across weighted monthly metrics.</div>
      </div>
      ${allRated&&isCurrentMonth?`<button class="btn btn-accent" onclick="savePerformanceMonth()">Save ${fmtMonth(activePerformanceMonth)}</button>`:''}
    </div>

    ${renderPerfMonthTabs(months,'a-performance')}
    ${renderPerfTeamTabs(scores,'a-performance')}
    ${renderPerfTeamSummary(scores,winnerTeam,'a-performance')}
    ${renderPerfFocusedTeam({teamKey:activePerformanceTeam,display,scores,isAdmin:true,isLocked:!!performanceHistory[activePerformanceMonth]})}

    ${allRated&&winnerTeam&&scores[winnerTeam]>0?`
    <div class="perf-winner-banner">
      <div style="font-size:34px">🏆</div>
      <div>
        <div style="font-size:16px;font-weight:700">${TEAM_META[winnerTeam].label} leads ${fmtMonth(activePerformanceMonth)}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">Performance index: <strong style="color:var(--accent)">${scores[winnerTeam]}/100</strong> — ${scores[winnerTeam]>=90?'Exceptional performance across all dimensions.':scores[winnerTeam]>=75?'Strong performance, setting the benchmark.':'Solid month — keep pushing!'}</div>
      </div>
    </div>`:''}

    ${renderPerfTrendPanel(activePerformanceTeam,trendMonths)}

    <div class="perf-guide-card">
      <div class="perf-section-title">Rating guide</div>
      <div class="perf-guide-grid">
        ${PERF_CATEGORIES.map(cat=>`
          <div class="perf-guide-item">
            <span style="font-size:16px">${cat.icon}</span>
            <div>
              <div style="font-size:12px;font-weight:600">${cat.label} <span style="color:var(--hint);font-weight:400">(${cat.weight}%)</span></div>
              <div style="font-size:11px;color:var(--hint)">${cat.desc}</div>
            </div>
          </div>`).join('')}
      </div>
      <div class="perf-guide-scale">
        <span>★ Poor</span><span>★★ Below par</span><span>★★★ Adequate</span><span>★★★★ Strong</span><span>★★★★★ Exceptional</span>
      </div>
    </div>`;
}

function setRating(teamKey, catId, val){
  if(!perfDraftScores[teamKey]) perfDraftScores[teamKey]={};
  // toggle off if clicking same value
  perfDraftScores[teamKey][catId] = perfDraftScores[teamKey][catId]===val ? 0 : val;
  switchPanel('a-performance');
}

function savePerformanceMonth(){
  if(!performanceHistory[activePerformanceMonth])
    performanceHistory[activePerformanceMonth]={};
  TEAMS_LIST.forEach(t=>{
    if(perfDraftScores[t]&&Object.keys(perfDraftScores[t]).length){
      performanceHistory[activePerformanceMonth][t]={
        ...(performanceHistory[activePerformanceMonth][t]||{}),
        ...perfDraftScores[t]
      };
    }
  });
  perfDraftScores={};
  toast('📊 Performance scores saved for '+fmtMonth(activePerformanceMonth)+'!');
  switchPanel('a-performance');
}

// ══════════════════════════════════════════════════════
//  EMPLOYEE — Team Performance (read-only)
// ══════════════════════════════════════════════════════
function renderEmpPerformance(el){
  const months=getPerfMonths().filter(m=>performanceHistory[m]); // only saved months
  const myTeamKey=Object.keys(GUILD_TEAMS).find(k=>GUILD_TEAMS[k].depts.includes(currentUser.dept))||TEAMS_LIST[0];
  ensurePerformanceTeam(myTeamKey);

  if(!months.length){
    el.innerHTML=`<div class="page-hdr"><div><div class="page-title">Team Performance</div><div class="page-sub">Monthly team evaluation</div></div></div>
      <div class="empty" style="margin-top:2rem">No performance data yet. Results will appear here once an admin publishes the monthly evaluation.</div>`;
    return;
  }

  if(!months.includes(activePerformanceMonth)||!performanceHistory[activePerformanceMonth])
    activePerformanceMonth=months[0];

  const saved=performanceHistory[activePerformanceMonth]||{};
  const scores={};
  TEAMS_LIST.forEach(t=>scores[t]=calcPerfScore(saved[t]||{}));
  const winnerTeam=Object.entries(scores).sort((a,b)=>b[1]-a[1])[0]?.[0];
  const trendMonths=Object.keys(performanceHistory).sort().slice(-3);

  el.innerHTML=`
    <div class="page-hdr">
      <div>
        <div class="page-title">Team Performance</div>
        <div class="page-sub">Switch teams to compare one focused scorecard at a time.</div>
      </div>
    </div>

    ${renderPerfMonthTabs(months,'e-performance')}
    ${renderPerfTeamTabs(scores,'e-performance')}
    ${renderPerfTeamSummary(scores,winnerTeam,'e-performance')}
    ${renderPerfFocusedTeam({teamKey:activePerformanceTeam,display:saved,scores,isAdmin:false,isLocked:true,myTeamKey})}

    ${winnerTeam&&scores[winnerTeam]>0?`
    <div class="perf-winner-banner">
      <div style="font-size:34px">🏆</div>
      <div>
        <div style="font-size:15px;font-weight:700">${TEAM_META[winnerTeam].label} leads ${fmtMonth(activePerformanceMonth)}</div>
        <div style="font-size:13px;color:var(--muted);margin-top:3px">Performance index: <strong style="color:var(--accent)">${scores[winnerTeam]}/100</strong></div>
      </div>
    </div>`:''}

    ${renderPerfTrendPanel(activePerformanceTeam,trendMonths)}`;
}

function exportCSV(){
  let csv='Month,Player,XP,Quests,Rewards\n';
  employees.filter(e=>e.role==='employee').forEach(e=>{
    csv+=`${fmtMonth('2026-04')},${e.name},${e.coins||0},${tasks.filter(t=>t.claimedById===e.id).length},${benefits.filter(b=>b.claimedBy.includes(e.id)).length}\n`;
  });
  Object.entries(monthlyArchive).sort().reverse().forEach(([mo,d])=>{
    (d.members||[]).forEach(m=>csv+=`${fmtMonth(mo)},${m.name},${m.pts},${m.tasks},${m.benefits}\n`);
  });
  const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'}));a.download='quest-report.csv';a.click();
  toast('📊 Report exported!');
}


