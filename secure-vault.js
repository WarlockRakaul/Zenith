const LEGACY_STORAGE_KEY = "zenith-journal-v1";
const VAULT_META_KEY = "zenith-vault-meta-v1";
const VAULT_DATA_KEY = "zenith-vault-data-v1";
const PENDING_SETUP_KEY = "zenith-vault-setup-pending-v1";
const VAULT_FORMAT = "zenith-encrypted-backup-v1";
const RECOVERY_ITERATIONS = 600000;
const MASTER_KEY_BYTES = 32;
const AAD_DATA = new TextEncoder().encode("zenith-data-v1");
const AAD_MASTER = new TextEncoder().encode("zenith-master-key-v1");
const HKDF_INFO = new TextEncoder().encode("zenith-device-unlock-v1");

let activeMasterKey = null;
let activeMasterBytes = null;
let saveQueue = Promise.resolve();

const encode = (bytes) => {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

const decode = (value) => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
};

const randomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));
const readJson = (key) => {
  try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
};
const writeJson = (key, value) => localStorage.setItem(key, JSON.stringify(value));
const importMasterKey = (bytes) => crypto.subtle.importKey("raw", bytes, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
const normalizeRecoveryCode = (value = "") => value.toUpperCase().replace(/[^A-Z2-9]/g, "");

const BASE32 = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const createRecoveryCode = () => {
  const bytes = randomBytes(24);
  let code = "";
  for (const byte of bytes) code += BASE32[byte % BASE32.length];
  return code.match(/.{1,4}/g).join("-");
};

const deriveRecoveryKey = async (code, salt, iterations = RECOVERY_ITERATIONS) => {
  const normalized = normalizeRecoveryCode(code);
  if (normalized.length < 20) throw new Error("Recovery code is incomplete.");
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(normalized), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const deriveDeviceKey = async (prfSecret, salt) => {
  const material = await crypto.subtle.importKey("raw", prfSecret, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "HKDF", hash: "SHA-256", salt, info: HKDF_INFO },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const wrapBytes = async (wrappingKey, bytes, additionalData = AAD_MASTER) => {
  const iv = randomBytes(12);
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData }, wrappingKey, bytes);
  return { iv: encode(iv), ciphertext: encode(ciphertext) };
};

const unwrapBytes = async (wrappingKey, envelope, additionalData = AAD_MASTER) => {
  try {
    return new Uint8Array(await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(envelope.iv), additionalData },
      wrappingKey,
      decode(envelope.ciphertext),
    ));
  } catch {
    throw new Error("That recovery code could not unlock this vault.");
  }
};

const createRecoveryEnvelope = async (masterBytes, recoveryCode) => {
  const salt = randomBytes(16);
  const key = await deriveRecoveryKey(recoveryCode, salt);
  return {
    algorithm: "PBKDF2-SHA256/AES-256-GCM",
    iterations: RECOVERY_ITERATIONS,
    salt: encode(salt),
    ...(await wrapBytes(key, masterBytes)),
  };
};

const unwrapRecoveryEnvelope = async (envelope, recoveryCode) => {
  const key = await deriveRecoveryKey(recoveryCode, decode(envelope.salt), envelope.iterations);
  return unwrapBytes(key, envelope);
};

const encryptState = async (state, masterKey) => {
  const iv = randomBytes(12);
  const encoded = new TextEncoder().encode(JSON.stringify(state));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: AAD_DATA }, masterKey, encoded);
  return {
    algorithm: "AES-256-GCM",
    iv: encode(iv),
    ciphertext: encode(ciphertext),
    updatedAt: new Date().toISOString(),
    revision: encode(randomBytes(12)),
  };
};

const decryptState = async (payload, masterKey) => {
  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: decode(payload.iv), additionalData: AAD_DATA },
      masterKey,
      decode(payload.ciphertext),
    );
    return JSON.parse(new TextDecoder().decode(plaintext));
  } catch {
    throw new Error("The encrypted journal could not be opened.");
  }
};

const currentDeviceLabel = () => {
  const agent = navigator.userAgent;
  if (/Android/i.test(agent)) return "Android device";
  if (/Windows/i.test(agent)) return "Windows PC";
  if (/iPhone|iPad/i.test(agent)) return "Apple device";
  return "This device";
};

