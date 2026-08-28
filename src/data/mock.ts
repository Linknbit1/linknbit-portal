import type {
  User,
  Project,
  Task,
  Stage,
  Notification,
  ActivityItem,
  LeaderboardEntry,
  Badge,
  Quest,
  Reward,
  Approval,
  Client,
  AttendanceRecord,
  Team,
  WFHRequest,
} from '../types'

/* =========================================================
   USERS
   ========================================================= */
export const USERS: User[] = [
  { id: 'u1', name: 'Ghayas', email: 'ghayas@linknbit.com', role: 'super_admin', level: 10, xp: 18000, coins: 2400, online: true },
  { id: 'u2', name: 'Ahmad Karimi', email: 'ahmad@linknbit.com', role: 'team_lead', department: 'development', level: 7, xp: 3200, xpToNext: 800, coins: 980, online: true },
  { id: 'u3', name: 'Sara Qureshi', email: 'sara@linknbit.com', role: 'project_manager', department: 'design', level: 6, xp: 2800, xpToNext: 700, coins: 760, online: false },
  { id: 'u4', name: 'Zain Malik', email: 'zain@linknbit.com', role: 'team_lead', department: 'marketing', level: 8, xp: 4100, xpToNext: 900, coins: 1240, online: true },
  { id: 'u5', name: 'Usman Tariq', email: 'usman@linknbit.com', role: 'employee', department: 'development', level: 5, xp: 2100, xpToNext: 400, coins: 540, online: true },
  { id: 'u6', name: 'Bilal Ahmed', email: 'bilal@linknbit.com', role: 'employee', department: 'design', level: 4, xp: 1600, xpToNext: 600, coins: 380, online: false },
  { id: 'u7', name: 'Hina Rizvi', email: 'hina@linknbit.com', role: 'employee', department: 'marketing', level: 3, xp: 1200, xpToNext: 500, coins: 290, online: false },
  { id: 'u8', name: 'Kamran Ali', email: 'kamran@linknbit.com', role: 'employee', department: 'development', level: 3, xp: 1100, xpToNext: 400, coins: 220, online: true },
  { id: 'u9', name: 'Imran Shah', email: 'imran@cricketsansar.com', role: 'client_owner', online: false },
  { id: 'u10', name: 'Usman Tariq', email: 'usman@linknbit.com', role: 'employee', department: 'development', level: 5, xp: 2100, xpToNext: 400, coins: 540, online: true },
]

/* =========================================================
   STAGES
   ========================================================= */
const DEV_STAGES: Stage[] = [
  { id: 'ds1', name: 'Requirement Finalization', order: 1, serviceType: 'development', clientVisible: false, requiresApproval: false, status: 'completed' },
  { id: 'ds2', name: 'Technical Planning', order: 2, serviceType: 'development', clientVisible: false, requiresApproval: false, status: 'completed' },
  { id: 'ds3', name: 'Setup & Architecture', order: 3, serviceType: 'development', clientVisible: false, requiresApproval: false, status: 'completed' },
  { id: 'ds4', name: 'Development', order: 4, serviceType: 'development', clientVisible: false, requiresApproval: false, status: 'completed' },
  { id: 'ds5', name: 'Internal QA', order: 5, serviceType: 'development', clientVisible: false, requiresApproval: false, status: 'blocked' },
  { id: 'ds6', name: 'Client Testing/UAT', order: 6, serviceType: 'development', clientVisible: true, requiresApproval: true, status: 'upcoming' },
  { id: 'ds7', name: 'Bug Fixing', order: 7, serviceType: 'development', clientVisible: false, requiresApproval: false, status: 'upcoming' },
  { id: 'ds8', name: 'Deployment', order: 8, serviceType: 'development', clientVisible: true, requiresApproval: true, status: 'upcoming' },
  { id: 'ds9', name: 'Support', order: 9, serviceType: 'development', clientVisible: true, requiresApproval: false, status: 'upcoming' },
]

