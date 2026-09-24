-- Erstelle Zuordnungstabelle: Alte Employee IDs → Neue User IDs
CREATE TEMPORARY TABLE emp_user_map AS
SELECT e.id as emp_id, u.id as user_id
FROM employees e
JOIN users u ON e.email = u.email;

-- Remap alle Foreign Keys in betroffenen Collections
UPDATE absences SET employee = (SELECT user_id FROM emp_user_map WHERE emp_id = absences.employee)
WHERE employee IN (SELECT emp_id FROM emp_user_map);

UPDATE time_entries SET employee = (SELECT user_id FROM emp_user_map WHERE emp_id = time_entries.employee)
WHERE employee IN (SELECT emp_id FROM emp_user_map);

UPDATE vacation_accounts SET employee = (SELECT user_id FROM emp_user_map WHERE emp_id = vacation_accounts.employee)
WHERE employee IN (SELECT emp_id FROM emp_user_map);

UPDATE documents SET employee = (SELECT user_id FROM emp_user_map WHERE emp_id = documents.employee)
WHERE employee IN (SELECT emp_id FROM emp_user_map);

UPDATE availability SET employee = (SELECT user_id FROM emp_user_map WHERE emp_id = availability.employee)
WHERE employee IN (SELECT emp_id FROM emp_user_map);

UPDATE shift_entries SET employee = (SELECT user_id FROM emp_user_map WHERE emp_id = shift_entries.employee)
WHERE employee IN (SELECT emp_id FROM emp_user_map);

UPDATE push_subscriptions SET employee = (SELECT user_id FROM emp_user_map WHERE emp_id = push_subscriptions.employee)
WHERE employee IN (SELECT emp_id FROM emp_user_map);

-- Verifizierung
SELECT '=== FK REMAP VERIFIKATION ===' as info;
SELECT 'absences: ' || COUNT(*) as table_count FROM absences WHERE employee IN (SELECT user_id FROM emp_user_map);
SELECT 'time_entries: ' || COUNT(*) as table_count FROM time_entries WHERE employee IN (SELECT user_id FROM emp_user_map);
SELECT 'shift_entries: ' || COUNT(*) as table_count FROM shift_entries WHERE employee IN (SELECT user_id FROM emp_user_map);
