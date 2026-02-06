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

async function cleanAllEmptyAutoUploadedClasses() {
    // Find ALL classes with "Auto-uploaded" in description
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, title, description, class_date')
        .ilike('description', '%Auto-uploaded%');

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Found ${classes.length} total auto-uploaded classes.`);

    let deletedCount = 0;
    let safeCount = 0;

    for (const cls of classes) {
        const { count, error: countError } = await supabase
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', cls.id);

        if (countError) {
            console.error(`Error counting materials for ${cls.id}:`, countError);
            continue;
        }

        if (count === 0) {
            // Delete!
            console.log(`[DELETE] Empty class: ${cls.title} (${cls.class_date})`);

            const { error: deleteError } = await supabase
                .from('classes')
                .delete()
                .eq('id', cls.id);

            if (deleteError) {
                console.error(`   Failed to delete: ${deleteError.message}`);
            } else {
                deletedCount++;
            }
        } else {
            console.log(`[KEEP] Class has ${count} materials: ${cls.title}`);
            safeCount++;
        }
    }

    console.log(`\nSummary:`);
    console.log(`- Kept (has materials): ${safeCount}`);
    console.log(`- Deleted (empty): ${deletedCount}`);
}

cleanAllEmptyAutoUploadedClasses();
