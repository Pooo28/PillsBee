// Configuration
const SUPABASE_URL = 'https://ceupmimkixpqjitoxmgx.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldXBtaW1raXhwcWppdG94bWd4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzcyNjEyODQsImV4cCI6MjA5MjgzNzI4NH0.eoCq0NjqQnGpgn_rpSLnZ_4jD0KV8YP3zBOUrvyklxY';

function getGroqKey() {
    return localStorage.getItem('groq_api_key') || '';
}

function saveGroqKey() {
    const key = document.getElementById('settings-groq-key').value.trim();
    if (key) {
        localStorage.setItem('groq_api_key', key);
        showToast('Groq API Key saved securely in your browser.', 'success');
    } else {
        localStorage.removeItem('groq_api_key');
        showToast('Groq API Key removed.', 'info');
    }
}
// Global State
let splashCompleted = false;
let currentUser = null;
let isForgotPasswordMode = false;
let isRecoveryMode = false;

// Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    let iconClass = 'fa-check-circle';
    if (type === 'error') iconClass = 'fa-exclamation-circle';
    if (type === 'info') iconClass = 'fa-info-circle';
    
    toast.innerHTML = `<i class="fas ${iconClass}"></i><span>${message}</span>`;
    
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastFadeOut 0.3s forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}
// FAILSAFE: Define dismissSplash at the very top
function dismissSplash() {
    console.log('Get Started clicked - Dismissing splash...');
    splashCompleted = true;
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 500);
    }
    
    // Attempt UI update, but don't let it block us
    try {
        updateUI(currentUser);
    } catch(e) {
        console.error('Splash dismissal UI error:', e);
    }
}

// Initialize Supabase
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// State
let medicines = [];
let isDarkMode = true;
let synth = window.speechSynthesis;
let currentUtterance = null;
let isVoiceEnabled = true;

function toggleVoice() {
    isVoiceEnabled = !isVoiceEnabled;
    if (!isVoiceEnabled && synth.speaking) {
        synth.cancel();
    }
    updateVoiceIcons();
}

function updateVoiceIcons() {
    const icons = document.querySelectorAll('.voice-toggle-icon');
    icons.forEach(icon => {
        icon.className = isVoiceEnabled ? 'fas fa-volume-up voice-toggle-icon' : 'fas fa-volume-mute voice-toggle-icon';
        icon.style.color = isVoiceEnabled ? 'var(--primary)' : 'var(--text-muted)';
    });
}

function speak(text) {
    if (!text || !synth || !isVoiceEnabled) return;

    // Stop any current speech
    if (synth.speaking) {
        synth.cancel();
    }

    // Aggressive cleaning for maximum clarity
    const cleanText = text
        .replace(/[*#_~`>]/g, '') // Remove markdown
        .replace(/\(.*?\)/g, '') // Remove text in parentheses (often side notes)
        .replace(/\[.*?\]/g, '') // Remove text in brackets
        .replace(/\n+/g, '. ')   // Replace newlines with pauses
        .trim();

    currentUtterance = new SpeechSynthesisUtterance(cleanText);

    // Voice selection logic
    const voices = synth.getVoices();
    // Prioritize premium/natural sounding voices
    const preferredVoice = voices.find(v =>
        (v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Natural')) &&
        v.lang.includes('en')
    ) || voices.find(v => v.lang.includes('en'));

    if (preferredVoice) currentUtterance.voice = preferredVoice;

    currentUtterance.rate = 0.95; // Slightly slower for clarity
    currentUtterance.pitch = 1.05; // Slightly higher for a friendly tone
    currentUtterance.volume = 1.0;

    synth.speak(currentUtterance);
}

// DOM Elements
const authSection = document.getElementById('auth-section');
const dashboardSection = document.getElementById('dashboard-section');
const chatbotSection = document.getElementById('chatbot-section');
const addMedSection = document.getElementById('add-med-section');
const historySection = document.getElementById('history-section');
const mainNav = document.getElementById('main-nav');
const medicineList = document.getElementById('medicine-list');
const historyList = document.getElementById('history-list');
const chatMessages = document.getElementById('chat-messages');
const loadingOverlay = document.getElementById('loading-overlay');

// Auto-initialize
initApp();

// --- Auth Functions (Supabase) ---
async function initApp() {
    console.log('Initializing PillsBee...');
    
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'flex'; // Ensure splash is visible until ready

    // Load theme preference
    const savedTheme = localStorage.getItem('pillsbee-theme');
    if (savedTheme === 'light') {
        isDarkMode = false;
        document.body.classList.remove('dark-mode');
    } else {
        isDarkMode = true;
        document.body.classList.add('dark-mode');
    }
    updateThemeIcons();

    const { data: { session } } = await db.auth.getSession();
    currentUser = session ? session.user : null;

    // Load existing Groq key to settings UI
    const groqKeyInput = document.getElementById('settings-groq-key');
    if (groqKeyInput && getGroqKey()) {
        groqKeyInput.value = getGroqKey();
    }

    db.auth.onAuthStateChange((event, session) => {
        currentUser = session ? session.user : null;
        if (event === 'PASSWORD_RECOVERY') {
            console.log('Password recovery event detected!');
            isRecoveryMode = true;
            splashCompleted = true; // Dismiss splash since we are recovering
            const overlay = document.getElementById('loading-overlay');
            if (overlay) {
                overlay.style.opacity = '0';
                setTimeout(() => {
                    overlay.style.display = 'none';
                }, 500);
            }
            showRecoveryUI();
        } else {
            if (splashCompleted) updateUI(currentUser);
        }
    });

    // Add Enter key listener for chat
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleChat();
            }
        });
    }
}

