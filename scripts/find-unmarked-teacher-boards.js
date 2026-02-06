
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
        const [k, v] = line.split('=');
        if (k && v) process.env[k.trim()] = v.trim().replace(/^["']|["']$/g, '');
    });
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkTeachers() {
    const { data: teachers } = await sb.from('teachers').select('*');
    console.log('Teachers:', JSON.stringify(teachers, null, 2));

    if (teachers && teachers.length > 0) {
        // Search for materials containing any teacher name
        for (const teacher of teachers) {
            const { data: mats } = await sb.from('materials')
                .select('id, title, type, order_index')
                .ilike('title', `%${teacher.name}%`);

            if (mats && mats.length > 0) {
                console.log(`Found materials for teacher ${teacher.name}:`, JSON.stringify(mats, null, 2));
            }
        }
    }
}

checkTeachers();
