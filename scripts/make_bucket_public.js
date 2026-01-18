const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load env
const envPath = path.join(__dirname, '..', '.env.local');
const envConfig = fs.readFileSync(envPath, 'utf8');
envConfig.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
    }
});

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
    const TARGET_BUCKET = 'blackboard-images';
    console.log(`Updating bucket '${TARGET_BUCKET}' to PUBLIC...`);

    const { data, error } = await supabase.storage.updateBucket(TARGET_BUCKET, {
        public: true, // FORCE PUBLIC
        fileSizeLimit: 10485760,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
    });

    if (error) {
        console.error('Error updating bucket:', error);
    } else {
        console.log(`Successfully updated bucket '${TARGET_BUCKET}' to public: true`);
        console.log(data);
    }

    // Also verify by listing
    const { data: buckets } = await supabase.storage.listBuckets();
    const b = buckets.find(b => b.name === TARGET_BUCKET);
    console.log('Current bucket config:', b);
}

main();
