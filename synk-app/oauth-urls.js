// OAuth URL builders with proper PKCE and consent parameters
const config = require('./config');
const PKCEGenerator = require('./pkce');

class OAuthURLBuilder {
    static buildGoogleAuthURL() {
        const pkce = PKCEGenerator.generatePKCEPair();
        
        const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth' +
            `?client_id=${config.get('GOOGLE_CLIENT_ID')}` +
            `&redirect_uri=${encodeURIComponent(config.get('GOOGLE_REDIRECT_URI'))}` +
            `&response_type=code` +
            `&scope=${encodeURIComponent('openid email profile https://www.googleapis.com/auth/calendar.readonly')}` +
            `&access_type=offline` +
            `&prompt=consent%20select_account` +  // force account selection + consent
            `&state=${pkce.state}` +
            `&code_challenge=${pkce.codeChallenge}` +
            `&code_challenge_method=S256`;

        console.log('🔗 Google OAuth URL generated:', authUrl.substring(0, 100) + '...');
        
        return {
            authUrl,
            codeVerifier: pkce.codeVerifier,
            state: pkce.state
        };
    }

    static buildNotionAuthURL() {
        const state = PKCEGenerator.generateState();
        
        const notionAuthUrl = 'https://api.notion.com/v1/oauth/authorize' +
            `?client_id=${config.get('NOTION_CLIENT_ID')}` +
            `&redirect_uri=${encodeURIComponent(config.get('NOTION_REDIRECT_URI'))}` +
            `&response_type=code` +
            `&owner=user` +
            `&state=${state}`;

        console.log('🔗 Notion OAuth URL generated:', notionAuthUrl.substring(0, 100) + '...');
        
        return {
            authUrl: notionAuthUrl,
            state
        };
    }
}

module.exports = OAuthURLBuilder;