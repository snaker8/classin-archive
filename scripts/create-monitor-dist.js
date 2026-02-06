const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, '..', 'dist-monitor');
const SCRIPTS_DIR = __dirname;
const ROOT_DIR = path.join(__dirname, '..');

// 1. Create Dist Directory
if (!fs.existsSync(DIST_DIR)) {
    fs.mkdirSync(DIST_DIR);
}

console.log(`Creating minimal monitor kit in: ${DIST_DIR}`);

// 2. Create Minimal package.json
const minimalPackageJson = {
    "name": "classin-monitor",
    "version": "1.0.0",
    "description": "Minimal Folder Monitor for ClassIn Archive",
    "scripts": {
        "start": "node folder-monitor.js"
    },
    "dependencies": {
        "@supabase/supabase-js": "^2.39.3"
    }
};

fs.writeFileSync(path.join(DIST_DIR, 'package.json'), JSON.stringify(minimalPackageJson, null, 2));
console.log(' - Created package.json');

// 3. Copy Scripts
const filesToCopy = [
    { src: path.join(SCRIPTS_DIR, 'folder-monitor.js'), dest: 'folder-monitor.js' },
    { src: path.join(SCRIPTS_DIR, 'monitor-config.json'), dest: 'monitor-config.json', optional: true },
    { src: path.join(SCRIPTS_DIR, 'run-monitor.bat'), dest: 'run-monitor.bat' },
    { src: path.join(SCRIPTS_DIR, 'install-startup.bat'), dest: 'install-startup.bat' },
    { src: path.join(SCRIPTS_DIR, 'start-silent.vbs'), dest: 'start-silent.vbs' }
];

filesToCopy.forEach(file => {
    if (fs.existsSync(file.src)) {
        fs.copyFileSync(file.src, path.join(DIST_DIR, file.dest));
        console.log(` - Copied ${file.dest}`);
    } else if (!file.optional) {
        console.error(`ERROR: Missing required file ${file.src}`);
    }
});

// 4. Copy .env.local (Critical for auth)
const envSrc = path.join(ROOT_DIR, '.env.local');
if (fs.existsSync(envSrc)) {
    // Read and verify it has the SV role key
    const envContent = fs.readFileSync(envSrc, 'utf8');
    if (envContent.includes('SUPABASE_SERVICE_ROLE_KEY')) {
        fs.copyFileSync(envSrc, path.join(DIST_DIR, '.env.local'));
        console.log(' - Copied .env.local (Contains Auth Keys - KEEP SECURE!)');
    } else {
        console.warn('WARNING: .env.local found but missing Service Role Key. Auto-upload may fail.');
    }
} else {
    console.warn('WARNING: .env.local NOT found. You must manually copy it to the dist folder.');
}

console.log('\nSUCCESS! Dist folder ready.');
console.log('To install on another PC:');
console.log('1. Copy the "dist-monitor" folder.');
console.log('2. Run "npm install" inside it.');
console.log('3. Run "install-startup.bat".');
