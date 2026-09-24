-- Füge alle Employee-Felder zu users hinzu
ALTER TABLE users ADD COLUMN phone TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN birthday TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN street TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN zip TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN city TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN position TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN contract_type TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN weekly_hours REAL;
ALTER TABLE users ADD COLUMN start_date TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN end_date TEXT DEFAULT '';
ALTER TABLE users ADD COLUMN vacation_days REAL;
ALTER TABLE users ADD COLUMN active BOOLEAN DEFAULT 1;
ALTER TABLE users ADD COLUMN planner_departments TEXT;
ALTER TABLE users ADD COLUMN department TEXT;

.headers on
.mode column
PRAGMA table_info(users);
