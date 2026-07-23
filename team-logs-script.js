document.addEventListener('DOMContentLoaded', async () => {
    const logsList = document.getElementById('logsList');

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

    loadLogs();
});
