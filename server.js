const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

loadEnvFile();

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, "data");
const DATA_FILE = path.join(DATA_DIR, "store.json");
const PORT = Number(process.env.PORT || 8080);

const CONFIG = {
    guildId: process.env.DISCORD_GUILD_ID || "1519481018221072454",
    ownerId: process.env.DISCORD_OWNER_ID || "1334557397456392343",
    appId: process.env.DISCORD_APP_ID || "1443275721110720654",
    clientSecret: process.env.DISCORD_CLIENT_SECRET || "",
    botToken: process.env.DISCORD_BOT_TOKEN || "",
    teamAccessKey: process.env.TEAM_ACCESS_KEY || "ahcdemri",
    adminUsername: process.env.ADMIN_USERNAME || "Jake",
    adminPassword: process.env.ADMIN_PASSWORD || "Jake13122010"
};

const TEAM_ROLE_ORDER = [
    { id: '1520102918219628756', name: 'Inhaber' },
    { id: '1523306447570599996', name: 'Co-Inhaber' },
    { id: '1523306440901660802', name: 'Senior Serverleitung' },
    { id: '1523305514669445222', name: 'Serverleitung' },
    { id: '1523306438540394517', name: 'Stellv. Serverleitung' },
    { id: '1523674698574200904', name: 'Entwickler' },
    { id: '1523744639193190551', name: 'Discord Leitung' },
    { id: '1523305513528459404', name: 'Chief Projektleitung' },
    { id: '1523305512379224414', name: 'Senior Projektleitung' },
    { id: '1523305511561461760', name: 'Projektleitung' },
    { id: '1523305512039350403', name: 'Stellv. Projektleitung' },
    { id: '1523305511544688640', name: 'Elite Management' },
    { id: '1523305510391251074', name: 'Chief Management' },
    { id: '1523305510160302131', name: 'Senior Management' },
    { id: '1523305218320760862', name: 'Management' },
    { id: '1523305217549009017', name: 'Elite Manager' },
    { id: '1523305216492179467', name: 'Senior Manager' },
    { id: '1523830801727356958', name: 'Manager' },
    { id: '1523305214688624650', name: 'Junior Manager' },
    { id: '1523305209357533225', name: 'Head Partner Management' },
    { id: '1523303884771037305', name: 'Partner Manager' },
    { id: '1523302763814195220', name: 'Partnerschaftsverwaltung' },
    { id: '1523302763130519794', name: 'Head Immobilien Management' },
    { id: '1523302762740449360', name: 'Immobilien Manager' },
    { id: '1523302761502998670', name: 'Immobilienverwaltung' },
    { id: '1523302761091956868', name: 'Elite Team Manager' },
    { id: '1523302760253100145', name: 'Senior Team Manager' },
    { id: '1523302758306807818', name: 'Team Manager' },
    { id: '1523302757090590780', name: 'Chief Administrator' },
    { id: '1523302756394340352', name: 'Senior Head Administrator' },
    { id: '1523302755807133727', name: 'Head Administrator' },
    { id: '1523302752049168385', name: 'Elite Administrator' },
    { id: '1523302602920427581', name: 'Senior Administrator' },
    { id: '1523298784874991687', name: 'Administrator' },
    { id: '1523298830752415907', name: 'Junior Administrator' },
    { id: '1523298724514627686', name: 'Elite Moderator' },
    { id: '1523298613214712020', name: 'Senior Moderator' },
    { id: '1523298439205621891', name: 'Moderator' },
    { id: '1523298462899245169', name: 'Junior Moderator' },
    { id: '1523298385346560173', name: 'Elite Support' },
    { id: '1523298285572460654', name: 'Senior Support' },
    { id: '1523297522607591484', name: 'Support' },
    { id: '1523297680128737381', name: 'Junior Support' }
];

const TEAM_ROLE_INDEX = new Map(TEAM_ROLE_ORDER.map((role, index) => [role.id, index]));
const TEAM_ROLE_ID = "1520102928398942348";
const TEAM_KICK_DURATION_MS = 1000 * 60 * 60 * 24 * 7;
const WARN_DURATIONS_MS = {
    "1d": 1000 * 60 * 60 * 24,
    "3d": 1000 * 60 * 60 * 24 * 3,
    "7d": 1000 * 60 * 60 * 24 * 7,
    "14d": 1000 * 60 * 60 * 24 * 14,
    "30d": 1000 * 60 * 60 * 24 * 30,
    "60d": 1000 * 60 * 60 * 24 * 60,
    "perm": null
};

const MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml",
    ".json": "application/json; charset=utf-8"
};

function loadEnvFile() {
    const envPath = path.join(__dirname, ".env");

    if (!fs.existsSync(envPath)) {
        return;
    }

    const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) {
            continue;
        }

        const [key, ...parts] = trimmed.split("=");
        if (!process.env[key]) {
            process.env[key] = parts.join("=").trim();
        }
    }
}

function createDefaultData() {
    return {
        accounts: [],
        teamSessions: [],
        adminSessions: [],
        logs: [],
        teamWarnings: [],
        teamPunishments: [],
        moderationUsage: []
    };
}