function updateUI(user) {
    if (!splashCompleted) return;
    
    const overlay = document.getElementById('loading-overlay');
    if (overlay) overlay.style.display = 'none';

    if (user) {
        authSection.classList.remove('active');
        dashboardSection.classList.add('active');
        mainNav.style.display = 'flex';

        // Update Greeting
        const hour = new Date().getHours();
        let greeting = "Good Morning";
        if (hour >= 12) greeting = "Good Afternoon";
        if (hour >= 17) greeting = "Good Evening";

        const name = user.user_metadata?.full_name || user.email.split('@')[0];
        const greetingEl = document.getElementById('user-greeting');
        if (greetingEl) greetingEl.innerText = `${greeting}, ${name}`;

        const dateEl = document.getElementById('today-date');
        if (dateEl) dateEl.innerText = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

        loadMedicines(user.id);

        if ("Notification" in window) Notification.requestPermission();
        setInterval(checkReminders, 60000);
    } else {
        authSection.classList.add('active');
        dashboardSection.classList.remove('active');
        chatbotSection.classList.remove('active');
        addMedSection.classList.remove('active');
        historySection.classList.remove('active');
        mainNav.style.display = 'none';
    }
}

let isLoginMode = true;

function toggleAuthMode(e) {
    if (e) e.preventDefault();
    
    if (isForgotPasswordMode) {
        isForgotPasswordMode = false;
        isLoginMode = true;
        // Show password group
        document.getElementById('auth-password').closest('.input-group').style.display = 'block';
        document.getElementById('auth-email').value = '';
        document.getElementById('auth-password').value = '';
    } else {
        isLoginMode = !isLoginMode;
    }
    
    document.getElementById('auth-title').innerText = isLoginMode ? 'Welcome Back!' : 'Create an Account';
    document.getElementById('auth-subtitle').innerText = isLoginMode ? 'Sign in to access your buzzing reminders.' : 'Join PillsBee for buzzing reminders.';
    document.getElementById('auth-submit-btn').innerText = isLoginMode ? 'Login' : 'Sign Up';
    document.getElementById('auth-switch-text').innerText = isLoginMode ? "Don't have an account?" : "Already have an account?";
    document.getElementById('auth-switch-link').innerText = isLoginMode ? 'Sign Up' : 'Login';
    document.getElementById('forgot-password-link').style.display = isLoginMode ? 'block' : 'none';
    document.getElementById('auth-error').style.display = 'none';
}

function togglePasswordVisibility() {
    const input = document.getElementById('auth-password');
    const icon = document.getElementById('toggle-password');
    if (input.type === 'password') {
        input.type = 'text';
        icon.classList.remove('fa-eye');
        icon.classList.add('fa-eye-slash');
    } else {
        input.type = 'password';
        icon.classList.remove('fa-eye-slash');
        icon.classList.add('fa-eye');
    }
}

