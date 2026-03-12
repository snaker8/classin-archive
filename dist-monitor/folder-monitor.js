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

// Supabase Storage 키에서 한글/특수문자를 안전한 ASCII로 변환
function safeStorageKey(str) {
    return str.replace(/[^a-zA-Z0-9\/_\-\.]/g, '_');
}

function isVideo(fileName) {
    return fileName.match(/\.(mp4|mov|avi|wmv|mkv|webm)$/i);
}

function isImage(fileName) {
    return fileName.match(/\.(png|jpg|jpeg|gif|webp)$/i);
}

// 폴더 구조: [모니터폴더]/[호실]/[반코드]/[수업유형]/[미니 블랙보드YYYY-MM-DD HH-MM-SS]/[파일]
// 예: 801/중1M12S/1-1내신특화/미니 블랙보드2026-01-21 21-56-32/3_김선린.png
// 또는: 801/중3H2실전A/미니 블랙보드2026-01-21/3_김선린.png (수업유형 없이 바로)
function parsePath(filePath, rootDir) {
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);

    if (parts.length < 3) {
        return {};
    }

    const room = parts[0];           // 801, 802, etc.
    const groupCode = parts[1];      // 중1M12S, 중3H2실전A, etc.

    // 날짜 추출: 모든 폴더에서 YYYY-MM-DD 패턴 찾기
    let classDate = null;
    let dateFolderIndex = -1;
    for (let i = 0; i < parts.length; i++) {
        const match = parts[i].match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            classDate = `${match[1]}-${match[2]}-${match[3]}`;
            dateFolderIndex = i;
            break;
        }
    }
    if (!classDate) {
        classDate = new Date().toISOString().split('T')[0];
    }

    // 수업유형 추출: 반코드와 날짜폴더 사이에 있는 폴더들
    // 예: parts = [801, 중1M12S, 1-1내신특화, 미니블랙보드..., 파일]
    //     subType = "1-1내신특화"
    // 예: parts = [801, 중3H2실전A, 미니블랙보드..., 파일]
    //     subType = null (반코드 바로 아래가 날짜폴더)
    let subType = null;
    const subTypeParts = [];
    const endIndex = dateFolderIndex > 2 ? dateFolderIndex : parts.length - 1;
    for (let i = 2; i < endIndex; i++) {
        // 날짜가 포함된 폴더(미니 블랙보드...)는 건너뜀
        if (!parts[i].match(/\d{4}-\d{2}-\d{2}/)) {
            subTypeParts.push(parts[i]);
        }
    }
    if (subTypeParts.length > 0) {
        subType = subTypeParts[subTypeParts.length - 1]; // 가장 깊은 수업유형 폴더
    }

    return { room, groupCode, subType, classDate, relativePath, parts };
}

// 네이밍 폴더(반코드) 유효성 검사: 날짜폴더나 미니블랙보드 폴더가 아닌 실제 반코드인지 확인
function isValidGroupCode(code) {
    if (!code) return false;
    // 미니 블랙보드 폴더명이면 반코드가 아님
    if (code.match(/미니\s*블랙보드/i)) return false;
    // 날짜 패턴만 있는 폴더면 반코드가 아님
    if (code.match(/^\d{4}-\d{2}-\d{2}/)) return false;
    return true;
}

// MAIN DISPATCHER
async function processFile(filePath, rootDir, centerName) {
    if (processedFiles.has(filePath)) return;

    const fileName = path.basename(filePath);
    if (fileName.startsWith('.')) return;

    // 네이밍 폴더(반코드) 안에 있는 파일만 처리
    const { groupCode } = parsePath(filePath, rootDir);
    if (!isValidGroupCode(groupCode)) {
        console.log(`[SKIP] 네이밍 폴더(반코드) 없음, 업로드 건너뜀: ${fileName}`);
        return;
    }

    if (isVideo(fileName)) {
        await processVideo(filePath, rootDir, fileName);
    } else if (isImage(fileName)) {
        await processImage(filePath, rootDir, fileName, centerName);
    }
}

