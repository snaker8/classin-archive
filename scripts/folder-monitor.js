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

function logToFile(msg) {
    const logPath = path.join(__dirname, 'monitor.log');
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logPath, `[${timestamp}] ${msg}\n`);
}

const originalLog = console.log;
const originalError = console.error;

console.log = function (...args) {
    originalLog.apply(console, args);
    logToFile(args.join(' '));
};

console.error = function (...args) {
    originalError.apply(console, args);
    logToFile('[ERROR] ' + args.join(' '));
};

// --- Deep Scan Logic ---
function getAllFiles(dirPath, arrayOfFiles) {
    const files = fs.readdirSync(dirPath);
    arrayOfFiles = arrayOfFiles || [];

    files.forEach(function (file) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
        } else {
            arrayOfFiles.push(fullPath);
        }
    });

    return arrayOfFiles;
}
// -----------------------

// Memory cache to prevent processing the same file multiple times in a short window
const processedFiles = new Set();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let allTeachers = [];
let allGroups = [];
let allStudents = [];
let AUTO_UPLOAD_IMAGES = true;
let AUTO_UPLOAD_VIDEOS = true;
const creationLock = new Map();

async function loadTeachers() {
    try {
        console.log("Loading teachers list...");
        const { data, error } = await supabase
            .from('teachers')
            .select('id, name');

        if (error) throw error;
        allTeachers = data || [];
        console.log(`Loaded ${allTeachers.length} teachers: ${allTeachers.map(t => t.name).join(', ')}`);
    } catch (e) {
        console.error("Failed to load teachers:", e.message);
    }
}

async function loadGroups() {
    try {
        console.log("Loading groups list...");
        const { data, error } = await supabase
            .from('groups')
            .select('id, name, teacher_id');

        if (error) throw error;
        allGroups = data || [];
        console.log(`Loaded ${allGroups.length} groups.`);
    } catch (e) {
        console.error("Failed to load groups:", e.message);
    }
}

async function loadStudents() {
    try {
        console.log("Loading students list...");
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student');

        if (error) throw error;
        allStudents = data || [];
        console.log(`Loaded ${allStudents.length} students.`);
    } catch (e) {
        console.error("Failed to load students:", e.message);
    }
}

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

// --- Helper Functions ---

function normalizeCombinedPath(filePath) {
    // Standardize path separators
    return filePath.split(__dirname).join('').split(path.sep).join('/');
}

function parseDateFromFolder(folderName) {
    // Formats: 2025-12-30, 26-1-27, 2025.12.30, 25.12.30
    // Also "미니 블랙보드2026-01-06"
    let year, month, day;

    // 1. YYYY-MM-DD or YY-M-D (Anywhere in string)
    let match = folderName.match(/(\d{2,4})-(\d{1,2})-(\d{1,2})/);
    if (match) {
        year = parseInt(match[1]);
        month = parseInt(match[2]);
        day = parseInt(match[3]);
    } else {
        // 2. YYYY.MM.DD or YY.M.D (Anywhere in string)
        match = folderName.match(/(\d{2,4})\.(\d{1,2})\.(\d{1,2})/);
        if (match) {
            year = parseInt(match[1]);
            month = parseInt(match[2]);
            day = parseInt(match[3]);
        }
    }

    if (year && month && day) {
        // Normalize Year (2-digit -> 20xx)
        if (year < 100) year += 2000;
        // Padding
        const MM = month.toString().padStart(2, '0');
        const DD = day.toString().padStart(2, '0');
        return `${year}-${MM}-${DD}`;
    }
    return null;
}

function extractStudentName(fileName) {
    // ClassIn format: "2_김경민.png" -> "김경민"
    // Also handle "김경민.png"
    // Remove extension
    let name = fileName.replace(/\.[^/.]+$/, "");
    // Remove leading digits and underscores/spaces
    name = name.replace(/^[\d\s_]+/, '').trim();
    // NEW: Remove suffixes like (1), (copy), etc.
    name = name.replace(/\s\(\d+\)$/, ""); // Remove " (1)", " (2)"
    name = name.replace(/\s-?\s?복사본$/, ""); // Remove " 복사본" (Korean for copy)
    name = name.replace(/_복사$/, "");
    // NEW: Remove trailing digits (e.g. "Name_190203" -> "Name")
    name = name.replace(/_[\d\.]+$/, ""); // Remove _12345 or _19.3
    name = name.replace(/_\d+$/, "");
    return name.trim().normalize('NFC');
}

