// HRMS Application Core - Safe loading wrapper
(function() {
  'use strict';
  
  // Prevent multiple loading
  if (window.HRMS_LOADED) {
    console.log('🔄 HRMS already loaded, skipping...');
    return;
  }

// API Configuration with universal network access
// Use window object to prevent redeclaration errors
window.API_CONFIG = window.API_CONFIG || {
  BASE_URL: (() => {
    const hostname = window.location.hostname;
    console.log('🔍 Detected hostname:', hostname);
    
    // For network access, always use the same host but port 5000
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      const networkApi = `http://${hostname}:5000/api`;
      console.log('🌐 Using network API:', networkApi);
      return networkApi;
    }
    
    // For localhost, use localhost API
    console.log('🏠 Using localhost API');
    return 'http://localhost:5000/api';
  })(),
  
  AUTH_ENDPOINTS: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    ME: '/auth/me'
  },
  
  USER_ENDPOINTS: {
    LIST: '/users',
    PROFILE: '/users/',
    TEAM: '/users/team/my-team'
  },
  
  LEAVE_ENDPOINTS: {
    LIST: '/leaves',
    CREATE: '/leaves',
    UPDATE: '/leaves/'
  },
  
  PERFORMANCE_ENDPOINTS: {
    LIST: '/performance',
    CREATE: '/performance',
    GOALS: '/performance/goals'
  },
  
  TEAM_ENDPOINTS: {
    CREATE: '/teams/create',
    JOIN: '/teams/join',
    MY_TEAMS: '/teams/my-teams',
    DETAILS: '/teams/',
    UPDATE: '/teams/',
    LEAVE: '/teams/'
  }
};

// Create a reference for easier access
const API_CONFIG = window.API_CONFIG;

