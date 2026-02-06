const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

console.log("==================================================");
console.log("   ClassIn Monitor - Environment Diagnostic");
console.log("==================================================");

// 1. Check Node Version
console.log(`\n[1] Checking Node.js Environment...`);
console.log(`    Node Version: ${process.version}`);
const majorVersion = parseInt(process.version.slice(1).split('.')[0], 10);
if (majorVersion < 18) {
    console.warn(`    WARNING: Node version might be too old. Recommend 18+`);
} else {
    console.log(`    MATCH: Version OK.`);
}

// 2. Check .env.local
console.log(`\n[2] Checking Configuration (.env.local)...`);
const envPathCurrent = path.join(__dirname, '.env.local');
const envPathParent = path.join(__dirname, '..', '.env.local');
let envPath = null;

if (fs.existsSync(envPathCurrent)) {
    envPath = envPathCurrent;
    console.log(`    FOUND: ${envPathCurrent}`);
} else if (fs.existsSync(envPathParent)) {
    envPath = envPathParent;
    console.log(`    FOUND: ${envPathParent}`);
} else {
    console.error(`    ERROR: .env.local FILE MISSING!`);
    console.error(`    -> Please copy .env.local to this folder.`);
    process.exit(1);
}

// Load Env
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
});

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) console.error(`    ERROR: NEXT_PUBLIC_SUPABASE_URL is missing in .env.local`);
else console.log(`    CHECK: NEXT_PUBLIC_SUPABASE_URL found.`);

if (!SUPABASE_KEY) console.error(`    ERROR: SUPABASE_SERVICE_ROLE_KEY is missing in .env.local`);
else console.log(`    CHECK: SUPABASE_SERVICE_ROLE_KEY found.`);

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log(`    -> Keys are missing. Script cannot run.`);
    process.exit(1);
}


// 3. Test Connection
console.log(`\n[3] Testing Supabase Connection...`);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testConnection() {
    try {
        const { data, error } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            throw error;
        }
        console.log(`    SUCCESS: Connected to Database. Profile count accessible.`);

        // Check Bucket
        const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
        if (bucketError) throw bucketError;

        const bbBucket = buckets.find(b => b.name === 'blackboard-images');
        if (bbBucket) {
            console.log(`    SUCCESS: Storage Bucket 'blackboard-images' found.`);
        } else {
            console.error(`    ERROR: Bucket 'blackboard-images' NOT FOUND!`);
        }

    } catch (err) {
        console.error(`    CONNECTION FAILED: ${err.message}`);
        console.error(`    -> Check your internet connection or API keys.`);
    }
}

testConnection();
