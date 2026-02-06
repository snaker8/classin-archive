
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

async function findMismatches() {
    const { data: materials } = await sb.from('materials').select('id, title, class_id, type');

    for (const mat of materials) {
        const { data: cls } = await sb.from('classes').select('student_id').eq('id', mat.class_id).single();
        const { data: profile } = await sb.from('profiles').select('full_name').eq('id', cls.student_id).single();

        if (!mat.title.includes(profile.full_name)) {
            console.log(`Mismatch: Material "${mat.title}" is in class for student "${profile.full_name}" (Type: ${mat.type})`);
        }
    }
}

findMismatches();
