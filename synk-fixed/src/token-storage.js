const keytar = require('keytar');
const Store = require('electron-store');

class TokenStorage {
  constructor() {
    this.store = new Store();
    this.serviceName = 'synk-oauth-tokens';
  }

  async saveTokens(service, tokens) {
    try {
      // Store sensitive tokens in keytar (system keychain)
      if (tokens.access_token) {
        await keytar.setPassword(this.serviceName, `${service}-access-token`, tokens.access_token);
      }
      
      if (tokens.refresh_token) {
        await keytar.setPassword(this.serviceName, `${service}-refresh-token`, tokens.refresh_token);
      }
      
      // Store non-sensitive metadata in electron-store
      const metadata = {
        expires_in: tokens.expires_in,
        token_type: tokens.token_type,
        scope: tokens.scope,
        saved_at: Date.now()
      };
      
      // Store additional service-specific data
      if (service === 'google') {
        metadata.email = tokens.email;
        metadata.name = tokens.name;
      } else if (service === 'notion') {
        metadata.owner = tokens.owner;
        metadata.workspace_name = tokens.workspace_name;
        metadata.workspace_id = tokens.workspace_id;
      }
      
      this.store.set(`${service}-metadata`, metadata);
      
      console.log(`✓ ${service} tokens saved securely`);
      
    } catch (error) {
      console.error(`✗ Failed to save ${service} tokens:`, error.message);
      throw error;
    }
  }

  async getTokens(service) {
    try {
      const accessToken = await keytar.getPassword(this.serviceName, `${service}-access-token`);
      const refreshToken = await keytar.getPassword(this.serviceName, `${service}-refresh-token`);
      const metadata = this.store.get(`${service}-metadata`);
      
      if (!accessToken) {
        return null;
      }
      
      return {
        access_token: accessToken,
        refresh_token: refreshToken,
        ...metadata
      };
      
    } catch (error) {
      console.error(`✗ Failed to retrieve ${service} tokens:`, error.message);
      return null;
    }
  }

  async deleteTokens(service) {
    try {
      await keytar.deletePassword(this.serviceName, `${service}-access-token`);
      await keytar.deletePassword(this.serviceName, `${service}-refresh-token`);
      this.store.delete(`${service}-metadata`);
      
      console.log(`✓ ${service} tokens deleted`);
      
    } catch (error) {
      console.error(`✗ Failed to delete ${service} tokens:`, error.message);
      throw error;
    }
  }

  async hasValidTokens(service) {
    const tokens = await this.getTokens(service);
    
    if (!tokens || !tokens.access_token) {
      return false;
    }
    
    // Check if token is expired (with 5 minute buffer)
    if (tokens.expires_in && tokens.saved_at) {
      const expiresAt = tokens.saved_at + (tokens.expires_in * 1000);
      const now = Date.now();
      const buffer = 5 * 60 * 1000; // 5 minutes
      
      if (now >= (expiresAt - buffer)) {
        console.log(`${service} token is expired or expiring soon`);
        return false;
      }
    }
    
    return true;
  }

  async refreshGoogleToken(refreshToken) {
    const config = require('./config');
    const fetch = require('node-fetch');
    
    try {
      const googleConfig = config.getGoogleConfig();
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: googleConfig.clientId,
          client_secret: googleConfig.clientSecret
        })
      });
      
      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.status}`);
      }
      
      const tokens = await response.json();
      
      // Update stored tokens
      await this.saveTokens('google', {
        ...tokens,
        refresh_token: refreshToken // Keep the original refresh token if not provided
      });
      
      console.log('✓ Google token refreshed successfully');
      return tokens;
      
    } catch (error) {
      console.error('✗ Google token refresh failed:', error.message);
      throw error;
    }
  }

  async clearAllTokens() {
    try {
      // Clear Google tokens
      await this.deleteTokens('google');
      
      // Clear Notion tokens
      await this.deleteTokens('notion');
      
      // Clear all stored data
      this.store.clear();
      
      console.log('✓ All tokens and data cleared');
      
    } catch (error) {
      console.error('✗ Failed to clear all tokens:', error.message);
      throw error;
    }
  }
}

module.exports = new TokenStorage();