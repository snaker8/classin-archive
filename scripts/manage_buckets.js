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
    console.log('Checking Supabase Storage Buckets...');

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error('Error listing buckets:', error);
        return;
    }

    console.log('Existing Buckets:', buckets.map(b => b.name));

    const TARGET_BUCKET = 'blackboard-images';
    const exists = buckets.find(b => b.name === TARGET_BUCKET);

    if (!exists) {
        console.log(`Bucket '${TARGET_BUCKET}' not found. Creating...`);
        const { data, error: createError } = await supabase.storage.createBucket(TARGET_BUCKET, {
            public: true,
            fileSizeLimit: 10485760, // 10MB
            allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp']
        });

        if (createError) {
            console.error('Error creating bucket:', createError);
        } else {
            console.log(`Successfully created bucket: '${TARGET_BUCKET}'`);
        }
    } else {
        console.log(`Bucket '${TARGET_BUCKET}' already exists.`);
    }
}

main();