function readData() {
    if (!fs.existsSync(DATA_FILE)) {
        return createDefaultData();
    }

    try {
        return { ...createDefaultData(), ...JSON.parse(fs.readFileSync(DATA_FILE, "utf8")) };
    } catch {
        return createDefaultData();
    }
}

function writeData(data) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const temporaryFile = `${DATA_FILE}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(data, null, 2), "utf8");
    fs.renameSync(temporaryFile, DATA_FILE);
}

function sendJson(res, status, value) {
    res.writeHead(status, {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
        "access-control-allow-origin": "*",
        "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
        "access-control-allow-headers": "content-type,x-team-access-token,x-admin-session"
    });
    res.end(JSON.stringify(value));
}

function sendText(res, status, value) {
    res.writeHead(status, { "content-type": "text/plain; charset=utf-8" });
    res.end(value);
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let body = "";
        req.on("data", (chunk) => {
            body += chunk;
            if (body.length > 1_000_000) {
                req.destroy();
                reject(new Error("Body zu groß."));
            }
        });
        req.on("end", () => {
            try {
                resolve(body ? JSON.parse(body) : {});
            } catch {
                reject(new Error("Ungültiges JSON."));
            }
        });
    });
}

function clean(value) {
    return String(value || "").trim();
}

function id(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
    const hash = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
    const [salt, hash] = String(stored || "").split(":");
    if (!salt || !hash) {
        return false;
    }

    const next = crypto.pbkdf2Sync(password, salt, 120000, 32, "sha256").toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(next, "hex"));
}

function addLog(data, type, message, actor = "System") {
    data.logs.unshift({
        id: id("log"),
        type,
        message,
        actor,
        at: new Date().toISOString()
    });
    data.logs = data.logs.slice(0, 100);
}

function clearOldSessions(data) {
    const twoHoursAgo = Date.now() - 1000 * 60 * 60 * 2;
    const thirtyDaysAgo = Date.now() - 1000 * 60 * 60 * 24 * 30;
    data.teamSessions = data.teamSessions.filter((session) => {
        const cutoff = session.accessType === "key" ? thirtyDaysAgo : twoHoursAgo;
        return new Date(session.lastSeenAt).getTime() > cutoff;
    });
    data.adminSessions = data.adminSessions.filter((session) => new Date(session.lastSeenAt).getTime() > twoHoursAgo);
}

function pruneExpiredModeration(data) {
    const now = Date.now();
    data.teamWarnings = (data.teamWarnings || []).filter((warning) => !warning.expiresAt || warning.expiresAt > now);
    data.teamPunishments = (data.teamPunishments || []).filter((punishment) => !punishment.expiresAt || punishment.expiresAt > now);
    data.moderationUsage = (data.moderationUsage || []).filter((entry) => entry.at > now - 1000 * 60 * 60);
}

function getActiveWarningCount(data, targetDiscordId) {
    return (data.teamWarnings || []).filter((warning) => warning.targetDiscordId === targetDiscordId && (!warning.expiresAt || warning.expiresAt > Date.now())).length;
}

function addModerationUsage(data, actorDiscordId, action) {
    data.moderationUsage.push({ actorDiscordId, action, at: Date.now() });
}

function getModerationUsageCount(data, actorDiscordId, action) {
    const windowStart = Date.now() - (action === "warn" ? 1000 * 60 * 10 : 1000 * 60 * 60);
    return (data.moderationUsage || []).filter((entry) => entry.actorDiscordId === actorDiscordId && entry.action === action && entry.at > windowStart).length;
}

function getHighestTeamRole(memberRoles) {
    if (!Array.isArray(memberRoles) || memberRoles.length === 0) {
        return { roleId: "", roleName: "@everyone", rank: TEAM_ROLE_ORDER.length };
    }

    const matched = memberRoles
        .map((roleId) => ({ roleId, index: TEAM_ROLE_INDEX.get(roleId) }))
        .filter((item) => item.index !== undefined)
        .sort((a, b) => a.index - b.index);

    const highest = matched[0];
    if (!highest) {
        return { roleId: "", roleName: "@everyone", rank: TEAM_ROLE_ORDER.length };
    }

    const roleInfo = TEAM_ROLE_ORDER[highest.index];
    return { roleId: roleInfo.id, roleName: roleInfo.name, rank: highest.index };
}

function getRoleIdForAction(currentRank, action) {
    if (action === "down-rank") {
        return TEAM_ROLE_ORDER[currentRank + 1]?.id || null;
    }

    if (action === "up-rank") {
        return TEAM_ROLE_ORDER[currentRank - 1]?.id || null;
    }

    return null;
}

async function applyDiscordRoleAction(discordId, roleId, operation) {
    if (!CONFIG.botToken || !roleId) {
        return { ok: false, message: "Bot-Token oder Rolle nicht verfügbar." };
    }

    const method = operation === "add" ? "PUT" : "DELETE";
    const response = await fetch(`https://discord.com/api/v10/guilds/${CONFIG.guildId}/members/${discordId}/roles/${roleId}`, {
        method,
        headers: {
            authorization: `Bot ${CONFIG.botToken}`,
            "user-agent": "BerlinCityRP-Web/1.0"
        }
    });

    if (!response.ok) {
        return { ok: false, message: `Discord-Rollenaktion fehlgeschlagen (${response.status}).` };
    }

    return { ok: true };
}

