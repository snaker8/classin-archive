const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local to get keys
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvValue = (key) => {
    const match = envContent.match(new RegExp(`${key}=(.*)`));
    return match ? match[1] : null;
};

const SUPABASE_URL = getEnvValue('NEXT_PUBLIC_SUPABASE_URL');
const SERVICE_ROLE_KEY = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Error: Could not find Supabase keys in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkAdmins() {
    console.log('Checking for admin users...');

    // 1. Get profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'admin');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log(`Found ${profiles.length} admin profile(s):`);

    for (const p of profiles) {
        console.log(`- Profile: ${p.email} (${p.full_name}) ID: ${p.id}`);

        // 2. Get User from Auth
        const { data: { user }, error: authError } = await supabase.auth.admin.getUserById(p.id);

        if (authError) {
            console.error(`  [ERROR] Could not find Auth User for ID ${p.id}: ${authError.message}`);
        } else {
            console.log(`  [OK] Auth User found. Email: ${user.email} (Confirmed: ${user.email_confirmed_at ? 'Yes' : 'No'})`);
            if (user.email !== p.email) {
                console.warn(`  [WARNING] Email mismatch! Profile: ${p.email}, Auth: ${user.email}`);
            }
        }
    }

    if (profiles.length === 0) {
        console.log('\nNo admin users found in "profiles" table.');
    }
}

checkAdmins();
