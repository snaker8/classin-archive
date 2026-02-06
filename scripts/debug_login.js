const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Logic to load env from .env.local
const envPathCurrent = path.join(__dirname, '.env.local');
const envPathParent = path.join(__dirname, '..', '.env.local');
const envPath = fs.existsSync(envPathCurrent) ? envPathCurrent : envPathParent;

if (fs.existsSync(envPath)) {
    console.log(`Loading env from: ${envPath}`);
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('--- Config Check ---');
console.log('URL Exists:', !!SUPABASE_URL);
console.log('Key Exists:', !!SUPABASE_KEY);
console.log('Key Type:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SERVICE_ROLE' : 'ANON');

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing config!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUser(email) {
    console.log(`\nChecking user: ${email}...`);

    // 1. Check Auth (only works if we have SERVICE_ROLE key)
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        try {
            const { data: { users }, error } = await supabase.auth.admin.listUsers();
            if (error) throw error;

            const user = users.find(u => u.email === email);
            if (user) {
                console.log(`[AUTH] User found in Auth! ID: ${user.id}`);
                console.log(`[AUTH] Email Confirmed: ${user.email_confirmed_at}`);
            } else {
                console.log(`[AUTH] User NOT found in Auth list (checked ${users.length} users).`);
            }
        } catch (e) {
            console.log('[AUTH] Error listing users:', e.message);
        }
    } else {
        console.log('[AUTH] Skipping Admin User Check (No Service Role Key)');
    }

    // 2. Check Public Profile
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', email) // Assuming email is in profiles, otherwise we can't check easily without ID
            .maybeSingle();

        if (error) {
            // If email column doesn't exist in profiles, we might fallback to checking Auth only
            console.log('[DB] Error checking profiles:', error.message);
        } else if (data) {
            console.log(`[DB] User found in Profiles! Role: ${data.role}`);
        } else {
            console.log('[DB] User NOT found in Profiles table.');
        }
    } catch (e) {
        console.log('[DB] Unexpected error:', e.message);
    }
}

checkUser('snaker@hanmail.net');