const DESIGN_STAGES: Stage[] = [
  { id: 'dss1', name: 'Discovery & Brief', order: 1, serviceType: 'design', clientVisible: true, requiresApproval: false, status: 'completed' },
  { id: 'dss2', name: 'Research & Strategy', order: 2, serviceType: 'design', clientVisible: false, requiresApproval: false, status: 'completed' },
  { id: 'dss3', name: 'Wireframing', order: 3, serviceType: 'design', clientVisible: true, requiresApproval: true, status: 'completed' },
  { id: 'dss4', name: 'UI Design', order: 4, serviceType: 'design', clientVisible: false, requiresApproval: false, status: 'current', approvalStatus: 'pending' },
  { id: 'dss5', name: 'Internal Review', order: 5, serviceType: 'design', clientVisible: false, requiresApproval: false, status: 'upcoming' },
  { id: 'dss6', name: 'Client Review', order: 6, serviceType: 'design', clientVisible: true, requiresApproval: true, status: 'upcoming' },
  { id: 'dss7', name: 'Revisions', order: 7, serviceType: 'design', clientVisible: false, requiresApproval: false, status: 'upcoming' },
  { id: 'dss8', name: 'Final Approval', order: 8, serviceType: 'design', clientVisible: true, requiresApproval: true, status: 'upcoming' },
  { id: 'dss9', name: 'Handover', order: 9, serviceType: 'design', clientVisible: true, requiresApproval: false, status: 'upcoming' },
]

/* =========================================================
   PROJECTS
   ========================================================= */
export const PROJECTS: Project[] = [
  {
    id: 'p1',
    name: 'Cricket Sansar App',
    clientId: 'c1',
    clientName: 'Cricket Sansar',
    serviceType: 'development',
    status: 'blocked',
    currentStage: 'Internal QA',
    progress: 68,
    startDate: '2026-02-10',
    deadline: '2026-05-15',
    budget: 850000,
    pmId: 'u2',
    pm: { id: 'u2', name: 'Ahmad Karimi', role: 'team_lead' },
    teamIds: ['u2', 'u5', 'u6'],
    clickUpSync: 'error',
    clickUpFolder: 'Cricket Sansar App',
    lastSynced: '2026-05-12T07:00:00',
    internalNote: 'Client delayed UAT sign-off. Following up Friday.',
    stages: DEV_STAGES,
  },
  {
    id: 'p2',
    name: 'Linknbit Brand Identity',
    clientId: 'c2',
    clientName: 'Internal',
    serviceType: 'design',
    status: 'in_progress',
    currentStage: 'UI Design',
    progress: 45,
    startDate: '2026-04-01',
    deadline: '2026-05-18',
    pmId: 'u3',
    pm: { id: 'u3', name: 'Sara Qureshi', role: 'project_manager' },
    teamIds: ['u3', 'u6'],
    clickUpSync: 'synced',
    stages: DESIGN_STAGES,
  },
  {
    id: 'p3',
    name: 'VPNGuider SEO Campaign',
    clientId: 'c3',
    clientName: 'VPNGuider',
    serviceType: 'marketing',
    status: 'blocked',
    currentStage: 'Optimization',
    progress: 72,
    startDate: '2026-03-01',
    deadline: '2026-05-14',
    pmId: 'u4',
    pm: { id: 'u4', name: 'Zain Malik', role: 'team_lead' },
    teamIds: ['u4', 'u7'],
    clickUpSync: 'error',
    stages: [],
  },
  {
    id: 'p4',
    name: 'Rahim Gul Transport Website',
    clientId: 'c4',
    clientName: 'Rahim Gul GLT',
    serviceType: 'design',
    status: 'awaiting_client',
    currentStage: 'Client Review',
    progress: 80,
    startDate: '2026-04-10',
    deadline: '2026-05-17',
    pmId: 'u3',
    pm: { id: 'u3', name: 'Sara Qureshi', role: 'project_manager' },
    teamIds: ['u3', 'u6'],
    clickUpSync: 'synced',
    stages: [],
  },
  {
    id: 'p5',
    name: 'Starr Luxury Cars Portal',
    clientId: 'c5',
    clientName: 'Starr Luxury Cars',
    serviceType: 'development',
    status: 'in_progress',
    currentStage: 'Development',
    progress: 35,
    startDate: '2026-04-15',
    deadline: '2026-06-02',
    pmId: 'u2',
    pm: { id: 'u2', name: 'Ahmad Karimi', role: 'team_lead' },
    teamIds: ['u2', 'u5'],
    clickUpSync: 'pending',
    stages: [],
  },
  {
    id: 'p6',
    name: 'Irene Teo Coaching Website',
    clientId: 'c6',
    clientName: 'Irene Teo',
    serviceType: 'design',
    status: 'in_progress',
    currentStage: 'Wireframing',
    progress: 25,
    startDate: '2026-05-01',
    deadline: '2026-05-28',
    pmId: 'u6',
    pm: { id: 'u6', name: 'Bilal Ahmed', role: 'employee' },
    teamIds: ['u6'],
    clickUpSync: 'synced',
    stages: [],
  },
  {
    id: 'p7',
    name: 'Offsite Pro Directory',
    clientId: 'c7',
    clientName: 'Offsite Pro',
    serviceType: 'development',
    status: 'in_progress',
    currentStage: 'Setup & Architecture',
    progress: 15,
    startDate: '2026-04-20',
    deadline: '2026-06-10',
    pmId: 'u5',
    pm: { id: 'u5', name: 'Usman Tariq', role: 'employee' },
    teamIds: ['u5'],
    clickUpSync: 'synced',
    stages: [],
  },
  {
    id: 'p8',
    name: 'MediGrow App',
    clientId: 'c8',
    clientName: 'MediGrow',
    serviceType: 'development',
    status: 'in_progress',
    currentStage: 'Requirement Finalization',
    progress: 8,
    startDate: '2026-05-10',
    deadline: '2026-06-20',
    pmId: 'u2',
    pm: { id: 'u2', name: 'Ahmad Karimi', role: 'team_lead' },
    teamIds: ['u2'],
    clickUpSync: 'pending',
    stages: [],
  },
]

