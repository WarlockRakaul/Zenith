import { ZENITH_CONFIG } from "./config.js";

const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
const GOOGLE_SCRIPT = "https://accounts.google.com/gsi/client";
let accessToken = "";
let tokenClient = null;
let scriptPromise = null;

const loadGoogleIdentity = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GOOGLE_SCRIPT;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("Google sign-in could not be loaded."));
    document.head.append(script);
  });
  return scriptPromise;
};

const configuredClientId = () => ZENITH_CONFIG.googleClientId?.trim();
export const isGoogleDriveConfigured = () => Boolean(configuredClientId());
export const isGoogleDriveConnected = () => Boolean(accessToken);

export const connectGoogleDrive = async () => {
  const clientId = configuredClientId();
  if (!clientId) throw new Error("Add Zenith's Google OAuth client ID in config.js first.");
  await loadGoogleIdentity();
  return new Promise((resolve, reject) => {
    tokenClient ||= google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: DRIVE_SCOPE,
      callback: () => {},
      error_callback: (error) => reject(new Error(error?.message || "Google authorization was cancelled.")),
    });
    tokenClient.callback = (response) => {
      if (response.error) reject(new Error(response.error_description || response.error));
      else {
        accessToken = response.access_token;
        resolve(response);
      }
    };
    tokenClient.requestAccessToken({ prompt: accessToken ? "" : "consent" });
  });
};

const driveFetch = async (url, options = {}) => {
  if (!accessToken) throw new Error("Connect Google Drive first.");
  const response = await fetch(url, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) },
  });
  if (response.status === 401) {
    accessToken = "";
    throw new Error("Google Drive authorization expired. Reconnect and try again.");
  }
  if (!response.ok) throw new Error(`Google Drive returned ${response.status}.`);
  return response;
};

const findBackupFile = async () => {
  const name = ZENITH_CONFIG.googleBackupFileName;
  const query = encodeURIComponent(`name='${name.replace(/'/g, "\\'")}' and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime,version)&orderBy=modifiedTime desc&pageSize=1`;
  const response = await driveFetch(url);
  return (await response.json()).files?.[0] || null;
};

export const downloadGoogleBackup = async () => {
  const file = await findBackupFile();
  if (!file) return null;
  const response = await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`);
  return { file, bundle: await response.json() };
};

const createBackupFile = async (bundle) => {
  const boundary = `zenith_${crypto.randomUUID()}`;
  const metadata = JSON.stringify({ name: ZENITH_CONFIG.googleBackupFileName, parents: ["appDataFolder"] });
  const content = JSON.stringify(bundle);
  const body = [
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
    `--${boundary}\r\nContent-Type: application/json\r\n\r\n${content}\r\n`,
    `--${boundary}--`,
  ].join("");
  const response = await driveFetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime,version", {
    method: "POST",
    headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
    body,
  });
  return response.json();
};

const updateBackupFile = async (fileId, bundle) => {
  const response = await driveFetch(`https://www.googleapis.com/upload/drive/v3/files/${encodeURIComponent(fileId)}?uploadType=media&fields=id,modifiedTime,version`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(bundle),
  });
  return response.json();
};

export const uploadGoogleBackup = async (bundle) => {
  const file = await findBackupFile();
  return file ? updateBackupFile(file.id, bundle) : createBackupFile(bundle);
};

export const synchronizeGoogleBackup = async (localBundle) => {
  const remote = await downloadGoogleBackup();
  if (!remote) {
    const file = await uploadGoogleBackup(localBundle);
    return { action: "uploaded", file };
  }
  const localTime = Date.parse(localBundle.payload.updatedAt || 0);
  const remoteTime = Date.parse(remote.bundle?.payload?.updatedAt || 0);
  if (remoteTime > localTime) return { action: "download", ...remote };
  if (localTime > remoteTime || localBundle.payload.revision !== remote.bundle?.payload?.revision) {
    const file = await updateBackupFile(remote.file.id, localBundle);
    return { action: "uploaded", file };
  }
  return { action: "current", file: remote.file };
};

export const disconnectGoogleDrive = () => {
  if (accessToken && window.google?.accounts?.oauth2) google.accounts.oauth2.revoke(accessToken, () => {});
  accessToken = "";
};
