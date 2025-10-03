// Profile Page Functionality

// Get API configuration from centralized config
const BASE_URL = window.API_CONFIG ? window.API_CONFIG.BASE_URL.replace('/api', '') : `http://${window.location.hostname}:5000`;

console.log('Profile App - BASE_URL:', BASE_URL);
console.log('Profile App - API_CONFIG available:', !!window.API_CONFIG);
console.log('Profile App - Auth available:', !!window.Auth);

// Profile page state
let isEditMode = false;
let originalUserData = null;
let currentUserData = null;

// Initialize profile page
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize authentication check
    if (!Auth.isAuthenticated()) {
        window.location.href = 'login.html';
        return;
    }

    // Initialize sidebar
    initializeSidebar();
    
    // Load user profile data
    await loadUserProfile();
    
    // Initialize event listeners
    initializeEventListeners();
});

// Initialize sidebar functionality
function initializeSidebar() {
    const sidebar = document.getElementById("sidebar");
    const menuBtn = document.getElementById("menuBtn");
    const closeBtn = document.getElementById("closeBtn");

    if (menuBtn) {
        menuBtn.addEventListener("click", () => sidebar.classList.add("active"));
    }
    
    if (closeBtn) {
        closeBtn.addEventListener("click", () => sidebar.classList.remove("active"));
    }

    // Initialize logout functionality
    const logoutBtn = document.querySelector('.logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to logout?')) {
                Auth.logout();
            }
        });
    }

    // Update user info in sidebar
    updateSidebarUserInfo();
}

// Update user info in sidebar
function updateSidebarUserInfo() {
    const user = Auth.getUser();
    if (user) {
        const userNameEl = document.querySelector('.user-name');
        const userRoleEl = document.querySelector('.user-role');
        
        if (userNameEl) {
            userNameEl.textContent = `${user.personalInfo?.firstName || 'User'} ${user.personalInfo?.lastName || ''}`.trim();
        }
        
        if (userRoleEl) {
            userRoleEl.textContent = user.role || 'Employee';
        }
    }
}

