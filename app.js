import {
  adoptRemoteBackup,
  canUseDeviceUnlock,
  deleteVault,
  enrollCurrentDevice,
  finalizeVaultSetup,
  getEncryptedBackup,
  getPendingRecoveryCode,
  getVaultStatus,
  initializeVault,
  lockVault,
  readLegacyState,
  restoreEncryptedBackup,
  saveVaultState,
  unlockWithDevice,
  unlockWithRecovery,
} from "./secure-vault.js";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  downloadGoogleBackup,
  isGoogleDriveConfigured,
  isGoogleDriveConnected,
  synchronizeGoogleBackup,
  uploadGoogleBackup,
} from "./drive-sync.js";

const FEELINGS = [
  { id: "great", emoji: "💛", label: "Great" },
  { id: "good", emoji: "🙂", label: "Good" },
  { id: "okay", emoji: "😐", label: "Okay" },
  { id: "bad", emoji: "🙁", label: "Bad" },
  { id: "terrible", emoji: "🌧️", label: "Terrible" },
  { id: "happy", emoji: "😊", label: "Happy" },
  { id: "calm", emoji: "😌", label: "Calm" },
  { id: "grateful", emoji: "🙏", label: "Grateful" },
  { id: "excited", emoji: "🤩", label: "Excited" },
  { id: "inspired", emoji: "✨", label: "Inspired" },
  { id: "productive", emoji: "💪", label: "Productive" },
  { id: "neutral", emoji: "😶", label: "Neutral" },
  { id: "tired", emoji: "🥱", label: "Tired" },
  { id: "stressed", emoji: "😵‍💫", label: "Stressed" },
  { id: "anxious", emoji: "😰", label: "Anxious" },
  { id: "sad", emoji: "😢", label: "Sad" },
  { id: "angry", emoji: "😠", label: "Angry" },
  { id: "hopeful", emoji: "🌱", label: "Hopeful" },
  { id: "focused", emoji: "🎯", label: "Focused" },
  { id: "proud", emoji: "🦁", label: "Proud" },
  { id: "loved", emoji: "🥰", label: "Loved" },
  { id: "curious", emoji: "🤔", label: "Curious" },
  { id: "playful", emoji: "😜", label: "Playful" },
  { id: "overwhelmed", emoji: "🫠", label: "Overwhelmed" },
  { id: "lonely", emoji: "🥀", label: "Lonely" },
];
const COLORS = ["#ff8f3d", "#39bd91", "#32afe0", "#9478e8", "#f2697a", "#f5b624"];
const PROMPTS = [
  "What made today feel distinctly yours?",
  "What are you carrying that you could gently set down?",
  "Where did you notice a small moment of beauty today?",
  "What would make tomorrow feel meaningful rather than merely productive?",
  "What are you learning about the way your energy moves?",
  "Name one thing you did today that your future self will appreciate.",
  "If today had a title, what would it be?",
  "What deserves more of your attention right now?",
  "What felt easier than expected, and why?",
  "What are you grateful you did not rush?",
];

const icon = (name) => {
  const paths = {
    dashboard: '<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z"/><path d="M9 21h6"/>',
    journal: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v18H6.5A2.5 2.5 0 0 0 4 23.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v18h5.5a2.5 2.5 0 0 1 2.5 2.5Z"/>',
    habits: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.06.06-2.83 2.83-.06-.06a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21H9.83v-.09a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-.06.06-2.83-2.83.06-.06a1.8 1.8 0 0 0 .36-2A1.8 1.8 0 0 0 2.61 13H2.5V9h.11a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-2l-.06-.06L6.67 3l.06.06a1.8 1.8 0 0 0 2 .36A1.8 1.8 0 0 0 9.83 1.8V1.7h4v.1a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.06-.06 2.83 2.83-.06.06a1.8 1.8 0 0 0-.36 2A1.8 1.8 0 0 0 21.05 9h.11v4h-.11A1.8 1.8 0 0 0 19.4 15Z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
    chevronUp: '<path d="m18 15-6-6-6 6"/>',
    chevronDown: '<path d="m6 9 6 6 6-6"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    spark: '<path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5Z"/><path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z"/>',
    download: '<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M5 21h14"/>',
    trash: '<path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14"/>',
    edit: '<path d="M12 20h9"/><path d="m16.5 3.5 4 4L8 20l-5 1 1-5Z"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
  };
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || ""}</svg>`;
};

const uid = () => crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now();
const pad = (value) => String(value).padStart(2, "0");
const dateKey = (date = new Date()) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key) => {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
};
const shiftDate = (key, amount) => {
  const date = fromKey(key);
  date.setDate(date.getDate() + amount);
  return dateKey(date);
};
const diffDays = (a, b) => Math.floor((fromKey(a) - fromKey(b)) / 86400000);
const formatDate = (key, options = { weekday: "long", month: "long", day: "numeric" }) =>
  new Intl.DateTimeFormat(undefined, options).format(fromKey(key));
const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
})[character]);
const feeling = (id) => FEELINGS.find((item) => item.id === id);
const feelingTag = (prefix, id) => {
  const item = feeling(id);
  return item ? `${prefix}${item.label.replace(/\s+/g, "")}` : "";
};
const isFeelingTag = (tag) => FEELINGS.some((item) => tag === feelingTag("b", item.id) || tag === feelingTag("a", item.id));
const mergeFeelingTags = (tags = [], before = "", after = "") => {
  const manual = tags.filter((tag) => !isFeelingTag(tag));
  return [...new Set([...manual, feelingTag("b", before), feelingTag("a", after)].filter(Boolean))];
};
const renderFeelingTags = (before = "", after = "") => {
  const tags = [feelingTag("b", before), feelingTag("a", after)].filter(Boolean);
  return tags.length ? tags.map((tag) => `<span class="emotion-tag">#${tag}</span>`).join("") : '<span class="feeling-tag-hint">No feeling tags selected</span>';
};
const sanitizeHtml = (value = "") => {
  const doc = new DOMParser().parseFromString(value, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed").forEach((node) => node.remove());
  doc.querySelectorAll("*").forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      if (attribute.name.startsWith("on") || ["src", "href"].includes(attribute.name)) node.removeAttribute(attribute.name);
    });
  });
  return doc.body.innerHTML;
};

const createDefaultState = () => {
  const today = dateKey();
  const habitNames = [
    ["Morning affirmation & journaling", "#9478e8", true],
    ["Exercise", "#ff8f3d", true],
    ["Drink water", "#32afe0", true],
    ["Read", "#39bd91", false],
    ["Daily planning standup", "#2774a7", false],
    ["Language practice", "#f5b624", false],
  ];
  const habits = habitNames.map(([name, color, priority], index) => ({
    id: uid(),
    name,
    color,
    frequency: "daily",
    reflectionPrompt: index === 1 ? "How did moving your body affect your energy?" : "",
    missedTime: "21:00",
    autoPriority: true,
    priority,
    createdAt: today,
  }));
  return {
    version: 1,
    habits,
    habitLogs: [],
    bullets: [],
    journals: [],
    collections: [],
    settings: {
      priorityOrder: habits.filter((habit) => habit.priority).map((habit) => habit.id),
      healthDays: 3,
      reminders: false,
    },
  };
};

const normalizeState = (candidate) => {
  const fallback = createDefaultState();
  if (!candidate || typeof candidate !== "object") return fallback;
  return {
    ...fallback,
    ...candidate,
    habits: Array.isArray(candidate.habits) ? candidate.habits : fallback.habits,
    habitLogs: Array.isArray(candidate.habitLogs) ? candidate.habitLogs : [],
    bullets: Array.isArray(candidate.bullets) ? candidate.bullets : [],
    journals: Array.isArray(candidate.journals) ? candidate.journals : [],
    collections: Array.isArray(candidate.collections) ? candidate.collections : [],
    settings: { ...fallback.settings, ...(candidate.settings || {}) },
  };
};

let state = createDefaultState();
let appUnlocked = false;
let pendingRecoveryCode = "";
let pendingRemoteBackup = null;
let restoreReturnToApp = false;
let securityBusy = false;
let lastSyncMessage = "Not connected";
let autoSyncTimer = null;
let deviceUnlockAvailable = false;

