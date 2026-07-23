document.addEventListener('DOMContentLoaded', async () => {
    const membersContainer = document.getElementById('teamMembersList');
    const manageModal = document.getElementById('manageModal');
    const manageTitle = document.getElementById('manageTitle');
    const manageInfo = document.getElementById('manageInfo');
    const manageAction = document.getElementById('manageAction');
    const warnDuration = document.getElementById('warnDuration');
    const manageReason = document.getElementById('manageReason');
    const manageSubmit = document.getElementById('manageSubmit');
    const manageCancel = document.getElementById('manageCancel');
    const manageCloseBtn = document.getElementById('manageCloseBtn');
    const manageResult = document.getElementById('manageResult');

    let currentTarget = null;
    let actorId = null;
    let actorRank = null;

    async function loadTeamMembers() {
        try {
            const response = await fetch(`${API_BASE}/api/team/members`);
            const data = await response.json();
            if (!data.ok) throw new Error(data.message || 'Fehler beim Laden');

            if (!data.members || data.members.length === 0) {
                membersContainer.innerHTML = '<div>Keine Team-Mitglieder gefunden.</div>';
                return;
            }

            membersContainer.innerHTML = '';
            data.members.forEach((member) => {
                const card = document.createElement('article');
                card.className = 'team-member-card';
                card.innerHTML = `
                    <div class="member-row">
                        <div class="member-avatar">
                            ${member.avatarUrl ? `<img src="${member.avatarUrl}" alt="${escapeHtml(member.displayName || member.username)}">` : '<span class="avatar-fallback">✕</span>'}
                        </div>
                                <div class="member-content">
                                    <strong>${escapeHtml(member.displayName || member.username)}</strong>
                                    <span class="role-badge ${getRoleStyleClass(member.highestRole)}">${getRoleBadge(member.highestRole)}</span>
                                    <small>Team-Warns: ${Number(member.warningCount) || 0}/5</small>
                                </div>
                        <div class="member-actions">
                            <button type="button" class="member-action-btn" data-member-id="${escapeHtml(member.id)}" data-role-rank="${Number(member.roleRank)}">Verwalten</button>
                        </div>
                    </div>
                `;
                membersContainer.appendChild(card);
            });
            // store actor info from session if available
            const user = window.discordAuth?.getUser ? window.discordAuth.getUser() : null;
            actorId = user?.id || null;
            if (actorId) {
                const me = data.members.find((m) => m.id === actorId);
                actorRank = me ? Number(me.roleRank) : null;
            }

            // attach listeners to manage buttons
            document.querySelectorAll('.member-action-btn').forEach((btn) => {
                const targetId = btn.getAttribute('data-member-id');
                const targetRank = btn.getAttribute('data-role-rank');

                if (actorId && actorId === targetId) {
                    btn.disabled = true;
                    btn.title = 'Du kannst dich selbst nicht verwalten.';
                    return;
                }

                if (actorRank === null) {
                    // cannot determine actor rank -> still allow click, backend will enforce
                } else if (Number(targetRank) <= actorRank) {
                    btn.disabled = true;
                    btn.title = 'Du kannst nur Team-Mitglieder unter dir verwalten.';
                    return;
                }

                btn.addEventListener('click', () => {
                    window.location.href = `team-member.html?discordId=${encodeURIComponent(targetId)}`;
                });
            });
        } catch (error) {
            membersContainer.innerHTML = `<div>Fehler beim Laden: ${escapeHtml(error.message)}</div>`;
        }
    }

    function getRoleStyleClass(role) {
        const normalized = String(role || '').toLowerCase();
        if (normalized.includes('owner') || normalized.includes('inhaber')) return 'owner';
        if (normalized.includes('co-inhaber') || normalized.includes('inhaber')) return 'owner';
        if (normalized.includes('senior') && normalized.includes('administrator')) return 'administrator';
        if (normalized.includes('administrator')) return 'administrator';
        if (normalized.includes('moderator')) return 'moderator';
        if (normalized.includes('support')) return 'support';
        if (normalized.includes('developer') || normalized.includes('entwickler')) return 'developer';
        return 'default-role';
    }

    function getRoleBadge(role) {
        const normalized = String(role || '').toLowerCase();
        if (normalized.includes('owner') || normalized.includes('inhaber')) return '🔰 Owner';
        if (normalized.includes('moderator')) return '🛡 Moderator';
        if (normalized.includes('administrator')) return '⚙️ Administrator';
        if (normalized.includes('support')) return '💠 Support';
        if (normalized.includes('entwickler') || normalized.includes('developer')) return '💻 Entwickler';
        return `⭐ ${escapeHtml(role || 'Team')}`;
    }

    function escapeHtml(text) {
        return String(text || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
    }

    function openManageModal(targetId, member) {
        currentTarget = { id: targetId, member };
        manageTitle.textContent = `Verwalten: ${member.displayName || member.username}`;
        manageInfo.innerHTML = `Rolle: <strong>${escapeHtml(member.highestRole)}</strong>`;
        manageResult.textContent = '';
        manageAction.value = 'warn';
        warnDuration.value = '1d';
        manageReason.value = '';
        manageModal.classList.remove('hidden');
        manageModal.setAttribute('aria-hidden', 'false');
    }

    function closeManageModal() {
        currentTarget = null;
        manageModal.classList.add('hidden');
        manageModal.setAttribute('aria-hidden', 'true');
    }

    manageCancel?.addEventListener('click', closeManageModal);
    manageCloseBtn?.addEventListener('click', closeManageModal);

    manageSubmit?.addEventListener('click', async () => {
        if (!currentTarget) return;
        const action = manageAction.value;
        const duration = warnDuration.value;
        const reason = manageReason.value.trim();
        if (!reason) {
            manageResult.textContent = 'Bitte einen Grund eingeben.';
            manageReason.focus();
            return;
        }
        const user = window.discordAuth?.getUser ? window.discordAuth.getUser() : null;

        if (!user || !user.id) {
            manageResult.textContent = 'Du musst mit Discord angemeldet sein.';
            return;
        }

        // send request to backend
        manageResult.textContent = 'Wird ausgeführt...';
        try {
            const res = await fetch(`${API_BASE}/api/team/manage`, {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({
                    actorDiscordId: user.id,
                    actorUsername: user.username || user.global_name || 'Unbekannt',
                    targetDiscordId: currentTarget.id,
                    action,
                    duration,
                    reason
                })
            });

            const data = await res.json().catch(() => null);
            if (!res.ok) {
                manageResult.textContent = data?.message || `Fehler: ${res.status}`;
                return;
            }

            manageResult.textContent = data?.message || 'Aktion erfolgreich.';
            // refresh members list to reflect role changes
            await loadTeamMembers();
            setTimeout(closeManageModal, 1200);
        } catch (err) {
            manageResult.textContent = 'Fehler beim Ausführen: ' + err.message;
        }
    });

    loadTeamMembers();
});
