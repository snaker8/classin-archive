const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Env loading
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
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing Service Role Key! Cannot restore user.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const EMAIL = 'snaker@hanmail.net';
const PASSWORD = 'classin1234';

async function resetPassword() {
    console.log(`Attempting to RESET password for: ${EMAIL}`);

    // 1. Get Profile ID (to get the UID, which should match Auth ID)
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', EMAIL)
        .single();

    if (profileError || !profile) {
        console.error('Error finding profile:', profileError);
        return;
    }

    console.log(`Found existing profile ID: ${profile.id}`);
    const uid = profile.id;

    // 2. Update Auth User Password
    const { data: user, error: updateError } = await supabase.auth.admin.updateUserById(
        uid,
        { password: PASSWORD }
    );

    if (updateError) {
        console.error('Error updating password:', updateError.message);
        // Fallback: If update by ID fails (maybe IDs don't match?), try listing again with pagination or filter if possible?
        // Actually, let's try to get user by email directly just to be sure of the ID.
        /*
        const { data: { users } } = await supabase.auth.admin.listUsers();
        // ... search ...
        */
    } else {
        console.log('SUCCESS! Password reset.');
        console.log(`Email: ${EMAIL}`);
        console.log(`New Password: ${PASSWORD}`);
    }
}

resetPassword();