async function handleEmailAuth(e) {
    e.preventDefault();
    const email = document.getElementById('auth-email').value;
    const password = document.getElementById('auth-password').value;
    const errorDiv = document.getElementById('auth-error');

    if (!isRecoveryMode && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorDiv.innerText = 'Invalid email';
        errorDiv.style.display = 'block';
        return;
    }

    if (isForgotPasswordMode) {
        errorDiv.style.display = 'none';
        const btn = document.getElementById('auth-submit-btn');
        btn.innerText = 'Sending...';
        btn.disabled = true;
        
        try {
            const { error } = await db.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            });
            if (error) throw error;
            showToast('Password reset link sent! Please check your email inbox.', 'success');
            isForgotPasswordMode = false;
            isLoginMode = true;
            toggleAuthMode();
        } catch (err) {
            errorDiv.innerText = err.message;
            errorDiv.style.display = 'block';
        } finally {
            btn.innerText = 'Send Reset Link';
            btn.disabled = false;
        }
        return;
    }

    if (password.length < 6) {
        errorDiv.innerText = 'Password too short (min 6 characters)';
        errorDiv.style.display = 'block';
        return;
    }

    errorDiv.style.display = 'none';
    const btn = document.getElementById('auth-submit-btn');
    btn.disabled = true;

    if (isRecoveryMode) {
        btn.innerText = 'Updating...';
        try {
            const { error } = await db.auth.updateUser({ password: password });
            if (error) throw error;
            showToast('Password updated successfully! You can now log in.', 'success');
            
            isRecoveryMode = false;
            isLoginMode = true;
            
            // Restore UI elements to normal login state
            document.getElementById('auth-email').closest('.input-group').style.display = 'block';
            const pwdGroup = document.getElementById('auth-password').closest('.input-group');
            pwdGroup.querySelector('label').innerText = 'Password';
            document.getElementById('auth-password').placeholder = '••••••••';
            
            document.getElementById('auth-divider').style.display = 'flex';
            document.getElementById('google-login-btn').style.display = 'flex';
            document.getElementById('auth-switch-text').style.display = 'inline';
            document.getElementById('auth-switch-link').style.display = 'inline';
            
            toggleAuthMode();
        } catch (err) {
            errorDiv.innerText = err.message;
            errorDiv.style.display = 'block';
        } finally {
            btn.innerText = 'Update Password';
            btn.disabled = false;
        }
        return;
    }

    btn.innerText = 'Please wait...';
    try {
        if (isLoginMode) {
            const { error } = await db.auth.signInWithPassword({ email, password });
            if (error) throw error;
        } else {
            const { error } = await db.auth.signUp({ email, password });
            if (error) throw error;
            showToast('Signup successful! Check your email to verify (or try logging in if auto-confirm is enabled).', 'success');
            if (!isLoginMode) toggleAuthMode();
        }
    } catch (err) {
        errorDiv.innerText = err.message;
        errorDiv.style.display = 'block';
    } finally {
        btn.innerText = isLoginMode ? 'Login' : 'Sign Up';
        btn.disabled = false;
    }
}

function handleForgotPassword(e) {
    if (e) e.preventDefault();
    isForgotPasswordMode = true;
    isLoginMode = false;
    
    document.getElementById('auth-title').innerText = 'Reset Password';
    document.getElementById('auth-subtitle').innerText = 'Enter your email to receive a password reset link.';
    
    // Hide password field
    document.getElementById('auth-password').closest('.input-group').style.display = 'none';
    
    document.getElementById('auth-submit-btn').innerText = 'Send Reset Link';
    document.getElementById('auth-switch-text').innerText = 'Remember your password?';
    document.getElementById('auth-switch-link').innerText = 'Login';
    document.getElementById('forgot-password-link').style.display = 'none';
    document.getElementById('auth-error').style.display = 'none';
}

function showRecoveryUI() {
    authSection.classList.add('active');
    dashboardSection.classList.remove('active');
    chatbotSection.classList.remove('active');
    addMedSection.classList.remove('active');
    historySection.classList.remove('active');
    mainNav.style.display = 'none';

    document.getElementById('auth-title').innerText = 'Set New Password';
    document.getElementById('auth-subtitle').innerText = 'Please enter your new password below.';
    
    // Hide email group
    document.getElementById('auth-email').closest('.input-group').style.display = 'none';
    
    // Configure password group
    const pwdGroup = document.getElementById('auth-password').closest('.input-group');
    pwdGroup.style.display = 'block';
    pwdGroup.querySelector('label').innerText = 'New Password';
    document.getElementById('auth-password').value = '';
    document.getElementById('auth-password').placeholder = 'Enter new password';
    
    document.getElementById('auth-submit-btn').innerText = 'Update Password';
    
    // Hide Google, divider, Switch text & links
    document.getElementById('forgot-password-link').style.display = 'none';
    document.getElementById('auth-divider').style.display = 'none';
    document.getElementById('google-login-btn').style.display = 'none';
    document.getElementById('auth-switch-text').style.display = 'none';
    document.getElementById('auth-switch-link').style.display = 'none';
    document.getElementById('auth-error').style.display = 'none';
}

async function handleGoogleLogin() {
    const { error } = await db.auth.signInWithOAuth({
        provider: 'google',
        options: {
            redirectTo: window.location.origin + window.location.pathname
        }
    });
    if (error) {
        console.error('Login error:', error.message);
        showToast('Failed to sign in with Google: ' + error.message, 'error');
    }
}

async function handleLogout() {
    await db.auth.signOut();
}

// Start Initialization
initApp();

// --- UI Functions ---
function switchTab(tabId) {
    const sections = ['splash-section', 'auth-section', 'dashboard-section', 'chatbot-section', 'add-med-section', 'history-section', 'settings-section', 'med-info-section'];
    sections.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.remove('active');
    });

    const activeSection = document.getElementById(`${tabId}-section`);
    if (activeSection) activeSection.classList.add('active');

    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => item.classList.remove('active'));
    if (tabId === 'dashboard') {
        navItems[0].classList.add('active');
        if (currentUser) loadMedicines(currentUser.id); // Aggressive refresh on tab switch
    }
    if (tabId === 'history') {
        navItems[1].classList.add('active');
        switchHistoryTab('pills'); // Default
        loadHistory(); // Aggressive refresh
    }
    if (tabId === 'add-med') navItems[2].classList.add('active');
    if (tabId === 'chatbot') {
        navItems[3].classList.add('active');
        loadChatHistory();
    }
    if (tabId === 'settings') navItems[4].classList.add('active');
}

