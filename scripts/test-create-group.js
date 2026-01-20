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

async function testInsert() {
    console.log("Attempting to create test group...");
    const testName = `Test Group ${Date.now()}`;

    const { data, error } = await supabase
        .from('groups')
        .insert({ name: testName, description: 'Test Description' })
        .select()
        .single();

    if (error) {
        console.error("INSERT FAILED:", error);
    } else {
        console.log("INSERT SUCCESS:", data);

        // Clean up
        console.log("Cleaning up...");
        await supabase.from('groups').delete().eq('id', data.id);
    }
}

testInsert();
