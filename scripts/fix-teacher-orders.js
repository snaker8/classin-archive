
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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixTeacherOrders() {
    console.log('Fetching all blackboard images to fix order_index...');

    const { data: materials, error } = await supabase
        .from('materials')
        .select('id, title, order_index, type')
        .in('type', ['blackboard_image', 'teacher_blackboard_image']);

    if (error) {
        console.error('Error fetching materials:', error);
        return;
    }

    console.log(`Found ${materials.length} boards. Fetching teachers list...`);

    const { data: teachers } = await supabase.from('teachers').select('name');

    // Create a set of patterns to check: Full names AND First names (last 2 chars)
    const teacherPatterns = new Set();
    teachers.forEach(t => {
        if (t.name) {
            teacherPatterns.add(t.name); // Full name e.g. "임세현"
            if (t.name.length === 3) {
                teacherPatterns.add(t.name.substring(1)); // First name e.g. "세현"
            }
        }
    });

    // Add manual overrides if needed based on user request
    ['세현', '지은'].forEach(p => teacherPatterns.add(p));

    console.log('Search patterns:', Array.from(teacherPatterns));

    let updatedCount = 0;
    for (const material of materials) {
        const updates = {};

        // 1. Extract leading numbers for order_index
        const orderMatch = material.title.match(/^(\d+)/);
        if (orderMatch) {
            const newOrderIndex = parseInt(orderMatch[1]);
            if (material.order_index !== newOrderIndex) {
                updates.order_index = newOrderIndex;
            }
        }

        // 2. Check if it should be teacher_blackboard_image
        // Check against all teacher patterns + generic terms
        const isTeacherBoard =
            Array.from(teacherPatterns).some(pattern => material.title.includes(pattern)) ||
            material.title.includes('쌤') ||
            material.title.includes('선생님');

        if (isTeacherBoard && material.type !== 'teacher_blackboard_image') {
            updates.type = 'teacher_blackboard_image';
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
            const { error: updateError } = await supabase
                .from('materials')
                .update(updates)
                .eq('id', material.id);

            if (updateError) {
                console.error(`   [ERROR] Failed to update ${material.title}:`, updateError.message);
            } else {
                const changes = Object.entries(updates).map(([k, v]) => `${k}:${v}`).join(', ');
                console.log(`   [UPDATED] ${material.title}: ${changes}`);
                updatedCount++;
            }
        }
    }

    console.log(`\nMigration complete. Total updated: ${updatedCount}`);
}

fixTeacherOrders();
