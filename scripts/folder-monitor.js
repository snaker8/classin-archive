const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// 1. Manually load .env.local
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf8');
    envConfig.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim().replace(/^["']|["']$/g, ''); // Remove quotes
        }
    });
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: .env.local file missing or keys not found.');
    console.error('Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper process input
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// Processing Logic
async function processFile(filePath, rootDir) {
    const fileName = path.basename(filePath);
    // Ignore dotfiles or non-images
    if (fileName.startsWith('.') || !fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return;

    // Structure: Root / ClassName / DateFolder / FileName
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length < 3) {
        console.log(`[SKIP] Invalid structure: ${relativePath}`);
        return;
    }

    const className = parts[0];
    const dateFolder = parts[1];
    const studentFile = parts[parts.length - 1];

    // Extract Date from dateFolder (support YYYY-MM-DD)
    const dateMatch = dateFolder.match(/(\d{4}-\d{2}-\d{2})/);
    const classDate = dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0];

    // Extract Student Name from filename (e.g., "1_Sehyeon.png" -> "Sehyeon")
    // Regex: Start with digits, underscore, then name, then extension
    const nameMatch = studentFile.match(/^\d+_(.+)\.(png|jpg|jpeg|gif|webp)$/i) || studentFile.match(/^(.+)\.(png|jpg|jpeg|gif|webp)$/i);
    let studentName = nameMatch ? nameMatch[1] : null; // Fallback to filename without ext

    // Clean up name (remove spaces, etc if needed)
    if (studentName) studentName = studentName.trim();

    if (!studentName) {
        console.log(`[SKIP] Could not parse student name: ${studentFile}`);
        return;
    }

    console.log(`[PROCESSING] Class: ${className} | Date: ${classDate} | Student: ${studentName}`);

    try {
        // 1. Find Student
        const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .ilike('full_name', `%${studentName}%`) // Partial match
            .limit(1);

        if (profileError) throw profileError;
        if (!profiles || profiles.length === 0) {
            console.log(`[ERROR] Student not found: ${studentName}`);
            return;
        }
        const student = profiles[0];
        // console.log(`   -> Found Student: ${student.full_name} (${student.id})`);

        // 2. Find or Create Class
        // We check if a class exists for this student + date (+ title optional)
        let { data: classes, error: classError } = await supabase
            .from('classes')
            .select('id')
            .eq('student_id', student.id)
            .eq('class_date', classDate)
            .eq('title', className) // Use folder name as title
            .limit(1);

        if (classError) throw classError;

        let classId;
        if (classes && classes.length > 0) {
            classId = classes[0].id;
        } else {
            // Create new class
            // Need a creator ID. We'll use the first admin found or a system user. 
            // For now, let's fetch an admin ID.
            const { data: adminUsers } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1);
            const adminId = adminUsers && adminUsers[0] ? adminUsers[0].id : student.id; // Fallback

            const { data: newClass, error: createError } = await supabase
                .from('classes')
                .insert({
                    student_id: student.id,
                    title: className, // Folder name as Title
                    description: `Auto-uploaded from folder: ${dateFolder}`,
                    class_date: classDate,
                    created_by: adminId
                })
                .select()
                .single();

            if (createError) throw createError;
            classId = newClass.id;
            console.log(`   -> Created New Class: ${className} (${classDate})`);
        }

        // 3. Check if file already exists (by name)
        // We'll skip duplicate filenames in the same class to prevent re-uploading on script restart
        // Actually, we can check materials
        const { count: existingCount } = await supabase
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)
            .ilike('content_url', `%${studentFile}%`);

        if (existingCount > 0) {
            console.log(`   -> [SKIP] File already uploaded: ${studentFile}`);
            return;
        }

        // 4. Upload File
        const fileContent = fs.readFileSync(filePath);
        const storagePath = `${student.id}/${classDate}/${Date.now()}-${studentFile}`;

        const { error: uploadError } = await supabase.storage
            .from('blackboard-images')
            .upload(storagePath, fileContent, {
                contentType: 'image/png', // Should detect mime type ideally, but simple for now
                upsert: false
            });

        if (uploadError) throw uploadError;

        // 5. Get Public URL
        const { data: publicUrlData } = supabase.storage
            .from('blackboard-images')
            .getPublicUrl(storagePath);

        // 6. Create Material
        const { error: materialError } = await supabase
            .from('materials')
            .insert({
                class_id: classId,
                type: 'blackboard_image',
                content_url: publicUrlData.publicUrl,
                order_index: 0 // Simplification
            });

        if (materialError) throw materialError;

        console.log(`   -> [SUCCESS] Uploaded: ${studentFile}`);

    } catch (err) {
        console.error(`   -> [ERROR] Failed: ${err.message}`);
    }
}

async function main() {
    console.log("==================================================");
    console.log("   ClassIn Archive - Auto Folder Uploader");
    console.log("==================================================");
    console.log("Make sure your folders are structured as:");
    console.log("   [WatchFolder] / [ClassName] / [DateFolder] / [StudentFile]");
    console.log("   Example: C:/Uploads / MathClass / 2024-01-01 / 1_John.png");
    console.log("--------------------------------------------------");

    const watchDir = await askQuestion("Enter the full path of the folder to watch: ");

    if (!fs.existsSync(watchDir)) {
        console.error("Error: Folder does not exist!");
        process.exit(1);
    }

    console.log(`\nMonitoring: ${watchDir}`);
    console.log("Press Ctrl+C to stop.\n");

    // Initial Scan?
    // Let's just watch for now. Or maybe scan deeply once.
    // User asked "when added", so fs.watch is key.
    // Recursive watch is 'recursive: true' in fs.watch (Windows/macOS only)

    let isProcessing = false;
    let fileQueue = [];

    // Simple debounced processor
    setInterval(async () => {
        if (isProcessing || fileQueue.length === 0) return;
        isProcessing = true;

        while (fileQueue.length > 0) {
            const filePath = fileQueue.shift();
            if (fs.existsSync(filePath)) { // Check if still exists
                await processFile(filePath, watchDir);
            }
        }
        isProcessing = false;
    }, 1000);

    // Watcher
    fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
        if (filename && eventType === 'rename') {
            // 'rename' usually handles creation too on Windows
            const fullPath = path.join(watchDir, filename);
            if (fs.existsSync(fullPath)) {
                // Check if it's a file
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isFile()) {
                        // Avoid duplicates in queue
                        if (!fileQueue.includes(fullPath)) {
                            console.log(`[DETECTED] ${filename}`);
                            fileQueue.push(fullPath);
                        }
                    }
                } catch (e) {
                    // Ignore (file might be deleted/moved rapidly)
                }
            }
        }
    });

}

main();
