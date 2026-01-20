const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// CONFIG FILE PATH
const CONFIG_FILE = path.join(__dirname, 'monitor-config.json');

// 1. Manually load .env.local
const envPathCurrent = path.join(__dirname, '.env.local');
const envPathParent = path.join(__dirname, '..', '.env.local');
const envPath = fs.existsSync(envPathCurrent) ? envPathCurrent : envPathParent;

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

// Memory cache to prevent processing the same file multiple times in a short window
const processedFiles = new Set();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

function addToCache(filePath) {
    processedFiles.add(filePath);
    setTimeout(() => {
        processedFiles.delete(filePath);
    }, CACHE_DURATION);
}

function isVideo(fileName) {
    return fileName.match(/\.(mp4|mov|avi|wmv|mkv|webm)$/i);
}

function isImage(fileName) {
    return fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i);
}

function parsePath(filePath, rootDir) {
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length < 3) {
        // console.log(`[SKIP] Path too short: ${relativePath}`);
        return {};
    }

    const className = parts[0];
    const dateFolder = parts[1];

    // Date parsing
    const dateMatch = dateFolder.match(/(\d{4}-\d{2}-\d{2})/);
    let classDate = dateMatch ? dateMatch[1] : null;

    // Backup date parsing from all parts if folder name isn't strict date
    if (!classDate) {
        for (const part of parts) {
            const match = part.match(/(\d{4})-?(\d{2})-?(\d{2})/);
            if (match) {
                classDate = `${match[1]}-${match[2]}-${match[3]}`;
                break;
            }
        }
    }

    if (!classDate) {
        classDate = new Date().toISOString().split('T')[0];
    }

    return { className, classDate, relativePath, dateFolder, parts };
}

// MAIN DISPATCHER
async function processFile(filePath, rootDir) {
    if (processedFiles.has(filePath)) return;

    const fileName = path.basename(filePath);
    if (fileName.startsWith('.')) return;

    if (isVideo(fileName)) {
        await processVideo(filePath, rootDir, fileName);
    } else if (isImage(fileName)) {
        await processImage(filePath, rootDir, fileName);
    }
}

