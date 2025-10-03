// Dashboard functionality

// Get API configuration from centralized config
const BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL.replace('/api', '') : `http://${window.location.hostname}:8000`;

// Calendar variables
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

// Example deadlines
const defaultDeadlines = {
    "2025-09-23": "AI model demo 🚀",
    "2025-09-25": "Final report submission 📝"
};
let deadlines = JSON.parse(localStorage.getItem('deadlines')) || defaultDeadlines;

const API = {
  async post(endpoint, data) {
    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }
};

// SECURITY: Real-time authentication validation
async function validateAuthenticationRealTime() {
    const token = window.Auth ? window.Auth.getToken() : localStorage.getItem('token');
    
    // If no token, redirect immediately
    if (!token) {
        console.warn('No authentication token found. Redirecting to login.');
        window.location.replace('../pages/login.html'); // Use replace to prevent back button
        return;
    }
    
    try {
        // Verify token with backend using centralized headers
        const headers = window.Auth ? window.Auth.getAuthHeaders() : {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
        
        const response = await fetch(`${BASE_URL}/api/auth/verify-token`, {
            method: 'GET',
            headers: headers
        });
        
        if (!response.ok) {
            throw new Error('Token validation failed');
        }
        
        const result = await response.json();
        if (!result.success) {
            throw new Error('Invalid token');
        }
        
        console.log('Authentication validated successfully');
        
    } catch (error) {
        console.warn('Authentication validation failed:', error.message);
        // Clear invalid tokens
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Use replace to prevent back button access
        window.location.replace('../pages/login.html');
    }
}

// SECURITY: Page visibility change detection (prevents back button cache access)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Page became visible (user came back via back button or tab switch)
        validateAuthenticationRealTime();
    }
});

// SECURITY: Window focus detection (temporarily disabled for debugging)
// window.addEventListener('focus', function() {
//     validateAuthenticationRealTime();
// });

document.addEventListener('DOMContentLoaded', async function() {
    // SECURITY: Basic authentication check (less aggressive)
    const token = window.Auth ? window.Auth.getToken() : localStorage.getItem('token');
    if (!token) {
        console.warn('No authentication token found. Redirecting to login.');
        window.location.replace('../pages/login.html');
        return;
    }
    
    console.log('Token found, initializing dashboard...');
    
    // Get DOM elements for calendar
    window.calendarDays = document.getElementById("calendarDays");
    window.monthYear = document.getElementById("monthYear");
    window.modal = document.getElementById("modal");
    window.taskDate = document.getElementById("taskDate");
    window.taskDetail = document.getElementById("taskDetail");
    window.closeModal = document.getElementById("closeModal");
    
    // Initialize logout functionality
    try {
        if (typeof Navigation !== 'undefined' && Navigation.initializeLogout) {
            Navigation.initializeLogout();
        } else {
            // Fallback: Initialize logout directly
            const logoutButtons = document.querySelectorAll('.logout-btn');
            logoutButtons.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (confirm('Are you sure you want to logout?')) {
                        // Clear all authentication data
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        sessionStorage.clear();
                        
                        // Clear cached user data
                        localStorage.removeItem('deadlines');
                        localStorage.removeItem('teamData');
                        
                        // Use replace to prevent back button access
                        window.location.replace('../pages/homepage.html');
                    }
                });
            });
        }
    } catch (error) {
        console.warn('Could not initialize logout functionality:', error);
    }
    
    // Test backend connectivity (delayed to allow login to complete)
    setTimeout(() => {
        testBackendConnection();
    }, 1000);
    
    // Load user-specific data (delayed to allow login to complete)
    setTimeout(() => {
        loadUserSpecificData();
    }, 500);
    
    // Initialize sidebar
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuBtn");
    const closeBtn = document.getElementById("closeBtn");

    menuBtn.addEventListener("click", () => sidebar.classList.add("active"));
    closeBtn.addEventListener("click", () => sidebar.classList.remove("active"));
    
    // Initialize calendar
    renderCalendar(currentMonth, currentYear);
    
    // Initialize team buttons
    initializeTeamButtons();
});