// Load user profile data
async function loadUserProfile() {
    try {
        showLoading(true);
        
        const headers = Auth.getAuthHeaders();
        const response = await fetch(`${BASE_URL}/api/auth/me`, {
            method: 'GET',
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        if (result.success) {
            originalUserData = result.data;
            currentUserData = JSON.parse(JSON.stringify(result.data)); // Deep copy
            populateProfileForm(currentUserData);
        } else {
            throw new Error(result.message || 'Failed to load profile');
        }
    } catch (error) {
        console.error('Error loading profile:', error);
        showMessage('Failed to load profile data. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Populate profile form with user data
function populateProfileForm(userData) {
    // Profile header
    const displayName = document.getElementById('displayName');
    const displayRole = document.getElementById('displayRole');
    const profileAvatar = document.getElementById('profileAvatar');
    
    if (displayName) {
        displayName.textContent = `${userData.personalInfo?.firstName || ''} ${userData.personalInfo?.lastName || ''}`.trim() || 'User Name';
    }
    
    if (displayRole) {
        displayRole.textContent = userData.role || 'Employee';
    }
    
    if (profileAvatar) {
        const initials = `${userData.personalInfo?.firstName?.[0] || 'U'}${userData.personalInfo?.lastName?.[0] || ''}`.toUpperCase();
        profileAvatar.innerHTML = `<i class="fa fa-user"></i>`;
        if (initials !== 'UU') {
            profileAvatar.textContent = initials;
        }
    }

    // Personal Information
    setFieldValue('firstName', userData.personalInfo?.firstName || '');
    setFieldValue('lastName', userData.personalInfo?.lastName || '');
    setFieldValue('email', userData.email || '');
    setFieldValue('phoneNumber', userData.personalInfo?.phoneNumber || '');
    setFieldValue('dateOfBirth', userData.personalInfo?.dateOfBirth ? formatDateForInput(userData.personalInfo.dateOfBirth) : '');
    setFieldValue('address', userData.personalInfo?.address || '');
    setFieldValue('location', userData.personalInfo?.location || '');

    // Work Information
    setFieldValue('employeeID', userData.workInfo?.employeeID || '');
    setFieldValue('title', userData.workInfo?.title || '');
    setFieldValue('department', userData.workInfo?.department || '');
    setFieldValue('dateOfJoining', userData.workInfo?.dateOfJoining ? formatDateForInput(userData.workInfo.dateOfJoining) : '');
    setFieldValue('experienceLevel', userData.workInfo?.experienceLevel || '');
    setFieldValue('capacityHours', userData.workInfo?.capacityHours || 40);

    // Skills
    populateSkills(userData.workInfo?.skills || []);
    
    // Current Projects
    populateCurrentProjects(userData.workInfo?.currentProjects || []);
}

// Helper function to set field values
function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.value = value;
    }
}

// Helper function to format date for input
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Populate skills display
function populateSkills(skills) {
    const skillsList = document.getElementById('skillsList');
    if (!skillsList) return;

    skillsList.innerHTML = '';
    
    skills.forEach(skill => {
        const skillTag = document.createElement('div');
        skillTag.className = 'skill-tag';
        skillTag.innerHTML = `
            <span>${skill}</span>
            ${isEditMode ? `<button type="button" class="skill-remove" onclick="removeSkill('${skill}')"><i class="fa fa-times"></i></button>` : ''}
        `;
        skillsList.appendChild(skillTag);
    });
}

// Populate current projects display
function populateCurrentProjects(projects) {
    const projectsList = document.getElementById('currentProjectsList');
    if (!projectsList) return;

    projectsList.innerHTML = '';
    
    if (projects.length === 0) {
        projectsList.innerHTML = '<div class="project-tag">No active projects</div>';
        return;
    }
    
    projects.forEach(project => {
        const projectTag = document.createElement('div');
        projectTag.className = 'project-tag';
        projectTag.textContent = project;
        projectsList.appendChild(projectTag);
    });
}

// Initialize event listeners
function initializeEventListeners() {
    console.log('Initializing event listeners...');
    
    // Edit toggle button
    const editToggleBtn = document.getElementById('editToggleBtn');
    if (editToggleBtn) {
        editToggleBtn.addEventListener('click', toggleEditMode);
        console.log('Edit toggle button initialized');
    }

    // Save button
    const saveBtn = document.getElementById('saveBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveProfile);
        console.log('Save button initialized');
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelEdit);
        console.log('Cancel button initialized');
    }

    // Change password button
    const changePasswordBtn = document.getElementById('changePasswordBtn');
    if (changePasswordBtn) {
        changePasswordBtn.addEventListener('click', openPasswordModal);
        console.log('Change password button initialized');
    } else {
        console.warn('Change password button not found');
    }

    // Password modal
    initializePasswordModal();

    // Add skill button
    const addSkillBtn = document.getElementById('addSkillBtn');
    if (addSkillBtn) {
        addSkillBtn.addEventListener('click', addSkill);
        console.log('Add skill button initialized');
    }

    // New skill input
    const newSkillInput = document.getElementById('newSkill');
    if (newSkillInput) {
        newSkillInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                addSkill();
            }
        });
        console.log('New skill input initialized');
    }
}

// Toggle edit mode
function toggleEditMode() {
    isEditMode = !isEditMode;
    
    const editToggleBtn = document.getElementById('editToggleBtn');
    const profileActions = document.getElementById('profileActions');
    
    // Update button text and icon
    if (editToggleBtn) {
        if (isEditMode) {
            editToggleBtn.innerHTML = '<i class="fa fa-eye"></i> View Mode';
            editToggleBtn.style.background = 'linear-gradient(135deg, #6b7280, #9ca3af)';
        } else {
            editToggleBtn.innerHTML = '<i class="fa fa-edit"></i> Edit Profile';
            editToggleBtn.style.background = 'linear-gradient(135deg, #1fad82, #22c55e)';
        }
    }
    
    // Show/hide action buttons
    if (profileActions) {
        profileActions.style.display = isEditMode ? 'flex' : 'none';
    }
    
    // Enable/disable form fields
    toggleFormFields(isEditMode);
    
    // Update skills display
    populateSkills(currentUserData.workInfo?.skills || []);
    
    // Show/hide skill addition controls
    const newSkillInput = document.getElementById('newSkill');
    const addSkillBtn = document.getElementById('addSkillBtn');
    
    if (newSkillInput) newSkillInput.style.display = isEditMode ? 'block' : 'none';
    if (addSkillBtn) addSkillBtn.style.display = isEditMode ? 'flex' : 'none';
}

