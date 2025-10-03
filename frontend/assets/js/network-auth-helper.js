// Network Access Helper for HRMS
// This helps share authentication between localhost and network IP access

class NetworkAuthHelper {
  static generateShareableLink() {
    const token = localStorage.getItem('token') || localStorage.getItem('hrms_token');
    if (!token) {
      alert('Please login first before generating shareable link');
      return;
    }
    
    const currentURL = new URL(window.location);
    const networkIP = prompt('Enter the network IP (e.g., 10.106.87.236):');
    if (!networkIP) return;
    
    // Create shareable URL with token
    const shareableURL = `http://${networkIP}:3000${currentURL.pathname}?token=${encodeURIComponent(token)}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareableURL).then(() => {
      alert(`Shareable link copied to clipboard!\n\n${shareableURL}\n\nSend this to your friend for instant access.`);
    }).catch(() => {
      prompt('Copy this link to share:', shareableURL);
    });
  }
  
  static addShareButton() {
    // Add a share button to the page
    const shareBtn = document.createElement('button');
    shareBtn.textContent = '🔗 Generate Network Share Link';
    shareBtn.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 9999;
      padding: 8px 12px;
      background: #1fad82;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    `;
    shareBtn.onclick = this.generateShareableLink;
    
    document.body.appendChild(shareBtn);
  }
}

// Auto-initialize if on localhost
if (window.location.hostname === 'localhost') {
  document.addEventListener('DOMContentLoaded', () => {
    // Only show share button if user is logged in
    if (localStorage.getItem('token') || localStorage.getItem('hrms_token')) {
      NetworkAuthHelper.addShareButton();
    }
  });
}

// Make it globally available
window.NetworkAuthHelper = NetworkAuthHelper;