# Zenith encrypted sync setup

Zenith uses a random 256-bit master key to encrypt journal data with AES-256-GCM. The master key is never uploaded in readable form.

It is wrapped in two ways:

- An offline recovery code derives a wrapping key with PBKDF2-SHA256 (600,000 iterations).
- A supported device can derive a wrapping key through WebAuthn PRF after Windows Hello or Android device verification.

The Google Drive backup contains only the encrypted journal payload and the recovery-wrapped master key. GitHub contains application code and the public OAuth client identifier only.

## 1. Publish to a stable HTTPS address

The included GitHub Pages workflow can publish the static app at:

`https://warlockrakaul.github.io/Zenith/`

In the GitHub repository, set **Settings → Pages → Source** to **GitHub Actions**, then push the project to `main`.

Windows device unlock can be tested at `http://localhost:4173`, because browsers treat localhost as a secure development origin. Android device unlock must use the HTTPS address. Do not use a changing LAN IP for enrollment.

## 2. Create the Google OAuth client

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create or select a project named `Zenith Journal`.
3. Enable **Google Drive API**.
4. Open **Google Auth Platform** and configure Branding/Audience.
5. Use an **External** audience for a personal Google account and add your own account as a test user while the app remains in testing.
6. Open **Clients → Create client → Web application**.
7. Add these **Authorized JavaScript origins**:
   - `http://localhost:4173`
   - `https://warlockrakaul.github.io`
8. No redirect URI or client secret is required for the popup token flow.
9. Copy the value ending in `.apps.googleusercontent.com`.

Google requires JavaScript origins to contain only the scheme, hostname, and optional port. Do not include `/Zenith/` in the authorized origin.

## 3. Configure Zenith

Open `config.js` and set:

```js
googleClientId: "YOUR_CLIENT_ID.apps.googleusercontent.com",
```

The client ID is a public application identifier, not a password or client secret. It is safe to keep with the static application code.

## 4. Secure the first device

1. Open Zenith at its stable address.
2. Select **Create secure vault**.
3. Complete the Windows Hello or device-security prompt when offered.
4. Save the recovery code offline. A printed copy in a secure location is ideal.
5. Enter Zenith and open **Data & settings**.
6. Select **Connect & sync** and authorize only Zenith's private Google Drive application-data folder.

The existing readable Zenith browser data is encrypted during this setup. Its old plaintext storage entry and Zenith's temporary readable recovery-code copy are removed after the encrypted vault is written and you confirm the recovery code is safely recorded. If setup is interrupted on the recovery screen, Zenith resumes that screen rather than leaving you locked out.

## 5. Add the phone

1. Open the same HTTPS Zenith address in Chrome on Android.
2. Choose **Restore encrypted Google Drive backup**.
3. Sign into the same Google account.
4. Enter the offline Zenith recovery code.
5. Leave **Enable device unlock here** selected and complete Android's fingerprint, face, PIN, or pattern prompt.
6. Install Zenith to the home screen after recovery is complete.

The phone now has its own device unlock envelope for the same master key.

## Normal synchronization

- Data is always saved into the encrypted local vault first.
- While Google Drive is connected, saves schedule an encrypted upload.
- Access tokens remain in memory and are not stored in Zenith, so use **Connect & sync** again after reopening the app.
- When explicitly syncing, a newer Drive snapshot is downloaded; otherwise the newer local snapshot is uploaded.
- Avoid editing both devices offline at the same time. This version synchronizes whole encrypted snapshots rather than merging individual records.

## Recovery and safety

- Losing one device is safe if another enrolled device or the recovery code remains available.
- Losing every enrolled device and the recovery code makes the journal permanently unrecoverable.
- Keep periodic encrypted file exports in addition to Google Drive.
- Changing a device's Windows Hello configuration, clearing browser site data, or uninstalling with data removal can require recovery enrollment again.
- Anyone with only the Google Drive file or encrypted export still needs the recovery code or an enrolled authenticator.
