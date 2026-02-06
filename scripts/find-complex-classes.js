
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

async function findComplexClasses() {
    const { data: materials } = await sb.from('materials').select('class_id, type, title');
    const counts = {};
    materials.forEach(m => {
        counts[m.class_id] = (counts[m.class_id] || 0) + 1;
    });

    const many = Object.entries(counts).filter(([id, count]) => count > 1);
    console.log(`Found ${many.length} classes with more than 1 material.`);

    for (const [id, count] of many) {
        const { data: cls } = await sb.from('classes').select('title, class_date').eq('id', id).single();
        const { data: mats } = await sb.from('materials').select('title, type').eq('class_id', id);
        console.log(`Class ${cls.title} (${cls.class_date}) has ${count} materials:`);
        console.log(JSON.stringify(mats, null, 2));
    }
}

findComplexClasses();
