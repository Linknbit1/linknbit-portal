-- XP threshold table — admin-editable, referenced by profiles.level
CREATE TABLE levels (
  level       int  PRIMARY KEY,
  xp_required int  NOT NULL,
  label       text
);

INSERT INTO levels (level, xp_required) VALUES
  (1,     0),
  (2,   500),
  (3,  1200),
  (4,  2500),
  (5,  4500),
  (6,  7500),
  (7, 11500),
  (8, 17000),
  (9, 24000),
  (10, 33000);