/* =========================================================
   TASKS
   ========================================================= */
export const TASKS: Task[] = [
  {
    id: 't1',
    title: 'Write test cases for match scores API',
    projectId: 'p1',
    projectName: 'Cricket Sansar App',
    stageId: 'ds5',
    stageName: 'Internal QA',
    serviceType: 'development',
    assigneeId: 'u2',
    assignee: { id: 'u2', name: 'Ahmad Karimi', role: 'team_lead' },
    status: 'in_progress',
    priority: 'high',
    dueDate: '2026-05-13',
    xpReward: 120,
    clientVisible: false,
    clickUpSync: 'synced',
    clickUpId: 'CS-244',
  },
  {
    id: 't2',
    title: 'QA: Player statistics endpoint',
    projectId: 'p1',
    projectName: 'Cricket Sansar App',
    stageId: 'ds5',
    stageName: 'Internal QA',
    serviceType: 'development',
    assigneeId: 'u5',
    assignee: { id: 'u5', name: 'Usman Tariq', role: 'employee' },
    status: 'review',
    priority: 'high',
    dueDate: '2026-05-13',
    xpReward: 100,
    clientVisible: false,
    clickUpSync: 'synced',
    clickUpId: 'CS-245',
  },
  {
    id: 't3',
    title: 'Fix pagination bug on fixtures list',
    description:
      'The pagination on the fixtures list endpoint is returning incorrect page counts when filters are applied. This is blocking UAT sign-off. Root cause suspected in the query builder logic. Needs investigation and fix before client testing.',
    projectId: 'p1',
    projectName: 'Cricket Sansar App',
    stageId: 'ds5',
    stageName: 'Internal QA',
    serviceType: 'development',
    assigneeId: 'u2',
    assignee: { id: 'u2', name: 'Ahmad Karimi', role: 'team_lead' },
    status: 'blocked',
    priority: 'critical',
    dueDate: '2026-05-12',
    xpReward: 150,
    clientVisible: false,
    clickUpSync: 'error',
    clickUpId: 'CS-247',
    createdBy: 'Usman Tariq',
    createdAt: '2026-05-08',
    updatedAt: '2026-05-12T08:00:00',
    subtasks: [
      { id: 'st1', title: 'Reproduce the bug with test data', completed: true, assigneeId: 'u2', assigneeName: 'Ahmad Karimi' },
      { id: 'st2', title: 'Identify root cause in query builder', completed: false, assigneeId: 'u2', assigneeName: 'Ahmad Karimi' },
      { id: 'st3', title: 'Write regression test after fix', completed: false, assigneeId: 'u6', assigneeName: 'Bilal Ahmed' },
    ],
    files: [
      { id: 'tf1', name: 'bug_screenshot.png', type: 'image', uploadedBy: 'Ahmad Karimi', uploadedAt: '2026-05-11', clientVisible: false },
      { id: 'tf2', name: 'fixtures_api_log.txt', type: 'text', uploadedBy: 'Ahmad Karimi', uploadedAt: '2026-05-11', clientVisible: false },
    ],
    comments: [
      { id: 'tc1', authorId: 'u2', authorName: 'Ahmad Karimi', content: 'Traced it to the filter_by_date logic in the query builder. Working on a fix now.', timestamp: '2026-05-12T08:00:00', isInternal: true },
      { id: 'tc2', authorId: 'u5', authorName: 'Usman Tariq', content: 'This is the blocker for UAT. Priority fix.', timestamp: '2026-05-12T05:00:00', isInternal: true },
      { id: 'tc3', authorId: 'u2', authorName: 'Ahmad Karimi', content: 'Reproduced consistently with date range filter + competition filter combined.', timestamp: '2026-05-11T10:00:00', isInternal: true },
    ],
  },
  {
    id: 't4',
    title: 'Performance test: live score updates',
    projectId: 'p1',
    projectName: 'Cricket Sansar App',
    stageId: 'ds5',
    stageName: 'Internal QA',
    serviceType: 'development',
    assigneeId: 'u5',
    assignee: { id: 'u5', name: 'Usman Tariq', role: 'employee' },
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-05-14',
    xpReward: 80,
    clientVisible: false,
    clickUpSync: 'synced',
    clickUpId: 'CS-248',
  },
  {
    id: 't5',
    title: 'Document API response schemas',
    projectId: 'p1',
    projectName: 'Cricket Sansar App',
    stageId: 'ds5',
    stageName: 'Internal QA',
    serviceType: 'development',
    assigneeId: 'u6',
    assignee: { id: 'u6', name: 'Bilal Ahmed', role: 'employee' },
    status: 'todo',
    priority: 'low',
    dueDate: '2026-05-15',
    xpReward: 60,
    clientVisible: true,
    clickUpSync: 'pending',
    clickUpId: 'CS-249',
  },
  {
    id: 't6',
    title: 'Review DB schema for match events',
    projectId: 'p5',
    projectName: 'Starr Luxury Cars Portal',
    stageId: 'sl-s1',
    stageName: 'Setup & Architecture',
    serviceType: 'development',
    assigneeId: 'u5',
    assignee: { id: 'u5', name: 'Usman Tariq', role: 'employee' },
    status: 'todo',
    priority: 'medium',
    dueDate: '2026-05-13',
    xpReward: 90,
    clientVisible: false,
    clickUpSync: 'synced',
  },
]