// Process Video (Shared Class Material)
async function processVideo(filePath, rootDir, fileName) {
    const { className, classDate, relativePath } = parsePath(filePath, rootDir);
    if (!className || !classDate) return;

    console.log(`[VIDEO DETECTED] ${className} - ${classDate} : ${fileName}`);

    try {
        // 1. Upload to Shared Storage (if not exists)
        const safeFileName = `${Date.now()}_${fileName}`;
        const storagePath = `_shared/${className}/${classDate}/${safeFileName}`;
        const fileContent = fs.readFileSync(filePath);

        // Simple ContentType detection
        let contentType = 'video/mp4';
        if (fileName.toLowerCase().endsWith('.mov')) contentType = 'video/quicktime';
        else if (fileName.toLowerCase().endsWith('.webm')) contentType = 'video/webm';

        console.log(`   -> Uploading video to shared storage...`);
        const { error: uploadError } = await supabase.storage
            .from('blackboard-images')
            .upload(storagePath, fileContent, { contentType, upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('blackboard-images')
            .getPublicUrl(storagePath);

        const contentUrl = publicUrlData.publicUrl;

        // 2. Find ALL classes for this Group/Date
        const { data: classes } = await supabase
            .from('classes')
            .select('id, student:profiles(full_name)')
            .eq('title', className)
            .eq('class_date', classDate);

        if (!classes || classes.length === 0) {
            console.log(`   -> [WARN] No classes found for ${className} on ${classDate}. Video uploaded but not linked. (Will link when students are added)`);
            addToCache(filePath);
            return;
        }

        console.log(`   -> Linking video to ${classes.length} students...`);

        // 3. Link to each class
        for (const cls of classes) {
            // Check duplicate
            const { count } = await supabase
                .from('materials')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', cls.id)
                .eq('title', fileName);

            if (count > 0) continue;

            await supabase.from('materials').insert({
                class_id: cls.id,
                type: 'video_link', // Use video_link type for now
                title: fileName,
                content_url: contentUrl,
                order_index: 100 // Videos at end
            });
            console.log(`      + Linked to ${cls.student.full_name}`);
        }

        console.log(`   -> [SUCCESS] Video processed.`);
        addToCache(filePath);

    } catch (err) {
        console.error(`   -> [ERROR] Video processing failed: ${err.message}`);
    }
}

// Process Student Image
async function processImage(filePath, rootDir, fileName) {
    const { className: folderName, classDate, relativePath, dateFolder } = parsePath(filePath, rootDir);
    if (!folderName || !classDate) return;

    // Extract Name
    let namePart = fileName.replace(/^\d+[_ ]*/, '').replace(/\.[^/.]+$/, "");
    let studentName = namePart.trim();

    if (!studentName || studentName.length < 2) {
        console.log(`[SKIP] Invalid student name in file: ${fileName}`);
        return;
    }

    try {
        // 1. Find Student
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .ilike('full_name', `%${studentName}%`)
            .limit(1);

        if (!profiles || profiles.length === 0) {
            console.log(`[SKIP] Student '${studentName}' not found in DB. File: ${fileName}`);
            return;
        }
        const student = profiles[0];

        // 2. Determine Class Title (Group Logic)
        let targetClassTitle = folderName; // Default to folder name

        // Check if student belongs to any groups
        const { data: groupMembers, error: groupError } = await supabase
            .from('group_members')
            .select('group:groups(name)')
            .eq('student_id', student.id);

        if (!groupError && groupMembers && groupMembers.length > 0) {
            // Priority 1: If folder name matches one of their groups, use that.
            const matchedGroup = groupMembers.find(gm => gm.group.name === folderName);
            if (matchedGroup) {
                targetClassTitle = matchedGroup.group.name;
                console.log(`   -> matched group: ${targetClassTitle}`);
            } else {
                // Priority 2: If file is in a generic folder, but student is in a group, use the first group.
                // Assuming 1 student usually belongs to 1 main class group for now.
                // If they are in multiple, we might need more logic, but taking the first one is a safe "auto-sort" default.
                targetClassTitle = groupMembers[0].group.name;
                console.log(`   -> auto-sorted to group: ${targetClassTitle}`);
            }
        }

        // 3. Find/Create Class Session
        let { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('student_id', student.id)
            .eq('class_date', classDate)
            .eq('title', targetClassTitle)
            .limit(1);

        let classId;
        if (classes && classes.length > 0) {
            classId = classes[0].id;
        } else {
            // Create New Class
            const { data: adminUsers } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1);
            const adminId = adminUsers && adminUsers[0] ? adminUsers[0].id : student.id;

            const { data: newClass, error: createError } = await supabase
                .from('classes')
                .insert({
                    student_id: student.id,
                    title: targetClassTitle,
                    description: `Auto-uploaded from folder: ${dateFolder}`,
                    class_date: classDate,
                    created_by: adminId
                })
                .select()
                .single();

            if (createError) throw createError;
            classId = newClass.id;
        }

        // 4. Image Duplication Check
        const { count: existingCount } = await supabase
            .from('materials')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', classId)
            .eq('title', fileName);

        if (existingCount > 0) {
            console.log(`[SKIP] Duplicate file already exists: ${fileName}`);
            addToCache(filePath);
            return;
        }

        console.log(`[UPLOADING] ${studentName} -> [${targetClassTitle}] ${classDate} : ${fileName}`);

        // 5. Upload Image
        const fileContent = fs.readFileSync(filePath);
        const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${path.extname(fileName)}`;
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
                title: fileName,
                content_url: publicUrlData.publicUrl,
                order_index: 0
            });

        if (materialError) throw materialError;

        console.log(`   -> [SUCCESS] Uploaded.`);
        addToCache(filePath);

        // 6. Catch-up: Check for Sibling Videos (using the SAME targetClassTitle)
        await scanForSiblingVideos(classId, path.dirname(filePath), targetClassTitle, classDate);

    } catch (err) {
        console.error(`   -> [ERROR] ${err.message}`);
    }
}

// Helper: Check for videos in the folder and link them if not already linked
async function scanForSiblingVideos(classId, folderPath, className, classDate) {
    try {
        const files = fs.readdirSync(folderPath);
        const videos = files.filter(f => isVideo(f));

        for (const videoFile of videos) {
            // Check if this class already has this video
            const { count } = await supabase
                .from('materials')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', classId)
                .eq('title', videoFile);

            if (count > 0) continue; // Already linked

            console.log(`   -> Found sibling video: ${videoFile}. Checking distribution...`);

            // We need the URL of the ALREADY UPLOADED video.
            // Search for ANY material with this title that is a video_link and has _shared path
            const { data: existingMaterials } = await supabase
                .from('materials')
                .select('content_url')
                .eq('title', videoFile)
                .filter('content_url', 'ilike', '%_shared%') // Supabase ILIKE filter
                .limit(1);

            let contentUrl;
            if (existingMaterials && existingMaterials.length > 0) {
                contentUrl = existingMaterials[0].content_url;
            } else {
                // Not found? Trigger explicit upload for it
                console.log(`      Video not on server yet. triggering upload...`);
                await processVideo(path.join(folderPath, videoFile), folderPath, videoFile);
                return; // processVideo handles linking
            }

            if (contentUrl) {
                await supabase.from('materials').insert({
                    class_id: classId,
                    type: 'video_link',
                    title: videoFile,
                    content_url: contentUrl,
                    order_index: 100
                });
                console.log(`      + Linked existing video to this class.`);
            }
        }
    } catch (err) {
        // console.log(`   -> [WARN] Error scanning siblings: ${err.message}`);
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
        watchDir = watchDir.trim().replace(/^["']|["']$/g, '');

        if (!fs.existsSync(watchDir)) {
            console.error("Error: Folder does not exist!");
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
