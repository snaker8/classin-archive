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
    const { className, classDate, relativePath, parts } = parsePath(filePath, rootDir);
    if (!className || !classDate) return;

    console.log(`[VIDEO DETECTED] Path: ${relativePath} | Date: ${classDate}`);

    try {
        // 1. Upload to Shared Storage (if not exists)
        const safeFileName = `${Date.now()}_${fileName}`;
        // Note: storagePath still uses the raw folder structure (M1/Class/...) 
        // which is fine, as long as we LINK it to the right class.
        // Actually, let's keep storage organization clean if possible, but raw path is safer for uniqueness.
        // Let's stick to using 'className' (first part) for storage folder to keep it somewhat organized, 
        // or we could use the full relative dir. Let's use parts[0] + parts[1]... actually parsePath already gives strict struct.
        // Let's just use what we have.

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
        // IMPROVED: Check all path parts for a matching Class Title
        // Since we don't know the exact class name, we query classes on this date 
        // that have a title matching ANY of our path parts.

        const { data: classes } = await supabase
            .from('classes')
            .select('id, title, student:profiles(full_name)')
            .eq('class_date', classDate)
            .in('title', parts); // Check if title is IN [M1, MyClass, SubType...]

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
// -----------------------

async function processTeacherImage(filePath, rootDir, fileName) {
    const { className, classDate, relativePath, parts } = parsePath(filePath, rootDir);
    if (!className || !classDate) return;

    // Remove number prefix for logging
    let namePart = fileName.replace(/^\d+[_ ]*/, '').replace(/\.[^/.]+$/, "").trim();

    console.log(`[TEACHER IMAGE DETECTED] Name: ${namePart} | Path: ${relativePath}`);

    try {
        // 1. Upload to Shared Storage (if not exists)
        const safeFileName = `${Date.now()}_${fileName}`;
        // Verify if we should use a specific 'teachers' folder or just shared
        const storagePath = `_shared/teachers/${className}/${classDate}/${safeFileName}`;
        const fileContent = fs.readFileSync(filePath);

        console.log(`   -> Uploading teacher board to shared storage...`);
        const { error: uploadError } = await supabase.storage
            .from('blackboard-images')
            .upload(storagePath, fileContent, { contentType: 'image/png', upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('blackboard-images')
            .getPublicUrl(storagePath);

        const contentUrl = publicUrlData.publicUrl;

        // NEW: Record in Teacher Board Master Gallery
        const teacherData = await findTeacher(namePart);
        const { error: masterError } = await supabase
            .from('teacher_board_master')
            .insert({
                content_url: contentUrl,
                class_date: classDate,
                teacher_id: teacherData ? teacherData.id : null,
                filename: fileName
            });

        if (masterError && !masterError.message.includes('unique_violation')) {
            console.warn(`   -> [WARN] Failed to record in master gallery: ${masterError.message}`);
        }

        // 2. Find ALL classes for this Group/Date
        const { data: classes } = await supabase
            .from('classes')
            .select('id, title, student:profiles(full_name)')
            .eq('class_date', classDate)
            .in('title', parts);

        if (!classes || classes.length === 0) {
            console.log(`   -> [INFO] No matching classes found yet. Board is safe in Gallery for manual distribution.`);
            addToCache(filePath);
            return;
        }

        console.log(`   -> Linking teacher board to ${classes.length} existing classes...`);

        // 3. Link to each class
        for (const cls of classes) {
            // Check duplicate
            const { count } = await supabase
                .from('materials')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', cls.id)
                .eq('title', fileName);

            if (count > 0) continue;

            const orderMatch = fileName.match(/^(\d+)/);
            const orderIndex = orderMatch ? parseInt(orderMatch[1]) : 0;

            await supabase.from('materials').insert({
                class_id: cls.id,
                type: 'teacher_blackboard_image',
                title: fileName,
                content_url: contentUrl,
                order_index: orderIndex
            });
            console.log(`      + Linked to ${cls.student.full_name}`);
        }

        console.log(`   -> [SUCCESS] Teacher board processed.`);
        addToCache(filePath);

    } catch (err) {
        console.error(`   -> [ERROR] Teacher board processing failed: ${err.message}`);
    }
}


// Process Student Image
async function processImage(filePath, rootDir, fileName) {
    const { className: folderName, classDate, relativePath, dateFolder, parts } = parsePath(filePath, rootDir);
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
            // Check if it is a TEACHER
            const teacherData = await findTeacher(studentName);
            if (teacherData) {
                await processTeacherImage(filePath, rootDir, fileName);
                return;
            }

            console.log(`[SKIP] Student '${studentName}' not found in DB. File: ${fileName}`);
            return;
        }
        const student = profiles[0];

        // 2. Determine Class Title (Group Logic)
        // 2. Determine Class Title (Improved Logic)
        // Goal: Use the deepest non-date folder as the Class Title (Topic).
        // Only if THAT specific folder matches a group name, use the normalized Group Name.
        // Do NOT let a parent folder override the specific topic folder.

        let candidateTitle = folderName; // Default to root folder

        // Parts includes filename at the end, so we ignore the last one.
        // We scan from deepest folder (length-2) up to root (0).
        for (let i = parts.length - 2; i >= 0; i--) {
            const part = parts[i];
            // Check if part looks like a date (YYYY-MM-DD or YYYY-MM-DD-...)
            // Simple check: starts with 4 digits and looks date-ish
            const isDateLike = part.match(/^\d{4}-\d{2}-\d{2}/);

            if (!isDateLike) {
                candidateTitle = part;
                break; // Found our topic!
            }
        }

        let targetClassTitle = candidateTitle;
        let assignedTeacherName = null;

        // Check if our Candidate Title matches a group
        const { data: groupMembers, error: groupError } = await supabase
            .from('group_members')
            .select('group:groups(name, teacher:teachers(name))')
            .eq('student_id', student.id);

        if (!groupError && groupMembers && groupMembers.length > 0) {
            const normalize = (s) => s.replace(/\s+/g, '').toLowerCase();
            const candidateNorm = normalize(candidateTitle);

            const matchedGroup = groupMembers.find(gm => {
                const groupNorm = normalize(gm.group.name);
                // Exact match OR prefix match
                return groupNorm === candidateNorm || groupNorm.startsWith(candidateNorm);
            });

            if (matchedGroup) {
                targetClassTitle = matchedGroup.group.name;
                if (matchedGroup.group.teacher) {
                    assignedTeacherName = matchedGroup.group.teacher.name;
                }
                console.log(`   -> [GROUP MATCH] Folder '${candidateTitle}' matched Group '${matchedGroup.group.name}'`);
            } else {
                console.log(`   -> [TOPIC CLASS] Using folder name: ${candidateTitle}`);
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
        let isNewClass = false;

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
            isNewClass = true;
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


        // Determine Material Type (Teacher vs Normal)
        let materialType = 'blackboard_image';
        if (assignedTeacherName && fileName.includes(assignedTeacherName)) {
            materialType = 'teacher_blackboard_image';
            console.log(`      [TEACHER MATERIAL DECTECTED] Matches '${assignedTeacherName}'`);
        }

        // IMPROVED: Extract order_index from filename (leading numbers)
        const orderMatch = fileName.match(/^(\d+)/);
        const orderIndex = orderMatch ? parseInt(orderMatch[1]) : 0;

        const { error: materialError } = await supabase
            .from('materials')
            .insert({
                class_id: classId,
                type: materialType,
                title: fileName,
                content_url: publicUrlData.publicUrl,
                order_index: orderIndex
            });

        if (materialError) throw materialError;

        console.log(`   -> [SUCCESS] Uploaded.`);
        addToCache(filePath);

        // 7. Catch-up: Check for Sibling Teacher Boards
        await scanForSiblingTeacherBoards(classId, path.dirname(filePath), targetClassTitle, classDate);

    } catch (err) {
        console.error(`   -> [ERROR] ${err.message}`);

        // Rollback: If this was a new class and upload failed, delete the empty class
        if (isNewClass && classId) {
            try {
                const { count } = await supabase
                    .from('materials')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', classId);

                if (count === 0) {
                    console.log(`   -> [ROLLBACK] Deleting empty class created for failed upload: ${targetClassTitle}`);
                    await supabase.from('classes').delete().eq('id', classId);
                }
            } catch (cleanupErr) {
                console.error(`   -> [ROLLBACK FAILED] Could not delete empty class: ${cleanupErr.message}`);
            }
        }
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

async function findTeacher(name) {
    try {
        const { data } = await supabase
            .from('teachers')
            .select('id, name')
            .ilike('name', `%${name.trim()}%`)
            .limit(1);
        return data && data.length > 0 ? data[0] : null;
    } catch (e) {
        return null;
    }
}

async function scanForSiblingTeacherBoards(classId, folderPath, className, classDate) {
    try {
        const files = fs.readdirSync(folderPath);
        const images = files.filter(f => isImage(f));

        for (const imgFile of images) {
            // Extract Name
            let namePart = imgFile.replace(/^\d+[_ ]*/, '').replace(/\.[^/.]+$/, "").trim();

            // Avoid re-checking known students (optimization: if we could, but simple check is fast enough)
            // Check if this file is a teacher file
            const teacherData = await findTeacher(namePart);
            if (teacherData) {
                // Check if linked
                const { count } = await supabase
                    .from('materials')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', classId)
                    .eq('title', imgFile);

                if (count > 0) continue;

                console.log(`   -> Found detected teacher sibling: ${imgFile}. Linking...`);

                // Find uploaded content_url in _shared/teachers
                // We look for any material with this title that has type 'teacher_blackboard_image'
                const { data: existingMaterials } = await supabase
                    .from('materials')
                    .select('content_url')
                    .eq('title', imgFile)
                    .eq('type', 'teacher_blackboard_image')
                    .limit(1);

                let contentUrl;
                if (existingMaterials && existingMaterials.length > 0) {
                    contentUrl = existingMaterials[0].content_url;
                } else {
                    // Trigger upload if not found
                    console.log(`      Teacher board not on server yet. triggering upload...`);
                    await processTeacherImage(path.join(folderPath, imgFile), folderPath, imgFile);
                    // processTeacherImage will link to ALL classes including this one if it finds it
                    // but due to timing, if we just created this class, processTeacherImage might find it NOW.
                    continue;
                }

                if (contentUrl) {
                    const orderMatch = imgFile.match(/^(\d+)/);
                    const orderIndex = orderMatch ? parseInt(orderMatch[1]) : 0;

                    await supabase.from('materials').insert({
                        class_id: classId,
                        type: 'teacher_blackboard_image',
                        title: imgFile,
                        content_url: contentUrl,
                        order_index: orderIndex
                    });
                    console.log(`      + Linked teacher board to this class.`);
                }
            }
        }

    } catch (e) {
        console.error(`Error scanning teacher siblings: ${e.message}`);
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
