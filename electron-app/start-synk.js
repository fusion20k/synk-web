const { spawn } = require('child_process');
const path = require('path');
const axios = require('axios');

class SynkLauncher {
    constructor() {
        this.serverProcess = null;
        this.serverReady = false;
    }

    async checkServerHealth() {
        try {
            const response = await axios.get('http://localhost:3000/health', { timeout: 2000 });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('Starting Synk server...');
            
            const serverPath = path.join(__dirname, '..', 'index.js');
            this.serverProcess = spawn('node', [serverPath], {
                cwd: path.join(__dirname, '..'),
                stdio: ['ignore', 'pipe', 'pipe']
            });

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                console.log('Server:', output);
                
                if (output.includes('Synk server listening on port 3000')) {
                    this.serverReady = true;
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error('Server Error:', data.toString());
            });

            this.serverProcess.on('close', (code) => {
                console.log(`Server process exited with code ${code}`);
                this.serverReady = false;
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!this.serverReady) {
                    reject(new Error('Server failed to start within 10 seconds'));
                }
            }, 10000);
        });
    }

    async ensureServerRunning() {
        const isHealthy = await this.checkServerHealth();
        
        if (!isHealthy) {
            console.log('Server not running, starting...');
            await this.startServer();
            
            // Wait a bit more for full initialization
            await new Promise(resolve => setTimeout(resolve, 2000));
        } else {
            console.log('Server already running and healthy');
        }
    }

    cleanup() {
        if (this.serverProcess) {
            console.log('Stopping server...');
            this.serverProcess.kill();
        }
    }
}

module.exports = SynkLauncher;