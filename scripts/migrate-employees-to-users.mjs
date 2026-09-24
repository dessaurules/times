import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8091');

console.log('🔄 Starte Datenmigration employees → users...\n');

try {
  // Step 1: Get all employees and users
  const employees = await pb.collection('employees').getFullList();
  const users = await pb.collection('users').getFullList();

  console.log(`📊 Gefunden: ${users.length} Users, ${employees.length} Employees\n`);

  // Step 2: Map employees to users by email
  const employeeByEmail = {};
  employees.forEach(emp => {
    employeeByEmail[emp.email] = emp;
  });

  // Step 3: Migrate data
  let migratedCount = 0;
  let skippedCount = 0;

  for (const user of users) {
    const matchedEmployee = employeeByEmail[user.email];

    if (matchedEmployee) {
      // Copy employee fields to user
      try {
        const updateData = {
          phone: matchedEmployee.phone || '',
          birthday: matchedEmployee.birthday || '',
          street: matchedEmployee.street || '',
          zip: matchedEmployee.zip || '',
          city: matchedEmployee.city || '',
          position: matchedEmployee.position || '',
          contract_type: matchedEmployee.contract_type || '',
          weekly_hours: matchedEmployee.weekly_hours || null,
          start_date: matchedEmployee.start_date || '',
          end_date: matchedEmployee.end_date || '',
          vacation_days: matchedEmployee.vacation_days || null,
          active: matchedEmployee.active !== undefined ? matchedEmployee.active : true,
          department: matchedEmployee.department || '',
          planner_departments: matchedEmployee.planner_departments || null,
        };

        // Only set first_name/last_name if they're empty
        if (!user.first_name && matchedEmployee.first_name) {
          updateData.first_name = matchedEmployee.first_name;
        }
        if (!user.last_name && matchedEmployee.last_name) {
          updateData.last_name = matchedEmployee.last_name;
        }

        await pb.collection('users').update(user.id, updateData);
        console.log(`✅ ${user.email} - migriert`);
        migratedCount++;
      } catch (e) {
        console.error(`❌ ${user.email} - Fehler:`, e.message);
      }
    } else {
      // No matching employee - set defaults
      try {
        let firstName = user.first_name || '';
        let lastName = user.last_name || '';

        // Split name if first/last name are empty
        if (!firstName && !lastName && user.name) {
          const parts = user.name.trim().split(/\s+/);
          firstName = parts[0] || '';
          lastName = parts.slice(1).join(' ') || '';
        }

        await pb.collection('users').update(user.id, {
          active: true,
          first_name: firstName,
          last_name: lastName,
        });
        console.log(`⚠️  ${user.email} - Kein Employee gefunden, Standard gesetzt`);
        skippedCount++;
      } catch (e) {
        console.error(`❌ ${user.email} - Fehler:`, e.message);
      }
    }
  }

  console.log(`\n📈 Ergebnis: ${migratedCount} migriert, ${skippedCount} angepasst\n`);

  // Step 4: Verify migration
  console.log('🔍 Verifiziere Migration...\n');
  const updatedUsers = await pb.collection('users').getFullList();
  updatedUsers.forEach(user => {
    console.log(`${user.email}:`);
    console.log(`  - first_name: "${user.first_name}", last_name: "${user.last_name}"`);
    console.log(`  - position: "${user.position}", weekly_hours: ${user.weekly_hours}`);
    console.log(`  - active: ${user.active}`);
  });

  console.log('\n✅ Datenmigration abgeschlossen!');
} catch (e) {
  console.error('❌ Fehler bei der Migration:', e);
  process.exit(1);
}
