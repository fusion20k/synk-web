/**
 * Release Manager - Automatically fetches latest GitHub release
 * Updates download links and version info without manual changes
 * 
 * Features:
 * - Auto-fetches latest release from GitHub API
 * - Updates download button with direct GitHub link
 * - Updates version number dynamically
 * - No manual updates needed - just create a new GitHub release!
 */

const GITHUB_API_URL = 'https://api.github.com/repos/fusion20k/synk-web/releases/latest';

/**
 * Fetch latest release from GitHub and update download button
 */
async function updateReleaseInfo() {
    try {
        const response = await fetch(GITHUB_API_URL);
        
        if (!response.ok) {
            console.warn('Failed to fetch release info:', response.statusText);
            return;
        }

        const release = await response.json();
        
        // Find the .exe asset
        const exeAsset = release.assets.find(asset => 
            asset.name.toLowerCase().endsWith('.exe')
        );

        if (!exeAsset) {
            console.warn('No .exe asset found in latest release');
            return;
        }

        // Update download button - prefer ID selector first
        let downloadBtn = document.getElementById('download-btn');
        if (!downloadBtn) {
            downloadBtn = document.querySelector('a[download*=".exe"]');
        }
        
        if (downloadBtn) {
            downloadBtn.href = exeAsset.browser_download_url;
            console.log(`✓ Download link updated to: ${exeAsset.name}`);
        }

        // Extract version from tag (e.g., "v1.1.0" -> "1.1.0")
        const version = release.tag_name.replace(/^v/, '');

        // Update version text - prefer ID selector first
        let versionPara = document.getElementById('version-info');
        
        if (!versionPara) {
            // Fallback: find by text content
            const paragraphs = Array.from(document.querySelectorAll('p'));
            versionPara = paragraphs.find(p => p.textContent.includes('Latest version:'));
        }
        
        if (versionPara) {
            versionPara.textContent = `Compatible with Windows 10 and later. Latest version: ${version}`;
            console.log(`✓ Version updated to: ${version}`);
        }

        console.log(`✓ Release manager activated: v${version}`);

    } catch (error) {
        console.warn('Release manager: Could not fetch latest release (this is OK - fallback link is active)');
        // Silently fail - download page still works with fallback links
    }
}

// Run when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', updateReleaseInfo);
} else {
    updateReleaseInfo();
}