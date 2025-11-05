# 🚀 Synk Release Manager - Streamlined Deployment Guide

## Problem Solved
Before: Corrupted releases → manual update needed → edit HTML download button → update version manually  
After: Upload new release to GitHub → **Automatic!** ✨

## How It Works

The download page now uses an **automatic release fetcher** (`release-manager.js`) that:

1. **Auto-detects latest release** from GitHub API every time the page loads
2. **Updates download button** with direct link to the latest `.exe` file
3. **Updates version display** automatically (no manual changes needed!)
4. **Has fallback behavior** - if API is unavailable, falls back to GitHub releases page

## Current Setup

- **GitHub Repository:** `https://github.com/fusion20k/synk-web`
- **Download Page:** Links to: `https://github.com/fusion20k/synk-web/releases/latest/download/Synk%20Setup.exe`
- **Version Display:** Automatically shows latest release tag (e.g., v1.1.0 → displays as "1.1.0")

## Your Workflow - SIMPLIFIED! 📋

### When you have a new build ready:

```
1. Create/upload a release on GitHub with your .exe file
   - Repository: https://github.com/fusion20k/synk-web
   - Tag it with semantic versioning (e.g., v1.1.1, v1.2.0)
   - Attach your Synk Setup.exe file
   
2. That's it! ✨ 
   - Website updates automatically
   - Download button links to latest release
   - Version number updates automatically
```

### No more need to:
- ❌ Edit `download.html` manually
- ❌ Update hardcoded version numbers
- ❌ Change download links
- ❌ Worry about outdated downloads

## Technical Details

### Files Modified:
- `c:\Users\david\Desktop\synk\js\release-manager.js` - Fetcher script
- `c:\Users\david\Desktop\synk\download.html` - Updated with script & IDs
- `c:\Users\david\Desktop\synk\synk-web\js\release-manager.js` - Same (synced)
- `c:\Users\david\Desktop\synk\synk-web\download.html` - Same (synced)

### How the Script Works:
```javascript
// Fetches: https://api.github.com/repos/fusion20k/synk-web/releases/latest

// Extracts:
1. Latest release tag (e.g., "v1.1.0")
2. First .exe asset from that release
3. Direct download URL from GitHub CDN

// Updates:
1. href attribute of #download-btn
2. text content of #version-info
```

### Key Features:
- ✅ Uses GitHub API (free, no authentication needed for public repos)
- ✅ Zero dependencies - plain JavaScript
- ✅ Caches efficiently (browsers respect API headers)
- ✅ Graceful fallback if API is slow or unavailable
- ✅ Works on both main repo and synk-web repo (synced automatically)

## Version Tag Format

Use standard semantic versioning for release tags:

| Tag | Display | Use Case |
|-----|---------|----------|
| `v1.0.0` | Latest version: 1.0.0 | First release |
| `v1.0.1` | Latest version: 1.0.1 | Bug fix |
| `v1.1.0` | Latest version: 1.1.0 | New feature |
| `v2.0.0` | Latest version: 2.0.0 | Major update |

The script automatically strips the "v" prefix when displaying.

## Testing Your Release

1. Upload a new release to GitHub with `.exe` file
2. Wait 5-10 seconds
3. Visit: `https://synk-web.vercel.app/download.html` (or your deployed URL)
4. Open browser DevTools Console (F12 → Console)
5. Should see: `✓ Release manager activated: v1.1.0`

## Troubleshooting

### Version not updating?
- Check GitHub Releases page - is the new release there?
- Refresh page (Ctrl+F5 for hard refresh)
- Check browser console for errors (F12 → Console)

### Download button not linking?
- Verify `.exe` file is attached to the GitHub release
- Filename must end with `.exe` (case-insensitive)
- Check console for: `✓ Download link updated to: Synk Setup.exe`

### API rate limiting?
- GitHub allows 60 requests/hour for unauthenticated requests
- With page caching, you'll never hit this limit
- If you do, you can add a GitHub token in the script

## Future Improvements (Optional)

Could add:
- Release notes display on download page
- Download count statistics
- Multi-platform releases (macOS, Linux)
- Automatic changelog generation
- Beta/stable release channels

## Commits Made

- `d2b903d` - Main repo: Add automatic release manager
- `8b08269` - synk-web repo: Add automatic release manager

---

**Result:** You now have a fully automated deployment pipeline! 🎉  
Just push releases to GitHub, and your website updates automatically.