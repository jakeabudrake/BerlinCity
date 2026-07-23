// Team Page Script
const TEAM_ROLE_ID = '1520102928398942348';
const SERVER_INVITE = 'https://discord.gg/JE3pd3srNB';
const APPEAL_INVITE = 'https://discord.gg/QzZcAqfpJK';
const TEAM_KEY_SESSION = 'bcrp_team_key_session';

document.addEventListener('DOMContentLoaded', async () => {
    const user = window.discordAuth.getUser();
    const loginRequired = document.getElementById('loginRequired');
    const teamDashboard = document.getElementById('teamDashboard');
    const teamOnlySection = document.getElementById('teamOnlySection');
    const noTeamRoleSection = document.getElementById('noTeamRoleSection');
    const noServerAccessSection = document.getElementById('noServerAccessSection');
    const welcomeText = document.getElementById('welcomeText');

    const teamAccessForm = document.getElementById('teamAccessForm');
    const teamAccessKey = document.getElementById('teamAccessKey');

    if (getTeamAccessGranted()) {
        showTeamDashboard('Schlüsselzugang');
    } else if (!user) {
        showLoginRequired();
    } else if (!user.isMember) {
        showNoServerAccess();
    } else {
        showTeamDashboard(user.username || 'Discord-Benutzer');
    }

    teamAccessForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        fetch(`${API_BASE}/api/team/key-login`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ key: teamAccessKey?.value || '' })
        })
            .then((response) => response.json())
            .then((data) => {
                if (!data.ok) {
                    alert(data.message || 'Falscher Team-Key. Bitte versuche es erneut.');
                    return;
                }
                localStorage.setItem('teamAccessGranted', 'true');
                localStorage.setItem(TEAM_KEY_SESSION, JSON.stringify(data.session));
                showTeamDashboard('Schlüsselzugang');
                teamAccessKey.value = '';
            })
            .catch(() => alert('Der Team-Key konnte nicht geprüft werden.'));
    });

    const loginRequiredBtn = document.getElementById('loginRequiredBtn');
    if (loginRequiredBtn) {
        loginRequiredBtn.addEventListener('click', () => {
            document.getElementById('discordLoginBtn')?.click();
        });
    }

    document.getElementById('teamQuickLinks')?.addEventListener('click', (e) => {
        const btn = e.target.closest('button[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');
        if (action === 'kontakt') {
            alert('Kontakt: Schreibe der Leitung auf Discord.');
        } else if (action === 'handbuch') {
            window.open('team.html#handbook', '_blank');
        } else if (action === 'onboarding') {
            window.open('team.html#onboarding', '_blank');
        } else if (action === 'support') {
            window.open('team-management.html', '_blank');
        }
    });

    const discordMessageForm = document.getElementById('discordMessageForm');
    const discordGuildForm = document.getElementById('discordGuildForm');
    const discordActionStatus = document.getElementById('discordActionStatus');

    discordMessageForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const channelId = document.getElementById('discordChannelId')?.value?.trim();
        const content = document.getElementById('discordMessageContent')?.value?.trim();
        if (!channelId || !content) return;

        discordActionStatus.innerHTML = '<strong>Wird gesendet...</strong><small>Bitte kurz warten.</small>';

        try {
            const response = await fetch(`${API_BASE}/api/discord/send-message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ channelId, content })
            });
            const data = await response.json();
            discordActionStatus.innerHTML = `<strong>${data.ok ? 'Gesendet' : 'Fehler'}</strong><small>${data.message || 'Keine Antwort'}</small>`;
        } catch (error) {
            discordActionStatus.innerHTML = `<strong>Fehler</strong><small>${error.message}</small>`;
        }
    });

    discordGuildForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const guildId = document.getElementById('discordGuildId')?.value?.trim();
        if (!guildId) return;

        discordActionStatus.innerHTML = '<strong>Serverinfo wird geladen...</strong><small>Bitte kurz warten.</small>';

        try {
            const response = await fetch(`${API_BASE}/api/discord/guild-info`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ guildId })
            });
            const data = await response.json();
            const guild = data.guild || {};
            discordActionStatus.innerHTML = `<strong>${guild.name || 'Server'}</strong><small>ID: ${guild.id || guildId}<br>Mitglieder: ${guild.member_count ?? 'n/a'}</small>`;
        } catch (error) {
            discordActionStatus.innerHTML = `<strong>Fehler</strong><small>${error.message}</small>`;
        }
    });

    const serverJoinBtn = document.getElementById('serverJoinBtn');
    if (serverJoinBtn) {
        serverJoinBtn.addEventListener('click', () => {
            window.open(SERVER_INVITE, '_blank');
        });
    }

    const appealBtn = document.getElementById('appealBtn');
    if (appealBtn) {
        appealBtn.addEventListener('click', () => {
            window.open(APPEAL_INVITE, '_blank');
        });
    }
});

function showLoginRequired() {
    document.getElementById('loginRequired')?.classList.remove('hidden');
    document.getElementById('teamDashboard')?.classList.add('hidden');
    document.getElementById('noServerAccessSection')?.classList.add('hidden');
}

function showTeamDashboard(name) {
    document.getElementById('loginRequired')?.classList.add('hidden');
    document.getElementById('noServerAccessSection')?.classList.add('hidden');
    document.getElementById('teamDashboard')?.classList.remove('hidden');
    const welcomeText = document.getElementById('welcomeText');
    if (welcomeText) {
        welcomeText.textContent = `Willkommen, ${name}! Hier ist dein Team-Dashboard.`;
    }

    loadRankings();
    loadLogs();

    const teamOnlySection = document.getElementById('teamOnlySection');
    const noTeamRoleSection = document.getElementById('noTeamRoleSection');
    const user = window.discordAuth.getUser();
    const hasKeyAccess = getTeamAccessGranted();
    const hasTeamRole = Boolean(user && window.discordAuth.hasTeamRole());

    if (hasTeamRole || hasKeyAccess) {
        teamOnlySection?.classList.remove('hidden');
        noTeamRoleSection?.classList.add('hidden');
    } else {
        teamOnlySection?.classList.add('hidden');
        noTeamRoleSection?.classList.remove('hidden');
    }
}

async function loadRankings() {
    const rankingsList = document.getElementById('rankingsList');
    if (!rankingsList) return;

    try {
        const res = await fetch(`${API_BASE}/api/rankings`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || 'Fehler');

        if (!data.rankings || data.rankings.length === 0) {
            rankingsList.innerHTML = '<div>Keine Einträge.</div>';
            return;
        }

        rankingsList.innerHTML = '';
        data.rankings.forEach((r, i) => {
            const el = document.createElement('div');
            el.innerHTML = `<strong>#${i + 1} ${escapeHtml(r.username)}</strong><br><small>Punktzahl: ${r.score}</small>`;
            rankingsList.appendChild(el);
        });
    } catch (err) {
        rankingsList.innerHTML = `<div>Fehler beim Laden: ${escapeHtml(err.message)}</div>`;
    }
}