async function showMedicineInfo(medId) {
    const med = medicines.find(m => m.id === medId);
    if (!med) return;

    // Switch to the separate Info screen
    switchTab('med-info');
    document.getElementById('info-med-name').innerText = med.name;

    // Reset to loading state
    const fields = ['med-usage-text', 'med-dosage-text', 'med-side-effects-text', 'med-timing-text'];
    fields.forEach(f => document.getElementById(f).innerText = 'Analyzing with AI...');

    // Setup Chatbot shortcut button
    document.getElementById('ask-ai-med-btn').onclick = () => {
        switchTab('chatbot');
        const input = document.getElementById('chat-input');
        if (input) {
            input.value = `Tell me more about ${med.name}. What are the key precautions?`;
            handleChat();
        }
    };

    // AI Fetching Logic using Groq
    try {
        const apiKey = getGroqKey();
        if (!apiKey) {
            throw new Error("Please set your Groq API Key in Settings first.");
        }

        const prompt = `Provide medical information for "${med.name}" in a strictly valid JSON format. 
        Structure: { 
            "usage": "Brief explanation of what this medicine is used for", 
            "dosage": "Typical dosage instructions", 
            "side_effects": "Common side effects to watch for", 
            "timing": "When to take (e.g., before/after food, morning/night)" 
        }. 
        Keep descriptions short (1-2 sentences each). DISCLAIMER: Always mention to consult a doctor.`;

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama3-8b-8192',
                messages: [{ role: 'user', content: prompt }],
                response_format: { type: "json_object" }
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error?.message || "API request failed");
        }

        const resData = await response.json();
        const content = JSON.parse(resData.choices[0].message.content);

        document.getElementById('med-usage-text').innerText = content.usage || 'Details not available.';
        document.getElementById('med-dosage-text').innerText = content.dosage || med.dosage || 'Check prescription.';
        document.getElementById('med-side-effects-text').innerText = content.side_effects || 'Consult your pharmacist.';
        document.getElementById('med-timing-text').innerText = content.timing || 'As prescribed.';

        // Speak the summary
        speak(`${med.name} is used for ${content.usage}. The dosage is ${content.dosage}.`);

    } catch (e) {
        console.error('AI Fetch Error:', e);
        fields.forEach(f => document.getElementById(f).innerText = 'Consult your doctor for precise details.');
    }
}

function closeModal() {
    document.getElementById('medicine-info-modal').style.display = 'none';
}

async function loadHistory() {
    const { data: { session } } = await db.auth.getSession();
    const user = session?.user;
    if (!user) return;

    const { data, error } = await db.from('history').select('*').eq('user_id', user.id).order('taken_at', { ascending: false });
    if (error) return historyList.innerHTML = '<p>Error loading history.</p>';

    if (data.length === 0) {
        historyList.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No history recorded yet.</p>';
        return;
    }

    historyList.innerHTML = data.map(h => {
        const date = new Date(h.taken_at);
        return `
        <div class="card glass history-item" style="animation: slideIn 0.3s ease; margin-bottom: 12px; display: flex; align-items: center; gap: 15px; padding: 15px;">
            <div style="background:var(--success); width:45px; height:45px; border-radius:14px; display:flex; justify-content:center; align-items:center; color:white; flex-shrink:0;">
                <i class="fas fa-check-circle" style="font-size:1.2rem;"></i>
            </div>
            <div style="flex:1;">
                <h4 style="margin:0; font-size:1rem; font-weight: 700;">${h.medicine_name}</h4>
                <p style="margin:3px 0 0; font-size:0.85rem; color:var(--text-muted); font-weight:500;">
                    ${h.dosage || 'N/A'} • <span style="color:var(--primary);">Qty Left: ${h.remaining_quantity || h.remaining || 'N/A'}</span>
                </p>
                <p style="margin:4px 0 0; font-size:0.75rem; color:var(--text-muted); opacity: 0.8;">
                    ${date.toLocaleDateString()} at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
            </div>
            <div style="display:flex; align-items:center; gap:10px;">
                <div class="status-badge status-taken">Taken</div>
                <i class="fas fa-trash-alt" onclick="deleteHistory('${h.id}')" style="cursor:pointer; color:var(--error); opacity:0.5; padding:5px; transition:0.3s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.5" title="Delete Record"></i>
            </div>
        </div>
    `}).join('');
}

