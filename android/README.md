# MELO Android package (Trusted Web Activity)

This directory holds the Bubblewrap (Google's official TWA tool) configuration
that wraps the deployed MELO web app into an Android APK. A TWA is a thin
native shell around the live site — it wraps the production URL:

```
https://melo-web-dbze.onrender.com   (host: melo-web-dbze.onrender.com)
```

> Render appends a random suffix to new service names, so the bare
> `melo-web.onrender.com` was never available. If the web service is ever
> recreated or moves to a custom domain, flip every URL in
> `twa-manifest.json` (host, startUrl, webManifestUrl, fullScopeUrl,
> iconUrl, maskableIconUrl), regenerate, and rebuild — see "If the domain
> changes" below.

## Files

| File | Committed | Purpose |
|---|---|---|
| `twa-manifest.json` | ✅ | App identity: package ID `app.melo.web`, host, colors, version, signing key reference |
| `melo-twa.keystore` | ✅ | Demo-stage signing key (alias `melo`) — **see warning below** |
| `README.md`, `.gitignore` | ✅ | This runbook |
| `app/`, `gradle/`, `build.gradle`, `gradlew*`, `settings.gradle`, `manifest-checksum.txt`, `store_icon.png` | ❌ gitignored | Android project **generated in place** by `bubblewrap update` (regenerable) |
| `*.apk`, `*.aab` | ❌ gitignored | Build outputs |

## Build the APK

Prerequisites (all set up on the build machine):

- **JDK 17** — `C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot`
- **`@bubblewrap/cli`** — `npm i -g @bubblewrap/cli`
- **Android SDK** — `%LOCALAPPDATA%\Android\Sdk` with `platform-tools`,
  `platforms;android-36`, `build-tools;36.1.0` (Bubblewrap pins 36.1.0), and
  licenses accepted
- **`~/.bubblewrap/config.json`** pointing at the JDK + SDK (without it,
  Bubblewrap falls into interactive prompts that break under piped stdin):

```json
{
  "jdkPath": "C:\\Program Files\\Microsoft\\jdk-17.0.20.101-hotspot",
  "androidSdkPath": "C:\\Users\\innoc\\AppData\\Local\\Android\\Sdk"
}
```

> Bubblewrap's SDK validator checks for `<sdk>/bin` or `<sdk>/tools` at the
> SDK root — a legacy layout modern SDKs don't have. Fix: an empty
> `<sdk>/bin` directory plus a forwarding `<sdk>/bin\sdkmanager.bat` that
> calls `cmdline-tools\latest\bin\sdkmanager.bat`.

```powershell
cd android
$env:JAVA_HOME = 'C:\jdk-17'          # space-free junction of the real JDK
$env:Path = "$env:JAVA_HOME\bin;$env:Path"
$env:BUBBLEWRAP_KEYSTORE_PASSWORD = '<keystore password>'
$env:BUBBLEWRAP_KEY_PASSWORD = '<key password>'

bubblewrap update    # fetches the live manifest; generates the project in place
bubblewrap build     # → android\app-release-signed.apk (+ app-release-bundle.aab)
```

> `jdkPath` must not contain spaces: Bubblewrap invokes `java.exe` via a
> shell without quoting, so `C:\Program Files\...` breaks mid-path. The build
> machine uses a directory junction `C:\jdk-17` → the real JDK install
> (`mklink /J C:\jdk-17 "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"`).

Both env vars skip Bubblewrap's interactive password prompts (piped stdin
crashes inquirer — do not try answering prompts in automation). `update`
prompts once for the version bump; answer with the current version name.

Install on a phone: copy the APK over and open it ("install unknown apps"
permission), or `adb install app-release-signed.apk`.

## Full-screen (no browser bar)

The APK renders without the Chrome URL bar once Android verifies the Digital
Asset Links file served by the web app:

```
https://melo-web-dbze.onrender.com/.well-known/assetlinks.json
```

That file is committed at `public/.well-known/assetlinks.json` and already
contains this keystore's SHA-256 fingerprint. If you regenerate the keystore,
update the fingerprint there (command below).

```powershell
keytool -list -v -keystore melo-twa.keystore -alias melo -storepass <password>
```

## ⚠️ Signing key warning

The keystore password lives in `twa-manifest.json` (Bubblewrap's standard
practice) so the build is reproducible. That is acceptable for a sideloaded
demo build, but **before shipping to the Play Store**: generate a fresh
keystore with a strong password kept outside the repo, update
`signingKey` in `twa-manifest.json`, and rotate the fingerprint in
`public/.well-known/assetlinks.json`. Losing the keystore means losing the
ability to update the installed app.

## If the domain changes

A TWA points at a host. After a custom domain goes live:

1. Edit `twa-manifest.json`: `host`, `startUrl`, `webManifestUrl`, `fullScopeUrl`,
   `iconUrl`, `maskableIconUrl` → new origin.
2. `bubblewrap update && bubblewrap build`.
3. Add the new origin to the API's `CORS_ORIGINS`.

## Play Store (optional, later)

- Google Play requires an **AAB** (`app-release-bundle.aab`) + a Play Console
  account ($25 one-time) + the Digital Asset Links verification passing.
- Sideloaded APKs need none of that — distribute the APK directly.
