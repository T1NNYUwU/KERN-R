const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
let backendProcess;
let frontendProcess;

function createWindow(isDev) {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    backgroundColor: '#000000',
    title: 'KERN-R Hybrid Studio',
    show: false // Don't show until ready
  });

  // Open DevTools for debugging
  if (isDev) {
    win.webContents.openDevTools();
  }

  const loadUrl = isDev ? 'http://localhost:3001' : 'http://localhost:3005';

  // Wait for servers to start then load
  setTimeout(() => {
    win.loadURL(loadUrl); 
    win.show();
  }, 5000); 

  // Hide the menu bar
  win.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  const isDev = !app.isPackaged;
  createWindow(isDev);

  // Start Backend
  const backendDir = path.join(__dirname, 'backend');
  
  if (isDev) {
    // Start Frontend
    const frontendDir = path.join(__dirname, 'frontend');
    frontendProcess = spawn('npm.cmd', ['run', 'dev', '--', '-p', '3001'], {
      cwd: frontendDir,
      shell: true
    });

    // Start Backend
    backendProcess = spawn('npm.cmd', ['run', 'start:dev'], { 
      cwd: backendDir,
      shell: true,
      env: { 
        ...process.env, 
        IS_ELECTRON: 'true',
        PORT: '3005',
        BIN_ROOT: path.join(__dirname, 'bin')
      }
    });
  } else {
    // In production, we run the built main.js from inside app.asar
    const backendMainPath = path.join(__dirname, 'backend', 'dist', 'main.js');
    const userDataPath = app.getPath('userData');
    const fs = require('fs');
    const tempDir = path.join(userDataPath, 'temp');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    
    backendProcess = spawn('node', [backendMainPath], { 
      cwd: userDataPath, // Writable directory for temp files
      env: { 
        ...process.env, 
        IS_ELECTRON: 'true',
        PORT: '3005',
        BIN_ROOT: path.join(process.resourcesPath, 'bin')
      }
    });
  }

  if (backendProcess) {
    backendProcess.stdout.on('data', (data) => console.log(`Backend: ${data}`));
    backendProcess.stderr.on('data', (data) => console.error(`Backend Error: ${data}`));
  }
  if (frontendProcess) {
    frontendProcess.stdout.on('data', (data) => console.log(`Frontend: ${data}`));
    frontendProcess.stderr.on('data', (data) => console.error(`Frontend Error: ${data}`));
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Ensure child processes are killed when the main process exits
const cleanup = () => {
  if (process.platform === 'win32') {
    if (backendProcess) {
      try { spawn('taskkill', ['/pid', backendProcess.pid, '/f', '/t']); } catch(e) {}
    }
    if (frontendProcess) {
      try { spawn('taskkill', ['/pid', frontendProcess.pid, '/f', '/t']); } catch(e) {}
    }
  } else {
    if (backendProcess) {
      try { process.kill(backendProcess.pid, 'SIGKILL'); } catch(e) {}
    }
    if (frontendProcess) {
      try { process.kill(frontendProcess.pid, 'SIGKILL'); } catch(e) {}
    }
  }
};

app.on('before-quit', cleanup);
process.on('exit', cleanup);
process.on('SIGINT', () => {
  cleanup();
  process.exit();
});
process.on('SIGTERM', () => {
  cleanup();
  process.exit();
});