// Aggressive Auto-Refresh Logic
window.addEventListener('focus', () => {
    if (currentUser) {
        console.log('App Focused: Syncing data...');
        loadMedicines(currentUser.id);
        loadHistory();
        loadChatHistory();
    }
});

document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentUser) {
        console.log('App Visible: Syncing data...');
        loadMedicines(currentUser.id);
    }
});

function toggleTheme() {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode', isDarkMode);
    updateThemeIcons();
    localStorage.setItem('pillsbee-theme', isDarkMode ? 'dark' : 'light');
}

function updateThemeIcons() {
    const icons = document.querySelectorAll('.fa-moon, .fa-sun, .fa-circle-half-stroke');
    icons.forEach(icon => {
        if (isDarkMode) {
            icon.classList.remove('fa-sun', 'fa-circle-half-stroke');
            icon.classList.add('fa-moon');
        } else {
            icon.classList.remove('fa-moon', 'fa-circle-half-stroke');
            icon.classList.add('fa-sun');
        }
    });
}

// --- Medicine Functions ---
let todayHistory = [];

async function loadMedicines(userId) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [medsRes, histRes] = await Promise.all([
        db.from('medicines').select('*').eq('user_id', userId),
        db.from('history').select('medicine_id').eq('user_id', userId).gte('taken_at', today.toISOString())
    ]);

    if (!medsRes.error) medicines = medsRes.data;
    if (!histRes.error) todayHistory = histRes.data.map(h => h.medicine_id);

    renderMedicines();
}

