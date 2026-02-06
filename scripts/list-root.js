
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

async function listRootItems() {
    const { data: items, error } = await sb.storage.from('blackboard-images').list('', { limit: 100 });
    if (error) console.error(error);
    else console.log('Root items in bucket:', JSON.stringify(items, null, 2));
}

listRootItems();