export const getVaultStatus = () => {
  const meta = readJson(VAULT_META_KEY);
  const payload = readJson(VAULT_DATA_KEY);
  const pending = readJson(PENDING_SETUP_KEY);
  return {
    configured: Boolean(meta?.recovery && payload?.ciphertext),
    deviceUnlock: Boolean(meta?.device?.credentialId),
    deviceLabel: meta?.device?.label || "This device",
    createdAt: meta?.createdAt || null,
    lastUpdated: payload?.updatedAt || null,
    setupPending: Boolean(pending?.recoveryCode),
  };
};

export const readLegacyState = () => readJson(LEGACY_STORAGE_KEY);
export const getPendingRecoveryCode = () => readJson(PENDING_SETUP_KEY)?.recoveryCode || "";
export const finalizeVaultSetup = () => {
  localStorage.removeItem(PENDING_SETUP_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
};

export const canUseDeviceUnlock = async () => {
  if (!window.isSecureContext || !window.PublicKeyCredential || !navigator.credentials) return false;
  try { return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable(); } catch { return false; }
};

const getPrfSecret = async (credentialId, prfSalt) => {
  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [{ type: "public-key", id: decode(credentialId) }],
      userVerification: "required",
      timeout: 60000,
      extensions: { prf: { eval: { first: decode(prfSalt) } } },
    },
  });
  const result = assertion?.getClientExtensionResults?.().prf?.results?.first;
  if (!result) throw new Error("This browser's device unlock cannot protect an encryption key. Use the recovery code on this device.");
  return new Uint8Array(result);
};

const createDeviceEnvelope = async (masterBytes) => {
  if (!await canUseDeviceUnlock()) throw new Error("Device unlock requires a supported browser on HTTPS.");
  const prfSalt = randomBytes(32);
  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: { name: "Zenith Journal" },
      user: { id: randomBytes(32), name: "zenith-vault", displayName: "Zenith Journal" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        residentKey: "preferred",
        userVerification: "required",
      },
      attestation: "none",
      timeout: 60000,
      extensions: { prf: { eval: { first: prfSalt } } },
    },
  });
  const credentialId = encode(credential.rawId);
  let secret = credential.getClientExtensionResults?.().prf?.results?.first;
  if (!secret) secret = await getPrfSecret(credentialId, encode(prfSalt));
  const kdfSalt = randomBytes(16);
  const deviceKey = await deriveDeviceKey(secret, kdfSalt);
  return {
    type: "webauthn-prf",
    label: currentDeviceLabel(),
    credentialId,
    prfSalt: encode(prfSalt),
    kdfSalt: encode(kdfSalt),
    ...(await wrapBytes(deviceKey, masterBytes)),
    createdAt: new Date().toISOString(),
  };
};

export const initializeVault = async (initialState, { enrollDevice = true } = {}) => {
  const masterBytes = randomBytes(MASTER_KEY_BYTES);
  const masterKey = await importMasterKey(masterBytes);
  const recoveryCode = createRecoveryCode();
  const recovery = await createRecoveryEnvelope(masterBytes, recoveryCode);
  const meta = { version: 1, format: VAULT_FORMAT, createdAt: new Date().toISOString(), recovery, device: null };
  let deviceError = "";
  if (enrollDevice) {
    try { meta.device = await createDeviceEnvelope(masterBytes); } catch (error) { deviceError = error.message; }
  }
  const payload = await encryptState(initialState, masterKey);
  writeJson(VAULT_META_KEY, meta);
  writeJson(VAULT_DATA_KEY, payload);
  writeJson(PENDING_SETUP_KEY, { recoveryCode, createdAt: new Date().toISOString() });
  activeMasterKey = masterKey;
  activeMasterBytes = masterBytes;
  return { recoveryCode, deviceUnlock: Boolean(meta.device), deviceError };
};

export const unlockWithDevice = async () => {
  const meta = readJson(VAULT_META_KEY);
  const payload = readJson(VAULT_DATA_KEY);
  if (!meta?.device || !payload) throw new Error("Device unlock is not configured.");
  const secret = await getPrfSecret(meta.device.credentialId, meta.device.prfSalt);
  const deviceKey = await deriveDeviceKey(secret, decode(meta.device.kdfSalt));
  const masterBytes = await unwrapBytes(deviceKey, meta.device);
  const masterKey = await importMasterKey(masterBytes);
  const state = await decryptState(payload, masterKey);
  activeMasterKey = masterKey;
  activeMasterBytes = masterBytes;
  return state;
};