// Toggle form fields readonly/editable
function toggleFormFields(editable) {
    const fields = [
        'firstName', 'lastName', 'phoneNumber', 'dateOfBirth', 'address', 'location',
        'title', 'experienceLevel', 'capacityHours'
    ];
    
    fields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            if (field.tagName === 'SELECT') {
                field.disabled = !editable;
            } else {
                field.readOnly = !editable;
            }
        }
    });
    
    // Some fields should always be readonly
    const readonlyFields = ['email', 'employeeID', 'department', 'dateOfJoining'];
    readonlyFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.readOnly = true;
        }
    });
}

// Add new skill
function addSkill() {
    const newSkillInput = document.getElementById('newSkill');
    if (!newSkillInput) return;
    
    const skill = newSkillInput.value.trim();
    if (!skill) {
        showMessage('Please enter a skill name.', 'error');
        return;
    }
    
    if (!currentUserData.workInfo) {
        currentUserData.workInfo = {};
    }
    
    if (!currentUserData.workInfo.skills) {
        currentUserData.workInfo.skills = [];
    }
    
    if (currentUserData.workInfo.skills.includes(skill)) {
        showMessage('This skill is already added.', 'error');
        return;
    }
    
    currentUserData.workInfo.skills.push(skill);
    populateSkills(currentUserData.workInfo.skills);
    newSkillInput.value = '';
}

// Remove skill
function removeSkill(skill) {
    if (!currentUserData.workInfo?.skills) return;
    
    currentUserData.workInfo.skills = currentUserData.workInfo.skills.filter(s => s !== skill);
    populateSkills(currentUserData.workInfo.skills);
}