// Load user-specific data
async function loadUserSpecificData() {
    try {
        const token = localStorage.getItem('token');
        if (!token) {
            showEmptyState();
            return;
        }

        // Get user info using centralized auth headers
        const headers = window.Auth ? window.Auth.getAuthHeaders() : {
            'Authorization': `Bearer ${token}`
        };
        
        const userResponse = await fetch(`${BASE_URL}/api/auth/me`, {
            headers: headers
        });

        if (userResponse.ok) {
            const userData = await userResponse.json();
            const user = userData.data;
            console.log('Current user:', user);

            // Update user info in sidebar
            updateUserInfo(user);
        } else {
            console.warn('Failed to load user info, but continuing to load projects');
        }

        // Always try to load user's projects regardless of user info success
        loadUserTeams();
        
    } catch (error) {
        console.error('Error loading user data:', error);
        // Still try to load projects even if user info fails
        loadUserTeams();
    }
}

// Update user info in sidebar
function updateUserInfo(user) {
    const userNameEl = document.querySelector('.user-name');
    const userRoleEl = document.querySelector('.user-role');
    
    if (userNameEl) {
        userNameEl.textContent = user.name || 'User';
    }
    
    if (userRoleEl) {
        userRoleEl.textContent = user.role || 'Employee';
    }
}

// Load user's projects (using teams API for compatibility)
async function loadUserTeams() {
    try {
        const token = window.Auth ? window.Auth.getToken() : localStorage.getItem('token');
        if (!token) {
            showEmptyState();
            return;
        }

        console.log('Loading user projects from:', `${BASE_URL}/api/teams/my-teams`);
        
        const headers = window.Auth ? window.Auth.getAuthHeaders() : {
            'Authorization': `Bearer ${token}`
        };
        
        const response = await fetch(`${BASE_URL}/api/teams/my-teams`, {
            headers: headers
        });

        console.log('Projects API response status:', response.status);

        if (response.ok) {
            const result = await response.json();
            console.log('Projects API response:', result);
            
            const teamsData = result.data?.teams || result.data || [];
            console.log('User projects:', teamsData);
            
            // Display teams in the projects section
            displayUserTeams(teamsData);
        } else {
            console.error('Failed to load user projects:', response.status);
            const errorText = await response.text();
            console.error('Error response:', errorText);
            showEmptyState();
        }
    } catch (error) {
        console.error('Error loading user projects:', error);
        showEmptyState();
    }
}

// Display user projects in the dashboard
function displayUserTeams(teamsData) {
    const projectsContainer = document.getElementById('projectsContainer');
    if (!projectsContainer) return;

    console.log('Displaying user teams/projects:', teamsData);

    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.style.display = 'none';

    // Clear existing content
    projectsContainer.innerHTML = '';

    // Check if teamsData is an array of team references or direct teams
    const teams = Array.isArray(teamsData) ? teamsData : [];
    console.log('Processed teams array:', teams);

    if (teams.length === 0) {
        console.log('No teams found, showing empty state');
        showEmptyState();
        return;
    }

    console.log(`Displaying ${teams.length} projects`);

    // Add user's projects
    teams.forEach((teamRef, index) => {
        console.log(`Processing project ${index + 1}:`, teamRef);
        
        // Handle both direct team objects and team reference objects
        const team = teamRef.team || teamRef;
        const role = teamRef.role || 'member';
        
        if (!team || !team.name) {
            console.warn('Skipping invalid team:', teamRef);
            return; // Skip invalid teams
        }

        const projectCard = document.createElement('div');
        projectCard.className = 'project-card';
        projectCard.setAttribute('data-team-id', team._id);
        projectCard.setAttribute('data-role', role);
        
        projectCard.innerHTML = `
            <h3>${team.name}</h3>
            <p class="team-description">${team.description || 'No description provided'}</p>
            <div class="badges">
                <span class="badge ${role === 'leader' ? 'team-leader' : ''}">${role === 'leader' ? 'Project Leader' : 'Project Member'}</span>
                <span class="team-code">Code: ${team.teamCode}</span>
            </div>
            <div class="team-info">
                <small>Members: ${team.memberCount || team.members?.length || 0}/${team.maxMembers || 10}</small>
            </div>
        `;

        // Add click handler for navigation
        projectCard.style.cursor = 'pointer';
        projectCard.addEventListener('click', () => {
            // Store current project data for the analysis page
            const projectData = {
                id: team._id,
                name: team.name,
                description: team.description,
                teamCode: team.teamCode,
                role: role,
                memberCount: team.memberCount || team.members?.length || 0,
                maxMembers: team.maxMembers || 10
            };
            
            // Store in sessionStorage for the analysis page to access
            sessionStorage.setItem('currentProject', JSON.stringify(projectData));
            
            if (role === 'leader') {
                window.location.href = `project_analysis_leader.html?project=${team._id}&role=${role}`;
            } else {
                window.location.href = `project_analysis_member.html?project=${team._id}&role=${role}`;
            }
        });

        projectsContainer.appendChild(projectCard);
        console.log(`Added project card for: ${team.name}`);
    });
}

