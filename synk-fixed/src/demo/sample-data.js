module.exports = {
  notionDatabases: [
    {
      id: 'db-demo-1',
      name: 'Demo Tasks',
      description: 'Sample task database for demo purposes',
      pages: [
        { id: 'page-1', title: 'Complete project proposal', status: 'In Progress' },
        { id: 'page-2', title: 'Review design mockups', status: 'To Do' },
        { id: 'page-3', title: 'Schedule team meeting', status: 'Done' }
      ]
    },
    {
      id: 'db-demo-2', 
      name: 'Demo Projects',
      description: 'Sample project tracking database',
      pages: [
        { id: 'proj-1', title: 'Website Redesign', status: 'Active' },
        { id: 'proj-2', title: 'Mobile App Development', status: 'Planning' }
      ]
    },
    {
      id: 'db-demo-3',
      name: 'Demo Notes',
      description: 'Sample notes and documentation',
      pages: [
        { id: 'note-1', title: 'Meeting Notes - Q4 Planning', status: 'Published' },
        { id: 'note-2', title: 'Research Findings', status: 'Draft' }
      ]
    }
  ],
  
  googleCalendars: [
    {
      id: 'cal-demo-1',
      name: 'Demo Calendar',
      description: 'Primary demo calendar',
      primary: true,
      events: [
        { id: 'event-1', title: 'Team Standup', start: '2024-01-15T09:00:00Z', end: '2024-01-15T09:30:00Z' },
        { id: 'event-2', title: 'Client Meeting', start: '2024-01-15T14:00:00Z', end: '2024-01-15T15:00:00Z' }
      ]
    },
    {
      id: 'cal-demo-2',
      name: 'Demo Work Calendar',
      description: 'Work-related demo events',
      primary: false,
      events: [
        { id: 'work-1', title: 'Project Review', start: '2024-01-16T10:00:00Z', end: '2024-01-16T11:00:00Z' },
        { id: 'work-2', title: 'Design Workshop', start: '2024-01-16T15:00:00Z', end: '2024-01-16T17:00:00Z' }
      ]
    },
    {
      id: 'cal-demo-3',
      name: 'Demo Personal',
      description: 'Personal demo calendar',
      primary: false,
      events: [
        { id: 'personal-1', title: 'Lunch with Sarah', start: '2024-01-17T12:00:00Z', end: '2024-01-17T13:00:00Z' }
      ]
    }
  ]
};