function renderMedicines() {
    const alertDiv = document.getElementById('refill-alert');
    const alertText = document.getElementById('refill-alert-text');

    // Check for low stock
    const lowStockMed = medicines.find(m => m.remaining_quantity <= 2);
    if (lowStockMed && alertDiv) {
        alertDiv.style.display = 'block';
        alertText.innerText = `${lowStockMed.name} is running low (${lowStockMed.remaining_quantity} left)`;
    } else if (alertDiv) {
        alertDiv.style.display = 'none';
    }

    if (medicines.length === 0) {
        medicineList.innerHTML = `
            <div class="glass card" style="text-align:center; padding:40px 20px; border:2px dashed rgba(255,255,255,0.1); margin-top: 20px;">
                <i class="fas fa-pills" style="font-size:3rem; color:var(--text-muted); opacity:0.3; margin-bottom:15px;"></i>
                <p style="color:var(--text-muted); margin-bottom:20px; font-size:1.1rem;">Your medicine schedule is empty.</p>
                <button class="btn btn-primary" onclick="switchTab('add-med')" style="max-width:200px; margin:0 auto; border-radius:30px;">Add First Medicine</button>
            </div>
        `;
        return;
    }

    medicineList.innerHTML = medicines.map(med => {
        // --- Multi-Dose Daily Logic ---
        const todayCount = todayHistory.filter(id => id === med.id).length;
        const totalDaily = (med.times && Array.isArray(med.times)) ? med.times.length : 1;
        const isDone = todayCount >= totalDaily;

        return `
            <div class="card glass med-card" onclick="showMedicineInfo('${med.id}')" style="margin-bottom:12px; display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; opacity: ${isDone ? '0.7' : '1'}; transition: all 0.3s ease; min-height: 90px; border-radius: 22px;">
                <div style="display: flex; align-items: center; gap: 18px; flex: 1; min-width: 0;">
                    <div class="med-icon" style="flex-shrink:0; width:54px; height:54px; font-size:1.3rem; background: ${isDone ? 'var(--success)' : 'rgba(138, 79, 255, 0.1)'}; color: ${isDone ? 'white' : 'var(--primary)'}; border-radius: 18px; display: flex; justify-content: center; align-items: center; box-shadow: 0 4px 15px rgba(0,0,0,0.05);">
                        <i class="fas fa-${isDone ? 'check-double' : 'pills'}"></i>
                    </div>
                    <div class="med-info" style="min-width: 0;">
                        <h3 style="margin:0; font-size:1.15rem; font-weight:800; text-decoration: ${isDone ? 'line-through' : 'none'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-color);">${med.name}</h3>
                        <div style="display: flex; align-items: center; gap: 8px; margin-top: 5px;">
                            <i class="far fa-clock" style="font-size: 0.8rem; color: var(--text-muted);"></i>
                            <p style="margin:0; font-size:0.9rem; color:var(--text-muted); font-weight:600;">${med.time || (med.times && med.times[0]) || 'Daily'}</p>
                        </div>
                    </div>
                </div>
                <div class="actions" style="display: flex; align-items: center; gap: 14px; flex-shrink: 0;" onclick="event.stopPropagation()">
                    ${isDone ? `
                        <div style="height: 50px; background: rgba(0, 200, 83, 0.1); color: var(--success); padding: 0 22px; border-radius: 16px; font-size: 0.9rem; font-weight: 800; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(0, 200, 83, 0.2); white-space: nowrap;">
                            <i class="fas fa-check-circle" style="font-size: 1.1rem;"></i> All Done
                        </div>
                    ` : `
                        <button class="btn btn-primary" onclick="markAsTaken('${med.id}')" style="height: 50px; padding: 0 25px; border-radius: 16px; font-size: 0.9rem; width:auto; background: var(--primary); color: white; border: none; font-weight: 800; box-shadow: 0 6px 20px rgba(138, 79, 255, 0.3); cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fas fa-plus"></i> Taken (${todayCount}/${totalDaily})
                        </button>
                    `}
                    <button class="btn glass" onclick="deleteMedicine('${med.id}')" style="width: 50px; height: 50px; border-radius: 16px; color: var(--error); border: 1px solid rgba(255, 75, 75, 0.2); background: rgba(255, 75, 75, 0.05); display: flex; justify-content: center; align-items: center; cursor: pointer; transition: 0.2s;" onmouseover="this.style.background='rgba(255, 75, 75, 0.1)'" onmouseout="this.style.background='rgba(255, 75, 75, 0.05)'" title="Delete Medicine">
                        <i class="fas fa-trash-alt" style="font-size: 1.1rem;"></i>
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

async function deleteHistory(historyId) {
    if (!confirm('Delete this history record?')) return;

    try {
        const { error } = await db.from('history').delete().eq('id', historyId);
        if (error) throw error;

        loadHistory();
    } catch (err) {
        console.error('Error deleting history:', err.message);
        showToast('Failed to delete record: ' + err.message, 'error');
    }
}

async function markAsTaken(medId) {
    const medIndex = medicines.findIndex(m => m.id === medId);
    if (medIndex === -1) return;
    const med = medicines[medIndex];

    // --- Hard Dose Limit Check ---
    const todayCount = todayHistory.filter(id => id === medId).length;
    const totalDaily = (med.times && Array.isArray(med.times)) ? med.times.length : 1;
    
    if (todayCount >= totalDaily) {
        console.log('Daily limit reached for this medicine.');
        return; 
    }

    // --- Optimistic UI Update ---
    // Save old state for fallback
    const oldQty = med.remaining_quantity;
    const wasTaken = todayHistory.includes(medId);

    // Apply changes locally
    todayHistory.push(medId);
    medicines[medIndex].remaining_quantity = Math.max(0, oldQty - 1);
    renderMedicines();

    try {
        const { error: histError } = await db.from('history').insert({
            user_id: currentUser.id,
            medicine_id: med.id,
            medicine_name: med.name,
            dosage: med.dosage,
            remaining: Math.max(0, oldQty - 1),
            taken_at: new Date().toISOString()
        });

        if (histError) throw histError;

        const { error: updateError } = await db.from('medicines')
            .update({ remaining_quantity: Math.max(0, oldQty - 1) })
            .eq('id', med.id);

        if (updateError) throw updateError;

        // Background sync to ensure everything is perfect
        loadMedicines(currentUser.id);
    } catch (err) {
        console.error('Sync Error:', err.message);
        // Fallback: Revert local state if DB fails
        todayHistory = todayHistory.filter(id => id !== medId);
        medicines[medIndex].remaining_quantity = oldQty;
        renderMedicines();
        showToast('Failed to save to server: ' + err.message, 'error');
    }
}



async function refillMedicine(id) {
    const { data: { session } } = await db.auth.getSession();
    const user = session?.user;
    const med = medicines.find(m => m.id === id);
    if (!med) return;

    if (confirm(`Refill ${med.name} to ${med.total_quantity}?`)) {
        const { error } = await db.from('medicines').update({ remaining_quantity: med.total_quantity }).eq('id', id);
        if (!error && user) loadMedicines(user.id);
    }
}

// --- Reminders ---
function checkReminders() {
    const now = new Date();
    const currentTime = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');

    medicines.forEach(med => {
        if (med.time === currentTime) {
            showNotification(med);
        }
    });
}

function showNotification(med) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification("PillsBee Reminder", {
            body: `It's time to take your ${med.name} (${med.dosage})`,
            icon: 'https://cdn-icons-png.flaticon.com/512/883/883356.png'
        });
    }

    if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(`Hello! It's time to take your ${med.name}, ${med.dosage}.`);
        window.speechSynthesis.speak(utterance);
    }
}

// --- OCR & Camera Logic ---
let ocrData = null;
let stream = null;

function addTimeSlot() {
    const container = document.getElementById('time-slots-container');
    const input = document.createElement('input');
    input.type = 'time';
    input.className = 'med-time-input glass';
    input.style.width = '100%';
    input.style.padding = '14px';
    input.style.borderRadius = '12px';
    input.style.border = '1px solid rgba(255,255,255,0.1)';
    input.style.marginBottom = '8px';
    input.style.background = 'transparent';
    input.style.color = 'inherit';
    container.appendChild(input);
}