// Show empty state when user has no projects
function showEmptyState() {
    const projectsContainer = document.getElementById('projectsContainer');
    if (!projectsContainer) return;

    // Hide loading state
    const loadingState = document.getElementById('loadingState');
    if (loadingState) loadingState.style.display = 'none';

    projectsContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 3rem; color: #64748b;">
            <i class="fa fa-folder-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;"></i>
            <h3>No Projects Yet</h3>
            <p>Create a new project or join an existing one to get started!</p>
            <div style="margin-top: 2rem; display: flex; gap: 1rem; justify-content: center;">
                <button class="gradient-btn" onclick="document.getElementById('make_team').click()">
                    <i class="fa-solid fa-plus"></i> Create Project
                </button>
                <button class="gradient-btn" onclick="document.getElementById('join_team').click()">
                    <i class="fa-solid fa-users"></i> Join Project
                </button>
            </div>
        </div>
    `;
}

function renderCalendar(month, year) {
    if (!window.calendarDays || !window.monthYear) return;
    
    window.calendarDays.innerHTML = "";
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    window.monthYear.textContent = `${monthNames[month]} ${year}`;

    // Empty slots before first day
    for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    window.calendarDays.appendChild(empty);
    }

    for (let day = 1; day <= totalDays; day++) {
    const dayDiv = document.createElement("div");
    dayDiv.classList.add("day");
    dayDiv.textContent = day;

    const today = new Date();
    if (day === today.getDate() && month === today.getMonth() && year === today.getFullYear()) {
        dayDiv.classList.add("today");
    }

const paddedMonth = String(month + 1).padStart(2, '0');
const paddedDay = String(day).padStart(2, '0');
const key = `${year}-${paddedMonth}-${paddedDay}`;        if (deadlines[key]) {
        dayDiv.classList.add("deadline");
        dayDiv.addEventListener("click", () => {
        window.taskDate.textContent = `${monthNames[month]} ${day}, ${year}`;
        window.taskDetail.textContent = deadlines[key];
        window.modal.style.display = "flex";
        });
    }

    window.calendarDays.appendChild(dayDiv);
    }
}

document.getElementById("prevMonth").addEventListener("click", () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar(currentMonth, currentYear);
});

document.getElementById("nextMonth").addEventListener("click", () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar(currentMonth, currentYear);
});

window.closeModal.addEventListener("click", () => window.modal.style.display = "none");
window.addEventListener("click", e => { if (e.target === window.modal) window.modal.style.display = "none"; });

renderCalendar(currentMonth, currentYear);


// Assistant widget logic (no memory)
const aToggle = document.getElementById('assistantToggle');
const aPanel = document.getElementById('assistantPanel');
const aClose = document.getElementById('assistantClose');
const aInput = document.getElementById('assistantInput');
const aSend = document.getElementById('assistantSend');
const aMsgs = document.getElementById('assistantMessages');

function openAssistant(){
    aPanel.hidden = false;
    aToggle.setAttribute('aria-expanded','true');
    aInput.focus();
}
function closeAssistant(){
    aPanel.hidden = true;
    aToggle.setAttribute('aria-expanded','false');
    // If URL hash was used to open the assistant, clear it on close
    if (location.hash && location.hash.toLowerCase() === '#assistant') {
    try { history.replaceState(null, '', location.pathname + location.search); } catch {}
    }
}
aToggle.addEventListener('click', () => aPanel.hidden ? openAssistant() : closeAssistant());
aClose.addEventListener('click', closeAssistant);
aInput.addEventListener('keypress', (e)=>{ if(e.key==='Enter'){ sendAssistant(); }});
aSend.addEventListener('click', sendAssistant);

// Open assistant if navigated with #assistant and on hash changes
function handleAssistantHash(){
    if ((location.hash || '').toLowerCase() === '#assistant') {
    openAssistant();
    }
}
window.addEventListener('hashchange', handleAssistantHash);
handleAssistantHash();

let currentSessionId = ""; // keep track of session across messages

async function sendAssistant(){
  const text = aInput.value.trim();
  if(!text) return;

  appendMsg('user', text);
  aInput.value = '';

  try {
    const res = await API.post('api/chat', {
      message: text,
      session_id: currentSessionId // send existing session or ""
    });

    console.log("Raw API response:", res);

    // Update session id if backend provides one
    if (res.session_id) {
      currentSessionId = res.session_id;
    }

    // Display AI response
    if (res && res.response) {
      appendMsg('ai', res.response);
    } else {
      appendMsg('ai', 'Sorry, I did not receive a valid response from the AI.');
    }
  } catch(err) {
    console.error('API Error:', err);
    appendMsg('ai', 'Error connecting to the AI service. Please try again later.');
  }
}

function appendMsg(role, text){
  const div = document.createElement('div');
  div.className = `a-msg ${role}`; // role = 'user' or 'ai'
  div.textContent = text;
  aMsgs.appendChild(div);
  aMsgs.scrollTop = aMsgs.scrollHeight;
}

function generateReply(text){
    const user = Auth.getUser() || {};
    if(/project/i.test(text)) return `I can help summarize your projects and roles. What do you want to know?`;
    if(/team/i.test(text)) return `Tell me about the team task or coordination you need help with.`;
    if(/schedule|calendar/i.test(text)) return `I can reference the calendar on this page. What date or deadline?`;
    return `Got it: "${text}". I’ll assist with HRMS-related queries like projects, teams, and schedules.`;
}

// Sidebar overlay behavior
const overlay = document.getElementById('sidebarOverlay');
const sidebarEl = document.getElementById('sidebar');
const menuBtnEl = document.getElementById('menuBtn');
const closeBtnEl = document.getElementById('closeBtn');
function openSidebar(){ sidebarEl.classList.add('active'); overlay.hidden = false; }
function closeSidebar(){ sidebarEl.classList.remove('active'); overlay.hidden = true; }
if(menuBtnEl){ menuBtnEl.addEventListener('click', openSidebar); }
if(closeBtnEl){ closeBtnEl.addEventListener('click', closeSidebar); }
overlay.addEventListener('click', closeSidebar);


document.getElementById("addBtn").onclick = () => {
document.getElementById("popup").style.display = "block";
};

// Close popup
function closePopup() {
document.getElementById("popup").style.display = "none";
}

// Save button handler
document.getElementById("saveBtn").onclick = () => {
const task = document.getElementById("task").value.trim();
const date = document.getElementById("date").value; // format: YYYY-MM-DD
if (task && date) {
    // 1️⃣ Add to deadlines object
deadlines[date] = task;

// 2️⃣ Re-render the calendar so the new date is highlighted
localStorage.setItem('deadlines', JSON.stringify(deadlines));
renderCalendar(currentMonth, currentYear);

// 3️⃣ Reset & close popup
closePopup();
document.getElementById("task").value = "";
document.getElementById("date").value = "";
} else {
    alert("Please enter both task and date!");
}
};

// Test backend connectivity
async function testBackendConnection() {
    try {
        console.log('Testing backend connection to:', BASE_URL);
        const headers = window.Auth ? window.Auth.getAuthHeaders() : {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
        };
        
        const response = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: headers
        });
        
        console.log('Backend test response status:', response.status);
        const text = await response.text();
        console.log('Backend test response:', text);
        
        if (response.status === 200) {
            console.log('✅ Backend connection successful');
        } else {
            console.warn('⚠️ Backend responded but may have issues');
        }
    } catch (error) {
        console.error('❌ Backend connection test failed:', error);
        console.error('Make sure your backend server is running on', BASE_URL);
    }
}

// Initialize team button functionality
function initializeTeamButtons() {
    const makeTeamBtn = document.getElementById('make_team');
    const joinTeamBtn = document.getElementById('join_team');

    if (makeTeamBtn) {
        makeTeamBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            showCreateTeamDialog();
        });
    }

    if (joinTeamBtn) {
        joinTeamBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            showJoinTeamDialog();
        });
    }
}

// Custom dialog for creating team
function showCreateTeamDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog-overlay';
    dialog.innerHTML = `
        <div class="custom-dialog">
            <div class="dialog-header">
                <h3>Create New Project</h3>
                <button class="close-dialog">&times;</button>
            </div>
            <div class="dialog-body">
                <label for="teamNameInput">Project Name:</label>
                <input type="text" id="teamNameInput" placeholder="Enter project name" maxlength="50">
                <label for="teamDescInput">Description (Optional):</label>
                <textarea id="teamDescInput" placeholder="Describe your team" maxlength="200"></textarea>
            </div>
            <div class="dialog-footer">
                <button class="btn-secondary cancel-btn">Cancel</button>
                <button class="btn-primary create-btn">Create Project</button>
            </div>
        </div>
    `;
    
    // Add styles
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 10000; font-family: 'Montserrat', sans-serif;
    `;
    
    const dialogBox = dialog.querySelector('.custom-dialog');
    dialogBox.style.cssText = `
        background: white; border-radius: 12px; padding: 1.5rem; min-width: 400px; max-width: 500px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(dialog);
    
    // Event listeners
    dialog.querySelector('.close-dialog').onclick = () => dialog.remove();
    dialog.querySelector('.cancel-btn').onclick = () => dialog.remove();
    
    dialog.querySelector('.create-btn').onclick = async () => {
        const teamName = document.getElementById('teamNameInput').value.trim();
        const teamDesc = document.getElementById('teamDescInput').value.trim();
        
        if (!teamName) {
            showErrorDialog('Please enter a project name');
            return;
        }
        
        // Debug: Check if token exists
        const token = window.Auth ? window.Auth.getToken() : localStorage.getItem('token');
        console.log('Auth token exists:', !!token); // Debug logging
        console.log('Making request to:', `${BASE_URL}/api/teams/create`); // Debug logging
        
        try {
            const headers = window.Auth ? {
                'Content-Type': 'application/json',
                ...window.Auth.getAuthHeaders()
            } : {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            };
            
            const response = await fetch(`${BASE_URL}/api/teams/create`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({
                    name: teamName,
                    description: teamDesc || 'Project created from dashboard'
                })
            });
            
            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);
            
            // Get response text first to see what we're actually getting
            const responseText = await response.text();
            console.log('Raw response:', responseText);
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse JSON:', parseError);
                showErrorDialog(`Server returned non-JSON response: ${responseText.substring(0, 100)}...`);
                return;
            }
            
            console.log('Parsed result:', result);
            
            if (response.ok) {
                dialog.remove();
                showSuccessDialog(`Team "${teamName}" created successfully!`, `Share this code: ${result.data.teamCode}`);
                // Reload user teams to show the new project
                setTimeout(() => loadUserTeams(), 1000);
            } else {
                console.error('API Error:', result);
                showErrorDialog(`Error: ${result.message || 'Failed to create project'}`);
            }
        } catch (error) {
            console.error('Network Error creating team:', error);
            showErrorDialog(`Network Error: ${error.message}. Check if backend is running on ${BASE_URL}`);
        }
    };
    
    // Close on outside click
    dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
}

// Custom dialog for joining team
function showJoinTeamDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog-overlay';
    dialog.innerHTML = `
        <div class="custom-dialog">
            <div class="dialog-header">
                <h3>Join Project</h3>
                <button class="close-dialog">&times;</button>
            </div>
            <div class="dialog-body">
                <label for="teamCodeInput">Project Code:</label>
                <input type="text" id="teamCodeInput" placeholder="Enter 8-character project code" maxlength="8" style="text-transform: uppercase; text-align: center; font-family: monospace; font-size: 1.2em; letter-spacing: 2px;">
                <small>Enter the code shared by your project leader</small>
            </div>
            <div class="dialog-footer">
                <button class="btn-secondary cancel-btn">Cancel</button>
                <button class="btn-primary join-btn">Join Project</button>
            </div>
        </div>
    `;
    
    // Add styles
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 10000; font-family: 'Montserrat', sans-serif;
    `;
    
    const dialogBox = dialog.querySelector('.custom-dialog');
    dialogBox.style.cssText = `
        background: white; border-radius: 12px; padding: 1.5rem; min-width: 400px; max-width: 500px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(dialog);
    
    // Auto-uppercase input
    const codeInput = document.getElementById('teamCodeInput');
    codeInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });
    
    // Event listeners
    dialog.querySelector('.close-dialog').onclick = () => dialog.remove();
    dialog.querySelector('.cancel-btn').onclick = () => dialog.remove();
    
    dialog.querySelector('.join-btn').onclick = async () => {
        const teamCode = codeInput.value.trim();
        
        if (!teamCode || teamCode.length !== 8) {
            showErrorDialog('Please enter a valid 8-character project code');
            return;
        }
        
        console.log('Joining project with code:', teamCode); // Debug logging
        
        try {
            const headers = window.Auth ? {
                'Content-Type': 'application/json',
                ...window.Auth.getAuthHeaders()
            } : {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            };
            
            const response = await fetch(`${BASE_URL}/api/teams/join`, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify({ teamCode })
            });
            
            console.log('Join project response status:', response.status); // Debug logging
            
            // Get response text first to see what we're actually getting
            const responseText = await response.text();
            console.log('Join project raw response:', responseText); // Debug logging
            
            let result;
            try {
                result = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse join team JSON:', parseError);
                showErrorDialog(`Server returned non-JSON response: ${responseText.substring(0, 100)}...`);
                return;
            }
            
            console.log('Join project parsed result:', result); // Debug logging
            
            if (response.ok) {
                dialog.remove();
                showSuccessDialog(`Successfully joined project: ${result.data.team.name}!`);
                // Reload user teams to show the joined project
                setTimeout(() => loadUserTeams(), 1000);
            } else {
                showErrorDialog(`Error: ${result.error || result.message || 'Failed to join project'}`);
            }
        } catch (error) {
            console.error('Error joining team:', error);
            showErrorDialog('Error joining team. Please try again.');
        }
    };
    
    // Close on outside click
    dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
    
    // Focus on input
    setTimeout(() => codeInput.focus(), 100);
}

// Success dialog
function showSuccessDialog(title, message = '') {
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog-overlay';
    dialog.innerHTML = `
        <div class="custom-dialog success-dialog">
            <div class="dialog-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #22c55e; font-size: 1.5em;">✓</span>
                    <h3 style="color: #22c55e; margin: 0;">Success!</h3>
                </div>
                <button class="close-dialog">&times;</button>
            </div>
            <div class="dialog-body">
                <p style="margin: 0.5rem 0; font-weight: 600;">${title}</p>
                ${message ? `<p style="margin: 0.5rem 0; font-size: 0.9em; color: #666;">${message}</p>` : ''}
            </div>
            <div class="dialog-footer">
                <button class="btn-primary ok-btn">OK</button>
            </div>
        </div>
    `;
    
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 10001; font-family: 'Montserrat', sans-serif;
    `;
    
    const dialogBox = dialog.querySelector('.custom-dialog');
    dialogBox.style.cssText = `
        background: white; border-radius: 12px; padding: 1.5rem; min-width: 350px; max-width: 500px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-left: 4px solid #22c55e;
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.close-dialog').onclick = () => dialog.remove();
    dialog.querySelector('.ok-btn').onclick = () => dialog.remove();
    dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
}

// Error dialog
function showErrorDialog(message) {
    const dialog = document.createElement('div');
    dialog.className = 'custom-dialog-overlay';
    dialog.innerHTML = `
        <div class="custom-dialog error-dialog">
            <div class="dialog-header">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="color: #ef4444; font-size: 1.5em;">⚠</span>
                    <h3 style="color: #ef4444; margin: 0;">Error</h3>
                </div>
                <button class="close-dialog">&times;</button>
            </div>
            <div class="dialog-body">
                <p style="margin: 0.5rem 0;">${message}</p>
            </div>
            <div class="dialog-footer">
                <button class="btn-primary ok-btn">OK</button>
            </div>
        </div>
    `;
    
    dialog.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center;
        z-index: 10001; font-family: 'Montserrat', sans-serif;
    `;
    
    const dialogBox = dialog.querySelector('.custom-dialog');
    dialogBox.style.cssText = `
        background: white; border-radius: 12px; padding: 1.5rem; min-width: 350px; max-width: 500px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3); border-left: 4px solid #ef4444;
    `;
    
    document.body.appendChild(dialog);
    
    dialog.querySelector('.close-dialog').onclick = () => dialog.remove();
    dialog.querySelector('.ok-btn').onclick = () => dialog.remove();
    dialog.onclick = (e) => { if (e.target === dialog) dialog.remove(); };
}