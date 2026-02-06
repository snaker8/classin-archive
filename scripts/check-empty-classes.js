const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPathCurrent = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPathCurrent)) {
    const envConfig = fs.readFileSync(envPathCurrent, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, '');
        }
    });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: Supabase credentials missing.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkAutoUploadedClasses() {
    // Find classes with specific titles
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, title, description, class_date, created_at')
        .ilike('title', '%중1M12P%')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Found ${classes.length} classes for 중3AL:`);

    for (const cls of classes) {
        const { count, error: countError } = await supabase
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

        if (countError) {
            console.error(`Error counting materials for ${cls.title}:`, countError);
        } else {
            console.log(`[${cls.class_date}] ${cls.title}`);
            console.log(`   - ID: ${cls.id}`);
            console.log(`   - Desc: ${cls.description}`);
            console.log(`   - Material Count: ${count}`);
            if (count === 0) {
                console.log(`   WARNING: EMPTY CLASS`);
            }
        }
    }
}

checkAutoUploadedClasses();