const migrateState = (candidate) => {
  const migrated = normalizeState(candidate);
  migrated.bullets.forEach((entry) => {
    entry.tags = mergeFeelingTags(entry.tags || [], entry.creationFeeling || "", entry.completionFeeling || "");
  });
  migrated.journals.forEach((entry) => {
    entry.beforeFeeling = entry.beforeFeeling || entry.mood || "";
    entry.afterFeeling = entry.afterFeeling || "";
    entry.tags = mergeFeelingTags(entry.tags || [], entry.beforeFeeling, entry.afterFeeling);
  });
  return migrated;
};

const ui = {
  page: "dashboard",
  selectedDate: dateKey(),
  journalMode: "bullet",
  habitView: "cards",
  bulletType: "task",
  creationFeeling: "",
  classicBeforeFeeling: null,
  classicAfterFeeling: null,
  selectedAnnualHabit: state.habits[0]?.id || "",
  modal: null,
  editingHabitId: null,
  pendingBulletId: null,
  pendingHabitId: null,
  pendingHabitDate: null,
  installPrompt: null,
};

const save = () => {
  if (!appUnlocked) return Promise.resolve();
  return saveVaultState(state)
    .then(() => {
      if (isGoogleDriveConnected()) {
        clearTimeout(autoSyncTimer);
        autoSyncTimer = setTimeout(() => performDriveSync({ background: true }), 1200);
      }
    })
    .catch((error) => toast(error.message));
};
const toast = (message) => {
  const region = document.querySelector("#toast-region");
  const item = document.createElement("div");
  item.className = "toast";
  item.textContent = message;
  region.append(item);
  setTimeout(() => item.remove(), 2800);
};

const getHabitLog = (habitId, date = ui.selectedDate) =>
  state.habitLogs.find((log) => log.habitId === habitId && log.date === date);
const completedOn = (habitId, date) => Boolean(getHabitLog(habitId, date)?.completed);
const completedTodayCount = () => state.habits.filter((habit) => completedOn(habit.id, dateKey())).length;
const habitStreak = (habitId, end = dateKey()) => {
  let streak = 0;
  let cursor = end;
  if (!completedOn(habitId, cursor)) cursor = shiftDate(cursor, -1);
  while (completedOn(habitId, cursor)) {
    streak += 1;
    cursor = shiftDate(cursor, -1);
  }
  return streak;
};
const lastCompleted = (habitId) =>
  state.habitLogs.filter((log) => log.habitId === habitId && log.completed).sort((a, b) => b.date.localeCompare(a.date))[0]?.date;
const neglectedDays = (habit) => {
  const last = lastCompleted(habit.id);
  return Math.max(0, diffDays(dateKey(), last || habit.createdAt));
};
const priorityHabits = () => {
  const byId = new Map(state.habits.map((habit) => [habit.id, habit]));
  const ordered = state.settings.priorityOrder.map((id) => byId.get(id)).filter(Boolean);
  state.habits.filter((habit) => habit.priority && !ordered.includes(habit)).forEach((habit) => ordered.push(habit));
  return ordered;
};
const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
};

const navButton = (page, label, iconName) => `
  <button class="nav-button ${ui.page === page ? "active" : ""}" data-action="navigate" data-page="${page}">
    ${icon(iconName)}<span>${label}</span>
  </button>`;

const securityBrand = () => `<div class="security-brand"><div class="brand-mark">${icon("journal")}</div><div><strong>Zenith</strong><span>Private journal vault</span></div></div>`;

const renderSecuritySetup = (message = "") => {
  document.querySelector("#app").innerHTML = `<main class="security-shell"><section class="security-card">
    ${securityBrand()}
    <p class="eyebrow">Encrypted on this device</p>
    <h1>Secure your journal</h1>
    <p class="security-lead">Zenith will replace readable browser storage with an AES-256 encrypted vault. You will receive one offline recovery code.</p>
    ${message ? `<div class="security-message">${escapeHtml(message)}</div>` : ""}
    <div class="security-feature-list">
      <div><span>01</span><p><strong>Daily unlock</strong>Windows Hello or your phone's screen lock when supported.</p></div>
      <div><span>02</span><p><strong>Recovery</strong>A private code that can restore or authorize another device.</p></div>
      <div><span>03</span><p><strong>Cloud privacy</strong>Only encrypted data is eligible for Google Drive sync.</p></div>
    </div>
    <label class="security-check"><input id="setup-device-unlock" type="checkbox" ${deviceUnlockAvailable ? "checked" : "disabled"}><span><strong>Set up device unlock now</strong><small>${deviceUnlockAvailable ? "Your system will show its secure Windows Hello or biometric prompt." : "Requires HTTPS and a browser with WebAuthn PRF support. Recovery-code unlock will still work."}</small></span></label>
    <button class="primary-button security-primary" data-action="secure-create" ${securityBusy ? "disabled" : ""}>${securityBusy ? "Creating encrypted vault…" : "Create secure vault"}</button>
    <div class="security-divider"><span>or</span></div>
    <button class="ghost-button security-primary" data-action="restore-drive" ${!isGoogleDriveConfigured() || securityBusy ? "disabled" : ""}>Restore encrypted Google Drive backup</button>
    ${!isGoogleDriveConfigured() ? '<p class="security-footnote">Google Drive becomes available after its OAuth client ID is added to <code>config.js</code>.</p>' : ""}
  </section></main>`;
};

const renderRecoveryCodeScreen = (result) => {
  document.querySelector("#app").innerHTML = `<main class="security-shell"><section class="security-card recovery-card">
    ${securityBrand()}
    <p class="eyebrow">One-time recovery step</p>
    <h1>Save this recovery code</h1>
    <p class="security-lead">It is the only fallback if your PC or phone is lost, reset, or unable to use device unlock. Zenith erases its temporary readable copy after you confirm it is saved.</p>
    <div class="recovery-code" aria-label="Zenith recovery code">${escapeHtml(pendingRecoveryCode)}</div>
    <div class="button-row"><button class="ghost-button" data-action="copy-recovery">Copy code</button><button class="ghost-button" data-action="download-recovery">Download text file</button></div>
    <label class="security-check"><input id="recovery-confirmed" type="checkbox"><span><strong>I saved it outside this device</strong><small>Do not store the only copy beside the encrypted backup.</small></span></label>
    ${result.deviceUnlock ? '<div class="security-success">Device unlock is ready.</div>' : `<div class="security-message">The vault is encrypted, but device unlock was not enrolled. ${escapeHtml(result.deviceError || "Use the recovery code to unlock.")}</div>`}
    <button class="primary-button security-primary" data-action="finish-security-setup">Enter Zenith</button>
  </section></main>`;
};

const renderUnlockScreen = (message = "") => {
  const status = getVaultStatus();
  document.querySelector("#app").innerHTML = `<main class="security-shell"><section class="security-card unlock-card">
    ${securityBrand()}
    <p class="eyebrow">Encrypted journal</p>
    <h1>Welcome back</h1>
    <p class="security-lead">Unlocking happens on this device. Google Drive and GitHub never receive a readable journal.</p>
    ${message ? `<div class="security-message">${escapeHtml(message)}</div>` : ""}
    ${status.deviceUnlock ? `<button class="primary-button security-primary" data-action="secure-unlock-device" ${securityBusy ? "disabled" : ""}>${securityBusy ? "Waiting for device…" : `Unlock with ${escapeHtml(status.deviceLabel)}`}</button>` : '<div class="security-message">Device unlock is not configured here. Use your recovery code, then add this device.</div>'}
    <details class="recovery-unlock"><summary>Use recovery code</summary><form id="recovery-unlock-form" class="classic-form"><div class="field"><label for="recovery-code-input">Recovery code</label><input class="input recovery-input" id="recovery-code-input" name="recoveryCode" autocomplete="off" spellcheck="false" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" required></div><label class="security-check compact"><input name="enrollDevice" type="checkbox" ${deviceUnlockAvailable ? "checked" : "disabled"}><span><strong>Add device unlock after recovery</strong></span></label><button class="ghost-button" type="submit">Unlock with recovery code</button></form></details>
    <button class="text-button" data-action="restore-drive" ${!isGoogleDriveConfigured() || securityBusy ? "disabled" : ""}>Restore from encrypted Google Drive backup</button>
  </section></main>`;
};

