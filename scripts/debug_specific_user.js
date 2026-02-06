const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('Missing config!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUser(phone) {
    const cleanPhone = phone.replace(/-/g, '');
    const emailSuffixes = ['student.local', 'teacher.local', 'admin.local'];

    console.log(`Checking variations for phone: ${cleanPhone}`);

    for (const suffix of emailSuffixes) {
        const email = `${cleanPhone}@${suffix}`;
        console.log(`\nChecking email: ${email}...`);

        try {
            const { data: { users }, error } = await supabase.auth.admin.listUsers();
            if (error) throw error;

            const user = users.find(u => u.email === email);
            if (user) {
                console.log(`[AUTH] User found!`);
                console.log(`ID: ${user.id}`);
                console.log(`Email: ${user.email}`);
                console.log(`Role in metadata: ${user.user_metadata?.role}`);

                // Also check profile
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', user.id)
                    .single();

                if (profile) {
                    console.log(`[DB] Profile found! Role: ${profile.role}, Full Name: ${profile.full_name}`);
                } else {
                    console.log(`[DB] Profile NOT found.`);
                }
            } else {
                console.log(`[AUTH] Not found with this email.`);
            }
        } catch (e) {
            console.error('Error:', e.message);
        }
    }
}

const targetPhone = '01051656324'; // From screenshot
checkUser(targetPhone);