/* =========================================================
   NOTIFICATIONS
   ========================================================= */
export const NOTIFICATIONS: Notification[] = [
  { id: 'n1', type: 'task_completed', actorId: 'u2', actorName: 'Ahmad Karimi', message: 'completed task "API endpoint for match scores"', projectName: 'Cricket Sansar App', timestamp: '2026-05-12T09:58:00', read: false },
  { id: 'n2', type: 'file_uploaded', actorId: 'u3', actorName: 'Sara Qureshi', message: 'uploaded file "Homepage_v3.fig"', projectName: 'Linknbit Brand Identity', timestamp: '2026-05-12T09:46:00', read: false },
  { id: 'n3', type: 'stage_approved', actorId: 'u9', actorName: 'Imran Shah (Client)', message: 'approved Stage: Wireframing', projectName: 'Cricket Sansar Brand Identity', timestamp: '2026-05-12T09:00:00', read: false },
  { id: 'n4', type: 'task_completed', actorId: 'u4', actorName: 'Zain Malik', message: 'moved VPNGuider SEO Campaign to Optimization stage', projectName: 'VPNGuider SEO Campaign', timestamp: '2026-05-12T08:00:00', read: true },
  { id: 'n5', type: 'badge_earned', actorId: 'u6', actorName: 'Bilal Ahmed', message: 'earned badge "First Approval"', timestamp: '2026-05-12T07:00:00', read: true },
]

/* =========================================================
   ACTIVITY FEED
   ========================================================= */
export const ACTIVITY_FEED: ActivityItem[] = [
  { id: 'a1', type: 'task_completed', actorId: 'u2', actorName: 'Ahmad Karimi', message: 'completed task "API endpoint for match scores"', projectName: 'Cricket Sansar App', timestamp: '2026-05-12T09:58:00' },
  { id: 'a2', type: 'file_uploaded', actorId: 'u3', actorName: 'Sara Qureshi', message: 'uploaded file "Homepage_v3.fig"', projectName: 'Linknbit Brand Identity', timestamp: '2026-05-12T09:46:00' },
  { id: 'a3', type: 'stage_approved', actorId: 'u9', actorName: 'Client (Cricket Sansar)', message: 'approved Stage: Wireframing', projectName: 'Cricket Sansar Brand Identity', timestamp: '2026-05-12T09:00:00' },
  { id: 'a4', type: 'stage_move', actorId: 'u4', actorName: 'Zain Malik', message: 'moved VPNGuider SEO Campaign to Optimization stage', projectName: 'VPNGuider SEO Campaign', timestamp: '2026-05-12T08:00:00' },
  { id: 'a5', type: 'badge_earned', actorId: 'u6', actorName: 'Bilal Ahmed', message: 'earned badge "First Approval"', timestamp: '2026-05-12T07:00:00' },
  { id: 'a6', type: 'revision_requested', actorId: 'u3', actorName: 'Sara Qureshi', message: 'requested revision on task "Mobile Navigation Design"', projectName: 'Linknbit Brand Identity', timestamp: '2026-05-12T06:00:00' },
  { id: 'a7', type: 'clickup_error', actorId: 'system', actorName: 'System', message: 'ClickUp sync error on Cricket Sansar App', projectName: 'Cricket Sansar App', timestamp: '2026-05-12T05:00:00', isError: true },
  { id: 'a8', type: 'xp_earned', actorId: 'u2', actorName: 'Ahmad Karimi', message: 'earned 450 XP for completing sprint', projectName: 'Cricket Sansar App', timestamp: '2026-05-12T04:00:00' },
]