// Authentication utilities with cross-origin support
window.Auth = window.Auth || {
  // Storage key prefix to avoid conflicts
  TOKEN_KEY: 'hrms_token',
  USER_KEY: 'hrms_user',
  
  // Get stored token with fallback mechanisms
  getToken() {
    // Try localStorage first
    let token = localStorage.getItem(this.TOKEN_KEY);
    if (token) return token;
    
    // Fallback to legacy key for compatibility
    token = localStorage.getItem('token');
    if (token) {
      // Migrate to new key
      localStorage.setItem(this.TOKEN_KEY, token);
      localStorage.removeItem('token');
      return token;
    }
    
    // Try sessionStorage as backup
    token = sessionStorage.getItem(this.TOKEN_KEY);
    if (token) return token;
    
    // Check URL parameters for token (network access workaround)
    const urlParams = new URLSearchParams(window.location.search);
    token = urlParams.get('token');
    if (token) {
      // Store it for future use
      this.setToken(token);
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
      return token;
    }
    
    return null;
  },
  
  // Set token with multiple storage methods
  setToken(token) {
    localStorage.setItem(this.TOKEN_KEY, token);
    sessionStorage.setItem(this.TOKEN_KEY, token);
    // Legacy support
    localStorage.setItem('token', token);
  },
  
  // Get stored user data
  getUser() {
    let userData = localStorage.getItem(this.USER_KEY);
    if (!userData) {
      userData = localStorage.getItem('user'); // Legacy fallback
    }
    if (!userData) {
      userData = sessionStorage.getItem(this.USER_KEY); // Backup
    }
    return userData ? JSON.parse(userData) : null;
  },
  
  // Set user data with multiple storage methods
  setUser(user) {
    const userStr = JSON.stringify(user);
    localStorage.setItem(this.USER_KEY, userStr);
    sessionStorage.setItem(this.USER_KEY, userStr);
    // Legacy support
    localStorage.setItem('user', userStr);
  },
  
  // Check if user is logged in
  isAuthenticated() {
    const token = this.getToken();
    console.log('🔐 Auth check - Token present:', !!token);
    return !!token;
  },
  
  // Login user
  async login(credentials) {
    try {
      console.log('🔐 Attempting login to:', API_CONFIG.BASE_URL);
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH_ENDPOINTS.LOGIN}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });
      
      const data = await response.json();
      console.log('🔐 Login response:', { success: data.success, hasToken: !!data.user?.token });
      
      if (data.success) {
        // Clear any existing authentication data
        this.clearAuth();
        
        // Set new authentication data using enhanced storage
        this.setToken(data.user.token);
        this.setUser(data.user);
        
        console.log('🔐 Login successful, token stored');
        return { success: true, user: data.user };
      } else {
        console.error('🔐 Login failed:', data.error);
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error('🔐 Login error:', error);
      return { success: false, error: 'Network error' };
    }
  },
  
  // Clear all authentication data
  clearAuth() {
    // Clear all possible storage locations
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
    sessionStorage.clear();
  },
  
  // Register user
  async register(userData) {
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.AUTH_ENDPOINTS.REGISTER}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData)
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: 'Network error' };
    }
  },
  
  // Logout user
  logout() {
    console.log('🔐 Logging out user');
    // Use the enhanced clear method
    this.clearAuth();
    
    // Clear any cached user data
    localStorage.removeItem('deadlines');
    localStorage.removeItem('teamData');
    
    // Use replace to prevent back button access to authenticated pages
    window.location.replace('homepage.html');
  },
  
  // Redirect to login if not authenticated
  requireAuth() {
    if (!this.isAuthenticated()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  },
  
  // Get authentication headers for API requests
  getAuthHeaders() {
    const token = this.getToken();
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` })
    };
  }
};

// Create a reference for easier access
const Auth = window.Auth;

// API request helper with authentication and better error handling
window.API = window.API || {
  async request(endpoint, options = {}) {
    const token = Auth.getToken();
    const fullUrl = `${API_CONFIG.BASE_URL}${endpoint}`;
    
    console.log('🌐 API Request:', {
      url: fullUrl,
      hasToken: !!token,
      method: options.method || 'GET'
    });
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...options
    };
    
    try {
      const response = await fetch(fullUrl, config);
      console.log('📡 API Response Status:', response.status);
      
      // Handle different response types
      if (response.status === 401) {
        console.error('🚨 401 Unauthorized - Logging out user');
        console.error('Request URL:', fullUrl);
        console.error('Token present:', !!token);
        Auth.logout();
        return;
      }
      
      if (!response.ok) {
        console.error('� API Error Response:', response.status, response.statusText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('✅ API Success:', endpoint);
      return data;
    } catch (error) {
      console.error('🔥 API Request Failed:', error);
      console.error('Failed URL:', fullUrl);
      console.error('Token was:', token ? 'Present' : 'Missing');
      return { success: false, error: error.message || 'Network error' };
    }
  },
  
  // GET request
  get(endpoint) {
    return this.request(endpoint);
  },
  
  // POST request
  post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },
  
  // PUT request
  put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  },
  
  // DELETE request
  delete(endpoint) {
    return this.request(endpoint, {
      method: 'DELETE'
    });
  }
};

// Create references for easier access  
const API = window.API;

// UI Utilities
window.UI = window.UI || {
  // Show notification
  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add styles
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 500;
      z-index: 10000;
      transition: all 0.3s ease;
      transform: translateX(100%);
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  },
  
  // Show loading spinner
  showLoading(element) {
    const originalText = element.textContent;
    element.textContent = 'Loading...';
    element.disabled = true;
    
    return () => {
      element.textContent = originalText;
      element.disabled = false;
    };
  }
};

// Create references for easier access
const UI = window.UI;

// Navigation utilities
window.Navigation = window.Navigation || {
  goToLogin() {
    window.location.href = 'login.html';
  },
  goToDashboard() {
    window.location.href = 'dashboard.html';
  },
  // Update user info in navigation
  updateUserInfo() {
    const user = Auth.getUser();
    if (user) {
      // Update user name in sidebar or navigation
      const userNameElements = document.querySelectorAll('.user-name');
      userNameElements.forEach(el => {
        el.textContent = `${user.firstName} ${user.lastName}`;
      });
      
      // Update role display
      const roleElements = document.querySelectorAll('.user-role');
      roleElements.forEach(el => {
        el.textContent = user.role;
      });
    }
  },
  
  // Add logout functionality to logout buttons
  initializeLogout() {
    const logoutButtons = document.querySelectorAll('.logout-btn');
    logoutButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Are you sure you want to logout?')) {
          Auth.logout();
        }
      });
    });
  }
};

// Create references for easier access
const Navigation = window.Navigation;

// Team Management utilities
window.TeamManager = window.TeamManager || {
  // Create a new team
  async createTeam(teamData) {
    try {
      const response = await API.post(API_CONFIG.TEAM_ENDPOINTS.CREATE, teamData);
      return response;
    } catch (error) {
      console.error('Create team error:', error);
      return { success: false, error: 'Failed to create team' };
    }
  },

  // Join a team using team code
  async joinTeam(teamCode) {
    try {
      const response = await API.post(API_CONFIG.TEAM_ENDPOINTS.JOIN, { teamCode });
      return response;
    } catch (error) {
      console.error('Join team error:', error);
      return { success: false, error: 'Failed to join team' };
    }
  },

  // Get user's teams
  async getMyTeams() {
    try {
      const response = await API.get(API_CONFIG.TEAM_ENDPOINTS.MY_TEAMS);
      return response;
    } catch (error) {
      console.error('Get teams error:', error);
      return { success: false, error: 'Failed to load teams' };
    }
  },

  // Get team details
  async getTeam(teamId) {
    try {
      const response = await API.get(API_CONFIG.TEAM_ENDPOINTS.DETAILS + teamId);
      return response;
    } catch (error) {
      console.error('Get team error:', error);
      return { success: false, error: 'Failed to load team details' };
    }
  },

  // Update team
  async updateTeam(teamId, updateData) {
    try {
      const response = await API.put(API_CONFIG.TEAM_ENDPOINTS.UPDATE + teamId, updateData);
      return response;
    } catch (error) {
      console.error('Update team error:', error);
      return { success: false, error: 'Failed to update team' };
    }
  },

  // Leave team
  async leaveTeam(teamId) {
    try {
      const response = await API.delete(API_CONFIG.TEAM_ENDPOINTS.LEAVE + teamId + '/leave');
      return response;
    } catch (error) {
      console.error('Leave team error:', error);
      return { success: false, error: 'Failed to leave team' };
    }
  },

  // Show create team modal
  showCreateTeamModal() {
    const modal = document.createElement('div');
    modal.className = 'team-modal-overlay';
    modal.innerHTML = `
      <div class="team-modal">
        <div class="team-modal-header">
          <h3>Create New Team</h3>
          <button class="close-modal">&times;</button>
        </div>
        <form id="createTeamForm" class="team-form">
          <div class="form-group">
            <label for="teamName">Team Name *</label>
            <input type="text" id="teamName" required maxlength="100" placeholder="Enter team name">
          </div>
          <div class="form-group">
            <label for="teamDescription">Description</label>
            <textarea id="teamDescription" maxlength="500" placeholder="Describe your team's purpose"></textarea>
          </div>
          <div class="form-group">
            <label for="maxMembers">Maximum Members</label>
            <input type="number" id="maxMembers" min="2" max="50" value="10" placeholder="Maximum team size">
          </div>
          <div class="form-actions">
            <button type="button" class="btn btn-secondary cancel-btn">Cancel</button>
            <button type="submit" class="btn btn-primary">Create Team</button>
          </div>
        </form>
      </div>
    `;

    // Add modal styles
    modal.style.cssText = 
      'position: fixed; top: 0; left: 0; right: 0; bottom: 0;' +
      'background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;' +
      'z-index: 10000;';

    const modalContent = modal.querySelector('.team-modal');
    modalContent.style.cssText = 
      'background: white; border-radius: 12px; padding: 2rem; max-width: 500px; width: 90%;' +
      'box-shadow: 0 20px 40px rgba(0,0,0,0.2);';

    document.body.appendChild(modal);

    // Handle form submission
    const form = modal.querySelector('#createTeamForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const teamData = {
        name: document.getElementById('teamName').value.trim(),
        description: document.getElementById('teamDescription').value.trim(),
        maxMembers: parseInt(document.getElementById('maxMembers').value)
      };

      const result = await this.createTeam(teamData);
      
      if (result.success) {
        UI.showNotification('Team created! Share code: ' + result.data.teamCode, 'success');
        modal.remove();
        // Reload teams if on dashboard
        if (typeof loadUserTeams === 'function') {
          loadUserTeams();
        }
      } else {
        UI.showNotification(result.error || 'Failed to create team', 'error');
      }
    });

    // Handle modal close
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  },

  // Show join team modal
  showJoinTeamModal() {
    const modal = document.createElement('div');
    modal.className = 'team-modal-overlay';
    modal.innerHTML = 
      '<div class="team-modal">' +
        '<div class="team-modal-header">' +
          '<h3>Join Team</h3>' +
          '<button class="close-modal">&times;</button>' +
        '</div>' +
        '<form id="joinTeamForm" class="team-form">' +
          '<div class="form-group">' +
            '<label for="teamCode">Team Code *</label>' +
            '<input type="text" id="teamCode" required maxlength="8" placeholder="Enter team code" style="text-transform: uppercase;">' +
            '<small>Enter the team code shared by your team leader</small>' +
          '</div>' +
          '<div class="form-actions">' +
            '<button type="button" class="btn btn-secondary cancel-btn">Cancel</button>' +
            '<button type="submit" class="btn btn-primary">Join Team</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    // Add modal styles (same as create modal)
    modal.style.cssText = 
      'position: fixed; top: 0; left: 0; right: 0; bottom: 0;' +
      'background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;' +
      'z-index: 10000;';

    const modalContent = modal.querySelector('.team-modal');
    modalContent.style.cssText = 
      'background: white; border-radius: 12px; padding: 2rem; max-width: 500px; width: 90%;' +
      'box-shadow: 0 20px 40px rgba(0,0,0,0.2);';

    document.body.appendChild(modal);

    // Auto-uppercase team code input
    const teamCodeInput = modal.querySelector('#teamCode');
    teamCodeInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });

    // Handle form submission
    const form = modal.querySelector('#joinTeamForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const teamCode = teamCodeInput.value.trim();
      const result = await this.joinTeam(teamCode);
      
      if (result.success) {
        UI.showNotification('Successfully joined team: ' + result.data.team.name, 'success');
        modal.remove();
        // Reload teams if on dashboard
        if (typeof loadUserTeams === 'function') {
          loadUserTeams();
        }
      } else {
        UI.showNotification(result.error || 'Failed to join team', 'error');
      }
    });

    // Handle modal close
    modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
    modal.querySelector('.cancel-btn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
  // Determine current page name (supports clean URLs without .html)
  const pathname = decodeURIComponent(window.location.pathname || '/');
  let page = pathname.substring(pathname.lastIndexOf('/') + 1);
  if (!page) page = 'index';
  page = page.toLowerCase();

  // Public pages that must NOT trigger auth redirects
  const isPublic = (p) => [
    'index', 'index.html',
    'login', 'login.html',
    'home page', 'home page.html',
    'homepage', 'homepage.html',
    'home%20page.html', // URL encoded space
    '', '/' // Root paths
  ].includes(p);

  // Only enforce auth on non-public pages
  if (!isPublic(page)) {
    // Check authentication for protected pages (dashboard, ai-assistant, etc.)
    if (!Auth.requireAuth()) return;

    // Update navigation with user info and unify logout handlers
    try { Navigation.updateUserInfo(); } catch (e) {}
    try { Navigation.initializeLogout(); } catch (e) {}
  }
  // Initialize Theme after auth gating - DISABLED
  // try { Theme.init(); } catch (e) { /* noop */ }
  
  // Remove any existing theme toggle button
  const existingToggle = document.getElementById('themeToggle');
  if (existingToggle) {
    existingToggle.remove();
  }
  // Initialize sidebar close behaviors globally
  try { initSidebarInteraction(); } catch (e) { /* noop */ }
});

// Theme manager (light/dark) - DISABLED
const Theme = {
  key: 'theme',
  current: null,
  init() {
    // Theme toggle disabled - do nothing
  },
  apply(theme) {
    // Theme toggle disabled - do nothing
  },
  toggle() {
    // Theme toggle disabled - do nothing
  },
  injectToggle() {
    // Theme toggle disabled - do nothing
  },
  _setBtnState(btn) {
    // Theme toggle disabled - do nothing
  }
};

// Robust sidebar interaction (outside click + Esc)
function initSidebarInteraction() {
  const sidebar = document.getElementById('sidebar');
  const menuBtn = document.getElementById('menuBtn');
  const closeBtn = document.getElementById('closeBtn');
  if (!sidebar || !menuBtn) return;

  const openSidebar = () => {
    sidebar.classList.add('active');
    menuBtn.setAttribute('aria-expanded', 'true');
  };
  const closeSidebar = () => {
    sidebar.classList.remove('active');
    menuBtn.setAttribute('aria-expanded', 'false');
  };

  menuBtn.addEventListener('click', openSidebar, { passive: true });
  if (closeBtn) closeBtn.addEventListener('click', closeSidebar, { passive: true });

  document.addEventListener('click', (e) => {
    if (!sidebar.classList.contains('active')) return;
    if (sidebar.contains(e.target)) return;
    if (menuBtn.contains(e.target)) return;
    closeSidebar();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sidebar.classList.contains('active')) {
      closeSidebar();
    }
  });
}

// Create final references for easier access
const TeamManager = window.TeamManager;

// Mark as loaded
window.HRMS_LOADED = true;
console.log('✅ HRMS Application loaded successfully');

})(); // End of IIFE