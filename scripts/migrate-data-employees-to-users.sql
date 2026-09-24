-- Migre Mitarbeiterdaten zu users
UPDATE users
SET
  phone = (SELECT phone FROM employees WHERE employees.email = users.email LIMIT 1),
  birthday = (SELECT birthday FROM employees WHERE employees.email = users.email LIMIT 1),
  street = (SELECT street FROM employees WHERE employees.email = users.email LIMIT 1),
  zip = (SELECT zip FROM employees WHERE employees.email = users.email LIMIT 1),
  city = (SELECT city FROM employees WHERE employees.email = users.email LIMIT 1),
  position = (SELECT position FROM employees WHERE employees.email = users.email LIMIT 1),
  contract_type = (SELECT contract_type FROM employees WHERE employees.email = users.email LIMIT 1),
  weekly_hours = (SELECT weekly_hours FROM employees WHERE employees.email = users.email LIMIT 1),
  start_date = (SELECT start_date FROM employees WHERE employees.email = users.email LIMIT 1),
  end_date = (SELECT end_date FROM employees WHERE employees.email = users.email LIMIT 1),
  vacation_days = (SELECT vacation_days FROM employees WHERE employees.email = users.email LIMIT 1),
  active = COALESCE((SELECT active FROM employees WHERE employees.email = users.email LIMIT 1), 1),
  department = (SELECT department FROM employees WHERE employees.email = users.email LIMIT 1),
  planner_departments = (SELECT planner_departments FROM employees WHERE employees.email = users.email LIMIT 1)
WHERE EXISTS (SELECT 1 FROM employees WHERE employees.email = users.email);

-- Fülle first_name und last_name aus Employees nach (wenn noch leer)
UPDATE users
SET first_name = (SELECT first_name FROM employees WHERE employees.email = users.email LIMIT 1)
WHERE (first_name IS NULL OR first_name = '')
  AND EXISTS (SELECT 1 FROM employees WHERE employees.email = users.email AND first_name IS NOT NULL);

UPDATE users
SET last_name = (SELECT last_name FROM employees WHERE employees.email = users.email LIMIT 1)
WHERE (last_name IS NULL OR last_name = '')
  AND EXISTS (SELECT 1 FROM employees WHERE employees.email = users.email AND last_name IS NOT NULL);

-- Setze active=true für alle Users
UPDATE users SET active = 1 WHERE active IS NULL OR active = '';

-- Verifizierung
SELECT '=== USERS NACH MIGRATION ===' as info;
SELECT id, email, COALESCE(first_name, '') as first_name, COALESCE(last_name, '') as last_name, COALESCE(position, '') as position, COALESCE(weekly_hours, 0) as weekly_hours, active FROM users;

SELECT '=== EMPLOYEES (original) ===' as info;
SELECT id, email, first_name, last_name, position, weekly_hours, active FROM employees;