/* =========================================================
   LEADERBOARD
   ========================================================= */
export const LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, user: { id: 'u4', name: 'Zain Malik', role: 'team_lead', level: 8 }, department: 'marketing', xpThisPeriod: 680, totalXp: 4100, badgeCount: 12, rankChange: 2 },
  { rank: 2, user: { id: 'u2', name: 'Ahmad Karimi', role: 'team_lead', level: 7 }, department: 'development', xpThisPeriod: 640, totalXp: 3200, badgeCount: 9, rankChange: 0 },
  { rank: 3, user: { id: 'u3', name: 'Sara Qureshi', role: 'project_manager', level: 6 }, department: 'design', xpThisPeriod: 410, totalXp: 2800, badgeCount: 11, rankChange: 1 },
  { rank: 4, user: { id: 'u5', name: 'Usman Tariq', role: 'employee', level: 5 }, department: 'development', xpThisPeriod: 320, totalXp: 2100, badgeCount: 6, rankChange: -1, isCurrentUser: true },
  { rank: 5, user: { id: 'u6', name: 'Bilal Ahmed', role: 'employee', level: 4 }, department: 'design', xpThisPeriod: 210, totalXp: 1600, badgeCount: 4, rankChange: 0 },
  { rank: 6, user: { id: 'u7', name: 'Hina Rizvi', role: 'employee', level: 3 }, department: 'marketing', xpThisPeriod: 190, totalXp: 1200, badgeCount: 3, rankChange: 2 },
  { rank: 7, user: { id: 'u8', name: 'Kamran Ali', role: 'employee', level: 3 }, department: 'development', xpThisPeriod: 175, totalXp: 1100, badgeCount: 2, rankChange: -1 },
]

/* =========================================================
   BADGES
   ========================================================= */
export const BADGES: Badge[] = [
  { id: 'b1', name: 'First Task', description: 'Complete your first task', category: 'milestone', icon: '⚡', earnedAt: '2026-04-01', locked: false },
  { id: 'b2', name: 'First Approval', description: 'Get your first client approval', category: 'milestone', icon: '✅', earnedAt: '2026-04-15', locked: false },
  { id: 'b3', name: 'Speed Demon', description: 'Complete 10 tasks before deadline', category: 'milestone', icon: '🏎️', locked: true },
  { id: 'b4', name: 'Century', description: 'Complete 100 tasks total', category: 'milestone', icon: '💯', locked: true },
  { id: 'b5', name: 'Bug Slayer', description: 'Fix 50 bugs', category: 'milestone', icon: '🐛', locked: true },
  { id: 'b6', name: '3-Day Streak', description: 'Complete tasks 3 days in a row', category: 'consistency', icon: '🔥', earnedAt: '2026-05-10', locked: false },
  { id: 'b7', name: '7-Day Streak', description: 'Complete tasks 7 days in a row', category: 'consistency', icon: '⚡', locked: true },
  { id: 'b8', name: '30-Day Streak', description: 'Complete tasks 30 days in a row', category: 'consistency', icon: '🌟', locked: true },
  { id: 'b9', name: 'Team Player', description: 'Collaborate on 5 team tasks', category: 'team', icon: '🤝', earnedAt: '2026-05-08', locked: false },
  { id: 'b10', name: 'Mentor', description: 'Help a junior complete their first task', category: 'team', icon: '👨‍🏫', locked: true },
  { id: 'b11', name: 'Design Master', description: 'Complete 20 Design tasks', category: 'service', icon: '🎨', locked: true },
  { id: 'b12', name: 'Dev Guru', description: 'Complete 20 Development tasks', category: 'service', icon: '💻', locked: true },
  { id: 'b13', name: 'Growth Hacker', description: 'Complete 20 Marketing tasks', category: 'service', icon: '📈', locked: true },
  { id: 'b14', name: 'Client Favorite', description: 'Receive 5 client approvals', category: 'special', icon: '⭐', locked: true },
  { id: 'b15', name: 'Zero Bugs', description: 'Complete a sprint with no bugs', category: 'special', icon: '🏆', locked: true },
  { id: 'b16', name: 'Overachiever', description: 'Earn 10,000 XP in a month', category: 'special', icon: '🚀', locked: true },
]

