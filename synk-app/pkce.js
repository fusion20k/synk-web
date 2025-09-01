// PKCE (Proof Key for Code Exchange) utility for Google OAuth
const crypto = require('crypto');

class PKCEGenerator {
    static generateCodeVerifier() {
        // Generate a cryptographically random string of 43-128 characters
        return crypto.randomBytes(32).toString('base64url');
    }

    static generateCodeChallenge(codeVerifier) {
        // Create SHA256 hash of the code verifier and encode as base64url
        return crypto
            .createHash('sha256')
            .update(codeVerifier)
            .digest('base64url');
    }

    static generateState() {
        // Generate a random state parameter for CSRF protection
        return crypto.randomBytes(16).toString('hex');
    }

    static generatePKCEPair() {
        const codeVerifier = this.generateCodeVerifier();
        const codeChallenge = this.generateCodeChallenge(codeVerifier);
        const state = this.generateState();

        return {
            codeVerifier,
            codeChallenge,
            state
        };
    }
}

module.exports = PKCEGenerator;