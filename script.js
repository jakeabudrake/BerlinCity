// Discord OAuth Configuration
const DISCORD_CONFIG = {
    guildId: '1519481018221072454',
    teamRoleId: '1520102928398942348',
    appealUrl: 'https://discord.gg/QzZcAqfpJK',
    serverInvite: 'https://discord.gg/JE3pd3srNB'
};

// API Base URL - Change this to your Render.com backend URL
// For local testing: http://localhost:8080
// For production: https://your-api.onrender.com
const API_BASE = window.location.hostname.includes('github') 
    ? 'https://berlincity.onrender.com'  // Render.com backend
    : window.location.origin;

// Session Management
const SESSION_KEY = 'bcrp_discord_session';
const USER_KEY = 'bcrp_discord_user';

// DOM Elements
const discordLoginBtn = document.getElementById('discordLoginBtn');
const userProfile = document.getElementById('userProfile');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const userAvatar = document.getElementById('userAvatar');
const profileMenuBtn = document.getElementById('profileMenuBtn');
const profileMenu = document.getElementById('profileMenu');
const logoutBtn = document.getElementById('logoutBtn');
const authModal = document.getElementById('authModal');
const serverCheckModal = document.getElementById('serverCheckModal');

function getRedirectUri() {
    if (window.location.protocol === 'file:') {
        return window.location.href.split('?')[0];
    }

    const host = window.location.host;
    
    if (host.includes('github')) {
        return 'https://jakeabudrake.github.io/BerlinCity/index.html';
    }
    
    if (host.includes('localhost') || host.includes('127.0.0.1')) {
        return 'http://localhost:8080/index.html';
    }
    
    return `${window.location.origin}/index.html`;
}

function getPersistentValue(key) {
    const currentValue = localStorage.getItem(key);
    if (currentValue !== null) {
        return currentValue;
    }

    const oldValue = sessionStorage.getItem(key);
    if (oldValue !== null) {
        localStorage.setItem(key, oldValue);
        sessionStorage.removeItem(key);
    }

    return oldValue;
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
        await handleOAuthCallback(code);
    } else {
        await loadUserSession();
    }

    setupEventListeners();
});

function setupEventListeners() {
    discordLoginBtn?.addEventListener('click', initiateDiscordLogin);
    profileMenuBtn?.addEventListener('click', toggleProfileMenu);
    logoutBtn?.addEventListener('click', handleLogout);

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.profile-section')) {
            profileMenu?.classList.add('hidden');
        }
    });
}

async function initiateDiscordLogin() {
    const redirectUri = getRedirectUri();
    const scopes = ['identify', 'guilds', 'guilds.members.read', 'email'];
    const clientId = '1443275721110720654';

    console.log('Redirect URI:', redirectUri);
    console.log('Full OAuth URL will be:', `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join('+')}`);

    const authUrl = `https://discord.com/oauth2/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scopes.join('+')}`;

    window.location.href = authUrl;
}

async function handleOAuthCallback(code) {
    authModal?.classList.remove('hidden');

    try {
        const redirectUri = getRedirectUri();
        const response = await fetch(`${API_BASE}/api/auth/discord`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, redirectUri })
        });

        const data = await response.json().catch(() => null);
        if (!response.ok) {
            const message = data?.message || 'Authentication failed';
            throw new Error(message);
        }

        if (!data?.ok) {
            throw new Error(data?.message || 'Authentication failed');
        }

        saveUserSession(data.user);

        if (!data.user.isMember) {
            showServerCheckModal();
            authModal?.classList.add('hidden');
            return;
        }

        updateUserProfile(data.user);
        window.history.replaceState({}, document.title, window.location.pathname);
        authModal?.classList.add('hidden');
    } catch (error) {
        console.error('OAuth callback error:', error);
        authModal?.classList.add('hidden');
        alert('Fehler bei der Anmeldung: ' + error.message);
    }
}

async function loadUserSession() {
    const userStr = getPersistentValue(USER_KEY);
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            const membership = await checkServerMembership(user);
            if (membership && membership.isMember === false) {
                showServerCheckModal();
                clearUserSession();
                return null;
            }

            if (membership) {
                Object.assign(user, membership);
            }
            saveUserSession(user);
            updateUserProfile(user);
            return user;
        } catch (error) {
            console.error('Session load error:', error);
            clearUserSession();
        }
    }

    return null;
}

async function checkServerMembership(user) {
    try {
        const response = await fetch(`${API_BASE}/api/auth/check-membership`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ discordId: user.id })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Membership check error:', error);
        return null;
    }
}

function saveUserSession(user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(SESSION_KEY, JSON.stringify({
        token: user.accessToken,
        discordId: user.id,
        timestamp: Date.now()
    }));
}

function updateUserProfile(user) {
    userName.textContent = user.username || user.global_name || 'Benutzer';
    userAvatar.src = user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png` : '';
    userAvatar.alt = user.username || 'Avatar';

    const role = user.highestRole || 'Mitglied';
    userRole.textContent = role;

    discordLoginBtn?.classList.add('hidden');
    userProfile?.classList.remove('hidden');
}

function showServerCheckModal() {
    serverCheckModal?.classList.remove('hidden');
}

function toggleProfileMenu() {
    profileMenu?.classList.toggle('hidden');
}

function handleLogout() {
    clearUserSession();
    location.reload();
}

function clearUserSession() {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(SESSION_KEY);
    userProfile?.classList.add('hidden');
    discordLoginBtn?.classList.remove('hidden');
    profileMenu?.classList.add('hidden');
}

window.discordAuth = {
    getUser: () => {
        const userStr = getPersistentValue(USER_KEY);
        return userStr ? JSON.parse(userStr) : null;
    },
    hasRole: (roleId) => {
        const user = window.discordAuth.getUser();
        return user?.roles?.includes(roleId) || false;
    },
    hasTeamRole: () => {
        return window.discordAuth.hasRole(DISCORD_CONFIG.teamRoleId);
    },
    logout: handleLogout
};