/* =========================================================
   QUESTS
   ========================================================= */
export const QUESTS: Quest[] = [
  { id: 'q1', title: 'Bug Slayer', description: 'Complete 5 bug fix tasks this week', progress: 2, total: 5, xpReward: 500, deadline: '2026-05-17', status: 'in_progress' },
  { id: 'q2', title: 'First Blood', description: 'Get your first task approved by a client', progress: 0, total: 1, xpReward: 300, status: 'not_started' },
  { id: 'q3', title: 'Speed Demon', description: 'Complete 3 tasks before their due date in a row', progress: 2, total: 3, xpReward: 400, deadline: '2026-05-17', status: 'in_progress' },
  { id: 'q4', title: 'Perfectionist', description: 'Complete 5 tasks with no revisions needed', progress: 0, total: 5, xpReward: 600, status: 'not_started', badgeReward: 'Perfectionist Badge' },
  { id: 'q5', title: 'Client Whisperer', description: 'Get 3 consecutive client approvals', progress: 0, total: 3, xpReward: 800, status: 'not_started' },
  { id: 'q6', title: 'Sprint Champion', description: 'Be the top XP earner on your team for a full week', progress: 0, total: 1, xpReward: 1000, status: 'not_started', badgeReward: 'Sprint Champion Badge' },
  { id: 'q7', title: 'Reliability', description: 'Submit all tasks on or before deadline for 2 weeks', progress: 0, total: 14, xpReward: 750, status: 'not_started' },
]

/* =========================================================
   REWARDS
   ========================================================= */
export const REWARDS: Reward[] = [
  { id: 'r1', name: 'Half Day Off', description: 'Take a half day off, morning or afternoon', coinCost: 500, category: 'time_off', icon: '🌅', available: true, status: 'active' },
  { id: 'r2', name: 'Work From Home Day', description: 'Work from the comfort of home for a full day', coinCost: 800, category: 'time_off', icon: '🏠', available: true, status: 'active' },
  { id: 'r3', name: 'Team Lunch Nomination', description: 'Nominate your team for a sponsored lunch', coinCost: 1200, category: 'work_perk', icon: '🍽️', available: true, status: 'active' },
  { id: 'r4', name: 'Choose Your Next Project', description: 'Have a say in which project you\'re assigned to next', coinCost: 2000, category: 'career', icon: '🎯', available: false, status: 'active' },
  { id: 'r5', name: 'Mentorship with CTO', description: 'One-on-one career mentorship session with the CTO', coinCost: 1500, category: 'career', icon: '🎓', available: false, status: 'active' },
  { id: 'r6', name: 'Linknbit Merch Box', description: 'Premium Linknbit branded merchandise package', coinCost: 3000, category: 'recognition', icon: '🎁', available: false, status: 'active' },
  { id: 'r7', name: 'Extended Deadline Pass', description: 'Get a one-task deadline extension, no questions asked', coinCost: 400, category: 'work_perk', icon: '⏰', available: true, status: 'active' },
  { id: 'r8', name: 'Featured on Showcase', description: 'Get featured on Linknbit\'s social media and website', coinCost: 600, category: 'recognition', icon: '🌟', available: true, status: 'active' },
]

/* =========================================================
   APPROVALS (Client view)
   ========================================================= */
export const APPROVALS: Approval[] = [
  {
    id: 'ap1',
    type: 'stage',
    projectId: 'p2',
    projectName: 'Cricket Sansar Brand Identity',
    stageName: 'Client Review',
    submittedBy: 'Sara Qureshi',
    submittedAt: '2026-05-10',
    status: 'pending',
    message: 'Hi Imran, the UI designs for all 12 screens are ready. Please review the Figma file and approve or request revisions.',
    attachments: [
      { id: 'af1', name: 'CS_UI_Designs_v3.fig', type: 'figma', uploadedBy: 'Sara Qureshi', uploadedAt: '2026-05-10', clientVisible: true },
    ],
    recipientName: 'Imran Shah',
  },
  {
    id: 'ap2',
    type: 'file',
    projectId: 'p1',
    projectName: 'Cricket Sansar App',
    fileName: 'API_Documentation_v2.pdf',
    submittedBy: 'Ahmad Karimi',
    submittedAt: '2026-05-11',
    status: 'pending',
    message: 'Please review and approve the API documentation before we proceed to client testing.',
    recipientName: 'Imran Shah',
  },
]

/* =========================================================
   TEAM PERFORMANCE (Admin Dashboard)
   ========================================================= */