async function startCamera() {
    const container = document.getElementById('camera-container');
    const video = document.getElementById('camera-stream');
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = stream;
        container.style.display = 'block';
    } catch (e) {
        console.error('Camera error:', e);
        document.getElementById('ocr-input').click();
    }
}

function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(t => t.stop());
        stream = null;
    }
    document.getElementById('camera-container').style.display = 'none';
}

async function capturePhoto() {
    const video = document.getElementById('camera-stream');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg'));
    const file = new File([blob], "capture.jpg", { type: "image/jpeg" });
    stopCamera();
    processOCR(file);
}

async function handleOCR(input) {
    if (!input.files || !input.files[0]) return;
    processOCR(input.files[0]);
}

async function processOCR(file) {
    const status = document.getElementById('ocr-status');
    status.style.display = 'block';

    try {
        if (typeof Tesseract === 'undefined') {
            await new Promise((resolve, reject) => {
                const script = document.createElement('script');
                script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            });
        }

        const result = await Tesseract.recognize(file, 'eng');
        ocrData = result.data.text;

        document.getElementById('ocr-text-result').innerText = ocrData;
        const reader = new FileReader();
        reader.onload = e => document.getElementById('ocr-captured-image').style.backgroundImage = `url(${e.target.result})`;
        reader.readAsDataURL(file);

        document.getElementById('ocr-modal').style.display = 'block';
    } catch (e) {
        console.error('OCR Error:', e);
        showToast('Failed to scan prescription.', 'error');
    } finally {
        status.style.display = 'none';
    }
}

function useOCRData() {
    if (!ocrData) return;
    const lines = ocrData.split('\n').filter(l => l.trim().length > 3);
    if (lines.length > 0) {
        document.getElementById('med-name').value = lines[0].trim();
        const dosageMatch = ocrData.match(/\d+\s*(mg|g|ml|tab|pill|mcg)/i);
        if (dosageMatch) document.getElementById('med-dosage').value = dosageMatch[0];
    }
    closeOCRModal();
}

function closeOCRModal() {
    document.getElementById('ocr-modal').style.display = 'none';
}

async function deleteMedicine(medId) {
    if (!confirm('Are you sure you want to delete this medicine? This will remove all its records.')) return;

    try {
        const { error } = await db.from('medicines').delete().eq('id', medId);
        if (error) throw error;

        loadMedicines(currentUser.id);
    } catch (err) {
        console.error('Error deleting medicine:', err.message);
        showToast('Failed to delete: ' + err.message, 'error');
    }
}

async function handleAddMedicine() {
    if (!currentUser) {
        showToast('Please login first', 'error');
        return;
    }

    const name = document.getElementById('med-name').value;
    const dosage = document.getElementById('med-dosage').value;
    const frequency = document.getElementById('med-frequency').value;
    const qty = parseInt(document.getElementById('med-qty').value);
    const expiry = document.getElementById('med-expiry').value;
    const voiceEnabled = document.getElementById('med-voice-toggle').checked;

    const timeInputs = document.querySelectorAll('.med-time-input');
    const times = Array.from(timeInputs).map(input => input.value).filter(t => t);

    if (!name || times.length === 0 || !qty) {
        showToast('Please fill in Name, at least one Time, and Quantity.', 'error');
        return;
    }

    try {
        const { error } = await db.from('medicines').insert({
            user_id: currentUser.id,
            name,
            dosage,
            frequency,
            time: times.join(', '), // Store as comma-separated string
            total_quantity: qty,
            remaining_quantity: qty,
            expiry_date: expiry || null,
            voice_enabled: voiceEnabled
        });

        if (error) throw error;

        switchTab('dashboard');
        loadMedicines(currentUser.id);
        // Reset form
        document.getElementById('med-name').value = '';
        document.getElementById('med-dosage').value = '';
        document.getElementById('time-slots-container').innerHTML = '<input type="time" class="med-time-input glass" style="width:100%; padding:14px; border-radius:12px; border:1px solid rgba(255,255,255,0.1); margin-bottom:8px; background:transparent; color:inherit;">';
    } catch (error) {
        showToast('Error: ' + error.message, 'error');
    }
}

async function switchHistoryTab(subTab) {
    const pillsView = document.getElementById('pills-history-view');
    const chatsView = document.getElementById('chats-history-view');
    const pillsTab = document.getElementById('hist-tab-pills');
    const chatsTab = document.getElementById('hist-tab-chats');

    if (subTab === 'pills') {
        pillsView.style.display = 'block';
        chatsView.style.display = 'none';
        pillsTab.style.background = 'var(--primary)';
        pillsTab.style.color = 'white';
        chatsTab.style.background = 'transparent';
        chatsTab.style.color = 'inherit';
        loadHistory();
    } else {
        pillsView.style.display = 'none';
        chatsView.style.display = 'block';
        chatsTab.style.background = 'var(--primary)';
        chatsTab.style.color = 'white';
        pillsTab.style.background = 'transparent';
        pillsTab.style.color = 'inherit';
        loadChatArchive();
    }
}

