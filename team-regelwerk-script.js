document.addEventListener('DOMContentLoaded', async () => {
    const rankingsList = document.getElementById('rankingsList');
    const logsList = document.getElementById('logsList');

    async function loadRankings() {
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
                el.innerHTML = `<strong>#${i+1} ${escapeHtml(r.username)}</strong><br><small>Punktzahl: ${r.score}</small>`;
                rankingsList.appendChild(el);
            });
        } catch (err) {
            rankingsList.innerHTML = `<div>Fehler beim Laden: ${escapeHtml(err.message)}</div>`;
        }
    }

    async function loadLogs() {
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

    // Load on start
    loadRankings();
    loadLogs();

    // Bottom boxes click handlers
    document.getElementById('bottomBoxes')?.addEventListener('click', (e) => {
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
});