// Save profile changes
async function saveProfile() {
    try {
        showLoading(true);
        
        // Collect form data
        const formData = collectFormData();
        
        // Validate required fields
        if (!validateFormData(formData)) {
            return;
        }
        
        // Update current user data
        updateCurrentUserData(formData);
        
        // Send update request
        const headers = Auth.getAuthHeaders();
        const response = await fetch(`${BASE_URL}/api/auth/update-profile`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify(currentUserData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            // Update stored user data
            Auth.setUser(result.data);
            
            // Update original data
            originalUserData = JSON.parse(JSON.stringify(result.data));
            
            // Exit edit mode
            isEditMode = false;
            toggleEditMode();
            
            // Update sidebar
            updateSidebarUserInfo();
            
            showMessage('Profile updated successfully!', 'success');
        } else {
            throw new Error(result.message || 'Failed to update profile');
        }
    } catch (error) {
        console.error('Error saving profile:', error);
        showMessage('Failed to save profile. Please try again.', 'error');
    } finally {
        showLoading(false);
    }
}

// Collect form data
function collectFormData() {
    return {
        personalInfo: {
            firstName: document.getElementById('firstName').value.trim(),
            lastName: document.getElementById('lastName').value.trim(),
            phoneNumber: document.getElementById('phoneNumber').value.trim(),
            dateOfBirth: document.getElementById('dateOfBirth').value,
            address: document.getElementById('address').value.trim(),
            location: document.getElementById('location').value.trim()
        },
        workInfo: {
            title: document.getElementById('title').value.trim(),
            experienceLevel: document.getElementById('experienceLevel').value,
            capacityHours: parseInt(document.getElementById('capacityHours').value) || 40,
            skills: currentUserData.workInfo?.skills || []
        }
    };
}

// Validate form data
function validateFormData(formData) {
    const { personalInfo, workInfo } = formData;
    
    if (!personalInfo.firstName) {
        showMessage('First name is required.', 'error');
        return false;
    }
    
    if (!personalInfo.lastName) {
        showMessage('Last name is required.', 'error');
        return false;
    }
    
    if (!personalInfo.location) {
        showMessage('Location is required.', 'error');
        return false;
    }
    
    if (workInfo.capacityHours < 0 || workInfo.capacityHours > 80) {
        showMessage('Capacity hours must be between 0 and 80.', 'error');
        return false;
    }
    
    return true;
}

// Update current user data with form data
function updateCurrentUserData(formData) {
    // Update personal info
    Object.assign(currentUserData.personalInfo, formData.personalInfo);
    
    // Update work info
    Object.assign(currentUserData.workInfo, formData.workInfo);
}

// Cancel edit mode
function cancelEdit() {
    // Restore original data
    currentUserData = JSON.parse(JSON.stringify(originalUserData));
    
    // Repopulate form
    populateProfileForm(currentUserData);
    
    // Exit edit mode
    isEditMode = false;
    toggleEditMode();
    
    showMessage('Changes cancelled.', 'info');
}

// Initialize password modal
function initializePasswordModal() {
    console.log('Initializing password modal...');
    
    const passwordModalOverlay = document.getElementById('passwordModalOverlay');
    const passwordModalCloseBtn = document.getElementById('passwordModalCloseBtn');
    const cancelPasswordBtn = document.getElementById('cancelPasswordBtn');
    const updatePasswordBtn = document.getElementById('updatePasswordBtn');
    
    console.log('Modal elements found:', {
        overlay: !!passwordModalOverlay,
        closeBtn: !!passwordModalCloseBtn,
        cancelBtn: !!cancelPasswordBtn,
        updateBtn: !!updatePasswordBtn
    });
    
    // Close modal events
    [passwordModalCloseBtn, cancelPasswordBtn].forEach((btn, index) => {
        if (btn) {
            btn.addEventListener('click', closePasswordModal);
            console.log(`Modal close button ${index + 1} initialized`);
        }
    });
    
    // Close on overlay click
    if (passwordModalOverlay) {
        passwordModalOverlay.addEventListener('click', (e) => {
            if (e.target === passwordModalOverlay) {
                closePasswordModal();
            }
        });
        console.log('Modal overlay click handler initialized');
    }
    
    // Update password button
    if (updatePasswordBtn) {
        updatePasswordBtn.addEventListener('click', updatePassword);
        console.log('Update password button initialized');
    } else {
        console.warn('Update password button not found');
    }
}

// Open password modal
function openPasswordModal() {
    const passwordModalOverlay = document.getElementById('passwordModalOverlay');
    if (passwordModalOverlay) {
        // Clear form
        document.getElementById('currentPassword').value = '';
        document.getElementById('newPassword').value = '';
        document.getElementById('confirmPassword').value = '';
        
        passwordModalOverlay.style.display = 'flex';
    }
}

// Close password modal
function closePasswordModal() {
    const passwordModalOverlay = document.getElementById('passwordModalOverlay');
    if (passwordModalOverlay) {
        passwordModalOverlay.style.display = 'none';
    }
}

// Update password
async function updatePassword() {
    console.log('Change password function called');
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    console.log('Password fields:', { 
        hasCurrentPassword: !!currentPassword, 
        hasNewPassword: !!newPassword, 
        hasConfirmPassword: !!confirmPassword 
    });
    
    // Validation
    if (!currentPassword) {
        showMessage('Current password is required.', 'error');
        return;
    }
    
    if (!newPassword) {
        showMessage('New password is required.', 'error');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('New password must be at least 6 characters long.', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('New password and confirmation do not match.', 'error');
        return;
    }
    
    try {
        showLoading(true);
        
        const headers = Auth.getAuthHeaders();
        console.log('Change password request headers:', headers);
        console.log('Change password request URL:', `${BASE_URL}/api/auth/change-password`);
        
        const response = await fetch(`${BASE_URL}/api/auth/change-password`, {
            method: 'PUT',
            headers: headers,
            body: JSON.stringify({
                currentPassword,
                newPassword
            })
        });
        
        console.log('Change password response status:', response.status);
        const result = await response.json();
        console.log('Change password response:', result);
        
        if (response.ok && result.success) {
            closePasswordModal();
            showMessage('Password updated successfully!', 'success');
        } else {
            throw new Error(result.message || 'Failed to update password');
        }
    } catch (error) {
        console.error('Error updating password:', error);
        showMessage(`Failed to update password: ${error.message}`, 'error');
    } finally {
        showLoading(false);
    }
}

// Show loading state
function showLoading(show) {
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        if (show) {
            mainContent.classList.add('loading');
        } else {
            mainContent.classList.remove('loading');
        }
    }
}

// Show message
function showMessage(text, type = 'info') {
    // Remove existing message
    const existingMessage = document.querySelector('.message');
    if (existingMessage) {
        existingMessage.remove();
    }
    
    // Create new message
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `
        <i class="fa fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info'}-circle"></i>
        <span>${text}</span>
    `;
    
    // Insert at top of main content
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.insertBefore(message, mainContent.firstChild);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000);
    }
}

// Make functions available globally for onclick handlers
window.removeSkill = removeSkill;