# Synk Desktop Application

## 🎨 Black + White Neon Theme Desktop App

This is the desktop version of Synk with a sleek black background and white neon glow design.

### Features

- **🔗 Easy Connections**: Connect Notion and Google Calendar with simple OAuth flows
- **⚡ Manual Sync**: Trigger sync operations with one click
- **🔄 Auto-Sync**: Configurable automatic sync intervals (15m, 30m, 1h, 6h)
- **📊 Live Logs**: Real-time sync activity monitoring
- **⚙️ Settings**: Manage connections and sync preferences
- **🔔 System Tray**: Minimize to tray with quick access menu

### UI Design

- **Background**: Pure black (#000000)
- **Outlines**: White neon glow with hover effects
- **Typography**: Clean Inter font family
- **Status Indicators**: Green (connected), Red (error), White (disconnected)
- **Buttons**: Rounded rectangles with neon outline and pulse effects

### Development

```bash
# Install dependencies
npm install

# Run in development
npm start

# Build for Windows
npm run build-win

# Build for all platforms
npm run build
```

### Building .exe

The app uses Electron Builder to create a Windows installer:

1. `npm run build-win` - Creates Windows installer
2. Output in `dist/` folder
3. Installer includes auto-launch option
4. System tray integration included

### Architecture

- **Main Process**: `main.js` - Window management, tray, IPC
- **Renderer**: `renderer/` - UI and application logic
- **Preload**: `preload.js` - Secure API bridge
- **Storage**: Encrypted local storage for settings and tokens

### API Integration

Connects to the Express server running on `localhost:3000`:
- `/setup/setup` - System status
- `/user/setup` - User creation
- `/auth/google` - OAuth flow
- `/sync/trigger` - Manual sync
- `/sync/enable|disable` - Auto-sync control

### Security

- Context isolation enabled
- Node integration disabled
- Encrypted local storage for sensitive data
- Secure IPC communication