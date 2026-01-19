/**
 * Bulk Fix Class Dates from Disk
 * 
 * This script scans the actual folder structure on disk,
 * matches files to classes in the database,
 * and updates the class_date based on the actual folder names.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const readline = require('readline');

// Load .env.local
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

// CONFIG FILE PATH
const CONFIG_FILE = path.join(__dirname, 'monitor-config.json');

function getAllFolderInfo(dirPath) {
    const results = [];

    try {
        // Get class folders (first level)
        const classFolders = fs.readdirSync(dirPath).filter(f =>
            fs.statSync(path.join(dirPath, f)).isDirectory()
        );

        for (const classFolder of classFolders) {
            const classPath = path.join(dirPath, classFolder);

            // Get date folders (second level)
            const dateFolders = fs.readdirSync(classPath).filter(f =>
                fs.statSync(path.join(classPath, f)).isDirectory()
            );

            for (const dateFolder of dateFolders) {
                // Extract date from folder name
                const dateMatch = dateFolder.match(/(\d{4})-?(\d{2})-?(\d{2})/);
                if (dateMatch) {
                    const extractedDate = `${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`;
                    results.push({
                        className: classFolder,
                        dateFolder: dateFolder,
                        extractedDate: extractedDate,
                        fullPath: path.join(classPath, dateFolder)
                    });
                }
            }
        }
    } catch (err) {
        console.error('Error scanning folders:', err);
    }

    return results;
}

async function fixDates(watchDir) {
    console.log('=== Bulk Fix Class Dates from Disk ===\n');
    console.log(`Scanning: ${watchDir}\n`);

    // 1. Get folder structure from disk
    const folderInfo = getAllFolderInfo(watchDir);
    console.log(`Found ${folderInfo.length} date folders on disk.\n`);

    // 2. Fetch all classes from database
    const { data: classes, error } = await supabase
        .from('classes')
        .select('id, title, description, class_date, student_id')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching classes:', error);
        return;
    }

    console.log(`Found ${classes.length} classes in database.\n`);

    let fixedCount = 0;

    // 3. For each folder on disk, find matching classes and fix dates
    for (const folder of folderInfo) {
        // Find classes with matching title (className) and description containing the old folder name
        const matchingClasses = classes.filter(cls =>
            cls.title === folder.className &&
            cls.description &&
            cls.description.includes(folder.dateFolder.replace(/\d{4}-?\d{2}-?\d{2}/, ''))
        );

        // Also try to match by title and incorrect date
        const potentialMatches = classes.filter(cls =>
            cls.title === folder.className &&
            cls.class_date !== folder.extractedDate
        );

        for (const cls of potentialMatches) {
            // Check if description contains similar folder pattern
            if (cls.description) {
                const descFolderMatch = cls.description.match(/folder:\s*(.+)/);
                if (descFolderMatch) {
                    const descFolder = descFolderMatch[1].trim();
                    // Check if this is the same folder type (e.g., "미니 블랙보드")
                    const baseName = folder.dateFolder.replace(/\d{4}-?\d{2}-?\d{2}/, '').trim();
                    const descBaseName = descFolder.replace(/\d{4}-?\d{2}-?\d{2}/, '').trim();

                    if (baseName === descBaseName) {
                        console.log(`[FIX] "${cls.title}"`);
                        console.log(`      DB Date: ${cls.class_date} -> Disk Date: ${folder.extractedDate}`);
                        console.log(`      DB Folder: ${descFolder}`);
                        console.log(`      Disk Folder: ${folder.dateFolder}`);

                        // Update both class_date and description
                        const newDescription = `Auto-uploaded from folder: ${folder.dateFolder}`;
                        const { error: updateError } = await supabase
                            .from('classes')
                            .update({
                                class_date: folder.extractedDate,
                                description: newDescription
                            })
                            .eq('id', cls.id);

                        if (updateError) {
                            console.log(`      [ERROR] ${updateError.message}`);
                        } else {
                            console.log(`      [SUCCESS] Updated!\n`);
                            fixedCount++;
                        }
                    }
                }
            }
        }
    }

    console.log('\n=== Summary ===');
    console.log(`Fixed: ${fixedCount} classes`);
    console.log(`Total folders on disk: ${folderInfo.length}`);
    console.log(`Total classes in DB: ${classes.length}`);
}

async function main() {
    let watchDir = "";

    // Load config if exists
    if (fs.existsSync(CONFIG_FILE)) {
        try {
            const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
            if (config.watchDir && fs.existsSync(config.watchDir)) {
                watchDir = config.watchDir;
            }
        } catch (e) {
            console.error("Config file corrupted");
        }
    }

    if (!watchDir) {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        watchDir = await new Promise(resolve =>
            rl.question("Enter the watch folder path: ", answer => {
                rl.close();
                resolve(answer.trim().replace(/^["']|["']$/g, ''));
            })
        );
    }

    if (!fs.existsSync(watchDir)) {
        console.error("Error: Folder does not exist!");
        process.exit(1);
    }

    await fixDates(watchDir);
}

main().then(() => {
    console.log('\nDone!');
    process.exit(0);
}).catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
});