// Process Video (Shared Class Material)
async function processVideo(filePath, rootDir, fileName) {
    const { room, groupCode, subType, classDate, relativePath, parts } = parsePath(filePath, rootDir);
    if (!groupCode || !classDate) return;

    console.log(`[VIDEO DETECTED] ${groupCode}/${subType || ''} | Date: ${classDate} | ${fileName}`);

    try {
        const safeFileName = `${Date.now()}_${safeStorageKey(fileName)}`;
        const storagePath = `_shared/${safeStorageKey(groupCode)}/${classDate}/${safeFileName}`;
        const fileContent = fs.readFileSync(filePath);

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

        // 그룹 기반으로 정확한 수업 매칭 (그룹 자동생성 안 함)
        const matchedGroup = await findOrCreateGroup(groupCode, subType, null, false);
        if (!matchedGroup) {
            console.log(`   -> [SKIP] 매칭 그룹 없음. 비디오 업로드만 완료, 연결 안 함.`);
            addToCache(filePath);
            return;
        }
        const targetTitle = matchedGroup.name;

        let { data: classes } = await supabase
            .from('classes')
            .select('id, title, student:profiles!classes_student_id_fkey(full_name)')
            .eq('class_date', classDate)
            .eq('title', targetTitle);

        if (!classes || classes.length === 0) {
            console.log(`   -> [INFO] '${targetTitle}' 수업이 아직 없음. 비디오 업로드만 완료.`);
            addToCache(filePath);
            return;
        }

        console.log(`   -> Linking video to ${classes.length} students (title='${targetTitle}')...`);

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
    const { room, groupCode, subType, classDate, relativePath, parts } = parsePath(filePath, rootDir);
    if (!groupCode || !classDate) return;

    let namePart = fileName.replace(/^\d+[_ ]*/, '').replace(/\.[^/.]+$/, "").trim();

    console.log(`[TEACHER IMAGE DETECTED] Name: ${namePart} | ${groupCode}/${subType || ''} | ${classDate}`);

    try {
        const safeFileName = `${Date.now()}_${safeStorageKey(fileName)}`;
        const storagePath = `_shared/teachers/${safeStorageKey(groupCode)}/${classDate}/${safeFileName}`;
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

        const teacherData = await findTeacher(namePart);

        // 중복 체크: 같은 filename + class_date 이미 있으면 master 삽입 스킵
        const { count: masterDupCount } = await supabase
            .from('teacher_board_master')
            .select('*', { count: 'exact', head: true })
            .eq('filename', fileName)
            .eq('class_date', classDate);

        if (masterDupCount === 0) {
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
        } else {
            console.log(`   -> [SKIP] Master gallery duplicate: ${fileName} on ${classDate}`);
        }

        // 그룹 기반으로 정확한 수업 매칭 (그룹 자동생성 안 함)
        const matchedGroup = await findOrCreateGroup(groupCode, subType, null, false);
        if (!matchedGroup) {
            console.log(`   -> [SKIP] 매칭 그룹 없음. 선생님판서는 갤러리에만 보관.`);
            addToCache(filePath);
            return;
        }
        const targetTitle = matchedGroup.name;

        let { data: classes } = await supabase
            .from('classes')
            .select('id, title, student:profiles!classes_student_id_fkey(full_name)')
            .eq('class_date', classDate)
            .eq('title', targetTitle);

        if (!classes || classes.length === 0) {
            console.log(`   -> [INFO] '${targetTitle}' 수업이 아직 없음. 선생님판서는 갤러리에만 보관.`);
            addToCache(filePath);
            return;
        }

        console.log(`   -> Linking teacher board to ${classes.length} classes (title='${targetTitle}')...`);

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
async function processImage(filePath, rootDir, fileName, centerName) {
    const { room, groupCode, subType, classDate, relativePath, parts } = parsePath(filePath, rootDir);
    if (!groupCode || !classDate) return;

    // Extract Name
    let namePart = fileName.replace(/^\d+[_ ]*/, '').replace(/\.[^/.]+$/, "");
    let studentName = namePart.trim();

    if (!studentName || studentName.length < 2) {
        console.log(`[SKIP] Invalid student name in file: ${fileName}`);
        return;
    }

    // 이름 유효성 검사: 한글 2~4자만 사람 이름으로 인식
    const isValidName = /^[가-힣]{2,4}$/.test(studentName);
    // 교재/판서 파일명 키워드 필터
    const isMaterialFile = /판서|교재|바이블|유형|개념|차시|정답|해설|시험|모의고사|학습용|블랙보드/.test(namePart);

    if (!isValidName || isMaterialFile) {
        console.log(`[SKIP] Not a person name: '${studentName}' (file: ${fileName})`);
        return;
    }

    try {
        // 1. 선생님 이름 먼저 체크 (선생님 판서는 모든 학생에게 공유되므로 우선 확인)
        const teacherData = await findTeacher(studentName);
        if (teacherData) {
            await processTeacherImage(filePath, rootDir, fileName);
            return;
        }

        // 2. 학생 이름 체크
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('role', 'student')
            .eq('status', 'active')
            .ilike('full_name', `%${studentName}%`)
            .limit(1);

        if (!profiles || profiles.length === 0) {
            // 미가입 학생 → 건너뛰기 (가입 후 재스캔하면 개인 판서로 정상 배포됨)
            console.log(`[SKIP-UNREGISTERED] '${studentName}' is not registered. Will be processed after registration + rescan.`);
            return;
        }
        const student = profiles[0];

        // 2. 그룹 매칭 (없으면 자동 생성)
        const matchedGroup = await findOrCreateGroup(groupCode, subType, centerName);
        let targetClassTitle = matchedGroup ? matchedGroup.name : (subType ? `${groupCode} ${subType}` : groupCode);
        let assignedTeacherName = null;

        if (matchedGroup) {
            // 선생님 정보 조회
            if (matchedGroup.id) {
                const { data: groupData } = await supabase
                    .from('groups')
                    .select('teacher:teachers(name)')
                    .eq('id', matchedGroup.id)
                    .single();
                if (groupData && groupData.teacher) {
                    assignedTeacherName = groupData.teacher.name;
                }
            }
            console.log(`   -> [GROUP] ${groupCode}/${subType || ''} → '${targetClassTitle}'`);
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
                    description: `Auto-uploaded from folder: ${groupCode}/${subType || ''}`,
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
            // 선생님판서가 아직 안 붙었을 수 있으므로 sibling 스캔은 실행
            await scanForSiblingTeacherBoards(classId, path.dirname(filePath), targetClassTitle, classDate);
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

// 그룹 매칭 또는 자동 생성 헬퍼
// 폴더 경로의 groupCode+subType으로 DB 그룹을 찾고, 없으면 자동 생성
async function findOrCreateGroup(groupCode, subType, centerName, createIfMissing = true) {
    const normalize = (s) => s.replace(/[\s\-()]/g, '').toLowerCase();
    const groupCodeNorm = normalize(groupCode);
    const subTypeNorm = subType ? normalize(subType) : null;

    const { data: groups } = await supabase.from('groups').select('id, name, center');

    if (groups) {
        // 1순위: groupCode+subType 정확 매칭
        const fullTarget = subTypeNorm ? groupCodeNorm + subTypeNorm : groupCodeNorm;
        let exact = groups.filter(g => normalize(g.name) === fullTarget);
        if (exact.length > 0) return exact[0];

        // 2순위: groupCode(subType) 형식 매칭
        if (subTypeNorm) {
            const withParen = groupCodeNorm + subTypeNorm; // 괄호 제거된 상태로 비교
            exact = groups.filter(g => normalize(g.name) === withParen);
            if (exact.length > 0) return exact[0];
        }

        // 3순위: groupCode만 정확히 시작 + subType 포함
        let candidates = groups.filter(g => normalize(g.name).startsWith(groupCodeNorm));
        if (candidates.length > 1 && subTypeNorm) {
            const refined = candidates.filter(g => normalize(g.name).includes(subTypeNorm));
            if (refined.length > 0) candidates = refined;
        }
        // 후보가 1개만 있으면 사용, 여러개면 subType 필터링 결과 사용
        if (candidates.length === 1) return candidates[0];
        if (candidates.length > 1 && subTypeNorm) {
            // subType까지 매칭된 후보만 반환
            const refined = candidates.filter(g => normalize(g.name).includes(subTypeNorm));
            if (refined.length > 0) return refined[0];
        }
        // includes 매칭 제거 - 너무 느슨해서 오매칭 원인
        if (candidates.length > 0) {
            console.log(`   -> [WARN] 그룹 후보 ${candidates.length}개 발견, 첫 번째 사용: '${candidates[0].name}'`);
            return candidates[0];
        }
    }

    // 그룹이 없으면 자동 생성 (createIfMissing=true일 때만)
    if (!createIfMissing) {
        console.log(`   -> [SKIP] 매칭 그룹 없음: ${groupCode}/${subType || ''}`);
        return null;
    }

    const groupName = subType ? `${groupCode} ${subType}` : groupCode;
    console.log(`   -> [AUTO-CREATE GROUP] '${groupName}' (센터: ${centerName || '미지정'})`);

    const { data: newGroup, error } = await supabase
        .from('groups')
        .insert({
            name: groupName,
            description: `폴더 모니터에서 자동 생성`,
            center: centerName || null
        })
        .select('id, name, center')
        .single();

    if (error) {
        console.error(`   -> [ERROR] Group creation failed: ${error.message}`);
        return null;
    }

    return newGroup;
}

// 공통 자료 처리: 학생이름이 없는 판서 → 해당 반 모든 학생에게 배포
async function processCommonImage(filePath, rootDir, fileName, groupCode, subType, classDate, centerName) {
    try {
        // 1. 그룹 매칭 (없으면 자동 생성)
        const matchedGroup = await findOrCreateGroup(groupCode, subType, centerName);

        if (!matchedGroup) {
            console.log(`   -> [SKIP] No matching group for ${groupCode}/${subType || ''}`);
            addToCache(filePath);
            return;
        }

        // 2. 그룹 멤버(학생) 목록 조회
        const { data: members } = await supabase
            .from('group_members')
            .select('student_id, student:profiles!group_members_student_id_fkey(id, full_name)')
            .eq('group_id', matchedGroup.id);

        if (!members || members.length === 0) {
            console.log(`   -> [SKIP] No students in group '${matchedGroup.name}'`);
            addToCache(filePath);
            return;
        }

        // 3. 이미지 업로드 (공유 스토리지)
        const fileContent = fs.readFileSync(filePath);
        const safeFileName = `${Date.now()}_${safeStorageKey(fileName)}`;
        const storagePath = `_shared/${safeStorageKey(groupCode)}/${classDate}/${safeFileName}`;

        const { error: uploadError } = await supabase.storage
            .from('blackboard-images')
            .upload(storagePath, fileContent, { contentType: 'image/png', upsert: false });

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
            .from('blackboard-images')
            .getPublicUrl(storagePath);
        const contentUrl = publicUrlData.publicUrl;

        const orderMatch = fileName.match(/^(\d+)/);
        const orderIndex = orderMatch ? parseInt(orderMatch[1]) : 0;

        console.log(`   -> Distributing common material to ${members.length} students in '${matchedGroup.name}'...`);

        // 4. 각 학생의 해당 날짜 수업에 연결 (없으면 생성)
        const { data: adminUsers } = await supabase.from('profiles').select('id').eq('role', 'admin').limit(1);
        const adminId = adminUsers && adminUsers[0] ? adminUsers[0].id : null;

        for (const member of members) {
            const studentId = member.student_id;
            const studentName = member.student ? member.student.full_name : 'Unknown';

            // 해당 학생의 해당 반/날짜 수업 찾기
            let { data: classes } = await supabase
                .from('classes')
                .select('id')
                .eq('student_id', studentId)
                .eq('class_date', classDate)
                .eq('title', matchedGroup.name)
                .limit(1);

            let classId;
            if (classes && classes.length > 0) {
                classId = classes[0].id;
            } else {
                // 수업 생성
                const { data: newClass, error: createError } = await supabase
                    .from('classes')
                    .insert({
                        student_id: studentId,
                        title: matchedGroup.name,
                        description: `Auto-created for common material`,
                        class_date: classDate,
                        created_by: adminId || studentId
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error(`      [ERROR] Failed to create class for ${studentName}: ${createError.message}`);
                    continue;
                }
                classId = newClass.id;
            }

            // 중복 확인
            const { count } = await supabase
                .from('materials')
                .select('*', { count: 'exact', head: true })
                .eq('class_id', classId)
                .eq('title', fileName);

            if (count > 0) continue;

            // 자료 연결
            await supabase.from('materials').insert({
                class_id: classId,
                type: 'teacher_blackboard_image',
                title: fileName,
                content_url: contentUrl,
                order_index: orderIndex
            });
            console.log(`      + ${studentName}`);
        }

        console.log(`   -> [SUCCESS] Common material distributed.`);
        addToCache(filePath);

    } catch (err) {
        console.error(`   -> [ERROR] Common material processing failed: ${err.message}`);
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

                // teacher_board_master에서 같은 날짜의 URL 찾기 (날짜 정확 매칭)
                let contentUrl;
                const { data: masterBoards } = await supabase
                    .from('teacher_board_master')
                    .select('content_url')
                    .eq('filename', imgFile)
                    .eq('class_date', classDate)
                    .limit(1);

                if (masterBoards && masterBoards.length > 0) {
                    contentUrl = masterBoards[0].content_url;
                } else {
                    // master에 없으면 같은 날짜 같은 수업의 다른 학생 class에서 찾기
                    const { data: sameDateMaterials } = await supabase
                        .from('materials')
                        .select('content_url, class:classes!inner(class_date)')
                        .eq('title', imgFile)
                        .eq('type', 'teacher_blackboard_image')
                        .eq('class.class_date', classDate)
                        .limit(1);

                    if (sameDateMaterials && sameDateMaterials.length > 0) {
                        contentUrl = sameDateMaterials[0].content_url;
                    } else {
                        console.log(`      Teacher board not on server yet for ${classDate}. Skipping sibling link.`);
                        continue;
                    }
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

    let watchDirs = [];

    // 1순위: DB(system_config)에서 센터별 폴더 설정 읽기
    try {
        console.log("\nDB에서 센터별 모니터 폴더 설정을 불러오는 중...");
        const { data, error } = await supabase
            .from('system_config')
            .select('value')
            .eq('key', 'monitor_config')
            .single();

        if (!error && data && data.value && Array.isArray(data.value.watchDirs)) {
            watchDirs = data.value.watchDirs
                .filter(d => d.path && fs.existsSync(d.path));

            if (watchDirs.length > 0) {
                console.log(`DB에서 ${watchDirs.length}개 센터 폴더를 불러왔습니다.`);
                // 로컬 config도 동기화
                fs.writeFileSync(CONFIG_FILE, JSON.stringify({ watchDirs }, null, 2));
            }
        }
    } catch (e) {
        console.log("DB 설정 로드 실패, 로컬 설정을 확인합니다...");
    }

    // 2순위: 로컬 monitor-config.json 파일
    if (watchDirs.length === 0 && fs.existsSync(CONFIG_FILE)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (config.watchDirs && Array.isArray(config.watchDirs)) {
                watchDirs = config.watchDirs.map(d => {
                    if (typeof d === 'string') return { center: 'Default', path: d };
                    return d;
                }).filter(d => d.path && fs.existsSync(d.path));
            } else if (config.watchDir && fs.existsSync(config.watchDir)) {
                watchDirs = [{ center: 'Default', path: config.watchDir }];
            }
        } catch (e) {
            console.error("로컬 설정 파일 오류.");
        }
    }

    // 3순위: 수동 입력 (최초 설정시에만)
    if (watchDirs.length === 0) {
        console.log("\n등록된 감시 폴더가 없습니다.");
        console.log("웹 관리자 페이지(설정 > 센터별 모니터 폴더 관리)에서 폴더를 등록하세요.");
        console.log("또는 아래에 직접 경로를 입력하세요.\n");
        const watchDir = await askQuestion("감시할 폴더 경로: ");
        const sanitizedDir = watchDir.trim().replace(/^["']|["']$/g, '');

        if (!fs.existsSync(sanitizedDir)) {
            console.error("오류: 해당 폴더가 존재하지 않습니다!");
            await new Promise(r => setTimeout(r, 3000));
            process.exit(1);
        }

        watchDirs = [{ center: 'Default', path: sanitizedDir }];
        fs.writeFileSync(CONFIG_FILE, JSON.stringify({ watchDirs }, null, 2));
    }

    console.log("\nPerforming Initial Scan (Checking for new files)...");

    try {
        for (const dirInfo of watchDirs) {
            console.log(`\n--- Scanning [${dirInfo.center || 'Unassigned'}] ${dirInfo.path} ---`);
            const allFiles = getAllFiles(dirInfo.path);
            console.log(`Found ${allFiles.length} files. Checking against server...`);

            for (const file of allFiles) {
                await processFile(file, dirInfo.path, dirInfo.center);
            }
        }
    } catch (e) {
        console.error("Scan failed:", e);
    }

    console.log("\nInitial Scan Complete. Starting Real-time Monitor...");
    console.log("(Minimize this window to keep running in background)\n");

    // Real-time Watcher
    let isProcessing = false;
    let fileQueue = [];

    // Processor Loop
    setInterval(async () => {
        if (isProcessing || fileQueue.length === 0) return;
        isProcessing = true;

        while (fileQueue.length > 0) {
            const item = fileQueue.shift();
            // Wait 1 sec to ensure file write is complete (very common issue with huge images)
            await new Promise(r => setTimeout(r, 1000));

            if (fs.existsSync(item.filePath)) {
                await processFile(item.filePath, item.rootDir, item.centerName);
            }
        }
        isProcessing = false;
    }, 2000);

    watchDirs.forEach(dirInfo => {
        const rootDir = dirInfo.path;
        console.log(`Watching (${dirInfo.center || 'Default'}): ${rootDir}`);

        fs.watch(rootDir, { recursive: true }, (eventType, filename) => {
            if (filename && eventType === 'rename') {
                const fullPath = path.join(rootDir, filename);
                if (fs.existsSync(fullPath)) {
                    try {
                        const stats = fs.statSync(fullPath);
                        if (stats.isFile()) {
                            if (!fileQueue.find(q => q.filePath === fullPath)) {
                                console.log(`[NEW FILE DETECTED in ${dirInfo.center || 'Default'}] ${filename}`);
                                fileQueue.push({ filePath: fullPath, rootDir, centerName: dirInfo.center });
                            }
                        }
                    } catch (e) { }
                }
            }
        });
    });

    // sync_requests 폴링 — 웹에서 재스캔 요청 시 전체 폴더 재스캔
    async function pollSyncRequests() {
        try {
            const { data: requests } = await supabase
                .from('sync_requests')
                .select('id, center, requested_at')
                .eq('status', 'pending')
                .order('requested_at', { ascending: true })
                .limit(1);

            if (requests && requests.length > 0) {
                const req = requests[0];
                console.log(`\n========== [RESCAN REQUESTED] center: ${req.center} ==========`);

                // 상태를 processing으로 변경
                await supabase
                    .from('sync_requests')
                    .update({ status: 'processing' })
                    .eq('id', req.id);

                // 캐시 초기화 (모든 파일 재처리 가능하도록)
                processedFiles.clear();

                // 전체 폴더 재스캔 (additive-only: 기존 자료 삭제 없이 새것만 추가)
                for (const dirInfo of watchDirs) {
                    if (req.center === '전체' || req.center === dirInfo.center) {
                        console.log(`\n--- Rescanning [${dirInfo.center || 'Default'}] ${dirInfo.path} ---`);
                        if (fs.existsSync(dirInfo.path)) {
                            const allFiles = getAllFiles(dirInfo.path);
                            console.log(`Found ${allFiles.length} files. Rescanning...`);
                            for (const file of allFiles) {
                                await processFile(file, dirInfo.path, dirInfo.center);
                            }
                        } else {
                            console.log(`[WARN] Folder not found: ${dirInfo.path}`);
                        }
                    }
                }

                // 완료 처리
                await supabase
                    .from('sync_requests')
                    .update({
                        status: 'completed',
                        completed_at: new Date().toISOString()
                    })
                    .eq('id', req.id);

                console.log(`========== [RESCAN COMPLETE] ==========\n`);
            }
        } catch (e) {
            console.error('[POLL ERROR]', e.message);
        }
    }

    // 30초마다 sync_requests 폴링
    setInterval(pollSyncRequests, 30 * 1000);
    console.log("Polling sync_requests every 30s for rescan triggers...\n");
}

main();