async function processExpiredPunishments(data) {
    const now = Date.now();
    const expiredPunishments = (data.teamPunishments || []).filter((punishment) => punishment.expiresAt && punishment.expiresAt <= now);

    for (const punishment of expiredPunishments) {
        if (punishment.type === "team-kick") {
            for (const roleId of punishment.roleIdsToRestore || []) {
                await applyDiscordRoleAction(punishment.targetDiscordId, roleId, "add");
            }
            addLog(data, "Team", `Team-Kick für ${punishment.targetDiscordId} ist abgelaufen. Rollen wurden wiederhergestellt.`, "System");
        }
    }

    data.teamPunishments = (data.teamPunishments || []).filter((punishment) => !punishment.expiresAt || punishment.expiresAt > now);
}

function publicAccount(account) {
    return {
        id: account.id,
        username: account.username,
        discordUserId: account.discordUserId,
        createdAt: account.createdAt,
        createdBy: account.createdBy,
        lastKnownRole: account.lastKnownRole || "Noch nicht abgefragt"
    };
}

function publicSession(session) {
    return {
        id: session.id,
        username: session.username,
        discordUserId: session.discordUserId,
        highestRole: session.highestRole || "Keine Rolle gefunden",
        startedAt: session.startedAt,
        lastSeenAt: session.lastSeenAt
    };
}

function requireAdmin(req, res, data) {
    const token = req.headers["x-admin-session"];
    clearOldSessions(data);
    const session = data.adminSessions.find((item) => item.token === token);

    if (!session) {
        sendJson(res, 401, { ok: false, message: "Nicht im Leitungsbereich eingeloggt." });
        return null;
    }

    session.lastSeenAt = new Date().toISOString();
    return session;
}

function getTeamKeySession(req, data) {
    const token = req.headers["x-team-access-token"];
    return data.teamSessions.find((session) => session.token === token && session.accessType === "key");
}

async function fetchHighestDiscordRole(userId) {
    if (!CONFIG.botToken) {
        return {
            ok: false,
            role: "Bot-Token fehlt",
            detail: "DISCORD_BOT_TOKEN ist nicht gesetzt."
        };
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${CONFIG.guildId}/members/${userId}`, {
        headers: {
            authorization: `Bot ${CONFIG.botToken}`,
            "user-agent": "BerlinCityRP-Web/1.0"
        }
    });

    if (!response.ok) {
        return {
            ok: false,
            role: "Member nicht gefunden",
            detail: `Discord Member API: ${response.status}`
        };
    }

    const member = await response.json();
    const highestRole = getHighestTeamRole(member.roles || []);

    return {
        ok: true,
        role: highestRole.roleName || "@everyone",
        roleId: highestRole.roleId || CONFIG.guildId
    };
}

async function fetchGuildMember(discordId) {
    if (!CONFIG.botToken) {
        return { ok: false, message: 'Bot-Token fehlt.' };
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${CONFIG.guildId}/members/${discordId}`, {
        headers: {
            authorization: `Bot ${CONFIG.botToken}`,
            "user-agent": "BerlinCityRP-Web/1.0"
        }
    });

    if (!response.ok) {
        return { ok: false, status: response.status, message: 'Nicht im Server oder nicht gefunden.' };
    }

    const member = await response.json();
    return { ok: true, member };
}

function getDiscordAvatarUrl(user) {
    if (!user || !user.avatar) {
        return null;
    }

    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`;
}

async function fetchGuildMembers() {
    if (!CONFIG.botToken) {
        return { ok: false, message: 'Bot-Token fehlt.', members: [] };
    }

    const members = [];
    let after = null;

    while (true) {
        const url = new URL(`https://discord.com/api/v10/guilds/${CONFIG.guildId}/members`);
        url.searchParams.set('limit', '1000');
        if (after) url.searchParams.set('after', after);

        const response = await fetch(url.toString(), {
            headers: {
                authorization: `Bot ${CONFIG.botToken}`,
                "user-agent": "BerlinCityRP-Web/1.0"
            }
        });

        if (!response.ok) {
            return { ok: false, message: `Discord-Mitglieder konnten nicht geladen werden (${response.status}).`, members: [] };
        }

        const chunk = await response.json();
        if (!Array.isArray(chunk) || chunk.length === 0) {
            break;
        }

        members.push(...chunk);
        if (chunk.length < 1000) {
            break;
        }

        after = chunk[chunk.length - 1].user.id;
    }

    return { ok: true, members };
}

async function exchangeDiscordCode(code, redirectUri) {
    if (!CONFIG.appId || !CONFIG.clientSecret) {
        return { ok: false, message: 'Discord client secret oder App-ID fehlt.' };
    }

    const body = new URLSearchParams({
        client_id: CONFIG.appId,
        client_secret: CONFIG.clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        scope: 'identify guilds guilds.members.read'
    });

    const response = await fetch('https://discord.com/api/v10/oauth2/token', {
        method: 'POST',
        headers: {
            'content-type': 'application/x-www-form-urlencoded'
        },
        body: body.toString()
    });

    if (!response.ok) {
        return { ok: false, message: `Token-Austausch fehlgeschlagen (${response.status}).` };
    }

    const data = await response.json();
    return { ok: true, data };
}