const renderDriveRestoreScreen = (message = "") => {
  document.querySelector("#app").innerHTML = `<main class="security-shell"><section class="security-card unlock-card">
    ${securityBrand()}
    <p class="eyebrow">Encrypted Google Drive backup found</p>
    <h1>Recover this device</h1>
    <p class="security-lead">Enter the offline recovery code that was created with this vault. The encrypted backup is decrypted only in this browser.</p>
    ${message ? `<div class="security-message">${escapeHtml(message)}</div>` : ""}
    <form id="drive-restore-form" class="classic-form"><div class="field"><label for="drive-recovery-code">Recovery code</label><input class="input recovery-input" id="drive-recovery-code" name="recoveryCode" autocomplete="off" spellcheck="false" required></div><label class="security-check compact"><input name="enrollDevice" type="checkbox" ${deviceUnlockAvailable ? "checked" : "disabled"}><span><strong>Enable device unlock here</strong></span></label><button class="primary-button" type="submit">Decrypt and restore</button></form>
    <button class="text-button" data-action="cancel-drive-restore">Cancel</button>
  </section></main>`;
};

const enterUnlockedApp = (unlockedState, message = "Zenith unlocked") => {
  state = migrateState(unlockedState);
  appUnlocked = true;
  ui.selectedAnnualHabit = state.habits[0]?.id || "";
  applyAutoPriority();
  renderShell();
  toast(message);
};

const performDriveSync = async ({ background = false } = {}) => {
  try {
    if (!isGoogleDriveConfigured()) throw new Error("Google Drive needs an OAuth client ID in config.js.");
    if (!isGoogleDriveConnected()) {
      if (background) return;
      await connectGoogleDrive();
    }
    const result = await synchronizeGoogleBackup(getEncryptedBackup());
    if (result.action === "download") {
      if (background) {
        lastSyncMessage = "Newer backup available—tap Sync now";
        toast(lastSyncMessage);
        return;
      }
      state = migrateState(await adoptRemoteBackup(result.bundle));
      lastSyncMessage = `Downloaded ${new Date(result.bundle.payload.updatedAt).toLocaleString()}`;
      renderShell();
      toast("Newer encrypted backup downloaded");
      return;
    }
    lastSyncMessage = result.action === "uploaded" ? "Encrypted backup uploaded" : "Drive backup is current";
    if (!background) {
      renderShell();
      toast(lastSyncMessage);
    }
  } catch (error) {
    lastSyncMessage = error.message;
    if (!background) {
      renderShell();
      toast(error.message);
    }
  }
};

