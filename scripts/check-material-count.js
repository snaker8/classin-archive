const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPathCurrent = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPathCurrent)) {
    const envConfig = fs.readFileSync(envPathCurrent, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkCount() {
    // 1. Check Total Count
    const { count, error } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error('Error fetching count:', error);
    } else {
        console.log(`Current Total Materials in DB: ${count}`);
    }

    // 2. Check for Specific Student "김가이"
    const { data: students } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', '%김가이%');

    if (students && students.length > 0) {
        console.log(`\nFound Student(s) for '김가이':`);
        for (const s of students) {
            console.log(`- [${s.id}] ${s.full_name}`);

            // Check classes for this student
            const { data: classes } = await supabase
                .from('classes')
                .select('*')
                .eq('student_id', s.id);

            if (classes && classes.length > 0) {
                console.log(`  Classes (${classes.length}):`);
                for (const c of classes) {
                    console.log(`    - [${c.id}] ${c.title} (${c.class_date})`);

                    // Check materials for this class
                    const { data: materials, error: matError } = await supabase
                        .from('materials')
                        .select('id, title, type')
                        .eq('class_id', c.id);

                    if (materials && materials.length > 0) {
                        console.log(`      > Materials (${materials.length}):`);
                        materials.forEach(m => console.log(`        * [${m.id}] ${m.title} (${m.type})`));
                    } else {
                        console.log(`      > No materials.`);
                    }
                }
            } else {
                console.log(`  No classes found for this student.`);
            }
        }
    } else {
        console.log(`\nStudent '김가이' NOT found in DB.`);
    }
}

checkCount();
