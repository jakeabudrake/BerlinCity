document.addEventListener('DOMContentLoaded', async () => {
  const memberError = document.getElementById('memberError');
  const discordId = new URLSearchParams(window.location.search).get('discordId');

  if (!discordId) {
    memberError.textContent = 'Keine Member-ID angegeben.';
    memberError.classList.remove('hidden');
    return;
  }

  async function load() {
    document.getElementById('memberError').classList.add('hidden');
    const memberName = document.getElementById('memberName');
    const memberSubtitle = document.getElementById('memberSubtitle');
    const memberRoleLabel = document.getElementById('memberRoleLabel');
    const memberSince = document.getElementById('memberSince');
    const memberRoleId = document.getElementById('memberRoleId');
    const infoOffline = document.getElementById('infoOffline');
    const infoLogins = document.getElementById('infoLogins');
    const infoTickets = document.getElementById('infoTickets');
    const infoApplications = document.getElementById('infoApplications');
    const resultDiv = document.getElementById('memberActionResult');
    const profileAvatar = document.getElementById('profileAvatar');

    memberName.textContent = 'Lade...';
    memberSubtitle.textContent = 'Bitte warten';
    memberRoleLabel.textContent = '---';
    resultDiv.textContent = 'Lade Mitgliedsdaten...';

    try {
      const res = await fetch(`${API_BASE}/api/team/members`);
      const data = await res.json();
      if (!data.ok) throw new Error(data.message || 'Fehler beim Laden der Mitglieder');

      const member = (data.members || []).find((m) => m.id === discordId || m.username === discordId);
      if (!member) {
        showError('Mitglied nicht gefunden.');
        return;
      }

      profileAvatar.innerHTML = member.avatarUrl
        ? `<img src="${member.avatarUrl}" alt="Avatar ${escapeHtml(member.displayName || member.username)}">`
        : `<div class="avatar-fallback">?</div>`;

      memberName.textContent = member.displayName || member.username || 'Unbekannt';
      memberSubtitle.textContent = `${member.username} • ${member.highestRole || 'Keine Rolle'} (Rang ${member.roleRank ?? '-'})`;
      memberRoleLabel.textContent = member.highestRole || 'Keine Rolle';
      memberSince.textContent = 'N/A';
      memberRoleId.textContent = member.highestRoleId || 'N/A';
      infoOffline.textContent = 'N/A';
      infoLogins.textContent = '0';
      infoTickets.textContent = '0';
      infoApplications.textContent = '0';
      resultDiv.textContent = 'Bereit zur Verwaltung.';

      const btnUp = document.getElementById('btnUpRank');
      const btnWarn = document.getElementById('btnWarn');
      const btnDown = document.getElementById('btnDownRank');
      const btnKick = document.getElementById('btnTeamKick');
      const actionForm = document.getElementById('actionForm');
      const actionFormTitle = document.getElementById('actionFormTitle');
      const actionReason = document.getElementById('actionReason');
      const actionDurationField = document.getElementById('actionDurationField');
      const actionDuration = document.getElementById('actionDuration');
      const actionCancel = document.getElementById('actionCancel');
      const user = window.discordAuth?.getUser ? window.discordAuth.getUser() : null;
      const keySession = getTeamKeySession();
      let selectedAction = null;

      async function makeRequest(action, duration) {
        if ((!user || !user.id) && !keySession?.token) {
          resultDiv.textContent = 'Du musst mit Discord angemeldet sein.';
          return;
        }
        const reason = actionReason.value.trim();
        if (!reason) {
          actionReason.focus();
          resultDiv.textContent = 'Ein Grund ist erforderlich.';
          return;
        }
        resultDiv.textContent = 'Sende Anfrage...';
        const headers = { 'content-type': 'application/json' };
        if (keySession?.token) headers['x-team-access-token'] = keySession.token;
        fetch(`${API_BASE}/api/team/manage`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            actorDiscordId: user?.id || '',
            actorUsername: user?.username || user?.global_name || 'Schlüsselzugang',
            targetDiscordId: discordId,
            action,
            duration,
            reason
          })
        })
          .then((r) => r.json())
          .then((d) => {
            if (!d || !d.ok) {
              resultDiv.textContent = d?.message || 'Fehler bei der Anfrage.';
              return;
            }
            resultDiv.textContent = d.message || 'Aktion erfolgreich.';
            actionForm.reset();
            actionForm.classList.add('hidden');
            setTimeout(load, 1200);
          })
          .catch((err) => {
            resultDiv.textContent = 'Fehler: ' + err.message;
          });
      }
      function openActionForm(action, title) {
        selectedAction = action;
        actionFormTitle.textContent = title;
        actionReason.value = '';
        actionDuration.value = '1d';
        actionDurationField.classList.toggle('hidden', action !== 'warn');
        actionForm.classList.remove('hidden');
        actionReason.focus();
      }

      btnUp.onclick = () => openActionForm('up-rank', 'Uprank begründen');
      btnWarn.onclick = () => openActionForm('warn', 'Team-Warn begründen');
      btnDown.onclick = () => openActionForm('down-rank', 'Degradierung begründen');
      btnKick.onclick = () => openActionForm('team-kick', 'Team-Kick begründen');
      actionCancel.onclick = () => actionForm.classList.add('hidden');
      actionForm.addEventListener('submit', (event) => {
        event.preventDefault();
        if (selectedAction) {
          makeRequest(selectedAction, selectedAction === 'warn' ? actionDuration.value : '1d');
        }
      });
    } catch (err) {
      showError(err.message);
    }
  }

  function showError(message) {
    const error = document.getElementById('memberError');
    error.textContent = message;
    error.classList.remove('hidden');
    document.getElementById('memberInfoBlock').classList.add('hidden');
    document.getElementById('memberActionResult').textContent = '';
  }

  function escapeHtml(text) {
    return String(text || '').replace(/[&<>'"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[c]);
  }

  function getTeamKeySession() {
    try {
      const storedSession = localStorage.getItem('bcrp_team_key_session') || sessionStorage.getItem('bcrp_team_key_session');
      if (storedSession && !localStorage.getItem('bcrp_team_key_session')) {
        localStorage.setItem('bcrp_team_key_session', storedSession);
        sessionStorage.removeItem('bcrp_team_key_session');
      }
      return storedSession ? JSON.parse(storedSession) : null;
    } catch {
      return null;
    }
  }

  await load();

  // Auto-reload every 2 minutes (120000 ms)
  setInterval(() => {
    load();
  }, 120000);
});
