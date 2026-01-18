
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const envVars = {};
envContent.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
        envVars[match[1]] = match[2];
    }
});

const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseServiceRoleKey = envVars['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

async function checkDuplicates() {
    console.log('Fetching all students...');
    const { data: students, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'student');

    if (error) {
        console.error('Error:', error);
        return;
    }

    const nameMap = {};
    const emailMap = {};

    students.forEach(s => {
        // Check Name Duplicates
        if (!nameMap[s.full_name]) {
            nameMap[s.full_name] = [];
        }
        nameMap[s.full_name].push(s);

        // Check Email Duplicates (unlikely due to unique constraint, but good to check)
        if (!emailMap[s.email]) {
            emailMap[s.email] = [];
        }
        emailMap[s.email].push(s);
    });

    console.log('--- Identical Names ---');
    let duplicateCount = 0;
    for (const [name, list] of Object.entries(nameMap)) {
        if (list.length > 1) {
            console.log(`"${name}" has ${list.length} entries:`);
            list.forEach(item => console.log(`  - ID: ${item.id}, Email: ${item.email}, Created: ${item.created_at}`));
            duplicateCount++;
        }
    }

    if (duplicateCount === 0) console.log('No duplicate names found.');

    console.log('\n--- Identical Emails ---');
    let emailDupCount = 0;
    for (const [email, list] of Object.entries(emailMap)) {
        if (list.length > 1) {
            console.log(`"${email}" has ${list.length} entries.`);
            emailDupCount++;
        }
    }
    if (emailDupCount === 0) console.log('No duplicate emails found.');
}

checkDuplicates();
