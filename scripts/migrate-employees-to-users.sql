-- Step 1: Migra Mitarbeiterdaten zu users basierend auf E-Mail-Match
UPDATE users u
SET
  phone = (SELECT phone FROM employees e WHERE e.email = u.email LIMIT 1),
  birthday = (SELECT birthday FROM employees e WHERE e.email = u.email LIMIT 1),
  street = (SELECT street FROM employees e WHERE e.email = u.email LIMIT 1),
  zip = (SELECT zip FROM employees e WHERE e.email = u.email LIMIT 1),
  city = (SELECT city FROM employees e WHERE e.email = u.email LIMIT 1),
  position = (SELECT position FROM employees e WHERE e.email = u.email LIMIT 1),
  contract_type = (SELECT contract_type FROM employees e WHERE e.email = u.email LIMIT 1),
  weekly_hours = (SELECT weekly_hours FROM employees e WHERE e.email = u.email LIMIT 1),
  start_date = (SELECT start_date FROM employees e WHERE e.email = u.email LIMIT 1),
  end_date = (SELECT end_date FROM employees e WHERE e.email = u.email LIMIT 1),
  vacation_days = (SELECT vacation_days FROM employees e WHERE e.email = u.email LIMIT 1),
  active = COALESCE((SELECT active FROM employees e WHERE e.email = u.email LIMIT 1), 1),
  department = (SELECT department FROM employees e WHERE e.email = u.email LIMIT 1),
  planner_departments = (SELECT planner_departments FROM employees e WHERE e.email = u.email LIMIT 1)
WHERE EXISTS (SELECT 1 FROM employees e WHERE e.email = u.email);

-- Step 2: Fill first_name and last_name für users die sie nicht haben
UPDATE users u
SET first_name = COALESCE(
  (SELECT first_name FROM employees e WHERE e.email = u.email LIMIT 1),
  TRIM(SUBSTR(name, 1, INSTR(name || ' ', ' ') - 1))
)
WHERE (first_name IS NULL OR first_name = '') AND name IS NOT NULL;

UPDATE users u
SET last_name = COALESCE(
  (SELECT last_name FROM employees e WHERE e.email = u.email LIMIT 1),
  TRIM(SUBSTR(name, INSTR(name || ' ', ' ') + 1))
)
WHERE (last_name IS NULL OR last_name = '') AND name IS NOT NULL;

-- Step 3: Setze active=true für alle users
UPDATE users SET active = 1 WHERE active IS NULL;

-- Verifizierung
.headers on
.mode column
SELECT 'USERS NACH MIGRATION:' as info;
SELECT id, email, first_name, last_name, position, weekly_hours, active FROM users;
