const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load env
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
    console.log("Checking tables in database...");

    // Attempt 1: Direct Select
    const { error: directError } = await supabase.from('groups').select('count', { count: 'exact', head: true });
    if (!directError) {
        console.log("SUCCESS: 'groups' table is accessible.");
        return;
    }
    console.log("Direct access failed:", directError.message);

    // Attempt 2: RPC call (if users have a generic SQL exec function - unlikely but checking)
    // Attempt 3: Just logging that it failed.
    console.log("VERDICT: Table missing or permission denied.");
}

check();
