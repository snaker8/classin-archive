const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const envPath = path.join(__dirname, '..', '.env.local');
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

async function check() {
    console.log("Checking [groups] table with strict SELECT...");

    // 1. Try to INSERT a dummy row (will fail with constraint error if table exists but empty, or 'not found' if missing)
    // Actually SELECT is safer.
    const { data, error } = await supabase.from('groups').select('id').limit(1);

    if (error) {
        console.error("SELECT ERROR:", JSON.stringify(error, null, 2));
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
            console.log("CONCLUSION: Table 'groups' DEFINITELY DOES NOT EXIST.");
        } else {
            console.log("CONCLUSION: Table exists but other error:", error.code);
        }
    } else {
        console.log("SUCCESS: Table 'groups' exists and is readable.");
    }
}

check();
