// src/config.js
const DEMO_MODE = (process.env.DEMO_MODE === 'true' || process.env.MODE === 'development');

function getGoogleConfig() {
  return {
    clientId: DEMO_MODE ? process.env.GOOGLE_CLIENT_ID_DEMO : process.env.GOOGLE_CLIENT_ID,
    clientSecret: DEMO_MODE ? process.env.GOOGLE_CLIENT_SECRET_DEMO : process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: DEMO_MODE ? process.env.GOOGLE_REDIRECT_URI_DEMO : process.env.GOOGLE_REDIRECT_URI
  };
}

function getNotionConfig() {
  return {
    clientId: DEMO_MODE ? process.env.NOTION_CLIENT_ID_DEMO : process.env.NOTION_CLIENT_ID,
    clientSecret: DEMO_MODE ? process.env.NOTION_CLIENT_SECRET_DEMO : process.env.NOTION_CLIENT_SECRET,
    redirectUri: DEMO_MODE ? process.env.NOTION_REDIRECT_URI_DEMO : process.env.NOTION_REDIRECT_URI
  };
}

module.exports = {
  DEMO_MODE,
  isDemo: () => DEMO_MODE,
  getGoogleConfig,
  getNotionConfig,
  get: (key) => {
    switch (key) {
      case 'MODE':
        return process.env.NODE_ENV || 'development';
      case 'DEMO_MODE':
        return DEMO_MODE;
      default:
        return process.env[key];
    }
  },
  isDemoMode: () => DEMO_MODE
};