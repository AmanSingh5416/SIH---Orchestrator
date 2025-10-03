// Quick Network Configuration Fix
// Add this to the top of any page your friend is accessing

// FOR NETWORK ACCESS - Update this IP when it changes
const MANUAL_API_OVERRIDE = 'http://10.106.87.236:5000/api'; // Update this IP as needed

// Override the API configuration
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  // Monkey patch the API_CONFIG
  Object.defineProperty(window, 'API_CONFIG_OVERRIDE', {
    value: MANUAL_API_OVERRIDE,
    writable: false
  });
}

console.log('🔧 Manual API Override active:', MANUAL_API_OVERRIDE);