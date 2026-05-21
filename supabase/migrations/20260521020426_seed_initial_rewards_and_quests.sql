-- ─────────────────────────────────────────
-- SEED: STARTER REWARDS
-- ─────────────────────────────────────────
INSERT INTO rewards (name, description, xp_cost, quantity, is_active) VALUES
  (
    'Extra Day Off',
    'Take an extra paid day off at a time of your choosing, subject to team capacity.',
    5000,
    -1,
    true
  ),
  (
    'Team Lunch',
    'Enjoy a team lunch on the company — your choice of restaurant, up to 4 people.',
    3000,
    5,
    true
  ),
  (
    'Learning Budget Boost',
    'PKR 5,000 added to your personal learning & development budget for courses, books, or tools.',
    2000,
    -1,
    true
  ),
  (
    'Work From Home Week',
    'One full week of remote work — no questions asked. Requires 1-week advance notice.',
    1500,
    -1,
    true
  ),
  (
    'Early Friday',
    'Leave 2 hours early this Friday. Valid for one use, expires end of month.',
    500,
    -1,
    true
  );

-- ─────────────────────────────────────────
-- SEED: STARTER QUESTS
-- ─────────────────────────────────────────
INSERT INTO quests (title, description, xp_reward, condition_type, condition_value, is_active, repeatable) VALUES
  (
    'Task Crusher',
    'Complete 5 tasks and prove you mean business.',
    250,
    'tasks_completed',
    '{"count": 5}'::jsonb,
    true,
    false
  ),
  (
    'Punctuality Pro',
    'Check in on time 7 days in a row — consistency is your superpower.',
    500,
    'on_time_streak',
    '{"streak_days": 7}'::jsonb,
    true,
    true
  ),
  (
    'Collaborator',
    'Leave 10 comments on tasks to help your team move forward.',
    150,
    'comments_added',
    '{"count": 10}'::jsonb,
    true,
    false
  );