async function fetchDiscordUser(accessToken) {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
        headers: {
            authorization: `Bearer ${accessToken}`,
            "user-agent": "BerlinCityRP-Web/1.0"
        }
    });

    if (!response.ok) {
        return { ok: false, message: 'Benutzerinformation konnte nicht geladen werden.' };
    }

    const data = await response.json();
    return { ok: true, data };
}

async function sendDiscordMessage(channelId, content) {
    if (!CONFIG.botToken) {
        return { ok: false, message: 'Bot-Token fehlt.' };
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
        method: 'POST',
        headers: {
            authorization: `Bot ${CONFIG.botToken}`,
            'content-type': 'application/json',
            'user-agent': 'BerlinCityRP-Web/1.0'
        },
        body: JSON.stringify({ content })
    });

    if (!response.ok) {
        return { ok: false, status: response.status, message: 'Nachricht konnte nicht gesendet werden.' };
    }

    const data = await response.json();
    return { ok: true, data };
}

async function fetchDiscordGuildInfo(guildId = CONFIG.guildId) {
    if (!CONFIG.botToken) {
        return { ok: false, message: 'Bot-Token fehlt.' };
    }

    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
        headers: {
            authorization: `Bot ${CONFIG.botToken}`,
            'user-agent': 'BerlinCityRP-Web/1.0'
        }
    });

    if (!response.ok) {
        return { ok: false, status: response.status, message: 'Serverinformationen konnten nicht geladen werden.' };
    }

    const guild = await response.json();
    return { ok: true, guild };
}

