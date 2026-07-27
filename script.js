document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('primary-download-btn');
  const osNameSpan = document.getElementById('os-name');

  if (!downloadBtn || !osNameSpan) return;

  const VERSION = 'v3.0.0-beta.14';
  const BASE = `https://github.com/rolv-io/rolv-releases/releases/download/${VERSION}`;
  const FALLBACK = `https://github.com/rolv-io/rolv-releases/releases/tag/${VERSION}`;

  const userAgent = window.navigator.userAgent.toLowerCase();
  let os = 'Unknown';
  let downloadLink = FALLBACK;

  async function resolveMacDownloadUrl() {
    try {
      if (navigator.userAgentData?.getHighEntropyValues) {
        const { architecture } = await navigator.userAgentData.getHighEntropyValues([
          'architecture',
        ]);
        if (architecture === 'x86') {
          return `${BASE}/Rolv-3.0.0-beta.14-x64.dmg`;
        }
      }
    } catch (_) {
      // Fall through to arm64 default
    }
    // Most Macs are Apple Silicon; Safari can't reliably report arch
    return `${BASE}/Rolv-3.0.0-beta.14-arm64.dmg`;
  }

  if (userAgent.includes('win')) {
    os = 'Windows';
    downloadLink = `${BASE}/Rolv-Setup-3.0.0-beta.14.exe`;
  } else if (userAgent.includes('mac')) {
    os = 'macOS';
    downloadLink = `${BASE}/Rolv-3.0.0-beta.14-arm64.dmg`;
    resolveMacDownloadUrl().then((url) => {
      downloadLink = url;
    });
  } else if (userAgent.includes('linux') || userAgent.includes('x11')) {
    os = 'Linux';
    downloadLink = `${BASE}/Rolv-3.0.0-beta.14.AppImage`;
  }

  if (os !== 'Unknown') {
    osNameSpan.textContent = ` for ${os}`;
  }

  downloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.open(downloadLink, '_blank');
  });
});
