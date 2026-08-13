const RELEASES_API = 'https://api.github.com/repos/rolv-io/rolv-releases/releases/latest';
const RELEASES_PAGE = 'https://github.com/rolv-io/rolv-releases/releases';
const LATEST_PAGE = `${RELEASES_PAGE}/latest`;

function classifyAsset(name) {
  const n = name.toLowerCase();
  if (n.endsWith('.blockmap') || n.endsWith('.yml') || n.endsWith('.zip')) return null;
  if (n.endsWith('.dmg') && n.includes('arm64')) {
    return {
      id: 'mac-arm',
      label: 'macOS Apple Silicon',
      primaryLabel: 'Download for macOS (Apple Silicon .dmg)',
    };
  }
  if (n.endsWith('.dmg') && n.includes('x64')) {
    return {
      id: 'mac-intel',
      label: 'macOS Intel',
      primaryLabel: 'Download for macOS (Intel .dmg)',
    };
  }
  if (n.endsWith('.exe')) {
    return { id: 'win', label: 'Windows', primaryLabel: 'Download for Windows' };
  }
  if (n.endsWith('.appimage')) {
    return {
      id: 'linux-appimage',
      label: 'Linux AppImage',
      primaryLabel: 'Download for Linux (AppImage)',
    };
  }
  if (n.endsWith('.deb')) {
    return {
      id: 'linux-deb',
      label: 'Linux .deb',
      primaryLabel: 'Download for Linux (.deb)',
    };
  }
  return null;
}

function packagesFromAssets(assets) {
  const packages = [];
  for (const asset of assets || []) {
    const kind = classifyAsset(asset.name || '');
    if (!kind || !asset.browser_download_url) continue;
    packages.push({ ...kind, url: asset.browser_download_url });
  }
  return packages;
}

async function detectPreferredId() {
  const ua = window.navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'win';
  if (ua.includes('mac')) {
    try {
      if (navigator.userAgentData?.getHighEntropyValues) {
        const { architecture } = await navigator.userAgentData.getHighEntropyValues([
          'architecture',
        ]);
        if (architecture === 'x86') return 'mac-intel';
      }
    } catch (_) {
      // Safari often cannot report arch; Apple Silicon is the default.
    }
    return 'mac-arm';
  }
  if (ua.includes('linux') || ua.includes('x11')) return 'linux-appimage';
  return 'mac-arm';
}

function pickPrimary(packages, preferredId) {
  return packages.find((pkg) => pkg.id === preferredId) || packages[0] || null;
}

document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('primary-download-btn');
  const osNameSpan = document.getElementById('os-name');
  const alts = document.getElementById('download-alts');
  const allReleases = document.getElementById('all-releases-link');

  if (!downloadBtn || !osNameSpan) return;
  if (allReleases) allReleases.href = RELEASES_PAGE;

  fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`GitHub ${res.status}`);
      return res.json();
    })
    .then(async (release) => {
      const packages = packagesFromAssets(release.assets);
      if (packages.length === 0) return;

      const preferredId = await detectPreferredId();
      const primary = pickPrimary(packages, preferredId);
      if (!primary) return;

      downloadBtn.href = primary.url;
      osNameSpan.textContent = '';
      downloadBtn.replaceChildren(
        document.createTextNode(`${primary.primaryLabel} `),
        (() => {
          const arrow = document.createElement('span');
          arrow.setAttribute('aria-hidden', 'true');
          arrow.textContent = '↓';
          return arrow;
        })(),
      );

      if (!alts) return;
      const others = packages.filter((pkg) => pkg.id !== primary.id);
      alts.replaceChildren();
      for (const pkg of others) {
        const link = document.createElement('a');
        link.className = 'download-alt';
        link.href = pkg.url;
        link.textContent = pkg.label;
        alts.appendChild(link);
      }
      alts.hidden = others.length === 0;
    })
    .catch(() => {
      downloadBtn.href = LATEST_PAGE;
    });
});