async function handleApi(req, res) {
    const data = readData();
    pruneExpiredModeration(data);
    clearOldSessions(data);
    await processExpiredPunishments(data);

    try {
        if (req.method === "GET" && req.url === "/api/status") {
            sendJson(res, 200, {
                ok: true,
                discordConnected: Boolean(CONFIG.botToken),
                guildId: CONFIG.guildId,
                appId: CONFIG.appId,
                ownerId: CONFIG.ownerId
            });
            return;
        }

        if (req.method === "POST" && req.url === "/api/admin/login") {
            const body = await readBody(req);
            const username = clean(body.username);
            const password = clean(body.password);

            if (username === CONFIG.adminUsername && password === CONFIG.adminPassword) {
                const session = {
                    token: id("admin"),
                    username: CONFIG.adminUsername,
                    startedAt: new Date().toISOString(),
                    lastSeenAt: new Date().toISOString()
                };
                data.adminSessions.push(session);
                addLog(data, "Leitung", "Leitungsbereich geöffnet.", CONFIG.adminUsername);
                writeData(data);
                sendJson(res, 200, { ok: true, session });
                return;
            }

            addLog(data, "Warnung", `Fehlgeschlagener Leitungs-Login für "${username || "unbekannt"}".`);
            writeData(data);
            sendJson(res, 401, { ok: false, message: "Username oder Passwort ist falsch." });
            return;
        }

        if (req.method === "POST" && req.url === "/api/admin/logout") {
            const session = requireAdmin(req, res, data);
            if (!session) return;
            data.adminSessions = data.adminSessions.filter((item) => item.token !== session.token);
            addLog(data, "Leitung", "Leitungsbereich geschlossen.", session.username);
            writeData(data);
            sendJson(res, 200, { ok: true });
            return;
        }

        if (req.method === "GET" && req.url === "/api/admin/dashboard") {
            const session = requireAdmin(req, res, data);
            if (!session) return;
            writeData(data);
            sendJson(res, 200, {
                ok: true,
                accounts: data.accounts.map(publicAccount),
                active: data.teamSessions.map(publicSession),
                logs: data.logs
            });
            return;
        }

        if (req.method === "POST" && req.url === "/api/admin/accounts") {
            const session = requireAdmin(req, res, data);
            if (!session) return;
            const body = await readBody(req);
            const username = clean(body.username);
            const password = clean(body.password);
            const discordUserId = clean(body.discordUserId);

            if (!username || !password || !discordUserId) {
                sendJson(res, 400, { ok: false, message: "Bitte Username, Passwort und Discord User ID ausfüllen." });
                return;
            }

            if (!/^\d{15,25}$/.test(discordUserId)) {
                sendJson(res, 400, { ok: false, message: "Die Discord User ID sieht nicht gültig aus." });
                return;
            }

            const exists = data.accounts.some((account) => account.username.toLowerCase() === username.toLowerCase());
            if (exists) {
                sendJson(res, 409, { ok: false, message: "Dieser Username existiert bereits." });
                return;
            }

            const role = await fetchHighestDiscordRole(discordUserId);
            const account = {
                id: id("acc"),
                username,
                passwordHash: hashPassword(password),
                discordUserId,
                lastKnownRole: role.role,
                createdAt: new Date().toISOString(),
                createdBy: session.username
            };

            data.accounts.push(account);
            addLog(data, "Account", `Team-Zugang für ${username} erstellt. Discord-Rolle: ${role.role}.`, session.username);
            writeData(data);
            sendJson(res, 201, { ok: true, account: publicAccount(account), role });
            return;
        }

        if (req.method === "DELETE" && req.url.startsWith("/api/admin/accounts/")) {
            const session = requireAdmin(req, res, data);
            if (!session) return;
            const accountId = decodeURIComponent(req.url.split("/").pop());
            const account = data.accounts.find((item) => item.id === accountId);

            if (!account) {
                sendJson(res, 404, { ok: false, message: "Account nicht gefunden." });
                return;
            }

            data.accounts = data.accounts.filter((item) => item.id !== accountId);
            data.teamSessions = data.teamSessions.filter((item) => item.username !== account.username);
            addLog(data, "Account", `Team-Zugang von ${account.username} entfernt.`, session.username);
            writeData(data);
            sendJson(res, 200, { ok: true });
            return;
        }

        if (req.method === "POST" && req.url === "/api/team/login") {
            const body = await readBody(req);
            const username = clean(body.username);
            const password = clean(body.password);
            const account = data.accounts.find((item) => item.username.toLowerCase() === username.toLowerCase());

            if (!account || !verifyPassword(password, account.passwordHash)) {
                addLog(data, "Warnung", `Fehlgeschlagener Team-Login für "${username || "unbekannt"}".`);
                writeData(data);
                sendJson(res, 401, { ok: false, message: "Dieser Team-Zugang wurde nicht gefunden." });
                return;
            }

            const role = await fetchHighestDiscordRole(account.discordUserId);
            account.lastKnownRole = role.role;

            const teamSession = {
                token: id("team"),
                username: account.username,
                discordUserId: account.discordUserId,
                highestRole: role.role,
                startedAt: new Date().toISOString(),
                lastSeenAt: new Date().toISOString()
            };

            data.teamSessions.push(teamSession);
            addLog(data, "Team", `${account.username} hat den Team-Bereich betreten. Höchste Rolle: ${role.role}.`, account.username);
            addLog(data, "Team", `Team-Login erfolgreich für ${account.username}.`, account.username);
            writeData(data);
            sendJson(res, 200, { ok: true, session: teamSession, role });
            return;
        }

        if (req.method === "POST" && req.url === "/api/team/key-login") {
            const body = await readBody(req);
            if (clean(body.key).toLowerCase() !== CONFIG.teamAccessKey.toLowerCase()) {
                sendJson(res, 401, { ok: false, message: "Falscher Team-Key." });
                return;
            }

            const session = {
                token: id("team_key"),
                accessType: "key",
                username: "Schlüsselzugang",
                discordUserId: CONFIG.ownerId,
                startedAt: new Date().toISOString(),
                lastSeenAt: new Date().toISOString()
            };
            data.teamSessions.push(session);
            addLog(data, "Team", "Team-Verwaltung mit Schlüsselzugang geöffnet.", "Schlüsselzugang");
            writeData(data);
            sendJson(res, 200, { ok: true, session });
            return;
        }

        if (req.method === "POST" && req.url === "/api/team/manage") {
            const body = await readBody(req);
            const keySession = getTeamKeySession(req, data);
            const actorDiscordId = keySession?.discordUserId || clean(body.actorDiscordId);
            const actorUsername = keySession?.username || clean(body.actorUsername || "System");
            const targetDiscordId = clean(body.targetDiscordId);
            const action = clean(body.action);
            const duration = clean(body.duration || "1d");
            const reason = clean(body.reason);

            if (!actorDiscordId || !targetDiscordId || !action) {
                sendJson(res, 400, { ok: false, message: "Actor, Ziel und Aktion werden benötigt." });
                return;
            }

            if (keySession) {
                keySession.lastSeenAt = new Date().toISOString();
            }

            if (!reason) {
                sendJson(res, 400, { ok: false, message: "Für diese Aktion muss ein Grund angegeben werden." });
                return;
            }

            if (actorDiscordId === targetDiscordId) {
                sendJson(res, 403, { ok: false, message: "Du kannst dich selbst nicht verwalten." });
                return;
            }

            const actorMemberInfo = await fetchGuildMember(actorDiscordId);
            const targetMemberInfo = await fetchGuildMember(targetDiscordId);

            if (!actorMemberInfo.ok || !targetMemberInfo.ok) {
                sendJson(res, 400, { ok: false, message: "Ein Discord-Mitglied konnte nicht gefunden werden." });
                return;
            }

            const actorRoleInfo = getHighestTeamRole(actorMemberInfo.member.roles || []);
            const targetRoleInfo = getHighestTeamRole(targetMemberInfo.member.roles || []);

            if (!actorRoleInfo.roleId || actorRoleInfo.roleId === TEAM_ROLE_ID) {
                sendJson(res, 403, { ok: false, message: "Du hast keine berechtigte Team-Rolle für Moderation." });
                return;
            }

            if (targetRoleInfo.roleId === "" || targetRoleInfo.rank >= actorRoleInfo.rank) {
                sendJson(res, 403, { ok: false, message: "Du kannst nur Team-Mitglieder unter dir verwalten." });
                return;
            }

            const allowedActions = ["down-rank", "up-rank", "warn", "team-kick"];
            if (!allowedActions.includes(action)) {
                sendJson(res, 400, { ok: false, message: "Ungültige Aktion." });
                return;
            }

            if (action === "warn" && !Object.prototype.hasOwnProperty.call(WARN_DURATIONS_MS, duration)) {
                sendJson(res, 400, { ok: false, message: "Ungültige Warn-Dauer." });
                return;
            }

            if (action === "down-rank" && getModerationUsageCount(data, actorDiscordId, "down-rank") >= 2) {
                sendJson(res, 429, { ok: false, message: "Du hast für diese Stunde schon zu oft runtergestuft." });
                return;
            }

            if (action === "up-rank" && getModerationUsageCount(data, actorDiscordId, "up-rank") >= 2) {
                sendJson(res, 429, { ok: false, message: "Du hast für diese Stunde schon zu oft hochgestuft." });
                return;
            }

            if (action === "warn" && getModerationUsageCount(data, actorDiscordId, "warn") >= 1) {
                sendJson(res, 429, { ok: false, message: "Ein Warn pro 10 Minuten ist erlaubt." });
                return;
            }

            if (action === "warn") {
                const activeWarnings = getActiveWarningCount(data, targetDiscordId);
                if (activeWarnings >= 5) {
                    sendJson(res, 409, { ok: false, message: "Diese Person hat bereits die maximale Warnanzahl und muss zuerst gekickt werden." });
                    return;
                }
            }

            let result = { ok: true, action };

            if (action === "down-rank") {
                const nextRoleId = getRoleIdForAction(targetRoleInfo.rank, "down-rank");
                if (!nextRoleId) {
                    sendJson(res, 400, { ok: false, message: "Diese Person kann nicht weiter heruntergestuft werden." });
                    return;
                }

                const removeResult = await applyDiscordRoleAction(targetDiscordId, targetRoleInfo.roleId, "remove");
                if (!removeResult.ok) {
                    sendJson(res, 502, { ok: false, message: removeResult.message || "Alte Rolle konnte auf Discord nicht entfernt werden." });
                    return;
                }

                const addResult = await applyDiscordRoleAction(targetDiscordId, nextRoleId, "add");
                if (!addResult.ok) {
                    await applyDiscordRoleAction(targetDiscordId, targetRoleInfo.roleId, "add");
                    sendJson(res, 502, { ok: false, message: addResult.message || "Neue Rolle konnte auf Discord nicht vergeben werden." });
                    return;
                }
                addModerationUsage(data, actorDiscordId, action);
                addLog(data, "Team", `${actorUsername} hat ${targetDiscordId} runtergestuft. Grund: ${reason}`, actorUsername);
                result.message = `Runtergestuft auf ${TEAM_ROLE_ORDER.find((role) => role.id === nextRoleId)?.name || "nächste Rolle"}`;
            } else if (action === "up-rank") {
                const nextRoleId = getRoleIdForAction(targetRoleInfo.rank, "up-rank");
                if (!nextRoleId) {
                    sendJson(res, 400, { ok: false, message: "Diese Person kann nicht weiter hochgestuft werden." });
                    return;
                }

                const removeResult = await applyDiscordRoleAction(targetDiscordId, targetRoleInfo.roleId, "remove");
                if (!removeResult.ok) {
                    sendJson(res, 502, { ok: false, message: removeResult.message || "Alte Rolle konnte auf Discord nicht entfernt werden." });
                    return;
                }

                const addResult = await applyDiscordRoleAction(targetDiscordId, nextRoleId, "add");
                if (!addResult.ok) {
                    await applyDiscordRoleAction(targetDiscordId, targetRoleInfo.roleId, "add");
                    sendJson(res, 502, { ok: false, message: addResult.message || "Neue Rolle konnte auf Discord nicht vergeben werden." });
                    return;
                }
                addModerationUsage(data, actorDiscordId, action);
                addLog(data, "Team", `${actorUsername} hat ${targetDiscordId} hochgestuft. Grund: ${reason}`, actorUsername);
                result.message = `Hochgestuft auf ${TEAM_ROLE_ORDER.find((role) => role.id === nextRoleId)?.name || "nächste Rolle"}`;
            } else if (action === "warn") {
                const durationMs = WARN_DURATIONS_MS[duration] ?? WARN_DURATIONS_MS["1d"];
                const warning = {
                    id: id("warn"),
                    targetDiscordId,
                    actorDiscordId,
                    actorUsername,
                    reason,
                    duration,
                    createdAt: Date.now(),
                    expiresAt: durationMs ? Date.now() + durationMs : null
                };

                data.teamWarnings.push(warning);
                addModerationUsage(data, actorDiscordId, action);
                addLog(data, "Team", `${actorUsername} hat ${targetDiscordId} verwarnt (${duration}). Grund: ${reason}`, actorUsername);
                result.warningCount = getActiveWarningCount(data, targetDiscordId);
                result.message = `Warn gespeichert. Aktive Warns: ${result.warningCount}`;

                if (result.warningCount >= 5 && !data.teamPunishments.some((punishment) => punishment.targetDiscordId === targetDiscordId && punishment.type === "team-kick" && punishment.expiresAt > Date.now())) {
                    const punishment = {
                        id: id("kick"),
                        type: "team-kick",
                        targetDiscordId,
                        actorDiscordId,
                        actorUsername,
                        reason: "5 Warns erreicht",
                        createdAt: Date.now(),
                        expiresAt: Date.now() + TEAM_KICK_DURATION_MS,
                        roleIdsToRestore: [targetRoleInfo.roleId, TEAM_ROLE_ID].filter(Boolean)
                    };

                    data.teamPunishments.push(punishment);
                    if (targetRoleInfo.roleId) {
                        await applyDiscordRoleAction(targetDiscordId, targetRoleInfo.roleId, "remove");
                    }
                    await applyDiscordRoleAction(targetDiscordId, TEAM_ROLE_ID, "remove");
                    addLog(data, "Team", `${targetDiscordId} hat 5 Warns erreicht und wurde für 7 Tage vom Team gekickt.`, actorUsername);
                    result.teamKick = true;
                    result.message = "5 Warns erreicht — Team-Kick für 7 Tage aktiviert.";
                }
            } else if (action === "team-kick") {
                const punishment = {
                    id: id("kick"),
                    type: "team-kick",
                    targetDiscordId,
                    actorDiscordId,
                    actorUsername,
                    reason,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + TEAM_KICK_DURATION_MS,
                    roleIdsToRestore: [targetRoleInfo.roleId, TEAM_ROLE_ID].filter(Boolean)
                };

                data.teamPunishments.push(punishment);
                if (targetRoleInfo.roleId) {
                    await applyDiscordRoleAction(targetDiscordId, targetRoleInfo.roleId, "remove");
                }
                await applyDiscordRoleAction(targetDiscordId, TEAM_ROLE_ID, "remove");
                addModerationUsage(data, actorDiscordId, action);
                addLog(data, "Team", `${actorUsername} hat ${targetDiscordId} für 7 Tage vom Team gekickt. Grund: ${reason}`, actorUsername);
                result.message = "Team-Kick für 7 Tage aktiviert.";
            }

            writeData(data);
            sendJson(res, 200, { ok: true, ...result });
            return;
        }

        if (req.method === "POST" && req.url === "/api/team/session") {
            const body = await readBody(req);
            const token = clean(body.token);
            const session = data.teamSessions.find((item) => item.token === token);

            if (!session) {
                writeData(data);
                sendJson(res, 401, { ok: false, message: "Nicht im Team-Bereich eingeloggt." });
                return;
            }

            session.lastSeenAt = new Date().toISOString();
            addLog(data, "Team", `${session.username} hat die Team-Sitzung erneuert.`, session.username);
            writeData(data);
            sendJson(res, 200, { ok: true, session });
            return;
        }

        if (req.method === "POST" && req.url === "/api/auth/discord") {
            const body = await readBody(req);
            const code = clean(body.code);
            const redirectUri = String(body.redirectUri || '').trim();

            if (!code || !redirectUri) {
                sendJson(res, 400, { ok: false, message: 'Code und Redirect URI werden benötigt.' });
                return;
            }

            const exchange = await exchangeDiscordCode(code, redirectUri);
            if (!exchange.ok) {
                sendJson(res, 400, { ok: false, message: exchange.message });
                return;
            }

            const tokenData = exchange.data;
            const userResponse = await fetchDiscordUser(tokenData.access_token);
            if (!userResponse.ok) {
                sendJson(res, 400, { ok: false, message: userResponse.message });
                return;
            }

            const user = userResponse.data;
            const memberInfo = await fetchGuildMember(user.id);
            const roleInfo = await fetchHighestDiscordRole(user.id);

            user.accessToken = tokenData.access_token;
            user.isMember = memberInfo.ok;
            user.roles = memberInfo.ok ? (memberInfo.member.roles || []) : [];
            user.highestRole = roleInfo.ok ? roleInfo.role : 'Mitglied';
            user.highestRoleId = roleInfo.ok ? roleInfo.roleId : CONFIG.guildId;

            addLog(data, "Discord", `Discord-Login von ${user.username} (${user.id}). Servermitglied: ${user.isMember ? 'ja' : 'nein'}. Höchste Rolle: ${user.highestRole}.`, user.username);
            writeData(data);
            sendJson(res, 200, { ok: true, user });
            return;
        }

        if (req.method === "POST" && req.url === "/api/auth/check-membership") {
            const body = await readBody(req);
            const discordId = clean(body.discordId);

            if (!discordId) {
                sendJson(res, 400, { ok: false, message: 'Discord ID wird benötigt.' });
                return;
            }

            const memberInfo = await fetchGuildMember(discordId);
            const roleInfo = await fetchHighestDiscordRole(discordId);
            addLog(data, "Discord", `Mitgliedschaftsprüfung für Discord-ID ${discordId}. Ergebnis: ${memberInfo.ok ? 'Mitglied' : 'Nicht-Mitglied'}. Höchste Rolle: ${roleInfo.role}.`, 'System');
            writeData(data);
            sendJson(res, 200, {
                ok: true,
                isMember: memberInfo.ok,
                roles: memberInfo.ok ? memberInfo.member.roles || [] : [],
                highestRole: roleInfo.ok ? roleInfo.role : 'Mitglied',
                highestRoleId: roleInfo.ok ? roleInfo.roleId : CONFIG.guildId
            });
            return;
        }

        if (req.method === "POST" && req.url === "/api/discord/send-message") {
            const body = await readBody(req);
            const channelId = clean(body.channelId);
            const content = clean(body.content);

            if (!channelId || !content) {
                sendJson(res, 400, { ok: false, message: 'Channel ID und Inhalt werden benötigt.' });
                return;
            }

            const result = await sendDiscordMessage(channelId, content);
            if (!result.ok) {
                addLog(data, "Discord", `Discord-Nachricht an Channel ${channelId} konnte nicht gesendet werden: ${result.message}`);
                writeData(data);
                sendJson(res, 400, { ok: false, message: result.message });
                return;
            }

            addLog(data, "Discord", `Discord-Nachricht an Channel ${channelId} gesendet. Länge: ${content.length} Zeichen.`, 'Bot');
            writeData(data);
            sendJson(res, 200, { ok: true, message: 'Nachricht gesendet.', data: result.data });
            return;
        }

        if (req.method === "POST" && req.url === "/api/discord/guild-info") {
            const body = await readBody(req);
            const guildId = clean(body.guildId || CONFIG.guildId);
            const result = await fetchDiscordGuildInfo(guildId);

            if (!result.ok) {
                addLog(data, "Discord", `Guild-Info für ${guildId} konnte nicht geladen werden: ${result.message}`);
                writeData(data);
                sendJson(res, 400, { ok: false, message: result.message });
                return;
            }

            addLog(data, "Discord", `Guild-Info geladen für Server ${guildId}. Name: ${result.guild.name || 'unbekannt'}.`, 'System');
            writeData(data);
            sendJson(res, 200, { ok: true, guild: result.guild });
            return;
        }

        if (req.method === "POST" && req.url === "/api/team/logout") {
            const body = await readBody(req);
            const token = clean(body.token);
            const session = data.teamSessions.find((item) => item.token === token);

            if (session) {
                data.teamSessions = data.teamSessions.filter((item) => item.token !== token);
                addLog(data, "Team", `${session.username} hat den Team-Bereich verlassen.`, session.username);
            }

            writeData(data);
            sendJson(res, 200, { ok: true });
            return;
        }

        // Public logs (read-only) for team dashboard display
        if (req.method === "GET" && req.url === "/api/logs") {
            writeData(data);
            sendJson(res, 200, { ok: true, logs: data.logs.slice(0, 50) });
            return;
        }

        // Team members endpoint: only users with a configurable team role hierarchy
        if (req.method === "GET" && req.url === "/api/team/members") {
            const result = await fetchGuildMembers();
            if (!result.ok) {
                sendJson(res, 500, { ok: false, message: result.message });
                return;
            }

            const members = result.members
                .map((member) => {
                    const highestRole = getHighestTeamRole(member.roles || []);
                    return {
                        id: member.user?.id || '',
                        username: `${member.user?.username || 'Unbekannt'}#${member.user?.discriminator || '0000'}`,
                        displayName: member.nick || member.user?.username || 'Unbekannt',
                        avatarUrl: getDiscordAvatarUrl(member.user),
                        roles: member.roles || [],
                        highestRole: highestRole.roleName,
                        highestRoleId: highestRole.roleId,
                        roleRank: highestRole.rank,
                        warningCount: getActiveWarningCount(data, member.user?.id || '')
                    };
                })
                .filter((member) => member.highestRoleId && member.highestRoleId !== '')
                .sort((a, b) => a.roleRank - b.roleRank || a.username.localeCompare(b.username));

            writeData(data);
            sendJson(res, 200, { ok: true, members });
            return;
        }

        if (req.method === "GET" && req.url === "/api/rankings") {
            // Build a score per username based on activity: session appearances + log mentions
            const scores = new Map();

            for (const acc of data.accounts) {
                scores.set(acc.username, { username: acc.username, score: 0 });
            }

            for (const s of data.teamSessions) {
                const entry = scores.get(s.username) || { username: s.username, score: 0 };
                entry.score += 5; // session presence counts
                scores.set(s.username, entry);
            }

            for (const l of data.logs) {
                const entry = scores.get(l.actor) || { username: l.actor, score: 0 };
                entry.score += 1; // log mentions count
                scores.set(l.actor, entry);
            }

            const list = Array.from(scores.values()).sort((a, b) => b.score - a.score).slice(0, 50);
            writeData(data);
            sendJson(res, 200, { ok: true, rankings: list });
            return;
        }

        sendJson(res, 404, { ok: false, message: "API-Endpunkt nicht gefunden." });
    } catch (error) {
        sendJson(res, 500, { ok: false, message: error.message || "Serverfehler." });
    }
}

async function serveStatic(req, res) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
    const filePath = path.normalize(path.join(ROOT, decodeURIComponent(requestedPath)));

    if (!filePath.startsWith(ROOT) || filePath.includes(`${path.sep}data${path.sep}`) || path.basename(filePath) === ".env") {
        sendText(res, 403, "Forbidden");
        return;
    }

    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
        sendText(res, 404, "Not found");
        return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || "application/octet-stream";
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    res.end(fs.readFileSync(filePath));
}

const server = http.createServer(async (req, res) => {
    if (req.method === "OPTIONS") {
        res.writeHead(204, {
            "access-control-allow-origin": "*",
            "access-control-allow-methods": "GET,POST,DELETE,OPTIONS",
            "access-control-allow-headers": "content-type,x-team-access-token,x-admin-session"
        });
        res.end();
        return;
    }

    if (req.url.startsWith("/api/")) {
        await handleApi(req, res);
        return;
    }

    await serveStatic(req, res);
});

server.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});
