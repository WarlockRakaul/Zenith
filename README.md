# Zenith Journal

Zenith is a private, local-first bullet journal and habit tracker designed for an Android phone. It is a dependency-free progressive web app: your entries stay in the browser on the device where you use it.

Zenith now includes an encrypted local vault, offline recovery code, WebAuthn device unlock, and encrypted Google Drive app-data synchronization. See [SECURITY_SETUP.md](./SECURITY_SETUP.md) before enabling cross-device sync.

## Included

- Dashboard with priority ordering, completion controls, weekly activity, and neglected-habit alerts
- Bullet journal with tasks, notes, events, status cycling, and starting/completion feelings
- Classic journal with mood, tags, rich text, and shuffleable daily prompts
- Habit creation, editing, deletion, streaks, daily completion, and reflection prompts
- Card, weekly, annual, and health-check habit views
- Responsive bottom navigation for phones
- Offline app shell, installable PWA manifest, and encrypted backup/restore
- Windows Hello/Android device unlock where WebAuthn PRF is supported
- Encrypted Google Drive app-data backup and cross-device restore
- In-app missed-habit reminders while Zenith is open

## Preview it on this computer

Double-click `Start-Zenith.cmd`. When the black Zenith window says the app is running, open:

`http://localhost:4173`

Keep the Zenith window open while using the app. Press `Ctrl+C` in that window to stop it.

If you prefer a command, run this from Command Prompt or PowerShell:

```powershell
E:\Journal\Zenith\Start-Zenith.cmd
```

The `.cmd` launcher intentionally uses an execution-policy bypass for the included local server script. It does not change the computer's permanent PowerShell policy.

## Use it on Android

### Recommended: private data + GitHub Pages hosting

GitHub Pages supplies the HTTPS connection Android requires for reliable PWA installation. The site files are public if the repository is public, but journal and habit data never enters the repository or GitHub; it remains in the phone's browser storage.

1. In the GitHub repository, open **Settings → Pages**.
2. Set **Source** to **GitHub Actions**.
3. Push this project to `main`. The included workflow publishes the app.
4. Open `https://warlockrakaul.github.io/Zenith/` in Chrome on Android.
5. Choose Chrome's **Add to Home screen** or **Install app** action.
6. Open Zenith once while online so its app shell is cached for offline use.

Export a JSON backup from **Data & settings** periodically. Removing the app, clearing Chrome storage, or changing browsers can remove local data.

### Same-Wi-Fi preview

Double-click `Start-Zenith.cmd`, then open the printed `Android/LAN` address on a phone connected to the same private Wi-Fi. Allow Node.js on **Private networks** if Windows Firewall asks.

This HTTP preview is useful for testing, but Android may not offer full offline installation because LAN HTTP is not a secure origin. GitHub Pages is the recommended installation route.

## Development

No package installation or build step is required. Edit `index.html`, `styles.css`, or `app.js`, then refresh the browser. For a syntax check with Node.js:

```powershell
node --check .\app.js
```

## Privacy and scope

Zenith has no accounts, analytics, backend, or remote database. Calendar synchronization and true background push notifications are intentionally excluded from this local edition because both require an online OAuth/scheduling service. In-app reminders work while Zenith is open.