async function loadLogs() {
    const logsList = document.getElementById('logsList');
    if (!logsList) return;

    try {
        const res = await fetch(`${API_BASE}/api/logs`);
        const data = await res.json();
        if (!data.ok) throw new Error(data.message || 'Fehler');

        if (!data.logs || data.logs.length === 0) {
            logsList.innerHTML = '<div>Keine Logs vorhanden.</div>';
            return;
        }

        logsList.innerHTML = '';
        data.logs.forEach((l) => {
            const el = document.createElement('div');
            el.innerHTML = `<strong>${escapeHtml(l.type)} · ${escapeHtml(l.actor)}</strong><br><small>${new Date(l.at).toLocaleString()} · ${escapeHtml(l.message)}</small>`;
            logsList.appendChild(el);
        });
    } catch (err) {
        logsList.innerHTML = `<div>Fehler beim Laden: ${escapeHtml(err.message)}</div>`;
    }
}

function escapeHtml(text) {
    return String(text || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

function getTeamAccessGranted() {
    if (localStorage.getItem('teamAccessGranted') === 'true') {
        return true;
    }

    if (sessionStorage.getItem('teamAccessGranted') === 'true') {
        localStorage.setItem('teamAccessGranted', 'true');
        sessionStorage.removeItem('teamAccessGranted');
        const oldSession = sessionStorage.getItem(TEAM_KEY_SESSION);
        if (oldSession) {
            localStorage.setItem(TEAM_KEY_SESSION, oldSession);
            sessionStorage.removeItem(TEAM_KEY_SESSION);
        }
        return true;
    }

    return false;
}

function showNoServerAccess() {
    document.getElementById('loginRequired')?.classList.add('hidden');
    document.getElementById('teamDashboard')?.classList.add('hidden');
    document.getElementById('noServerAccessSection')?.classList.remove('hidden');
}

// Handle page navigation with role check
document.addEventListener('click', (e) => {
    if (e.target.closest('a[href*="admin"], a[href*="leitung"]')) {
        const user = window.discordAuth.getUser();
        if (!user || !window.discordAuth.hasTeamRole()) {
            e.preventDefault();
            alert('Du hast keinen Zugriff auf diesen Bereich. Kontaktiere die Leitung.');
            return false;
        }
    }
});
