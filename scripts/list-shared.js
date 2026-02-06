
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

async function listShared() {
    const { data: files, error } = await sb.storage.from('blackboard-images').list('_shared/teachers', { limit: 100 });
    if (error) console.error(error);
    else console.log('Shared teacher folders:', JSON.stringify(files, null, 2));

    if (files) {
        for (const file of files) {
            if (file.id === undefined) { // Directory
                const { data: subfiles } = await sb.storage.from('blackboard-images').list(`_shared/teachers/${file.name}`);
                console.log(`Files in ${file.name}:`, JSON.stringify(subfiles, null, 2));
            }
        }
    }
}

listShared();
