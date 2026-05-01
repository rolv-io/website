document.addEventListener('DOMContentLoaded', () => {
  // OS Detection for primary download button
  const downloadBtn = document.getElementById('primary-download-btn');
  const osNameSpan = document.getElementById('os-name');
  
  if (downloadBtn && osNameSpan) {
    const userAgent = window.navigator.userAgent.toLowerCase();
    let os = 'Unknown';
    let downloadLink = 'https://github.com/rolv-io/rolv-agentic/releases/latest'; // Fallback
    
    if (userAgent.indexOf('win') !== -1) {
      os = 'Windows';
      // If we had direct links, we could set them here. For now we just point to latest release.
    } else if (userAgent.indexOf('mac') !== -1) {
      os = 'macOS';
    } else if (userAgent.indexOf('linux') !== -1 || userAgent.indexOf('x11') !== -1) {
      os = 'Linux';
    }

    if (os !== 'Unknown') {
      osNameSpan.textContent = ` for ${os}`;
    }
    
    downloadBtn.addEventListener('click', (e) => {
      e.preventDefault();
      window.open(downloadLink, '_blank');
    });
  }
});