async function loadChatArchive() {
    const list = document.getElementById('chat-archive-list');
    list.innerHTML = '<div style="text-align:center; padding:20px;"><i class="fas fa-spinner fa-spin"></i> Loading archive...</div>';

    const { data, error } = await db.from('chat_history')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false });

    if (error || data.length === 0) {
        list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:20px;">No archived chats found.</p>';
        return;
    }

    list.innerHTML = data.map(chat => {
        const date = new Date(chat.created_at);
        const isBot = chat.role === 'bot';
        return `
            <div class="card glass" style="margin-bottom: 15px; border-left: 4px solid ${isBot ? 'var(--primary)' : 'var(--accent)'}; padding: 20px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-size: 0.75rem; font-weight: 700; color: ${isBot ? 'var(--primary)' : 'var(--accent)'}; text-transform: uppercase;">
                        ${isBot ? 'AI Response' : 'Your Question'}
                    </span>
                    <span style="font-size: 0.7rem; color: var(--text-muted);">
                        ${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
                <p style="font-size: 0.95rem; line-height: 1.5; margin: 0;">${chat.content}</p>
            </div>
        `;
    }).join('');
}

async function clearChatHistory() {
    if (!confirm('Are you sure you want to clear your entire chat history archive? This cannot be undone.')) return;

    try {
        const { error } = await db.from('chat_history').delete().eq('user_id', currentUser.id);
        if (error) throw error;

        chatMessages.innerHTML = '<div class="message bot">History cleared. How can I help you today?</div>';
        showToast('Chat history cleared successfully.', 'success');
    } catch (err) {
        console.error('Error clearing history:', err.message);
        showToast('Failed to clear history.', 'error');
    }
}

// --- Chatbot Logic (With Archive) ---
async function loadChatHistory() {
    const { data: { session } } = await db.auth.getSession();
    const user = session?.user;
    if (!user) return;

    try {
        const { data, error } = await db.from('chat_history')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
            chatMessages.innerHTML = '';
            data.forEach(msg => {
                addMessage(msg.content, msg.role);
            });
        }
    } catch (err) {
        console.error('Archive Load Error:', err);
        const list = document.getElementById('chat-archive-list');
        if (list) list.innerHTML = `<p style="color:var(--error); padding:20px;">Error loading archive: ${err.message}</p>`;
    }
}

async function handleChat() {
    if (!currentUser) {
        showToast('Please log in to chat.', 'error');
        return;
    }
    const input = document.getElementById('chat-input');
    const text = input.value.trim();
    if (!text) return;

    const { data: { session } } = await db.auth.getSession();
    const user = session?.user;

    if (!user) {
        alert('Please log in to chat.');
        return;
    }

    // Save user message to Archive
    const { error: userSaveError } = await db.from('chat_history').insert({
        user_id: user.id,
        role: 'user',
        content: text
    });

    if (userSaveError) {
        console.error('Failed to save user message:', userSaveError);
        // If the table doesn't exist, we should inform the user
        if (userSaveError.code === '42P01') {
            addMessage('⚠️ Database table "chat_history" not found. Please ensure your Supabase schema is set up.', 'bot');
        } else {
            addMessage(`⚠️ Archive Error: ${userSaveError.message}`, 'bot');
        }
    }

    addMessage(text, 'user');
    input.value = '';
    const loadingId = addMessage('Thinking...', 'bot', true);
    const loadingEl = document.getElementById(loadingId);

    try {
        const apiKey = getGroqKey();
        if (!apiKey) {
            throw new Error("API Key missing. Please set your Groq API Key in Settings.");
        }

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: 'llama-3.1-8b-instant',
                messages: [
                    { role: 'system', content: 'You are PillsBee, a professional medical assistant. Always remind users: "Consult your doctor for medical advice." Keep responses helpful, empathetic, and concise.' },
                    { role: 'user', content: text }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `API Error (${response.status})`);
        }

        const data = await response.json();
        if (data.choices && data.choices[0]) {
            const botResponse = data.choices[0].message.content;
            loadingEl.innerText = botResponse;

            // Speak the answer
            speak(botResponse);

            // Save bot response to Archive
            const { error: botSaveError } = await db.from('chat_history').insert({
                user_id: user.id,
                role: 'bot',
                content: botResponse
            });

            if (botSaveError) {
                console.error('Failed to save bot response:', botSaveError);
            }
        } else {
            throw new Error('No response from AI.');
        }
    } catch (e) {
        console.error('Chat Error:', e);
        loadingEl.innerHTML = `<span style="color:var(--error); font-size: 0.85rem;">⚠️ ${e.message}</span>`;
    }
}

function addMessage(text, role, isTemp = false) {
    const id = isTemp ? 'temp-' + Date.now() : '';
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${role}`;
    if (id) msgDiv.id = id;
    msgDiv.innerText = text;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return id;
}
