# Fat Cat Cartel

Website for the FFXIV Free Company Fat Cat Cartel.

## Local App Commands

Install dependencies:

```bash
npm install
```

Start the Vite dev server:

```bash
npm run dev
```

Start the app with local stubs instead of Firebase:

```bash
VITE_USE_STUBS=true npm run dev
```

Start with the dev persona layer for local UI flow testing:

```bash
VITE_DEV_AUTH_LAYER=true npm run dev
```

The dev persona layer is local-only and bypasses Firebase Functions, Discord, and Raid Helper calls with localStorage-backed mock callables.

Build the app:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

Lint the app:

```bash
npm run lint
```

## Firebase Functions Commands

Install function dependencies:

```bash
cd functions
npm install
```

Build functions:

```bash
cd functions
npm run build
```

Watch-build functions during emulator work:

```bash
cd functions
npm run build:watch
```

Register Discord commands:

```bash
cd functions
npm run register:discord
```

## Firebase Emulator Commands

The local emulator data lives here:

```text
emulator-data
```

Start all configured emulators and import saved data:

```bash
firebase emulators:start --import="./emulator-data"
```

Start emulators, import saved data, and export changes back on exit:

```bash
firebase emulators:start --import="./emulator-data" --export-on-exit="./emulator-data"
```

Start only Functions and Realtime Database emulators:

```bash
firebase emulators:start --only functions,database --import="./emulator-data" --export-on-exit="./emulator-data"
```

Emulator ports from `firebase.json`:

```text
Emulator UI: http://127.0.0.1:4000
Functions:   http://127.0.0.1:5001
Database:    http://127.0.0.1:9000
```

Export current emulator data manually:

```bash
firebase emulators:export "./emulator-data"
```

## Firebase Console

Production backend console:

```text
https://console.firebase.google.com/project/fat-cat-cartel/overview
```

Common pages:

```text
Realtime Database: https://console.firebase.google.com/project/fat-cat-cartel/database/fat-cat-cartel-default-rtdb/data
Functions:         https://console.firebase.google.com/project/fat-cat-cartel/functions
Hosting:           https://console.firebase.google.com/project/fat-cat-cartel/hosting
Project settings:  https://console.firebase.google.com/project/fat-cat-cartel/settings/general
```

Backend error logs:

```text
Firebase Functions logs: https://console.firebase.google.com/project/fat-cat-cartel/functions/logs
Google Cloud Logging:    https://console.cloud.google.com/logs/query?project=fat-cat-cartel
```

Use Firebase Functions logs for quick callable or scheduled Function errors. Use Google Cloud Logging when you need deeper filtering by severity, function name, request ID, timestamp, or stack trace.

Use the local Emulator UI for local backend state:

```text
http://127.0.0.1:4000
```

## Firebase Deploy Commands

Build app and deploy everything configured in `firebase.json`:

```bash
npm run build
firebase deploy
```

Deploy hosting only:

```bash
npm run build
firebase deploy --only hosting
```

Deploy functions only:

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

Deploy Realtime Database rules only:

```bash
firebase deploy --only database
```

Deploy hosting and functions:

```bash
npm run build
cd functions
npm run build
cd ..
firebase deploy --only hosting,functions
```

Deploy a single function:

```bash
firebase deploy --only functions:functionName
```

Example:

```bash
firebase deploy --only functions:triggerFCCollectionRefresh
```

## Useful Firebase Commands

Log in to Firebase:

```bash
firebase login
```

Check the active Firebase project:

```bash
firebase use
```

Switch Firebase project:

```bash
firebase use project-id
```

List Firebase projects:

```bash
firebase projects:list
```

View function logs:

```bash
firebase functions:log
```

View logs for one function:

```bash
firebase functions:log --only functionName
```

Set a Functions secret:

```bash
firebase functions:secrets:set SECRET_NAME
```

Read a Functions secret value:

```bash
firebase functions:secrets:access SECRET_NAME
```

## Notes

- Use real Firebase values in `.env` for real backend testing and deploys.
- Use `VITE_USE_STUBS=true` for ordinary UI work without Firebase credentials.
- Firebase Hosting serves `dist` and rewrites app routes to `index.html`.
