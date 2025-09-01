// Environment configuration loader with validation
const fs = require('fs');
const path = require('path');

class Config {
    constructor() {
        this.config = {};
        this.loadConfig();
        this.validateConfig();
    }

    loadConfig() {
        // Determine environment
        const nodeEnv = process.env.NODE_ENV || 'development';
        const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
        const envPath = path.join(__dirname, envFile);

        console.log(`Loading config from: ${envFile}`);

        if (!fs.existsSync(envPath)) {
            throw new Error(`Environment file not found: ${envPath}`);
        }

        // Parse .env file
        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');

        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    this.config[key.trim()] = valueParts.join('=').trim();
                }
            }
        }

        // Override with process.env if available
        Object.keys(this.config).forEach(key => {
            if (process.env[key]) {
                this.config[key] = process.env[key];
            }
        });
    }

    validateConfig() {
        const requiredKeys = [
            'MODE',
            'DEMO_MODE',
            'NOTION_CLIENT_ID',
            'NOTION_CLIENT_SECRET',
            'NOTION_REDIRECT_URI',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'GOOGLE_REDIRECT_URI'
        ];

        const missing = requiredKeys.filter(key => !this.config[key]);

        if (missing.length > 0) {
            const error = `MISSING: ${missing.join(', ')}`;
            console.error('❌ OAuth Configuration Error:', error);
            throw new Error(`OAuth misconfigured: ${error}`);
        }

        console.log('✅ OAuth configuration validated successfully');
        console.log(`Mode: ${this.config.MODE}, Demo: ${this.config.DEMO_MODE}`);
    }

    get(key) {
        return this.config[key];
    }

    getAll() {
        return { ...this.config };
    }

    isDevelopment() {
        return this.config.MODE === 'development';
    }

    isProduction() {
        return this.config.MODE === 'production';
    }

    isDemoMode() {
        return this.config.DEMO_MODE === 'true';
    }
}

module.exports = new Config();