function parsePath(filePath, rootDir) {
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length < 2) return {};

    let classDate = null;
    let dateFolderIndex = -1;
    let dateFolderName = '';

    for (let i = parts.length - 2; i >= 0; i--) {
        const folder = parts[i];
        const parsed = parseDateFromFolder(folder);
        if (parsed) {
            classDate = parsed;
            dateFolderIndex = i;
            dateFolderName = folder;
            break;
        }
    }

    if (!classDate) {
        return { relativePath, parts, classDate: null };
    }

    // Determine Group: Scan parts for a known group name
    let matchedGroup = null;
    let groupFolderIndex = -1;
    let groupFolder = 'Uncategorized';

    // Search for a known group in the path parts (excluding the filename part if it was included in parts, but parts here is folders relative to rootDir + filename usually, check line 184)
    // Actually parts is relativePath.split(path.sep). So it includes filename at the end.
    // We iterate backwards to find the group, but we should prioritize the closest group or the top-level?
    // Usually top-level is the main group. Let's search from the beginning.
    for (let i = 0; i < parts.length - 1; i++) { // Exclude filename
        const part = parts[i];

        // 1. Exact match
        let found = allGroups.find(g => g.name === part);

        // 2. Token match (e.g. "802 중1M12P" containing "중1M12P")
        if (!found) {
            const tokens = part.split(' ');
            found = allGroups.find(g => tokens.includes(g.name));
        }

        // 3. Short name match (e.g. "중1H1" matching "중1H1(공통수학1 개념)")
        if (!found) {
            found = allGroups.find(g => {
                const shortName = g.name.split('(')[0].trim();
                return part === shortName || part.includes(shortName);
            });
        }

        if (found) {
            matchedGroup = found;
            groupFolder = part; // Use original folder string to preserve topic (e.g. "802 GroupName Topic")
            groupFolderIndex = i;
            break; // Stop at first match (top-level group)
        }
    }

    // Fallback if no group found: use folder above date as group
    // FIX: Skip generic folders like "수업판서"
    if (!matchedGroup && dateFolderIndex > 0) {
        let candidateIndex = dateFolderIndex - 1;
        let candidateFolder = parts[candidateIndex];

        const IGNORED_FOLDERS = ['수업판서', '판서', '미니 블랙보드', 'Blackboard', 'Mini Blackboard'];

        while (candidateIndex >= 0 && IGNORED_FOLDERS.includes(candidateFolder)) {
            candidateIndex--;
            if (candidateIndex >= 0) candidateFolder = parts[candidateIndex];
        }

        if (candidateIndex >= 0) {
            groupFolder = candidateFolder;
            groupFolderIndex = candidateIndex;
            matchedGroup = allGroups.find(g => g.name === groupFolder);
            // Try token match on fallback too
            if (!matchedGroup) {
                const tokens = groupFolder.split(' ');
                matchedGroup = allGroups.find(g => tokens.includes(g.name));
            }
            // Try short name match on fallback too
            if (!matchedGroup) {
                matchedGroup = allGroups.find(g => {
                    const shortName = g.name.split('(')[0].trim();
                    return groupFolder === shortName || groupFolder.includes(shortName);
                });
            }
        }
    }

    // Determine Topic Path (All folders except Group, Date, and File)
    let rawTopicDumps = [];
    for (let i = 0; i < parts.length - 1; i++) {
        if (i !== dateFolderIndex) {
            rawTopicDumps.push(parts[i]);
        }
    }

    // Construct Canonical Class Title: [GroupName] [Sorted Topics]
    let targetClassTitle = '';
    const groupPrefix = matchedGroup ? matchedGroup.name.split('(')[0].trim() : groupFolder;

    if (groupPrefix === 'Uncategorized') {
        targetClassTitle = rawTopicDumps.join(' ');
    } else {
        // CLEANUP & SORTING: Aggressively prevent "Word A Word B" vs "Word B Word A" issues.
        // Instead of exact word matching, replace the group name *anywhere* in the string to handle "1-2개념수업 중1M12S"
        const escGroup = groupPrefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regexGroupInside = new RegExp(escGroup, 'gi');

        let cleanedString = rawTopicDumps.join(' ').replace(regexGroupInside, ' ');
        let cleanTopicWords = cleanedString.replace(/[()]/g, '').split(/[\s_]+/).map(w => w.trim()).filter(w => w.length > 0);

        // SORT ALPHABETICALLY to ensure identical ordering regardless of folder name variations
        cleanTopicWords.sort();

        // ENFORCE ORDER: Group Name first, then Sorted Topic
        targetClassTitle = `${groupPrefix} ${cleanTopicWords.join(' ')}`.trim();
    }

    // Final Cleanup: Remove classroom numbers, fix spacing, remove trailing special chars
    targetClassTitle = targetClassTitle.replace(/\b\d{3}\b\s*/g, "") // Classrooms
        .replace(/\s+/g, ' ')       // Double spaces
        .replace(/[_\-]\s*$/, "")    // Trailing separators
        .trim();

    return {
        className: groupFolder,
        groupId: matchedGroup ? matchedGroup.id : null,
        groupTeacherId: matchedGroup ? matchedGroup.teacher_id : null,
        topicName: rawTopicDumps.join(' '),
        targetClassTitle,
        classDate,
        relativePath,
        dateFolder: dateFolderName,
        parts
    };
}

// MAIN DISPATCHER
async function processFile(filePath, rootDir) {
    if (processedFiles.has(filePath)) return;

    const fileName = path.basename(filePath);
    if (fileName.startsWith('.')) return;

    if (isVideo(fileName)) {
        if (!AUTO_UPLOAD_VIDEOS) return;
        await processVideo(filePath, rootDir, fileName);
    } else if (isImage(fileName)) {
        if (!AUTO_UPLOAD_IMAGES) return;
        await processImage(filePath, rootDir, fileName);
    }
}