export const TEAM_PERFORMANCE = [
  { id: 'u2', name: 'Ahmad Karimi', role: 'Development Lead', tasksCompleted: 23, avgDays: 1.8, xp: 3200, workload: 'heavy' as const },
  { id: 'u3', name: 'Sara Qureshi', role: 'Design Lead', tasksCompleted: 18, avgDays: 2.1, xp: 2800, workload: 'medium' as const },
  { id: 'u4', name: 'Zain Malik', role: 'Marketing Lead', tasksCompleted: 31, avgDays: 1.2, xp: 4100, workload: 'heavy' as const },
  { id: 'u6', name: 'Bilal Ahmed', role: 'Design Lead', tasksCompleted: 11, avgDays: 3.0, xp: 1600, workload: 'light' as const },
]

/* =========================================================
   CLIENTS
   ========================================================= */
export const CLIENTS: Client[] = [
  { id: 'c1', name: 'Imran Shah', email: 'imran@cricketsansar.com', company: 'Cricket Sansar', accountManagerId: 'u2', accountManagerName: 'Ahmad Karimi', status: 'active', projectCount: 1, joinedAt: '2026-02-10', industry: 'Sports & Media', internalNote: 'High-priority client. Needs weekly updates.' },
  { id: 'c2', name: 'Internal', email: 'ghayas@linknbit.com', company: 'Linknbit (Internal)', accountManagerId: 'u1', accountManagerName: 'Ghayas', status: 'active', projectCount: 1, joinedAt: '2026-04-01', industry: 'Agency' },
  { id: 'c3', name: 'Alex Turner', email: 'alex@vpnguider.com', company: 'VPNGuider', accountManagerId: 'u4', accountManagerName: 'Zain Malik', status: 'active', projectCount: 1, joinedAt: '2026-03-01', industry: 'Technology', internalNote: 'SEO-focused. Monthly reporting required.' },
  { id: 'c4', name: 'Rahim Gul', email: 'rahim@glttransport.com', company: 'Rahim Gul GLT', accountManagerId: 'u3', accountManagerName: 'Sara Qureshi', status: 'active', projectCount: 1, joinedAt: '2026-04-10', industry: 'Logistics' },
  { id: 'c5', name: 'David Starr', email: 'david@starrluxury.com', company: 'Starr Luxury Cars', accountManagerId: 'u2', accountManagerName: 'Ahmad Karimi', status: 'active', projectCount: 1, joinedAt: '2026-04-15', industry: 'Automotive' },
  { id: 'c6', name: 'Irene Teo', email: 'irene@ireneteo.com', company: 'Irene Teo Coaching', accountManagerId: 'u6', accountManagerName: 'Bilal Ahmed', status: 'active', projectCount: 1, joinedAt: '2026-05-01', industry: 'Coaching & Consulting' },
  { id: 'c7', name: 'Mark Offsite', email: 'mark@offsitepro.com', company: 'Offsite Pro', accountManagerId: 'u5', accountManagerName: 'Usman Tariq', status: 'active', projectCount: 1, joinedAt: '2026-04-20', industry: 'B2B SaaS' },
  { id: 'c8', name: 'Dr. Farrukh Alam', email: 'farrukh@medigrow.pk', company: 'MediGrow', accountManagerId: 'u2', accountManagerName: 'Ahmad Karimi', status: 'active', projectCount: 1, joinedAt: '2026-05-10', industry: 'Healthcare' },
]

/* =========================================================
   ATTENDANCE
   ========================================================= */
