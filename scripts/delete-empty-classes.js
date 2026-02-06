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

async function deleteEmptyClasses() {
    // 1. Find classes with "중3AL" in title
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, title, description, class_date')
        .ilike('title', '%중3AL%');

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Found ${classes.length} classes matching '중3AL':`);
    let deletedCount = 0;

    for (const cls of classes) {
        // 2. Check material count for EACH class
        const { count, error: countError } = await supabase
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

        if (countError) {
            console.error(`Error counting materials for ${cls.title} (${cls.id}):`, countError);
            continue;
        }

        if (count === 0) {
            // 3. DELETE if count is 0
            console.log(`[DELETE] Deleting empty class: ${cls.title} (${cls.class_date}) - ID: ${cls.id}`);

            const { error: deleteError } = await supabase
                .from('classes')
                .delete()
                .eq('id', cls.id);

            if (deleteError) {
                console.error(`   Failed to delete: ${deleteError.message}`);
            } else {
                console.log(`   Success.`);
                deletedCount++;
            }
        } else {
            console.log(`[SKIP] Class has ${count} materials: ${cls.title} (${cls.class_date})`);
        }
    }

    console.log(`\nOperation Complete.`);
    console.log(`Total Found: ${classes.length}`);
    console.log(`Total Deleted: ${deletedCount}`);
}

deleteEmptyClasses();
