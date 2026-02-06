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

async function resetPassword() {
    const email = 'snaker@hanmail.net'; // Target admin email
    const newPassword = 'lsh1107!!';

    console.log(`Resetting password for ${email}...`);

    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();

    if (profileError) {
        console.error('Error finding user in profiles:', profileError);
        return;
    }

    const { data, error } = await supabase.auth.admin.updateUserById(
        profiles.id,
        { password: newPassword }
    );

    if (error) {
        console.error('Error updating password:', error);
    } else {
        console.log('Password updated successfully to: classin1234');
    }
}

resetPassword();
