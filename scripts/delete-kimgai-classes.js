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

async function deleteClassesForKimGai() {
    // 1. Find the student ID
    const { data: students, error: sError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .ilike('full_name', '%김가이%');

    if (sError || !students || students.length === 0) {
        console.error('Student "김가이" not found.');
        return;
    }

    const studentId = students[0].id;
    console.log(`Found student: ${students[0].full_name} (${studentId})`);

    // 2. Delete all classes for this student
    const { data, error } = await supabase
        .from('classes')
        .delete()
        .eq('student_id', studentId)
        .select();

    if (error) {
        console.error('Error deleting classes:', error);
    } else {
        console.log(`Successfully deleted ${data.length} classes for this student.`);
        data.forEach(c => console.log(` - Deleted: ${c.title} (${c.class_date})`));
    }
}

deleteClassesForKimGai();
