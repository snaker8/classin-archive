const { spawn } = require('child_process');
const path = require('path');

console.log('Starting ClassIn Archive Development Environment...');
console.log('-> Next.js Web Server');
console.log('-> Folder Monitor (dist-monitor/folder-monitor.js)');
console.log('-> Video Processing Worker (scripts/video-processing/main.py)\n');

const isWindows = /^win/.test(process.platform);
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const pythonCmd = isWindows ? 'python' : 'python3';

// 1. Start Next.js Web Server
const nextProcess = spawn(npmCmd, ['run', 'next-dev'], {
    shell: true,
    stdio: 'inherit'
});

// 2. Start Folder Monitor
const monitorProcess = spawn('node', [path.join(__dirname, 'scripts', 'folder-monitor.js')], {
    shell: true,
    stdio: 'inherit'
});

// 3. Start Python Video Processor
const pythonProcess = spawn(pythonCmd, ['main.py'], {
    cwd: path.join(__dirname, 'scripts', 'video-processing'),
    shell: true,
    stdio: 'inherit'
});

// Handle termination to gracefully shut down all child processes
const cleanup = () => {
    console.log('\nShutting down all services...');
    nextProcess.kill('SIGINT');
    monitorProcess.kill('SIGINT');
    pythonProcess.kill('SIGINT');
    process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
