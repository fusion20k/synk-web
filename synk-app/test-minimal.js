console.log('Testing minimal Electron...');
console.log('Process versions:', process.versions);
console.log('Process type:', process.type);

const electron = require('electron');
console.log('Electron type:', typeof electron);
console.log('Electron keys:', Object.keys(electron));

if (electron.app) {
    console.log('App found!');
    electron.app.whenReady().then(() => {
        console.log('App ready!');
        process.exit(0);
    });
} else {
    console.log('No app found');
    process.exit(1);
}