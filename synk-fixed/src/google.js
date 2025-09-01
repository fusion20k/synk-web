const fetch = require('node-fetch');
const { getGoogleToken } = require('./oauth');

async function listGoogleCalendars() {
  try {
    const tokens = await getGoogleToken();
    const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      // If demo mode is enabled and we get an error, return sample data
      if (process.env.DEMO_MODE === 'true') {
        console.log('Demo mode: returning sample calendar data');
        return getSampleCalendars();
      }
      
      const errorText = await response.text();
      throw new Error(`Google API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.items.map(cal => ({
      id: cal.id,
      name: cal.summary,
      primary: cal.primary || false,
      accessRole: cal.accessRole,
      backgroundColor: cal.backgroundColor,
      description: cal.description,
      timeZone: cal.timeZone
    }));
  } catch (error) {
    console.error('Error fetching Google calendars:', error);
    
    // If demo mode is enabled, return sample data on error
    if (process.env.DEMO_MODE === 'true') {
      console.log('Demo mode: returning sample calendar data due to error');
      return getSampleCalendars();
    }
    
    throw error;
  }
}

async function getGoogleUserInfo() {
  try {
    const tokens = await getGoogleToken();
    return tokens.user_info;
  } catch (error) {
    console.error('Error getting Google user info:', error);
    return null;
  }
}

function getSampleCalendars() {
  return [
    {
      id: 'primary',
      name: 'Primary Calendar',
      primary: true,
      accessRole: 'owner',
      backgroundColor: '#1976d2',
      description: 'Your main calendar',
      timeZone: 'America/New_York',
      _demo: true
    },
    {
      id: 'work@example.com',
      name: 'Work Calendar',
      primary: false,
      accessRole: 'owner',
      backgroundColor: '#f44336',
      description: 'Work-related events',
      timeZone: 'America/New_York',
      _demo: true
    },
    {
      id: 'personal@example.com',
      name: 'Personal Calendar',
      primary: false,
      accessRole: 'owner',
      backgroundColor: '#4caf50',
      description: 'Personal events and appointments',
      timeZone: 'America/New_York',
      _demo: true
    }
  ];
}

module.exports = {
  listGoogleCalendars,
  getGoogleUserInfo
};