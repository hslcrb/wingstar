const { spawn } = require('child_process');
const path = require('path');

console.log('Compiling main process TypeScript...');
const tsc = spawn('npx', ['tsc'], { shell: true, stdio: 'inherit' });

tsc.on('close', (code) => {
  if (code !== 0) {
    console.error('TypeScript compilation failed.');
    process.exit(code);
  }

  console.log('Starting Vite development server...');
  const vite = spawn('npx', ['vite'], { shell: true });
  let electronStarted = false;

  vite.stdout.on('data', (data) => {
    const output = data.toString();
    console.log(`[Vite] ${output.trim()}`);
    
    // Check if Vite server is up (usually logs local URL)
    if (!electronStarted && (output.includes('Local:') || output.includes('localhost:') || output.includes('Network:'))) {
      electronStarted = true;
      console.log('Vite is ready. Launching Electron...');
      
      const electron = spawn('npx', ['electron', '.', '--dev'], { shell: true, stdio: 'inherit' });
      
      electron.on('close', () => {
        console.log('Electron closed. Stopping Vite dev server...');
        vite.kill();
        process.exit();
      });
    }
  });

  vite.stderr.on('data', (data) => {
    console.error(`[Vite Error] ${data.toString().trim()}`);
  });

  process.on('SIGINT', () => {
    vite.kill();
    process.exit();
  });
});
