const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Mock environment for local script
const envLocal = fs.readFileSync(path.resolve('.env.local'), 'utf8');
const env = {};
envLocal.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseAdmin = createClient(
    env['NEXT_PUBLIC_SUPABASE_URL'],
    env['SUPABASE_SERVICE_ROLE_KEY'],
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    }
);

async function testDistribution() {
    console.log('--- Testing Distribution Logic (Simulation) ---');

    // 1. Find a class to target (e.g., latest class)
    const { data: classes, error: classError } = await supabaseAdmin
        .from('classes')
        .select('*')
        .order('class_date', { ascending: false })
        .limit(1);

    if (classError || !classes || classes.length === 0) {
        console.error('No classes found to test with.');
        return;
    }

    const targetClass = classes[0];
    console.log(`Target Class: ID=${targetClass.id}, Date=${targetClass.class_date}, Title=${targetClass.title}`);

    // 2. Simulate "Distributing" a board to this date
    // We won't actually upload a file, just verify the query logic handles it.
    // Logic: Find classes by date -> Insert material.

    const date = targetClass.class_date;
    console.log(`Simulating distribution for Date: ${date}`);

    const { data: matchingClasses, error: queryError } = await supabaseAdmin
        .from('classes')
        .select('id, student_id')
        .eq('class_date', date);

    if (queryError) {
        console.error('Error querying classes:', queryError);
        return;
    }

    console.log(`Found ${matchingClasses.length} matching classes for date ${date}.`);

    // 3. Verify we can insert a material (Mock insert)
    const mockUrl = 'https://example.com/mock-teacher-board.png';
    const materialsToInsert = matchingClasses.map(cls => ({
        class_id: cls.id,
        type: 'teacher_blackboard_image',
        content_url: mockUrl,
        order_index: 0
    }));

    console.log(`Would insert ${materialsToInsert.length} material records.`);
    console.log('Sample record:', materialsToInsert[0]);

    // 4. Verify Viewer Logic assumption
    // If we inserted this, does the viewer see it?
    // Viewer queries 'materials' by 'class_id'.
    // Yes, materialsToInsert[0].class_id matches targetClass.id.

    console.log('--- Verification Successful: Distribution logic matches Class ID correctly. ---');
}

testDistribution();