const renderShell = () => {
  document.querySelector("#app").innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">${icon("journal")}</div>
          <div class="brand-copy"><strong>Zenith</strong><span>Journal & habits</span></div>
        </div>
        <nav class="nav-list" aria-label="Primary">
          ${navButton("dashboard", "Dashboard", "dashboard")}
          ${navButton("journal", "Journal", "journal")}
          ${navButton("habits", "Habits", "habits")}
        </nav>
        <div class="sidebar-footer">
          <button class="nav-button" data-action="open-settings">${icon("settings")}<span>Data & settings</span></button>
          <div class="privacy-note"><strong>Encrypted by design</strong>Readable entries stay in memory only while Zenith is unlocked.</div>
        </div>
      </aside>
      <main class="main-shell">${renderPage()}</main>
      <nav class="mobile-nav" aria-label="Primary">
        ${navButton("dashboard", "Today", "dashboard")}
        ${navButton("journal", "Journal", "journal")}
        ${navButton("habits", "Habits", "habits")}
      </nav>
    </div>
    ${renderModal()}
  `;
};

const settingsButton = () => `
  <button class="ghost-button" data-action="open-settings" aria-label="Settings">${icon("settings")}<span class="settings-label sr-only">Settings</span></button>`;

const renderDashboard = () => {
  const priorities = priorityHabits();
  const neglected = state.habits.filter((habit) => neglectedDays(habit) >= state.settings.healthDays);
  const count = completedTodayCount();
  const percentage = state.habits.length ? Math.round((count / state.habits.length) * 100) : 0;
  return `
    <section class="page">
      <header class="page-header">
        <div><p class="eyebrow">${icon("spark")} Zenith</p><h1>${greeting()}</h1><p class="subhead">${formatDate(dateKey())}</p></div>
        <div class="header-actions">${settingsButton()}</div>
      </header>
      ${neglected.length ? `
        <div class="health-banner">
          <div>${icon("habits")}<span><strong>${escapeHtml(neglected[0].name)}</strong> could use a little attention.</span></div>
          <button class="small-button ghost-button" data-action="navigate-health">Review habits</button>
        </div>` : ""}
      <div class="section-stack">
        <section class="card">
          <div class="card-header"><h2 class="card-title">${icon("habits")} Today's priority habits</h2><span class="badge">${priorities.length} priorities</span></div>
          <div class="card-body">
            <div class="priority-list">
              ${priorities.length ? priorities.map(renderPriorityItem).join("") : `<div class="empty-state"><div>Choose a habit’s edit menu to make it a priority.</div></div>`}
            </div>
          </div>
        </section>
        <div class="dashboard-grid">
          <section class="card">
            <div class="card-header"><h2 class="card-title">${icon("chart")} This week's rhythm</h2><span class="badge">${percentage}% today</span></div>
            <div class="card-body">${renderWeekBars()}</div>
          </section>
          <div class="quick-grid">
            <button class="quick-card journal" data-action="navigate" data-page="journal">
              ${icon("journal")}<strong>Daily journal</strong><span>${state.bullets.filter((entry) => entry.date === dateKey()).length} bullets today</span>
            </button>
            <button class="quick-card habits" data-action="navigate" data-page="habits">
              ${icon("habits")}<strong>Habit tracker</strong><span>${count} of ${state.habits.length} complete</span>
              <div class="mini-progress"><i style="width:${percentage}%"></i></div>
            </button>
          </div>
        </div>
      </div>
    </section>`;
};

const renderPriorityItem = (habit, index) => {
  const done = completedOn(habit.id, dateKey());
  const neglected = neglectedDays(habit);
  return `
    <div class="priority-item" style="--habit-color:${habit.color}">
      <div class="reorder-buttons">
        <button class="mini-icon" data-action="priority-up" data-id="${habit.id}" aria-label="Move up" ${index === 0 ? "disabled" : ""}>${icon("chevronUp")}</button>
        <button class="mini-icon" data-action="priority-down" data-id="${habit.id}" aria-label="Move down" ${index === priorityHabits().length - 1 ? "disabled" : ""}>${icon("chevronDown")}</button>
      </div>
      <div class="priority-copy">
        <strong>${escapeHtml(habit.name)}</strong>
        <div class="priority-meta"><span class="badge">🔥 ${habitStreak(habit.id)} day streak</span>${neglected >= state.settings.healthDays ? `<span class="badge attention">${neglected} days</span>` : ""}</div>
      </div>
      <button class="soft-button complete-button ${done ? "done" : ""}" data-action="toggle-habit" data-id="${habit.id}" data-date="${dateKey()}">${done ? "Completed" : "Complete"}</button>
    </div>`;
};

const weekKeys = (ending = dateKey()) => Array.from({ length: 7 }, (_, index) => shiftDate(ending, index - 6));
const renderWeekBars = () => {
  const days = weekKeys();
  const max = Math.max(1, state.habits.length + 3);
  return `
    <div class="week-bars">
      ${days.map((day) => {
        const habits = state.habitLogs.filter((log) => log.date === day && log.completed).length;
        const bullets = state.bullets.filter((entry) => entry.date === day).length;
        const journals = state.journals.some((entry) => entry.date === day && entry.html) ? 1 : 0;
        return `<div class="day-bar">
          <div class="bar-track" title="${habits} habits, ${bullets} bullets, ${journals} journal">
            <i class="bar-part habits" style="height:${Math.min(100, habits / max * 100)}%"></i>
            <i class="bar-part bullets" style="height:${Math.min(45, bullets / max * 100)}%"></i>
            <i class="bar-part journals" style="height:${journals ? 12 : 0}%"></i>
          </div>
          <span class="day-label ${day === dateKey() ? "today" : ""}">${formatDate(day, { weekday: "short" }).slice(0, 2)}</span>
        </div>`;
      }).join("")}
    </div>
    <div class="legend"><span><i style="background:var(--green)"></i>Habits</span><span><i style="background:#82796e"></i>Bullets</span><span><i style="background:var(--purple)"></i>Journal</span></div>`;
};

const dateNavigator = () => `
  <div class="date-nav">
    <button class="icon-button" data-action="date-shift" data-amount="-1" aria-label="Previous day">${icon("chevronLeft")}</button>
    <button class="date-pill" data-action="date-today">${icon("calendar")}${ui.selectedDate === dateKey() ? "Today" : formatDate(ui.selectedDate, { month: "short", day: "numeric" })}</button>
    <button class="icon-button" data-action="date-shift" data-amount="1" aria-label="Next day">${icon("chevronRight")}</button>
  </div>`;

const renderJournal = () => `
  <section class="page">
    <header class="page-header">
      <div><p class="eyebrow">Daily log</p><h1>${ui.selectedDate === dateKey() ? "Today" : formatDate(ui.selectedDate, { weekday: "long" })}</h1><p class="subhead">${formatDate(ui.selectedDate, { month: "long", day: "numeric", year: "numeric" })}</p></div>
      <div class="header-actions">${dateNavigator()}</div>
    </header>
    <div class="segmented journal-tabs">
      <button class="segment ${ui.journalMode === "bullet" ? "active" : ""}" data-action="journal-mode" data-mode="bullet">${icon("calendar")} Bullet journal</button>
      <button class="segment ${ui.journalMode === "classic" ? "active" : ""}" data-action="journal-mode" data-mode="classic">${icon("journal")} Classic journal</button>
    </div>
    ${ui.journalMode === "bullet" ? renderBulletJournal() : renderClassicJournal()}
  </section>`;

const bulletSymbol = (type, status = "open") => {
  if (type === "note") return "–";
  if (type === "event") return "○";
  return { open: "•", done: "✓", migrated: "›", cancelled: "×" }[status] || "•";
};

const renderFeelingSelector = (target, selected = "", label = "Feeling") => {
  const selectedFeeling = feeling(selected);
  const selectedLabel = selectedFeeling ? `${selectedFeeling.emoji} ${selectedFeeling.label}` : "None";
  return `<details class="feeling-select" data-feeling-select="${target}">
    <summary><span>${escapeHtml(label)}</span><strong>${selectedLabel}</strong></summary>
    <div class="feeling-menu">
      <button class="feeling-option ${selected ? "" : "active"}" type="button" data-action="pick-feeling" data-target="${target}" data-feeling=""><span class="feeling-option-emoji">—</span><span>None</span></button>
      ${FEELINGS.map((item) => `<button class="feeling-option ${selected === item.id ? "active" : ""}" type="button" data-action="pick-feeling" data-target="${target}" data-feeling="${item.id}"><span class="feeling-option-emoji">${item.emoji}</span><span>${item.label}</span></button>`).join("")}
    </div>
  </details>`;
};

const renderFeelingGrid = (action, selected = "") => `<div class="feeling-grid">
  <button class="mood-button ${selected ? "" : "active"}" type="button" data-action="${action}" data-feeling=""><span class="emoji">—</span><span>None</span></button>
  ${FEELINGS.map((item) => `<button class="mood-button ${selected === item.id ? "active" : ""}" type="button" data-action="${action}" data-feeling="${item.id}"><span class="emoji">${item.emoji}</span><span>${item.label}</span></button>`).join("")}
</div>`;

const renderBulletJournal = () => {
  const entries = state.bullets.filter((entry) => entry.date === ui.selectedDate).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return `
    <section class="card quick-add-card">
      <form id="quick-add-form">
        <div class="quick-add">
          <button class="bullet-type-button" type="button" data-action="cycle-bullet-type" title="Entry type: ${ui.bulletType}">${bulletSymbol(ui.bulletType)}</button>
          <label class="sr-only" for="quick-entry">Add a new entry</label>
          <input id="quick-entry" name="text" autocomplete="off" placeholder="Add a ${ui.bulletType}…" required />
          <button class="icon-button" type="submit" aria-label="Add entry">${icon("plus")}</button>
        </div>
        <div class="quick-add-feeling">
          ${renderFeelingSelector("bullet-before", ui.creationFeeling, "Before")}
          <div class="generated-feeling-tags">${renderFeelingTags(ui.creationFeeling, "")}</div>
        </div>
      </form>
    </section>
    <section class="card" style="margin-top:18px">
      <div class="card-header"><h2 class="card-title">${icon("journal")} Entries</h2><span class="badge">${entries.length}</span></div>
      <div class="card-body">
        <div class="entry-list">
          ${entries.length ? entries.map(renderBulletEntry).join("") : `<div class="empty-state"><div>${icon("calendar")}<p>No entries for this day yet.</p></div></div>`}
        </div>
      </div>
    </section>`;
};

const renderBulletEntry = (entry) => `
  <article class="entry-item">
    <button class="status-button" data-action="cycle-entry-status" data-id="${entry.id}" aria-label="Cycle entry status">${bulletSymbol(entry.type, entry.status)}</button>
    <div>
      <div class="entry-text ${entry.status}">${escapeHtml(entry.text)}</div>
      <div class="entry-meta">
        <span>${entry.type}</span>
        ${entry.creationFeeling ? `<span class="feeling-dot" title="Before: ${feeling(entry.creationFeeling)?.label || ""}">${feeling(entry.creationFeeling)?.emoji || ""}</span>` : ""}
        ${entry.completionFeeling ? `<span>→</span><span class="feeling-dot" title="After: ${feeling(entry.completionFeeling)?.label || ""}">${feeling(entry.completionFeeling)?.emoji || ""}</span>` : ""}
        ${(entry.tags || []).filter(isFeelingTag).map((tag) => `<span class="emotion-tag">#${escapeHtml(tag)}</span>`).join("")}
      </div>
    </div>
    <button class="mini-icon" data-action="delete-entry" data-id="${entry.id}" aria-label="Delete entry">${icon("trash")}</button>
  </article>`;

const currentJournal = () => state.journals.find((entry) => entry.date === ui.selectedDate);
const renderClassicJournal = () => {
  const entry = currentJournal() || {};
  if (ui.classicBeforeFeeling === null) ui.classicBeforeFeeling = entry.beforeFeeling || entry.mood || "";
  if (ui.classicAfterFeeling === null) ui.classicAfterFeeling = entry.afterFeeling || "";
  const prompt = entry.prompt || PROMPTS[Math.abs(diffDays(ui.selectedDate, "2026-01-01")) % PROMPTS.length];
  const manualTags = (entry.tags || []).filter((tag) => !isFeelingTag(tag));
  return `
    <section class="card">
      <div class="card-header"><h2 class="card-title">${icon("journal")} Journal entry</h2><span class="badge">Auto-saved when you tap Save</span></div>
      <div class="card-body">
        <form id="classic-form" class="classic-form">
          <div class="prompt-card">
            <div class="prompt-top"><span class="prompt-label">Today's anchor prompt</span><button class="shuffle-button" type="button" data-action="shuffle-prompt">↻ Shuffle</button></div>
            <p class="prompt-text" id="prompt-text">${escapeHtml(prompt)}</p>
          </div>
          <div class="field"><label for="journal-title">Title <span style="color:var(--muted);font-weight:400">(optional)</span></label><input class="input" id="journal-title" name="title" value="${escapeHtml(entry.title || "")}" placeholder="Give your entry a title…" /></div>
          <div class="field"><label>How did your feelings change?</label><div class="feeling-pair">${renderFeelingSelector("classic-before", ui.classicBeforeFeeling, "Before writing")}${renderFeelingSelector("classic-after", ui.classicAfterFeeling, "After writing")}</div><div id="classic-feeling-tags" class="generated-feeling-tags">${renderFeelingTags(ui.classicBeforeFeeling, ui.classicAfterFeeling)}</div></div>
          <div class="field"><label for="journal-editor">Your thoughts</label><div id="journal-editor" class="rich-editor" contenteditable="true" role="textbox" aria-multiline="true" data-placeholder="Write freely. This stays on your device…">${sanitizeHtml(entry.html || "")}</div></div>
          <div class="field"><label for="journal-tags">Other tags</label><input class="input" id="journal-tags" name="tags" value="${escapeHtml(manualTags.join(", "))}" placeholder="reflection, work, gratitude…" /></div>
          <button class="primary-button" type="submit">Save entry</button>
        </form>
      </div>
    </section>`;
};

const renderHabits = () => {
  const total = state.habits.length;
  const completed = state.habits.filter((habit) => completedOn(habit.id, ui.selectedDate)).length;
  const percent = total ? Math.round(completed / total * 100) : 0;
  const best = Math.max(0, ...state.habits.map((habit) => habitStreak(habit.id)));
  return `
    <section class="page">
      <header class="page-header">
        <div><p class="eyebrow">Practice makes rhythm</p><h1>Habits</h1><p class="subhead">${formatDate(ui.selectedDate)}</p></div>
        <div class="header-actions"><button class="primary-button" data-action="new-habit">＋ New habit</button></div>
      </header>
      <div class="stats">
        <div class="stat"><strong>${completed}/${total}</strong><span>Completed</span></div>
        <div class="stat"><strong>${percent}%</strong><span>Daily progress</span></div>
        <div class="stat"><strong>${best}</strong><span>Best streak</span></div>
      </div>
      <div class="button-row" style="justify-content:space-between;margin-bottom:18px">
        <div class="segmented">
          <button class="segment ${ui.habitView === "cards" ? "active" : ""}" data-action="habit-view" data-view="cards">Cards</button>
          <button class="segment ${ui.habitView === "week" ? "active" : ""}" data-action="habit-view" data-view="week">Week</button>
          <button class="segment ${ui.habitView === "year" ? "active" : ""}" data-action="habit-view" data-view="year">Year</button>
          <button class="segment ${ui.habitView === "health" ? "active" : ""}" data-action="habit-view" data-view="health">Health</button>
        </div>
        ${dateNavigator()}
      </div>
      ${renderHabitView()}
    </section>`;
};

const renderHabitView = () => {
  if (ui.habitView === "week") return renderWeekTracker();
  if (ui.habitView === "year") return renderAnnualTracker();
  if (ui.habitView === "health") return renderHealthCheck();
  return state.habits.length
    ? `<div class="habit-grid">${state.habits.map(renderHabitCard).join("")}</div>`
    : `<div class="card empty-state"><div>${icon("habits")}<p>Create your first habit to start tracking.</p><button class="primary-button" data-action="new-habit">New habit</button></div></div>`;
};

const renderHabitCard = (habit) => {
  const done = completedOn(habit.id, ui.selectedDate);
  const total = state.habitLogs.filter((log) => log.habitId === habit.id && log.completed).length;
  return `
    <article class="habit-card" style="--habit-color:${habit.color}">
      <div class="habit-card-top">
        <h3>${escapeHtml(habit.name)}</h3>
        <div class="habit-actions">
          <button class="mini-icon" data-action="edit-habit" data-id="${habit.id}" aria-label="Edit ${escapeHtml(habit.name)}">${icon("edit")}</button>
          <button class="mini-icon" data-action="delete-habit" data-id="${habit.id}" aria-label="Delete ${escapeHtml(habit.name)}">${icon("trash")}</button>
        </div>
      </div>
      <div class="habit-stats"><span><strong>${habitStreak(habit.id)}</strong> day streak</span><span><strong>${total}</strong> total</span></div>
      <button class="soft-button habit-complete ${done ? "done" : ""}" data-action="toggle-habit" data-id="${habit.id}" data-date="${ui.selectedDate}">${done ? "✓ Completed" : "Mark complete"}</button>
    </article>`;
};

const renderWeekTracker = () => {
  const days = weekKeys(ui.selectedDate);
  return `<section class="card"><div class="card-header"><h2 class="card-title">${icon("calendar")} Seven-day tracker</h2></div><div class="card-body" style="overflow-x:auto">
    <table class="week-table"><thead><tr><th>Habit</th>${days.map((day) => `<th>${formatDate(day, { weekday: "narrow" })}<br>${fromKey(day).getDate()}</th>`).join("")}</tr></thead>
    <tbody>${state.habits.map((habit) => `<tr style="--habit-color:${habit.color}"><td>${escapeHtml(habit.name)}</td>${days.map((day) => `<td><button class="check-cell ${completedOn(habit.id, day) ? "done" : ""}" data-action="toggle-habit" data-id="${habit.id}" data-date="${day}" aria-label="Toggle ${escapeHtml(habit.name)} on ${day}">${completedOn(habit.id, day) ? icon("check") : ""}</button></td>`).join("")}</tr>`).join("")}</tbody></table>
  </div></section>`;
};

const renderAnnualTracker = () => {
  const habit = state.habits.find((item) => item.id === ui.selectedAnnualHabit) || state.habits[0];
  if (!habit) return `<div class="card empty-state">Create a habit to see its annual tracker.</div>`;
  const year = fromKey(ui.selectedDate).getFullYear();
  return `<section class="card"><div class="card-header"><h2 class="card-title">${icon("chart")} Annual tracker</h2><span class="badge">${year}</span></div><div class="card-body">
    <div class="annual-toolbar"><div class="field"><label for="annual-habit">Habit</label><select class="select" id="annual-habit" data-action="annual-habit">${state.habits.map((item) => `<option value="${item.id}" ${item.id === habit.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`).join("")}</select></div><span class="badge">${state.habitLogs.filter((log) => log.habitId === habit.id && log.date.startsWith(String(year)) && log.completed).length} completions</span></div>
    <div class="year-grid" style="--habit-color:${habit.color}">${Array.from({ length: 12 }, (_, month) => renderMonth(habit, year, month)).join("")}</div>
  </div></section>`;
};

const renderMonth = (habit, year, month) => {
  const total = new Date(year, month + 1, 0).getDate();
  return `<div class="month-block"><div class="month-label">${new Intl.DateTimeFormat(undefined, { month: "short" }).format(new Date(year, month, 1))}</div><div class="month-days">${Array.from({ length: total }, (_, index) => {
    const day = dateKey(new Date(year, month, index + 1));
    return `<i class="year-day ${completedOn(habit.id, day) ? "done" : ""} ${day > dateKey() ? "future" : ""}" title="${day}"></i>`;
  }).join("")}</div></div>`;
};

const renderHealthCheck = () => {
  const sorted = [...state.habits].sort((a, b) => neglectedDays(b) - neglectedDays(a));
  return `<section class="card"><div class="card-header"><h2 class="card-title">${icon("habits")} Habit health check</h2><span class="badge">Attention after ${state.settings.healthDays} days</span></div><div class="card-body"><div class="health-list">
    ${sorted.map((habit) => {
      const days = neglectedDays(habit);
      const label = days === 0 ? "Completed recently" : days === 1 ? "Last completed yesterday" : `${days} days since completion`;
      return `<div class="health-row" style="--habit-color:${habit.color}"><i class="health-dot"></i><div class="health-copy"><strong>${escapeHtml(habit.name)}</strong><span>${label}</span></div><span class="badge ${days >= state.settings.healthDays ? "attention" : ""}">${days >= state.settings.healthDays ? "Review" : "Healthy"}</span></div>`;
    }).join("")}
  </div></div></section>`;
};

const renderModal = () => {
  if (!ui.modal) return "";
  if (ui.modal === "habit") return renderHabitModal();
  if (ui.modal === "completion-feeling") return renderFeelingModal();
  if (ui.modal === "reflection") return renderReflectionModal();
  if (ui.modal === "settings") return renderSettingsModal();
  return "";
};

const modalShell = (title, body, footer = "") => `
  <div class="modal-backdrop" data-action="modal-backdrop">
    <section class="modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <header class="modal-header"><h2>${escapeHtml(title)}</h2><button class="icon-button" data-action="close-modal" aria-label="Close">${icon("close")}</button></header>
      <div class="modal-body">${body}</div>${footer ? `<footer class="modal-footer">${footer}</footer>` : ""}
    </section>
  </div>`;

const renderHabitModal = () => {
  const habit = state.habits.find((item) => item.id === ui.editingHabitId) || {
    name: "", color: COLORS[1], frequency: "daily", reflectionPrompt: "", missedTime: "21:00", autoPriority: true, priority: false,
  };
  const body = `<form id="habit-form" class="classic-form">
    <div class="field"><label for="habit-name">Habit name</label><input class="input" id="habit-name" name="name" value="${escapeHtml(habit.name)}" placeholder="Morning meditation" required /></div>
    <div class="field"><label>Color</label><div class="color-row">${COLORS.map((color) => `<button class="color-button ${color === habit.color ? "active" : ""}" type="button" data-action="select-habit-color" data-color="${color}" style="--color:${color}" aria-label="Choose color ${color}"></button>`).join("")}<input type="hidden" name="color" value="${habit.color}" /></div></div>
    <div class="field"><label for="habit-frequency">Frequency</label><select class="select" id="habit-frequency" name="frequency"><option value="daily" ${habit.frequency === "daily" ? "selected" : ""}>Daily</option><option value="weekly" ${habit.frequency === "weekly" ? "selected" : ""}>Weekly</option></select></div>
    <div class="field"><label for="reflection-prompt">Reflection prompt <span style="font-weight:400;color:var(--muted)">(optional)</span></label><textarea class="textarea" id="reflection-prompt" name="reflectionPrompt" placeholder="How did this habit make you feel?">${escapeHtml(habit.reflectionPrompt)}</textarea></div>
    <div class="field"><label for="missed-time">Missed reflection time</label><input class="input" id="missed-time" name="missedTime" type="time" value="${habit.missedTime || "21:00"}" /></div>
    <div class="switch-row"><div class="switch-copy"><strong>Priority habit</strong><span>Show on the dashboard.</span></div><button class="switch ${habit.priority ? "on" : ""}" type="button" data-action="toggle-form-switch" data-field="priority" aria-pressed="${habit.priority}"></button><input type="hidden" name="priority" value="${habit.priority}"></div>
    <div class="switch-row"><div class="switch-copy"><strong>Auto-prioritize</strong><span>Keep it visible when you miss a day.</span></div><button class="switch ${habit.autoPriority ? "on" : ""}" type="button" data-action="toggle-form-switch" data-field="autoPriority" aria-pressed="${habit.autoPriority}"></button><input type="hidden" name="autoPriority" value="${habit.autoPriority}"></div>
  </form>`;
  const footer = `<button class="ghost-button" data-action="close-modal">Cancel</button><button class="primary-button" data-action="submit-habit">${ui.editingHabitId ? "Save changes" : "Create habit"}</button>`;
  return modalShell(ui.editingHabitId ? "Edit habit" : "New habit", body, footer);
};

const renderFeelingModal = () => {
  const entry = state.bullets.find((item) => item.id === ui.pendingBulletId);
  const body = `<p class="subhead">How do you feel now that this task is complete? This will be logged separately as an <strong>after</strong> feeling.</p>${renderFeelingGrid("completion-feeling", entry?.completionFeeling || "")}`;
  return modalShell("Completion check-in", body, `<button class="ghost-button" data-action="close-modal">Skip</button><span></span>`);
};

const renderReflectionModal = () => {
  const habit = state.habits.find((item) => item.id === ui.pendingHabitId);
  if (!habit) return "";
  const body = `<p class="prompt-text">${escapeHtml(habit.reflectionPrompt)}</p><div class="field"><label for="habit-reflection">A quick reflection</label><textarea class="textarea" id="habit-reflection" placeholder="What did you notice?"></textarea></div>`;
  return modalShell("Pause and notice", body, `<button class="ghost-button" data-action="close-modal">Skip</button><button class="primary-button" data-action="save-reflection">Save reflection</button>`);
};

const renderSettingsModal = () => {
  const install = ui.installPrompt ? `<button class="primary-button" data-action="install-app">Install Zenith</button>` : "";
  const vaultStatus = getVaultStatus();
  const driveConfigured = isGoogleDriveConfigured();
  const body = `
    <div class="settings-section"><h3>Encrypted vault</h3><p class="subhead">Journal content is encrypted locally. The readable key exists only while Zenith is unlocked.</p><div class="security-status-row"><span>Device unlock</span><strong>${vaultStatus.deviceUnlock ? `Ready · ${escapeHtml(vaultStatus.deviceLabel)}` : "Not enrolled"}</strong></div></div>
    <div class="button-row"><button class="ghost-button" data-action="lock-now">Lock now</button><button class="ghost-button" data-action="enroll-device" ${vaultStatus.deviceUnlock || !deviceUnlockAvailable ? "disabled" : ""}>Add device unlock</button></div>
    <div class="settings-section"><h3>Google Drive sync</h3><p class="subhead">Only the encrypted vault and recovery envelope are uploaded to Drive's private app-data folder.</p><div class="security-status-row"><span>Status</span><strong>${escapeHtml(lastSyncMessage)}</strong></div>${driveConfigured ? `<div class="button-row"><button class="primary-button" data-action="sync-drive">${isGoogleDriveConnected() ? "Sync now" : "Connect & sync"}</button>${isGoogleDriveConnected() ? '<button class="ghost-button" data-action="disconnect-drive">Disconnect</button>' : ""}</div>` : '<div class="security-message">Add the Google OAuth client ID to <code>config.js</code> after the final HTTPS address is online.</div>'}</div>
    <div class="settings-section"><h3>Portable encrypted backup</h3><p class="subhead">Safe to keep in ordinary storage. Restoring it still requires the offline recovery code.</p></div>
    <div class="button-row"><button class="ghost-button" data-action="export-data">${icon("download")} Export encrypted backup</button><button class="ghost-button" data-action="import-data">${icon("upload")} Import encrypted backup</button><input id="import-file" class="sr-only" type="file" accept="application/json" /></div>
    <div class="field"><label for="health-days">Health-check threshold</label><select class="select" id="health-days" data-action="health-days"><option value="2" ${state.settings.healthDays === 2 ? "selected" : ""}>2 days</option><option value="3" ${state.settings.healthDays === 3 ? "selected" : ""}>3 days</option><option value="5" ${state.settings.healthDays === 5 ? "selected" : ""}>5 days</option><option value="7" ${state.settings.healthDays === 7 ? "selected" : ""}>7 days</option></select></div>
    <div class="switch-row"><div class="switch-copy"><strong>In-app reminders</strong><span>Show missed-habit reminders while Zenith is open.</span></div><button class="switch ${state.settings.reminders ? "on" : ""}" data-action="toggle-reminders" aria-pressed="${state.settings.reminders}"></button></div>
    ${install}
    <button class="danger-button" data-action="reset-data">Delete encrypted vault from this device</button>
    <p class="subhead">Background push notifications and calendar sync require an online service. This local edition intentionally keeps them off-device.</p>
  `;
  return modalShell("Data & settings", body);
};

const renderPage = () => ui.page === "journal" ? renderJournal() : ui.page === "habits" ? renderHabits() : renderDashboard();

const captureClassicDraft = () => {
  const form = document.querySelector("#classic-form");
  if (!form) return null;
  return {
    title: form.elements.title.value,
    html: document.querySelector("#journal-editor")?.innerHTML || "",
    tags: form.elements.tags.value,
    prompt: document.querySelector("#prompt-text")?.textContent || "",
  };
};

const toggleHabit = (habitId, date) => {
  let log = getHabitLog(habitId, date);
  const habit = state.habits.find((item) => item.id === habitId);
  if (log) {
    log.completed = !log.completed;
    log.completedAt = log.completed ? new Date().toISOString() : null;
  } else {
    log = { id: uid(), habitId, date, completed: true, completedAt: new Date().toISOString(), reflection: "" };
    state.habitLogs.push(log);
  }
  save();
  if (log.completed && habit?.reflectionPrompt) {
    ui.pendingHabitId = habitId;
    ui.pendingHabitDate = date;
    ui.modal = "reflection";
  }
};

const updatePriority = (id, direction) => {
  const order = [...state.settings.priorityOrder];
  const index = order.indexOf(id);
  const next = index + direction;
  if (index < 0 || next < 0 || next >= order.length) return;
  [order[index], order[next]] = [order[next], order[index]];
  state.settings.priorityOrder = order;
  save();
};

const applyAutoPriority = () => {
  const yesterday = shiftDate(dateKey(), -1);
  state.habits.forEach((habit) => {
    if (habit.autoPriority && habit.createdAt <= yesterday && !completedOn(habit.id, yesterday)) {
      habit.priority = true;
      if (!state.settings.priorityOrder.includes(habit.id)) state.settings.priorityOrder.unshift(habit.id);
    }
  });
  save();
};

document.querySelector("#app").addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;

  if (action === "secure-create") {
    const enrollDevice = Boolean(document.querySelector("#setup-device-unlock")?.checked);
    securityBusy = true;
    renderSecuritySetup();
    try {
      state = migrateState(readLegacyState() || state);
      const result = await initializeVault(state, { enrollDevice });
      pendingRecoveryCode = result.recoveryCode;
      securityBusy = false;
      renderRecoveryCodeScreen(result);
    } catch (error) {
      securityBusy = false;
      renderSecuritySetup(error.message);
    }
    return;
  } else if (action === "copy-recovery") {
    try { await navigator.clipboard.writeText(pendingRecoveryCode); toast("Recovery code copied"); }
    catch { toast("Copy failed—select and record the visible code."); }
    return;
  } else if (action === "download-recovery") {
    const blob = new Blob([`ZENITH RECOVERY CODE\n\n${pendingRecoveryCode}\n\nCreated: ${new Date().toISOString()}\nKeep this offline and private.\n`], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `zenith-recovery-${dateKey()}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast("Recovery file downloaded");
    return;
  } else if (action === "finish-security-setup") {
    if (!document.querySelector("#recovery-confirmed")?.checked) {
      toast("Confirm that you saved the recovery code first.");
      return;
    }
    try {
      const result = await unlockWithRecovery(pendingRecoveryCode, { enrollDevice: false });
      state = migrateState(result.state);
      finalizeVaultSetup();
      pendingRecoveryCode = "";
      enterUnlockedApp(state, "Encrypted vault ready");
    } catch (error) {
      toast(error.message);
    }
    return;
  } else if (action === "secure-unlock-device") {
    securityBusy = true;
    renderUnlockScreen();
    try {
      enterUnlockedApp(await unlockWithDevice());
    } catch (error) {
      securityBusy = false;
      renderUnlockScreen(error.name === "NotAllowedError" ? "Device unlock was cancelled." : error.message);
    }
    return;
  } else if (action === "restore-drive") {
    restoreReturnToApp = false;
    securityBusy = true;
    if (getVaultStatus().configured) renderUnlockScreen("Connecting to Google Drive…");
    else renderSecuritySetup("Connecting to Google Drive…");
    try {
      await connectGoogleDrive();
      const remote = await downloadGoogleBackup();
      if (!remote) throw new Error("No Zenith encrypted backup was found in this Google account.");
      pendingRemoteBackup = remote.bundle;
      securityBusy = false;
      renderDriveRestoreScreen();
    } catch (error) {
      securityBusy = false;
      if (getVaultStatus().configured) renderUnlockScreen(error.message);
      else renderSecuritySetup(error.message);
    }
    return;
  } else if (action === "cancel-drive-restore") {
    pendingRemoteBackup = null;
    if (restoreReturnToApp && appUnlocked) renderShell();
    else if (getVaultStatus().configured) renderUnlockScreen();
    else renderSecuritySetup();
    restoreReturnToApp = false;
    return;
  } else if (action === "lock-now") {
    clearTimeout(autoSyncTimer);
    lockVault();
    appUnlocked = false;
    ui.modal = null;
    renderUnlockScreen();
    return;
  } else if (action === "enroll-device") {
    try {
      await enrollCurrentDevice();
      renderShell();
      toast("Device unlock added");
    } catch (error) { toast(error.message); }
    return;
  } else if (action === "sync-drive") {
    await performDriveSync();
    return;
  } else if (action === "disconnect-drive") {
    disconnectGoogleDrive();
    lastSyncMessage = "Disconnected";
    renderShell();
    toast("Google Drive disconnected");
    return;
  } else if (action === "navigate") {
    ui.page = button.dataset.page;
    ui.modal = null;
  } else if (action === "navigate-health") {
    ui.page = "habits";
    ui.habitView = "health";
  } else if (action === "date-shift") {
    ui.selectedDate = shiftDate(ui.selectedDate, Number(button.dataset.amount));
    ui.classicBeforeFeeling = null;
    ui.classicAfterFeeling = null;
  } else if (action === "date-today") {
    ui.selectedDate = dateKey();
    ui.classicBeforeFeeling = null;
    ui.classicAfterFeeling = null;
  } else if (action === "priority-up") {
    updatePriority(button.dataset.id, -1);
  } else if (action === "priority-down") {
    updatePriority(button.dataset.id, 1);
  } else if (action === "toggle-habit") {
    toggleHabit(button.dataset.id, button.dataset.date);
  } else if (action === "journal-mode") {
    ui.journalMode = button.dataset.mode;
  } else if (action === "cycle-bullet-type") {
    const types = ["task", "note", "event"];
    ui.bulletType = types[(types.indexOf(ui.bulletType) + 1) % types.length];
    button.textContent = bulletSymbol(ui.bulletType);
    button.title = `Entry type: ${ui.bulletType}`;
    const quickInput = document.querySelector("#quick-entry");
    if (quickInput) quickInput.placeholder = `Add a ${ui.bulletType}…`;
    return;
  } else if (action === "pick-feeling") {
    const target = button.dataset.target;
    const selected = button.dataset.feeling;
    if (target === "bullet-before") ui.creationFeeling = selected;
    if (target === "classic-before") ui.classicBeforeFeeling = selected;
    if (target === "classic-after") ui.classicAfterFeeling = selected;
    const labels = { "bullet-before": "Before", "classic-before": "Before writing", "classic-after": "After writing" };
    const selector = button.closest(".feeling-select");
    if (selector) selector.outerHTML = renderFeelingSelector(target, selected, labels[target]);
    const tags = target === "bullet-before"
      ? renderFeelingTags(ui.creationFeeling, "")
      : renderFeelingTags(ui.classicBeforeFeeling || "", ui.classicAfterFeeling || "");
    const tagContainer = document.querySelector(target === "bullet-before" ? ".quick-add-feeling .generated-feeling-tags" : "#classic-feeling-tags");
    if (tagContainer) tagContainer.innerHTML = tags;
    return;
  } else if (action === "cycle-entry-status") {
    const entry = state.bullets.find((item) => item.id === button.dataset.id);
    if (entry?.type === "task") {
      const statuses = ["open", "done", "migrated", "cancelled"];
      entry.status = statuses[(statuses.indexOf(entry.status) + 1) % statuses.length];
      if (entry.status === "done") {
        ui.pendingBulletId = entry.id;
        ui.modal = "completion-feeling";
      }
      save();
    }
  } else if (action === "delete-entry") {
    if (confirm("Delete this journal entry?")) {
      state.bullets = state.bullets.filter((item) => item.id !== button.dataset.id);
      save();
    }
  } else if (action === "shuffle-prompt") {
    const current = document.querySelector("#prompt-text").textContent;
    const choices = PROMPTS.filter((prompt) => prompt !== current);
    document.querySelector("#prompt-text").textContent = choices[Math.floor(Math.random() * choices.length)];
    return;
  } else if (action === "habit-view") {
    ui.habitView = button.dataset.view;
  } else if (action === "new-habit") {
    ui.editingHabitId = null;
    ui.modal = "habit";
  } else if (action === "edit-habit") {
    ui.editingHabitId = button.dataset.id;
    ui.modal = "habit";
  } else if (action === "delete-habit") {
    const habit = state.habits.find((item) => item.id === button.dataset.id);
    if (habit && confirm(`Delete “${habit.name}” and all of its tracking history?`)) {
      state.habits = state.habits.filter((item) => item.id !== habit.id);
      state.habitLogs = state.habitLogs.filter((log) => log.habitId !== habit.id);
      state.settings.priorityOrder = state.settings.priorityOrder.filter((id) => id !== habit.id);
      save();
      toast("Habit deleted");
    }
  } else if (action === "open-settings") {
    ui.modal = "settings";
  } else if (action === "close-modal") {
    ui.modal = null;
    ui.pendingBulletId = null;
    ui.pendingHabitId = null;
    ui.pendingHabitDate = null;
  } else if (action === "modal-backdrop" && event.target === button) {
    ui.modal = null;
  } else if (action === "select-habit-color") {
    document.querySelectorAll(".color-button").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    document.querySelector('#habit-form input[name="color"]').value = button.dataset.color;
    return;
  } else if (action === "toggle-form-switch") {
    const input = document.querySelector(`#habit-form input[name="${button.dataset.field}"]`);
    const next = input.value !== "true";
    input.value = String(next);
    button.classList.toggle("on", next);
    button.setAttribute("aria-pressed", String(next));
    return;
  } else if (action === "submit-habit") {
    document.querySelector("#habit-form").requestSubmit();
    return;
  } else if (action === "completion-feeling") {
    const entry = state.bullets.find((item) => item.id === ui.pendingBulletId);
    if (entry) {
      entry.completionFeeling = button.dataset.feeling;
      entry.tags = mergeFeelingTags(entry.tags || [], entry.creationFeeling, entry.completionFeeling);
    }
    ui.modal = null;
    ui.pendingBulletId = null;
    save();
    toast("Task completed");
  } else if (action === "save-reflection") {
    const log = getHabitLog(ui.pendingHabitId, ui.pendingHabitDate || ui.selectedDate);
    if (log) log.reflection = document.querySelector("#habit-reflection").value.trim();
    ui.modal = null;
    ui.pendingHabitId = null;
    ui.pendingHabitDate = null;
    save();
    toast("Reflection saved");
  } else if (action === "export-data") {
    await saveVaultState(state);
    const blob = new Blob([JSON.stringify(getEncryptedBackup(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `zenith-encrypted-backup-${dateKey()}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast("Encrypted backup exported");
    return;
  } else if (action === "import-data") {
    document.querySelector("#import-file").click();
    return;
  } else if (action === "toggle-reminders") {
    state.settings.reminders = !state.settings.reminders;
    save();
  } else if (action === "reset-data") {
    if (confirm("Delete this device's encrypted Zenith vault? Keep your recovery code and Google Drive backup if you may need to restore it.")) {
      deleteVault();
      state = createDefaultState();
      appUnlocked = false;
      ui.modal = null;
      ui.page = "dashboard";
      renderSecuritySetup("The encrypted vault was deleted from this device.");
      return;
    }
  } else if (action === "install-app") {
    ui.installPrompt?.prompt();
    ui.installPrompt = null;
  }
  renderShell();
});

document.querySelector("#app").addEventListener("submit", async (event) => {
  event.preventDefault();
  if (event.target.id === "recovery-unlock-form") {
    const data = new FormData(event.target);
    securityBusy = true;
    renderUnlockScreen("Checking recovery code…");
    try {
      const result = await unlockWithRecovery(data.get("recoveryCode"), { enrollDevice: data.get("enrollDevice") === "on" });
      securityBusy = false;
      enterUnlockedApp(result.state, result.deviceError || "Recovery code accepted");
    } catch (error) {
      securityBusy = false;
      renderUnlockScreen(error.message);
    }
    return;
  }
  if (event.target.id === "drive-restore-form") {
    const data = new FormData(event.target);
    if (!pendingRemoteBackup) return renderUnlockScreen("The pending Google Drive backup is no longer available.");
    securityBusy = true;
    renderDriveRestoreScreen("Decrypting backup…");
    try {
      const result = await restoreEncryptedBackup(pendingRemoteBackup, data.get("recoveryCode"), { enrollDevice: data.get("enrollDevice") === "on" });
      pendingRemoteBackup = null;
      securityBusy = false;
      enterUnlockedApp(result.state, result.deviceError || "Encrypted backup restored");
    } catch (error) {
      securityBusy = false;
      renderDriveRestoreScreen(error.message);
    }
    return;
  }
  if (event.target.id === "quick-add-form") {
    const text = new FormData(event.target).get("text")?.trim();
    if (!text) return;
    state.bullets.push({
      id: uid(),
      date: ui.selectedDate,
      text,
      type: ui.bulletType,
      status: "open",
      creationFeeling: ui.creationFeeling,
      completionFeeling: "",
      tags: mergeFeelingTags([], ui.creationFeeling, ""),
      createdAt: new Date().toISOString(),
    });
    save();
    ui.creationFeeling = "";
    renderShell();
    document.querySelector("#quick-entry")?.focus();
    toast("Entry added");
  }
  if (event.target.id === "classic-form") {
    const form = event.target;
    const draft = captureClassicDraft();
    const manualTags = form.elements.tags.value.split(",").map((tag) => tag.trim()).filter(Boolean);
    const record = {
      id: currentJournal()?.id || uid(),
      date: ui.selectedDate,
      title: form.elements.title.value.trim(),
      mood: ui.classicBeforeFeeling || "",
      beforeFeeling: ui.classicBeforeFeeling || "",
      afterFeeling: ui.classicAfterFeeling || "",
      html: sanitizeHtml(draft.html),
      tags: mergeFeelingTags(manualTags, ui.classicBeforeFeeling || "", ui.classicAfterFeeling || ""),
      prompt: draft.prompt,
      updatedAt: new Date().toISOString(),
    };
    const index = state.journals.findIndex((item) => item.date === ui.selectedDate);
    if (index >= 0) state.journals[index] = record;
    else state.journals.push(record);
    save();
    renderShell();
    toast("Journal saved");
  }
  if (event.target.id === "habit-form") {
    const data = Object.fromEntries(new FormData(event.target));
    const existing = state.habits.find((item) => item.id === ui.editingHabitId);
    const habit = {
      id: existing?.id || uid(),
      name: data.name.trim(),
      color: data.color,
      frequency: data.frequency,
      reflectionPrompt: data.reflectionPrompt.trim(),
      missedTime: data.missedTime,
      autoPriority: data.autoPriority === "true",
      priority: data.priority === "true",
      createdAt: existing?.createdAt || dateKey(),
    };
    if (existing) Object.assign(existing, habit);
    else state.habits.push(habit);
    const order = state.settings.priorityOrder.filter((id) => id !== habit.id);
    if (habit.priority) order.push(habit.id);
    state.settings.priorityOrder = order;
    if (!ui.selectedAnnualHabit) ui.selectedAnnualHabit = habit.id;
    ui.modal = null;
    save();
    renderShell();
    toast(existing ? "Habit updated" : "Habit created");
  }
});

document.querySelector("#app").addEventListener("change", async (event) => {
  if (event.target.id === "annual-habit") {
    ui.selectedAnnualHabit = event.target.value;
    renderShell();
  }
  if (event.target.id === "health-days") {
    state.settings.healthDays = Number(event.target.value);
    save();
    renderShell();
  }
  if (event.target.id === "import-file" && event.target.files[0]) {
    try {
      const imported = JSON.parse(await event.target.files[0].text());
      if (imported?.format !== "zenith-encrypted-backup-v1" || !imported.recovery || !imported.payload) throw new Error("Invalid encrypted backup");
      pendingRemoteBackup = imported;
      restoreReturnToApp = true;
      ui.modal = null;
      renderDriveRestoreScreen();
    } catch (error) {
      toast(error.message || "That file is not a valid encrypted Zenith backup");
    }
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  ui.installPrompt = event;
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js").catch(() => {}));
}

const bootstrapSecurity = async () => {
  deviceUnlockAvailable = await canUseDeviceUnlock();
  const status = getVaultStatus();
  if (status.setupPending) {
    pendingRecoveryCode = getPendingRecoveryCode();
    renderRecoveryCodeScreen({ deviceUnlock: status.deviceUnlock, deviceError: "" });
  } else if (status.configured) {
    renderUnlockScreen();
  } else {
    state = migrateState(readLegacyState() || createDefaultState());
    renderSecuritySetup();
  }
};

bootstrapSecurity();

setInterval(() => {
  if (!appUnlocked || !state.settings.reminders) return;
  const now = new Date();
  const currentTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const due = state.habits.find((habit) => !completedOn(habit.id, dateKey()) && habit.missedTime && currentTime >= habit.missedTime);
  if (due && sessionStorage.getItem("zenith-reminded") !== dateKey()) {
    toast(`Gentle reminder: ${due.name} is still open today`);
    sessionStorage.setItem("zenith-reminded", dateKey());
  }
}, 60000);
