
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

async function checkRecent() {
    const { data: classes } = await sb.from('classes').select('id, title, class_date').order('created_at', { ascending: false }).limit(10);
    console.log('Recent Classes:', JSON.stringify(classes, null, 2));

    if (classes && classes.length > 0) {
        for (const cls of classes) {
            const { data: mats } = await sb.from('materials').select('*').eq('class_id', cls.id);
            if (mats && mats.length > 0) {
                console.log(`Materials for ${cls.title} (${cls.class_date}):`, JSON.stringify(mats, null, 2));
            }
        }
    }
}

checkRecent();