export const ATTENDANCE_RECORDS: AttendanceRecord[] = [
  { id: 'a1', userId: 'u2', userName: 'Ahmad Karimi', date: '2026-05-16', checkIn: '09:02', checkOut: '18:15', status: 'present', method: 'office' },
  { id: 'a2', userId: 'u3', userName: 'Sara Qureshi', date: '2026-05-16', checkIn: '09:45', checkOut: undefined, status: 'late', method: 'remote', note: 'Working from home today' },
  { id: 'a3', userId: 'u4', userName: 'Zain Malik', date: '2026-05-16', checkIn: '08:55', checkOut: '17:58', status: 'present', method: 'office' },
  { id: 'a4', userId: 'u5', userName: 'Usman Tariq', date: '2026-05-16', checkIn: '09:10', checkOut: undefined, status: 'present', method: 'office' },
  { id: 'a5', userId: 'u6', userName: 'Bilal Ahmed', date: '2026-05-16', status: 'absent', method: 'admin', note: 'Sick leave' },
  { id: 'a6', userId: 'u7', userName: 'Hina Rizvi', date: '2026-05-16', checkIn: '10:30', checkOut: '14:30', status: 'present', method: 'office' },
  { id: 'a7', userId: 'u8', userName: 'Kamran Ali', date: '2026-05-16', checkIn: '09:05', checkOut: undefined, status: 'present', method: 'office' },
  // Yesterday
  { id: 'a8', userId: 'u2', userName: 'Ahmad Karimi', date: '2026-05-15', checkIn: '09:00', checkOut: '18:30', status: 'present', method: 'office' },
  { id: 'a9', userId: 'u3', userName: 'Sara Qureshi', date: '2026-05-15', checkIn: '09:15', checkOut: '17:45', status: 'present', method: 'office' },
  { id: 'a10', userId: 'u4', userName: 'Zain Malik', date: '2026-05-15', checkIn: '09:00', checkOut: '18:00', status: 'present', method: 'office' },
  { id: 'a11', userId: 'u5', userName: 'Usman Tariq', date: '2026-05-15', status: 'absent', method: 'admin' },
  { id: 'a12', userId: 'u6', userName: 'Bilal Ahmed', date: '2026-05-15', checkIn: '09:20', checkOut: '18:10', status: 'present', method: 'office' },
  { id: 'a13', userId: 'u7', userName: 'Hina Rizvi', date: '2026-05-15', checkIn: '09:00', checkOut: '18:00', status: 'present', method: 'office' },
  { id: 'a14', userId: 'u8', userName: 'Kamran Ali', date: '2026-05-15', checkIn: '09:30', status: 'late', method: 'office' },
]

/* =========================================================
   WFH REQUESTS
   ========================================================= */
export const WFH_REQUESTS: WFHRequest[] = [
  {
    id: 'wfh1',
    userId: 'u5',
    userName: 'Usman Tariq',
    date: '2026-05-19',
    requestedAt: '2026-05-18T09:15:00',
    reason: 'Internet issues in my area, will work from a co-working space nearby.',
    status: 'pending',
  },
  {
    id: 'wfh2',
    userId: 'u6',
    userName: 'Bilal Ahmed',
    date: '2026-05-19',
    requestedAt: '2026-05-18T08:45:00',
    reason: 'Doctor appointment in the morning, will work from home afterward.',
    status: 'pending',
  },
  {
    id: 'wfh3',
    userId: 'u3',
    userName: 'Sara Qureshi',
    date: '2026-05-20',
    requestedAt: '2026-05-18T10:00:00',
    reason: 'Deadline-critical design work, need a distraction-free environment.',
    status: 'pending',
  },
  {
    id: 'wfh4',
    userId: 'u7',
    userName: 'Hina Rizvi',
    date: '2026-05-17',
    requestedAt: '2026-05-16T18:30:00',
    reason: 'Family commitment in the evening, requesting early WFH.',
    status: 'approved',
    reviewedBy: 'Ghayas',
    reviewedAt: '2026-05-16T19:05:00',
    note: 'Approved. Please check in on time.',
  },
  {
    id: 'wfh5',
    userId: 'u8',
    userName: 'Kamran Ali',
    date: '2026-05-16',
    requestedAt: '2026-05-15T17:00:00',
    reason: 'Power outage reported in my area.',
    status: 'rejected',
    reviewedBy: 'Ahmad Karimi',
    reviewedAt: '2026-05-15T18:30:00',
    note: 'Generator available at office. Please come in.',
  },
  {
    id: 'wfh6',
    userId: 'u2',
    userName: 'Ahmad Karimi',
    date: '2026-05-18',
    requestedAt: '2026-05-18T00:00:00',
    reason: 'HR-granted WFH for client call setup.',
    status: 'approved',
    reviewedBy: 'Ghayas',
    reviewedAt: '2026-05-18T00:00:00',
    grantedDirectly: true,
  },
]

/* =========================================================
   TEAMS
   ========================================================= */
export const TEAMS: Team[] = [
  { id: 'tm1', name: 'Development Team', department: 'development', leadId: 'u2', leadName: 'Ahmad Karimi', memberIds: ['u2', 'u5', 'u8'], activeProjects: 4, avgWorkload: 'heavy' },
  { id: 'tm2', name: 'Design Team', department: 'design', leadId: 'u3', leadName: 'Sara Qureshi', memberIds: ['u3', 'u6'], activeProjects: 3, avgWorkload: 'medium' },
  { id: 'tm3', name: 'Marketing Team', department: 'marketing', leadId: 'u4', leadName: 'Zain Malik', memberIds: ['u4', 'u7'], activeProjects: 1, avgWorkload: 'medium' },
]
