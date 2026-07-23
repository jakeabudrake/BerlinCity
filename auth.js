const SESSION_KEYS = {
    admin: "bcrp_admin_session",
    team: "bcrp_team_session"
};

async function apiRequest(path, options = {}) {
    const response = await fetch(path, {
        headers: {
            "content-type": "application/json",
            ...(options.headers || {})
        },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    });

    const data = await response.json().catch(() => ({
        ok: false,
        message: "Serverantwort konnte nicht gelesen werden."
    }));

    if (!response.ok) {
        return { ok: false, message: data.message || "Anfrage fehlgeschlagen.", ...data };
    }

    return data;
}

function getStoredSession(key) {
    try {
        const storedValue = localStorage.getItem(key) || sessionStorage.getItem(key);
        if (storedValue && !localStorage.getItem(key)) {
            localStorage.setItem(key, storedValue);
            sessionStorage.removeItem(key);
        }
        return storedValue ? JSON.parse(storedValue) : null;
    } catch {
        return null;
    }
}

function setStoredSession(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function clearStoredSession(key) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
}

function getAdminSession() {
    return getStoredSession(SESSION_KEYS.admin);
}

function getTeamSessionLocal() {
    return getStoredSession(SESSION_KEYS.team);
}

function adminHeaders() {
    const session = getAdminSession();
    return session?.token ? { "x-admin-session": session.token } : {};
}

async function adminLogin(username, password) {
    const result = await apiRequest("/api/admin/login", {
        method: "POST",
        body: { username, password }
    });

    if (result.ok) {
        setStoredSession(SESSION_KEYS.admin, result.session);
    }

    return result;
}

async function adminLogout() {
    await apiRequest("/api/admin/logout", {
        method: "POST",
        headers: adminHeaders()
    });
    clearStoredSession(SESSION_KEYS.admin);
}

async function getAdminDashboard() {
    return apiRequest("/api/admin/dashboard", {
        method: "GET",
        headers: adminHeaders()
    });
}

async function createTeamAccount(username, password, discordUserId) {
    return apiRequest("/api/admin/accounts", {
        method: "POST",
        headers: adminHeaders(),
        body: { username, password, discordUserId }
    });
}

async function deleteTeamAccount(accountId) {
    return apiRequest(`/api/admin/accounts/${encodeURIComponent(accountId)}`, {
        method: "DELETE",
        headers: adminHeaders()
    });
}

async function teamLogin(username, password) {
    const result = await apiRequest("/api/team/login", {
        method: "POST",
        body: { username, password }
    });

    if (result.ok) {
        setStoredSession(SESSION_KEYS.team, result.session);
    }

    return result;
}

async function getTeamSession() {
    const session = getTeamSessionLocal();

    if (!session?.token) {
        return null;
    }

    const result = await apiRequest("/api/team/session", {
        method: "POST",
        body: { token: session.token }
    });

    if (!result.ok) {
        clearStoredSession(SESSION_KEYS.team);
        return null;
    }

    setStoredSession(SESSION_KEYS.team, result.session);
    return result.session;
}

async function teamLogout() {
    const session = getTeamSessionLocal();

    if (session?.token) {
        await apiRequest("/api/team/logout", {
            method: "POST",
            body: { token: session.token }
        });
    }

    clearStoredSession(SESSION_KEYS.team);
}

function formatDate(value) {
    return new Intl.DateTimeFormat("de-DE", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(new Date(value));
}
