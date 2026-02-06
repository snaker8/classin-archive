const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually load .env.local
const envPathCurrent = path.join(__dirname, '.env.local');
const envPathParent = path.join(__dirname, '..', '.env.local');
const envPath = fs.existsSync(envPathCurrent) ? envPathCurrent : envPathParent;

if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('Checking Groups containing "중1" or "M1"...');

    const { data: groups, error } = await supabase
        .from('groups')
        .select('name');

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Total Groups: ${groups.length}`);
    console.log('--- Sample Groups ---');
    groups.forEach(g => {
        if (g.name.includes('중1') || g.name.includes('M1') || g.name.includes('H1')) {
            console.log(`"${g.name}" (Normalized: "${g.name.replace(/\s+/g, '').toLowerCase()}")`);
        }
    });
}

main();
