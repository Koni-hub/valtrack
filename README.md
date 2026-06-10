# ValTrack

Valorant account tracker with auto-detection via Riot lockfile.

## Requirements

- Windows 10/11
- Node.js 20+ (only for `npm start` mode)
- Valorant installed and running

## Usage

### Option 1: Run from source (Node.js)

```bash
npm install
npm start
```

Open http://localhost:3000

### Option 2: Portable .exe (no Node.js needed)

1. Download `ValTrack.zip` from Releases
2. Extract anywhere
3. Run `ValTrack.exe`

## How it works

1. Login with your user (Arvin/Ronnel/Ivan/Thomas)
2. Open Valorant on the same PC
3. The app auto-detects which tracked account is logged in via Riot lockfile
4. Shows real-time status: AVAILABLE / IN USE
5. Works across multiple tabs (WebSocket sync)

## Credentials

| User | Password |
|------|----------|
| Arvin | 123 |
| Ronnel | 456 |
| Ivan | 789 |
| Thomas | 000 |

## Build from source

```bash
npm install
npm run build
```

Output in `dist/ValTrack.exe`
