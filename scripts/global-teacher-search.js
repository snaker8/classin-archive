
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

async function globalSearch() {
    const { data: mats } = await sb.from('materials')
        .select('id, title, type, order_index')
        .or('title.ilike.%샘%,title.ilike.%선생님%,title.ilike.%설명%,title.ilike.%풀이%');

    if (mats && mats.length > 0) {
        console.log(`Found potential teacher materials:`, JSON.stringify(mats, null, 2));
    } else {
        console.log('No potential teacher materials found with keywords.');
    }
}

globalSearch();
