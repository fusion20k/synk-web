# Release Process

## First-time setup
1. Create a GitHub token with `repo` permissions
2. Set the environment variable (PowerShell):
```powershell
setx GH_TOKEN "your_token"
```

## Pro Edition
```bash
npm run build:pro
npm run publish:pro
```

## Ultimate Edition
```bash
npm run build:ultimate
npm run publish:ultimate
```

## Notes
- Both editions share code but have separate:
  - App IDs (`com.synk.pro` / `com.synk.ultimate`)
  - Update channels (different GitHub repos)
  - Version tracking (independent)
- Keep `src/update-log.json` current so users see "What's New".
- DO NOT push to multiple repos — keep the code in this repo only.