export const unlockWithRecovery = async (recoveryCode, { enrollDevice = false } = {}) => {
  const meta = readJson(VAULT_META_KEY);
  const payload = readJson(VAULT_DATA_KEY);
  if (!meta?.recovery || !payload) throw new Error("No encrypted vault was found on this device.");
  const masterBytes = await unwrapRecoveryEnvelope(meta.recovery, recoveryCode);
  const masterKey = await importMasterKey(masterBytes);
  const state = await decryptState(payload, masterKey);
  activeMasterKey = masterKey;
  activeMasterBytes = masterBytes;
  let deviceError = "";
  if (enrollDevice) {
    try {
      meta.device = await createDeviceEnvelope(masterBytes);
      writeJson(VAULT_META_KEY, meta);
    } catch (error) { deviceError = error.message; }
  }
  return { state, deviceUnlock: Boolean(meta.device), deviceError };
};

export const enrollCurrentDevice = async () => {
  if (!activeMasterBytes) throw new Error("Unlock Zenith before adding device unlock.");
  const meta = readJson(VAULT_META_KEY);
  meta.device = await createDeviceEnvelope(activeMasterBytes);
  writeJson(VAULT_META_KEY, meta);
  return meta.device;
};

export const saveVaultState = (state) => {
  if (!activeMasterKey) return Promise.reject(new Error("Zenith is locked."));
  const snapshot = structuredClone(state);
  saveQueue = saveQueue.catch(() => {}).then(async () => {
    const payload = await encryptState(snapshot, activeMasterKey);
    writeJson(VAULT_DATA_KEY, payload);
    return payload;
  });
  return saveQueue;
};

export const getEncryptedBackup = () => {
  const meta = readJson(VAULT_META_KEY);
  const payload = readJson(VAULT_DATA_KEY);
  if (!meta?.recovery || !payload) throw new Error("No encrypted vault is available.");
  return { format: VAULT_FORMAT, version: 1, recovery: meta.recovery, payload };
};

export const restoreEncryptedBackup = async (bundle, recoveryCode, { enrollDevice = true } = {}) => {
  if (bundle?.format !== VAULT_FORMAT || !bundle.recovery || !bundle.payload) throw new Error("This is not a Zenith encrypted backup.");
  const masterBytes = await unwrapRecoveryEnvelope(bundle.recovery, recoveryCode);
  const masterKey = await importMasterKey(masterBytes);
  const state = await decryptState(bundle.payload, masterKey);
  const meta = { version: 1, format: VAULT_FORMAT, createdAt: new Date().toISOString(), recovery: bundle.recovery, device: null };
  let deviceError = "";
  if (enrollDevice) {
    try { meta.device = await createDeviceEnvelope(masterBytes); } catch (error) { deviceError = error.message; }
  }
  writeJson(VAULT_META_KEY, meta);
  writeJson(VAULT_DATA_KEY, bundle.payload);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  localStorage.removeItem(PENDING_SETUP_KEY);
  activeMasterKey = masterKey;
  activeMasterBytes = masterBytes;
  return { state, deviceUnlock: Boolean(meta.device), deviceError };
};

export const adoptRemoteBackup = async (bundle) => {
  if (!activeMasterKey) throw new Error("Unlock Zenith before downloading a backup.");
  if (bundle?.format !== VAULT_FORMAT || !bundle.payload) throw new Error("The Google Drive backup is invalid.");
  const state = await decryptState(bundle.payload, activeMasterKey);
  const meta = readJson(VAULT_META_KEY);
  if (bundle.recovery) meta.recovery = bundle.recovery;
  writeJson(VAULT_META_KEY, meta);
  writeJson(VAULT_DATA_KEY, bundle.payload);
  return state;
};

export const lockVault = () => {
  activeMasterKey = null;
  if (activeMasterBytes) activeMasterBytes.fill(0);
  activeMasterBytes = null;
};

export const deleteVault = () => {
  lockVault();
  localStorage.removeItem(VAULT_META_KEY);
  localStorage.removeItem(VAULT_DATA_KEY);
  localStorage.removeItem(PENDING_SETUP_KEY);
  localStorage.removeItem(LEGACY_STORAGE_KEY);
};

export const isVaultUnlocked = () => Boolean(activeMasterKey);
