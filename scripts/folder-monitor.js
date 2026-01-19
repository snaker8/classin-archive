const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// CONFIG FILE PATH
const CONFIG_FILE = path.join(__dirname, 'monitor-config.json');

// 1. Manually load .env.local
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Error: .env.local file missing or keys not found.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

// --- Deep Scan Logic ---
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, "/", file));
        }
    });

    return arrayOfFiles;
}
// -----------------------

async function processFile(filePath, rootDir) {
    const fileName = path.basename(filePath);
    if (fileName.startsWith('.') || !fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i)) return;

    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length < 3) return; // Need Class/Date/File

    const className = parts[0];
    const dateFolder = parts[1];
    const studentFile = parts[parts.length - 1];

    const dateMatch = dateFolder.match(/(\d{4}-\d{2}-\d{2})/);

    // If no date found in dateFolder, search all path parts
    let classDate = null;
    if (dateMatch) {
        classDate = dateMatch[1];
    } else {
        // Search all parts for a date pattern (more flexible)
        for (const part of parts) {
            const match = part.match(/(\d{4})-?(\d{2})-?(\d{2})/);
            if (match) {
                classDate = `${match[1]}-${match[2]}-${match[3]}`;
                break;
            }
        }
    }

    // Fallback to today if no date found
    if (!classDate) {
        classDate = new Date().toISOString().split('T')[0];
        console.log(`[WARN] No date found in path, using today: ${relativePath}`);
    }

    console.log(`[DEBUG] Processing: ${relativePath} -> Date: ${classDate}, Class: ${className}`);

    // Extract Name
    // Pattern: "1_Name.png" or "Name.png" or "3_Name_hash.png"
    // Let's take the first part after digits and underscore, or just the name
    // Simplest robust: Remove leading digits and underscores, then take basename
    let namePart = studentFile.replace(/^\d+[_ ]*/, '').replace(/\.[^/.]+$/, "");
    // Remove any trailing hash or numbers if separated by underscore (optional, depends on user files)
    // For "1_Sehyeon.png", namePart is "Sehyeon"
    // For "Sehyeon.png", namePart is "Sehyeon"

    // If name has underscores inside (e.g. Kim_Sehyeon), allow it.
    let studentName = namePart.trim();

    // Check for "___" separator in case of "2_008___82121652.png" (from image)
    if (studentName.includes('___')) {
        // Maybe ignore this file or try to parse? Use logic: "2_008" might be name?
        // Let's assume user uses standard names mostly.
        // If it looks like ID, skip or warn.
    }

    if (!studentName) return;

    // Check with Supabase (Is this file already uploaded?)
    // Optimization: Check duplication globally for this class? 
    // We do it per file for safety.

    try {
        // 1. Find Student
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .ilike('full_name', `%${studentName}%`)
            .limit(1);

        if (!profiles || profiles.length === 0) {
            console.log(`[SKIP] Student '${studentName}' not found for file: ${studentFile}`);
            return;
        }
        const student = profiles[0];

        // 2. Find/Create Class
        let { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('student_id', student.id)
            .eq('class_date', classDate)
            .eq('title', className)
            .limit(1);

        let classId;
        if (classes && classes.length > 0) {
            classId = classes[0].id;
        } else {
            // Fetch admin
            const { data: adminUsers } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1);
            const adminId = adminUsers && adminUsers[0] ? adminUsers[0].id : student.id;

            const { data: newClass, error: createError } = await supabase
                .from('classes')
                .insert({
                    student_id: student.id,
                    title: className,
                    description: `Auto-uploaded from folder: ${dateFolder}`,
                    class_date: classDate,
                    created_by: adminId
                })
                .select()
                .single();

            if (createError) throw createError;
            classId = newClass.id;
        }

        // 3. Duplication Check (Crucial)
        const { count: existingCount } = await supabase
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)
            .ilike('content_url', `%${studentFile}%`);

        if (existingCount > 0) {
            // Already uploaded
            return;
        }

        console.log(`[UPLOADING] ${studentName} - ${classDate} : ${studentFile}`);

        // 4. Upload
        const fileContent = fs.readFileSync(filePath);
        // Use safe ASCII name for storage key: timestamp_random.ext
        const ext = path.extname(studentFile);
        const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${ext}`;
        const storagePath = `${student.id}/${classDate}/${safeFileName}`;

        const { error: uploadError } = await supabase.storage
            .from('blackboard-images')
            .upload(storagePath, fileContent, { contentType: 'image/png', upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('blackboard-images')
            .getPublicUrl(storagePath);

        const { error: materialError } = await supabase
            .from('materials')
            .insert({
                class_id: classId,
                type: 'blackboard_image',
                content_url: publicUrlData.publicUrl,
                order_index: 0
            });

        if (materialError) throw materialError;

        console.log(`   -> [SUCCESS] Uploaded.`);

    } catch (err) {
        console.error(`   -> [ERROR] ${err.message}`);
    }
}

async function main() {
    console.log("==================================================");
    console.log("   ClassIn Archive - Persistent Folder Monitor");
    console.log("==================================================");

    let watchDir = "";

    // Load config if exists
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (config.watchDir && fs.existsSync(config.watchDir)) {
                watchDir = config.watchDir;
                console.log(`Loaded config for folder: ${watchDir}`);
            }
        } catch (e) {
            console.error("Config file corrupted, resetting...");
        }
    }

    if (!watchDir) {
        watchDir = await askQuestion("Enter the full path of the folder to watch: ");
        watchDir = watchDir.trim().replace(/^["']|["']$/g, ''); // Remove quotes if user pasted path as string

        if (!fs.existsSync(watchDir)) {
            console.error("Error: Folder does not exist!");
            // Wait a bit before exit so user sees message
            await new Promise(r => setTimeout(r, 3000));
            process.exit(1);
        }

        // Save config
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ watchDir }, null, 2));
    }

    console.log("\nPerforming Initial Scan (Checking for new files)...");

    try {
        const allFiles = getAllFiles(watchDir);
        console.log(`Found ${allFiles.length} files. Checking against server...`);

        for (const file of allFiles) {
            await processFile(file, watchDir);
        }
    } catch (e) {
        console.error("Scan failed:", e);
    }

    console.log("\nInitial Scan Complete. Starting Real-time Monitor...");
    console.log(`Monitoring: ${watchDir}`);
    console.log("(Minimize this window to keep running in background)");

    // Real-time Watcher
    let isProcessing = false;
    let fileQueue = [];

    // Processor Loop
    setInterval(async () => {
        if (isProcessing || fileQueue.length === 0) return;
        isProcessing = true;

        while (fileQueue.length > 0) {
            const filePath = fileQueue.shift();
            // Wait 1 sec to ensure file write is complete (very common issue with huge images)
            await new Promise(r => setTimeout(r, 1000));

            if (fs.existsSync(filePath)) {
                await processFile(filePath, watchDir);
            }
        }
        isProcessing = false;
    }, 2000);

    fs.watch(watchDir, { recursive: true }, (eventType, filename) => {
        if (filename && eventType === 'rename') {
            const fullPath = path.join(watchDir, filename);
            if (fs.existsSync(fullPath)) {
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.isFile()) {
                        if (!fileQueue.includes(fullPath)) {
                            console.log(`[NEW FILE DETECTED] ${filename}`);
                            fileQueue.push(fullPath);
                        }
                    }
                } catch (e) { }
            }
        }
    });
}

main();