// Process Video (Local Batch Processing)
async function processVideo(filePath, rootDir, fileName) {
    const { className, classDate, relativePath, parts, targetClassTitle } = parsePath(filePath, rootDir);
    if (!className || !classDate) return;

    // Check if we should ignore this file (e.g. temporary files)
    if (fileName.startsWith('~$') || fileName.startsWith('.')) return;

    console.log(`[VIDEO DETECTED] Path: ${relativePath} | Date: ${classDate}`);

    try {
        // 1. Check for Sibling Videos (Batching)
        const folderPath = path.dirname(filePath);
        const allFiles = fs.readdirSync(folderPath);
        const videoFiles = allFiles.filter(f => isVideo(f) && !f.startsWith('~$') && !f.startsWith('.'));

        // Sort alphabetically to determine order
        videoFiles.sort();

        // Check if any of these are already processed to avoid duplicate batches
        // We use the first file as the "key" for the batch
        const firstVideo = videoFiles[0];
        const batchKey = path.join(folderPath, 'BATCH_PROCESSED');

        // ── Deduplication Guard (two layers) ────────────────────────────────
        // Layer 1: Check video_archive by normalized path (catches re-queuing)
        const normalizedPath = `local:${filePath.toLowerCase()}`;
        const { data: existingByPath } = await supabase
            .from('video_archive')
            .select('id, status')
            .ilike('file_path', normalizedPath)
            .limit(1);

        if (existingByPath && existingByPath.length > 0) {
            console.log(`   -> [SKIP] Already in video_archive (${existingByPath[0].status}): ${fileName}`);
            addToCache(filePath);
            return;
        }

        // Layer 2: Check video_archive by title (catches renamed/moved files)
        const { data: existingByTitle } = await supabase
            .from('video_archive')
            .select('id, status')
            .eq('title', fileName)
            .limit(1);

        if (existingByTitle && existingByTitle.length > 0) {
            console.log(`   -> [SKIP] Already in video_archive by filename (${existingByTitle[0].status}): ${fileName}`);
            addToCache(filePath);
            return;
        }
        // ──────────────────────────────────────────────────────────────────────

        // Wait for file stability (simple check)
        const size1 = fs.statSync(filePath).size;
        await new Promise(r => setTimeout(r, 2000));
        const size2 = fs.statSync(filePath).size;

        if (size1 !== size2) {
            console.log(`   -> [WAIT] File is still copying... ${fileName}`);
            return; // Will be picked up next scan
        }

        console.log(`   -> Processing video batch for ${targetClassTitle}...`);

        // Determine Batch Metadata
        const batchId = require('crypto').randomUUID();
        const totalParts = videoFiles.length;
        const partNumber = videoFiles.indexOf(fileName) + 1;

        // 2. Find/Create Class
        // We reuse logic from processImage to ensure class exists
        // ... (Simplified class finding logic)
        let classId = null;
        let studentName = extractStudentName(parts[parts.length - 2]) || 'Class Video'; // Fallback

        // Try simply finding class by title and date first
        let { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('class_date', classDate)
            .eq('title', targetClassTitle)
            .limit(1);

        if (classes && classes.length > 0) {
            classId = classes[0].id;
        } else {
            // If no class exists, we might need to create one? 
            // Ideally video attaches to existing class. If not found, maybe create a "Class Video" session?
            // For now, let's try to find ANY class on that date with matching Group
            // or just create one if we have enough info.
            console.log(`   -> [INFO] No exact class found for '${targetClassTitle}'. Creating new session...`);

            // ... creation logic similar to images ...
            const { data: adminUsers } = await supabase.from('profiles').select('id').filter('role', 'in', '("super_manager", "manager")').limit(1);
            const adminId = adminUsers && adminUsers.length > 0 ? adminUsers[0].id : null;

            // Get first student from group if possible, or just use admin? 
            // Classes MUST have a student_id. This is tricky for group videos.
            // Strategy: Find ANY student in this group.
            const { groupId } = parsePath(filePath, rootDir);
            let studentId = adminId;

            if (groupId) {
                const { data: members } = await supabase.from('group_members').select('student_id').eq('group_id', groupId).limit(1);
                if (members && members.length > 0) studentId = members[0].student_id;
            }

            if (!studentId) {
                console.log(`   -> [SKIP] Cannot create class: No student identified.`);
                return;
            }

            if (groupId) {
                const { data: membership } = await supabase
                    .from('group_members')
                    .select('student_id')
                    .eq('group_id', groupId)
                    .eq('student_id', studentId)
                    .limit(1);

                if (!membership || membership.length === 0) {
                    console.log(`   -> [WARNING] Membership Mismatch for Video! Current student ${studentId} is not in group ${groupId}. skipping.`);
                    return;
                }
            }

            const { data: newClass, error } = await supabase.from('classes').insert({
                student_id: studentId,
                title: targetClassTitle,
                class_date: classDate,
                created_by: adminId || studentId,
                ...(groupId ? { group_id: groupId } : {})
            }).select().single();

            if (error) {
                console.error(`   -> Class creation failed: ${error.message}`);
                return;
            }
            classId = newClass.id;
        }

        // 3. Insert into video_archive (QUEUE)
        // Use 'local:' prefix for path
        const { error: archiveError } = await supabase.from('video_archive').insert({
            class_id: classId,
            title: fileName,
            file_path: `local:${filePath}`, // LOCAL PATH
            status: 'pending',
            batch_id: totalParts > 1 ? batchId : null,
            part_number: partNumber,
            total_parts: totalParts,
            device_id: process.env.DEVICE_ID || 'unknown' // Track source device
        });

        if (archiveError) throw archiveError;

        console.log(`   -> [QUEUED] ${fileName} (Part ${partNumber}/${totalParts})`);
        addToCache(filePath);

    } catch (err) {
        console.error(`   -> [ERROR] Video processing failed: ${err.message}`);
    }
}
// -----------------------

async function processTeacherImage(filePath, rootDir, fileName) {
    const { targetClassTitle, classDate, relativePath, className, groupId, groupTeacherId } = parsePath(filePath, rootDir);
    if (!targetClassTitle || !classDate) return;

    // Search for teacher name in ALL parts of the path
    let teacherData = null;
    const pathParts = path.dirname(relativePath).split(path.sep);
    pathParts.push(fileName); // Also check filename

    for (const part of pathParts) {
        const cleanPart = extractStudentName(part) || part;
        teacherData = await findTeacher(cleanPart);
        if (teacherData) {
            console.log(`   -> Teacher found in path: ${part} -> ${teacherData.name}`);
            break;
        }
    }

    // Default to Group's assigned teacher if none found in path
    const finalTeacherId = teacherData ? teacherData.id : groupTeacherId;
    const finalTeacherName = teacherData ? teacherData.name : (allTeachers.find(t => t.id === groupTeacherId)?.name || 'Unknown');

    console.log(`[TEACHER IMAGE DETECTED] Teacher: ${finalTeacherName} | Title: ${targetClassTitle} | Path: ${relativePath}`);
    console.log(`   [DEBUG] groupId: ${groupId}, groupTeacherId: ${groupTeacherId}`);

    try {
        // 1. Upload to Storage (use teacher ID as root folder)
        const safeFileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}${path.extname(fileName)}`;
        const storagePath = `${finalTeacherId}/${classDate}/${safeFileName}`;
        const fileContent = fs.readFileSync(filePath);

        console.log(`   -> Uploading teacher board to shared storage...`);
        const { error: uploadError } = await supabase.storage
            .from('blackboard-images')
            .upload(storagePath, fileContent, { contentType: 'image/png', upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('blackboard-images')
            .getPublicUrl(storagePath);

        const publicUrl = publicUrlData.publicUrl;

        const { error: masterError } = await supabase
            .from('teacher_board_master')
            .insert({
                teacher_id: finalTeacherId,
                filename: fileName,
                content_url: publicUrl,
                class_date: classDate
            });

        if (masterError && !masterError.message.includes('unique_violation')) {
            console.warn(`   -> [WARN] Failed to record in master gallery: ${masterError.message}`);
        }

        // 3. GROUP EXPANSION: If it's a known group, ensure sessions exist for ALL members
        let targetClassIds = [];
        if (groupId) {
            console.log(`   -> Group detected: ${className}. Ensuring sessions for all members...`);
            const { data: members } = await supabase
                .from('group_members')
                .select('student_id')
                .eq('group_id', groupId);

            if (members && members.length > 0) {
                const studentIds = members.map(m => m.student_id);
                console.log(`   -> Found ${studentIds.length} members in group ${groupId}`);

                // Get admin ID for creation
                const { data: adminUsers } = await supabase.from('profiles').select('id').filter('role', 'in', '("super_manager", "manager")').limit(1);
                const adminId = adminUsers && adminUsers.length > 0 ? adminUsers[0].id : null;

                for (const sId of studentIds) {
                    // Check if class exists
                    const { data: existingClass } = await supabase
                        .from('classes')
                        .select('id')
                        .eq('student_id', sId)
                        .eq('class_date', classDate)
                        .eq('title', targetClassTitle)
                        .limit(1);

                    if (existingClass && existingClass.length > 0) {
                        targetClassIds.push(existingClass[0].id);
                    } else {
                        // Create New Class
                        const { data: newClass, error: createError } = await supabase
                            .from('classes')
                            .insert({
                                student_id: sId,
                                title: targetClassTitle,
                                description: `Auto-distributed from group: ${className}`,
                                class_date: classDate,
                                created_by: adminId || sId
                            })
                            .select()
                            .single();

                        if (!createError) {
                            targetClassIds.push(newClass.id);
                            console.log(`      + Created session for student ${sId.substring(0, 8)}`);
                        }
                    }
                }
            }
        } else {
            // Fallback: Just find existing matching classes if no group ID (traditional behavior)
            const { data: classes } = await supabase
                .from('classes')
                .select('id')
                .eq('class_date', classDate)
                .eq('title', targetClassTitle);
            if (classes) targetClassIds = classes.map(c => c.id);
        }

        if (targetClassIds.length === 0) {
            console.log(`   -> [INFO] No target classes found/created for title '${targetClassTitle}' and date ${classDate}.`);
            addToCache(filePath);
            return;
        }

        console.log(`   -> Linking teacher board to ${targetClassIds.length} classes...`);

        // 4. Link to each class
        for (const classId of targetClassIds) {
            // Check duplicate
            const { count } = await supabase
                .from('materials')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', classId)
                .eq('title', `[T] ${fileName}`);

            if (count > 0) continue;

            const orderMatch = fileName.match(/^(\d+)/);
            const orderIndex = orderMatch ? parseInt(orderMatch[1]) : 0;

            const { error: linkError } = await supabase.from('materials').insert({
                class_id: classId,
                type: 'blackboard_image',
                title: `[T] ${fileName}`,
                content_url: publicUrl,
                order_index: orderIndex
            });

            if (linkError) {
                console.error(`      - [ERROR] Failed to link to class ${classId}: ${linkError.message}`);
            } else {
                console.log(`      + Linked to class ${classId}`);
            }
        }

        console.log(`   -> [SUCCESS] Teacher board processed.`);
        addToCache(filePath);

    } catch (err) {
        console.error(`   -> [ERROR] Teacher board processing failed: ${err.message}`);
    }
}


// Process Student Image
async function processImage(filePath, rootDir, fileName) {
    const { targetClassTitle, classDate, relativePath, dateFolder, parts, groupId, className } = parsePath(filePath, rootDir);
    if (!targetClassTitle || !classDate) {
        // console.log(`[DEBUG_SKIP] Invalid path structure: ${relativePath}`);
        return;
    }

    // 1. PRIORITY: Check if it's a TEACHER first (anywhere in path)
    let matchedTeacher = null;
    for (const part of parts) {
        // Extract a clean name from the part (folder or file)
        const cleanPart = extractStudentName(part) || part;
        matchedTeacher = await findTeacher(cleanPart);
        if (matchedTeacher) {
            console.log(`   -> Priority teacher match found in path: ${part} -> ${matchedTeacher.name}`);
            break;
        }
    }

    if (matchedTeacher) {
        await processTeacherImage(filePath, rootDir, fileName);
        return;
    }

    // 2. Extract Student Name from filename OR path
    let studentName = extractStudentName(fileName);

    if (!studentName || studentName.length < 2) {
        // Scan path parts for student names
        for (const part of parts) {
            const nameFromPart = extractStudentName(part);
            if (nameFromPart && nameFromPart.length >= 2) {
                // Check if this looks like a known student
                const cleanName = nameFromPart.trim().normalize('NFC');
                const isKnown = allStudents.some(s => s.full_name && s.full_name.normalize('NFC').includes(cleanName));
                if (isKnown) {
                    studentName = cleanName;
                    console.log(`   -> Student name found in path directory: ${part} -> ${studentName}`);
                    break;
                }
            }
        }
    }

    if (!studentName || studentName.length < 2) {
        console.log(`[SKIP] No readable student name in file or path: ${fileName}`);
        return;
    }

    let classId;
    let isNewClass = false;

    try {
        let student = null;
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .ilike('full_name', `%${studentName}%`)
            .limit(1);

        if (!student) {
            // Handle concurrency within the monitor
            if (creationLock.has(studentName)) {
                console.log(`   -> [WAIT] Student creation already in progress for '${studentName}'...`);
                await creationLock.get(studentName);
                // Re-check after lock
                const { data: profilesAfter } = await supabase
                    .from('profiles')
                    .select('id, full_name')
                    .eq('role', 'student')
                    .ilike('full_name', `%${studentName}%`)
                    .limit(1);
                if (profilesAfter && profilesAfter.length > 0) {
                    student = profilesAfter[0];
                }
            }

            if (!student) {
                let resolveLock;
                const lockPromise = new Promise(res => { resolveLock = res; });
                creationLock.set(studentName, lockPromise);

                try {
                    console.log(`[INFO] Student '${studentName}' not found in DB. Creating/Ensuring student record...`);
                    const dummyEmail = `student_${Date.now()}_${Math.random().toString(36).substring(7)}@classin.com`;

                    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
                        email: dummyEmail,
                        password: 'password123!',
                        email_confirm: true,
                        user_metadata: { full_name: studentName }
                    });

                    if (authError) {
                        console.error(`[ERROR] Failed to create auth user for ${studentName}:`, authError.message);
                        resolveLock();
                        creationLock.delete(studentName);
                        return;
                    }

                    const { data: newProfile, error: profileError } = await supabase
                        .from('profiles')
                        .upsert({
                            id: authData.user.id,
                            email: dummyEmail,
                            full_name: studentName,
                            role: 'student'
                        }, { onConflict: 'id' })
                        .select('id, full_name')
                        .single();

                    if (profileError) {
                        console.error(`[ERROR] Failed to upsert profile for ${studentName}:`, profileError.message);
                        resolveLock();
                        creationLock.delete(studentName);
                        return;
                    }

                    student = newProfile;
                    allStudents.push(student);
                    console.log(`   -> Created new student: ${student.full_name} (${student.id})`);
                    resolveLock();
                    creationLock.delete(studentName);
                } catch (e) {
                    resolveLock();
                    creationLock.delete(studentName);
                    throw e;
                }
            }
        }

        // --- NEW: STUDENT MEMBERSHIP VERIFICATION & AUTO-MIGRATION ---
        if (groupId) {
            const { data: membership } = await supabase
                .from('group_members')
                .select('group_id')
                .eq('student_id', student.id)
                .eq('group_id', groupId)
                .limit(1);

            if (!membership || membership.length === 0) {
                console.log(`[INFO] Student '${student.full_name}' is not in group '${className}'. Auto-migrating...`);

                // Remove from all old groups
                const { error: deleteError } = await supabase
                    .from('group_members')
                    .delete()
                    .eq('student_id', student.id);

                if (deleteError) {
                    console.error(`   -> [ERROR] Failed to remove old group memberships for ${student.full_name}:`, deleteError.message);
                } else {
                    // Insert into new group
                    const { error: insertError } = await supabase
                        .from('group_members')
                        .insert({
                            student_id: student.id,
                            group_id: groupId
                        });

                    if (insertError) {
                        console.error(`   -> [ERROR] Failed to add ${student.full_name} to new group ${groupId}:`, insertError.message);
                    } else {
                        console.log(`   -> Successfully moved ${student.full_name} to group ${className}`);
                    }
                }
            }
        } else {
            console.log(`   -> [INFO] Student found but no group matched in path. Proceeding with loose title.`);
        }
        // --------------------------------------------

        // Use the constructed targetClassTitle (Group [Topic])
        console.log(`   -> [CLASS TITLE] ${targetClassTitle} | From path: ${relativePath}`);


        let { data: classes } = await supabase
            .from('classes')
            .select('id')
            .eq('student_id', student.id)
            .eq('class_date', classDate)
            .eq('title', targetClassTitle)
            .limit(1);

        if (classes && classes.length > 0) {
            classId = classes[0].id;
        } else {
            // Create New Class
            const { data: adminUsers } = await supabase.from('profiles').select('id').filter('role', 'in', '("super_manager", "manager")').limit(1);
            const adminId = adminUsers && adminUsers.length > 0 ? adminUsers[0].id : student.id;

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

        const contentUrl = publicUrlData.publicUrl;

        // 6. Record in Materials Table (Missing step fixed)
        const orderMatch = fileName.match(/^(\d+)/);
        const orderIndex = orderMatch ? parseInt(orderMatch[1]) : 0;

        const { error: materialError } = await supabase.from('materials').insert({
            class_id: classId,
            type: 'blackboard_image',
            title: fileName,
            content_url: contentUrl,
            order_index: orderIndex
        });

        if (materialError) throw materialError;
        // 7. Catch-up: Check for Sibling Teacher Boards
        // 7. Catch-up: Check for Sibling Teacher Boards
        await scanForSiblingTeacherBoards(classId, path.dirname(filePath), targetClassTitle, classDate, rootDir);

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
async function scanForSiblingVideos(classId, folderPath, className, classDate, rootDir) {
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
                await processVideo(path.join(folderPath, videoFile), rootDir, videoFile);
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
    if (!name || name.length < 2) return null;

    // Clean name (remove T, 쌤, etc.)
    const nameClean = name.replace(/쌤$/, 'T').replace(/선생님$/, 'T').replace(/T$/, '').trim();

    // 1. Exact or Substring match (e.g., "세현" vs "임세현")
    // We want to be careful not to match too aggressively, but for 2-3 chars it's usually safe.
    let matched = allTeachers.find(t => {
        const tName = t.name.trim();
        return tName === nameClean || tName.includes(nameClean) || nameClean.includes(tName);
    });

    if (matched) {
        return matched;
    }

    return null;
}

async function scanForSiblingTeacherBoards(classId, folderPath, className, classDate, rootDir) {
    try {
        const files = fs.readdirSync(folderPath);
        const images = files.filter(f => isImage(f));

        for (const imgFile of images) {
            // Extract Name
            // Extract Name
            let namePart = extractStudentName(imgFile);

            // Avoid re-checking known students (optimization: if we could, but simple check is fast enough)
            // Check if this file is a teacher file
            const teacherData = await findTeacher(namePart);
            if (teacherData) {
                // Check if linked
                const { count } = await supabase
                    .from('materials')
                    .select('*', { count: 'exact', head: true })
                    .eq('class_id', classId)
                    .eq('title', `[T] ${imgFile}`);

                if (count > 0) continue;

                console.log(`   -> Found detected teacher sibling: ${imgFile}. Linking...`);

                // Find uploaded content_url: teacher_board_master에서 같은 날짜로 정확 매칭
                let contentUrl;
                const { data: masterBoards } = await supabase
                    .from('teacher_board_master')
                    .select('content_url')
                    .eq('filename', imgFile)
                    .eq('class_date', classDate)
                    .limit(1);

                if (masterBoards && masterBoards.length > 0) {
                    contentUrl = masterBoards[0].content_url;
                }

                // master에 없으면 같은 날짜 같은 수업의 다른 학생 class에서 찾기
                if (!contentUrl) {
                    const { data: sameDateMaterials } = await supabase
                        .from('materials')
                        .select('content_url, class:classes!inner(class_date)')
                        .eq('title', imgFile)
                        .eq('type', 'teacher_blackboard_image')
                        .eq('class.class_date', classDate)
                        .limit(1);

                    if (sameDateMaterials && sameDateMaterials.length > 0) {
                        contentUrl = sameDateMaterials[0].content_url;
                    }
                }

                if (!contentUrl) {
                    // Trigger upload if not found
                    console.log(`      Teacher board not on server yet. triggering upload...`);
                    await processTeacherImage(path.join(folderPath, imgFile), rootDir, imgFile);
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
                        title: `[T] ${imgFile}`,
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

// Helper to setup watcher for a single directory
function setupWatcher(dirPath, fileQueue) {
    console.log(`Setting up watcher for: ${dirPath}`);
    try {
        fs.watch(dirPath, { recursive: true }, (eventType, filename) => {
            if (filename && eventType === 'rename') {
                const fullPath = path.join(dirPath, filename);
                if (fs.existsSync(fullPath)) {
                    try {
                        const stats = fs.statSync(fullPath);
                        if (stats.isFile()) {
                            if (!fileQueue.includes(fullPath)) {
                                console.log(`[NEW FILE DETECTED] ${filename} in ${dirPath}`);
                                fileQueue.push({ filePath: fullPath, rootDir: dirPath });
                            }
                        }
                    } catch (e) { }
                }
            }
        });
        return true;
    } catch (e) {
        console.error(`Failed to watch ${dirPath}: ${e.message}`);
        return false;
    }
}

async function main() {
    console.log("==================================================");
    console.log("   ClassIn Archive - Persistent Folder Monitor");
    console.log("==================================================");

    let watchDirs = [];
    let config = null; // hoisted for polling access later

    // Load config if exists
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (config.watchDirs && Array.isArray(config.watchDirs)) {
                watchDirs = config.watchDirs
                    .map(d => typeof d === 'string' ? d : d.path)
                    .filter(d => d && fs.existsSync(d));
            } else if (config.watchDir) {
                const d = config.watchDir;
                const p = typeof d === 'string' ? d : d.path;
                if (p && fs.existsSync(p)) {
                    watchDirs = [p];
                }
            }

            if (config.autoUploadImages !== undefined) AUTO_UPLOAD_IMAGES = config.autoUploadImages;
            if (config.autoUploadVideos !== undefined) AUTO_UPLOAD_VIDEOS = config.autoUploadVideos;
        } catch (e) {
            console.error("Config file corrupted, resetting...");
        }
    }

    if (watchDirs.length === 0) {
        console.log("No valid watch directories found in config.");
        const inputDir = await askQuestion("Enter a folder path to watch (you can add more in monitor-config.json later): ");
        const cleanDir = inputDir.trim().replace(/^["']|["']$/g, '');

        if (fs.existsSync(cleanDir)) {
            watchDirs.push(cleanDir);
            // Save config
            fs.writeFileSync(CONFIG_FILE, JSON.stringify({ watchDirs }, null, 2));
        } else {
            console.error("Error: Folder does not exist!");
            await new Promise(r => setTimeout(r, 3000));
            process.exit(1);
        }
    }

    console.log(`\nMonitoring ${watchDirs.length} directories:`);
    watchDirs.forEach(d => console.log(` - ${d}`));

    await loadTeachers();
    await loadGroups();
    await loadStudents();

    console.log("\nPerforming Initial Scan (Checking for new files)...");

    for (const dir of watchDirs) {
        try {
            const allFiles = getAllFiles(dir);
            console.log(`[${path.basename(dir)}] Found ${allFiles.length} files. Checking against server...`);

            let count = 0;
            for (const file of allFiles) {
                await processFile(file, dir);
                count++;
                if (count % 100 === 0) console.log(`   -> Checked ${count}/${allFiles.length} files...`);
            }
            console.log(`   -> [FINISHED] Scan complete for ${dir}.`);
        } catch (e) {
            console.error(`Scan failed for ${dir}:`, e.message);
        }
    }

    console.log("\nInitial Scan Complete. Starting Real-time Monitor...");
    console.log("(Minimize this window to keep running in background)");

    // Real-time Watcher
    let isProcessing = false;
    let fileQueue = []; // Array of objects { filePath, rootDir }

    // Setup watchers for all dirs
    watchDirs.forEach(dir => setupWatcher(dir, fileQueue));

    // Processor Loop
    setInterval(async () => {
        if (isProcessing || fileQueue.length === 0) return;
        isProcessing = true;

        while (fileQueue.length > 0) {
            const item = fileQueue.shift();
            // Handle both object (new style) and string (old style compat)
            let filePath, rootDir;
            if (typeof item === 'string') {
                filePath = item;
                // Try to infer rootDir? 
                // For safety, let's assume it belongs to the first watchDir if not specified (legacy fallback)
                rootDir = watchDirs[0];
            } else {
                filePath = item.filePath;
                rootDir = item.rootDir;
            }

            // Wait 1 sec to ensure file write is complete (very common issue with huge images)
            await new Promise(r => setTimeout(r, 1000));

            if (fs.existsSync(filePath)) {
                await processFile(filePath, rootDir);
            }
        }
        isProcessing = false;
    }, 2000);

    // ── Remote Sync Request Polling (every 30 seconds) ──
    // Reads centerMapping to pass to pollForSyncRequests
    const centerMapping = config && config.watchDirs
        ? config.watchDirs.map(d => typeof d === 'string' ? { center: '전체', path: d } : d)
        : [];

    console.log('[POLL] Remote sync request polling started (every 30s).');
    // Initial check immediately on startup
    pollForSyncRequests(watchDirs, centerMapping);
    // Recurring poll every 30 seconds
    setInterval(() => pollForSyncRequests(watchDirs, centerMapping), 30 * 1000);
    // ────────────────────────────────────────────────────
}

// ─── Remote Sync Request Polling ───────────────────────────────────────────
// Polls Supabase every 30 seconds for pending sync_requests created from the web admin panel.
// When a request is found, runs a full folder scan for the specified center.
async function pollForSyncRequests(watchDirs, centerMapping) {
    try {
        const { data: requests, error } = await supabase
            .from('sync_requests')
            .select('id, center')
            .eq('status', 'pending')
            .order('requested_at', { ascending: true })
            .limit(5);

        if (error) {
            // Table may not exist yet — silently ignore
            if (!error.message.includes('does not exist') && !error.message.includes('relation')) {
                console.error('[POLL] Error checking sync_requests:', error.message);
            }
            return;
        }

        if (!requests || requests.length === 0) return;

        for (const req of requests) {
            console.log(`\n[REMOTE SYNC] Received request #${req.id} for center: "${req.center}"`);

            // Mark as running
            await supabase.from('sync_requests')
                .update({ status: 'running', started_at: new Date().toISOString() })
                .eq('id', req.id);

            // Determine which dirs to scan
            let dirsToScan = watchDirs;
            if (req.center && req.center !== '전체' && centerMapping) {
                const filtered = centerMapping
                    .filter(m => m.center === req.center)
                    .map(m => m.path)
                    .filter(p => {
                        const fsModule = require('fs');
                        return p && fsModule.existsSync(p);
                    });
                if (filtered.length > 0) dirsToScan = filtered;
            }

            try {
                // Reload metadata before scan
                await supabase.from('sync_requests')
                    .update({ log_message: '교사/그룹/학생 정보 로딩 중...' })
                    .eq('id', req.id);

                await loadTeachers();
                await loadGroups();
                await loadStudents();

                // Collect all files first to get total count
                let allFilesToProcess = [];
                for (const dir of dirsToScan) {
                    console.log(`[REMOTE SYNC] Scanning: ${dir}`);
                    try {
                        const allFiles = getAllFiles(dir);
                        console.log(`[REMOTE SYNC]   Found ${allFiles.length} files.`);
                        allFilesToProcess.push(...allFiles.map(f => ({ file: f, dir })));
                    } catch (e) {
                        console.error(`[REMOTE SYNC] Scan failed for ${dir}:`, e.message);
                    }
                }

                const totalFiles = allFilesToProcess.length;
                await supabase.from('sync_requests')
                    .update({ files_found: totalFiles, files_processed: 0, log_message: `${totalFiles}개 파일 발견, 처리 시작...` })
                    .eq('id', req.id);

                // Process all files with progress tracking
                let totalProcessed = 0;
                let lastUpdateTime = 0;
                for (const { file, dir } of allFilesToProcess) {
                    await processFile(file, dir);
                    totalProcessed++;

                    // Update progress every 2 seconds or on last file
                    const now = Date.now();
                    if (now - lastUpdateTime > 2000 || totalProcessed === totalFiles) {
                        lastUpdateTime = now;
                        const pct = totalFiles > 0 ? Math.round((totalProcessed / totalFiles) * 100) : 100;
                        await supabase.from('sync_requests')
                            .update({
                                files_processed: totalProcessed,
                                log_message: `처리 중... ${totalProcessed}/${totalFiles} (${pct}%)`
                            })
                            .eq('id', req.id);
                    }
                }

                console.log(`[REMOTE SYNC] Done. Processed ${totalProcessed} files.`);

                await supabase.from('sync_requests')
                    .update({
                        status: 'done',
                        completed_at: new Date().toISOString(),
                        files_processed: totalProcessed,
                        log_message: `완료: ${totalProcessed}개 파일 처리됨`
                    })
                    .eq('id', req.id);

            } catch (scanErr) {
                console.error('[REMOTE SYNC] Scan error:', scanErr.message);
                await supabase.from('sync_requests')
                    .update({ status: 'error', completed_at: new Date().toISOString(), error_message: scanErr.message, log_message: `오류: ${scanErr.message}` })
                    .eq('id', req.id);
            }
        }
    } catch (pollErr) {
        // Non-critical — don't crash the monitor
        console.error('[POLL] Unexpected error:', pollErr.message);
    }
}
// ───────────────────────────────────────────────────────────────────────────

main();
