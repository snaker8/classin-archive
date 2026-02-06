
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

async function listAllFiles(path = '') {
    const { data: items, error } = await sb.storage.from('blackboard-images').list(path, { limit: 100 });
    if (error) return [];

    let files = [];
    for (const item of items) {
        const fullPath = path ? `${path}/${item.name}` : item.name;
        if (item.id === undefined) { // Directory
            const subfiles = await listAllFiles(fullPath);
            files = files.concat(subfiles);
        } else {
            files.push(fullPath);
        }
    }
    return files;
}

async function searchInStorage() {
    console.log('Searching all files in blackboard-images bucket...');
    const allFiles = await listAllFiles();
    console.log(`Found ${allFiles.length} files total.`);

    const teacherNames = ['임세현', '조현철', '김지은', '백융일', '최원우', '전도현'];
    const matches = allFiles.filter(f => teacherNames.some(name => f.includes(name)) || f.includes('샘') || f.includes('선생님'));

    if (matches.length > 0) {
        console.log('Found teacher-related files in storage:', JSON.stringify(matches, null, 2));
    } else {
        console.log('No teacher-related files found in storage.');
    }
}

searchInStorage();
