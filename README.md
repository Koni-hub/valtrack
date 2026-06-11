# ValTrack

Real-time Valorant account tracker with automatic login detection, rank tracking, and session management.

## Features

- **Auto-detection** — Detects which tracked account is logged into Valorant on the same PC by reading Riot Client config files
- **Live status** — Shows who's currently playing with an elapsed timer
- **Rank & MMR** — Displays current rank, RR, peak rank via HenrikDev API
- **Match history** — Last 3 matches with map, agent, KDA, result
- **Multi-user** — Login system for 4 users (Arvin, Ronnel, Ivan, Thomas) with session conflict detection
- **Real-time sync** — WebSocket + localStorage-based cross-tab sync so multiple browser tabs stay in sync
- **Activity tracking** — Shows when each account last played (today / this week / inactive)

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
3. The backend polls every 2 seconds — it reads the Riot Client SSID JWT and Valorant config to detect the logged-in account's PUUID
4. If the PUUID matches a tracked account, the UI shows who's playing with a live timer
5. Rank, MMR, and match history are fetched from the [HenrikDev Valorant API](https://docs.henrikdev.xyz/)
6. Works across multiple tabs via WebSocket + BroadcastChannel

## Credentials

| User   | Password |
|--------|----------|
| Arvin  | 123      |
| Ronnel | 456      |
| Ivan   | 789      |
| Thomas | 000      |

## Tracked Accounts

- 依神 紫苑 #yuji
- コニ先輩 #6969

## Build from source

```bash
npm install
npm run build
```

Output in `dist/ValTrack.exe`

## Tech Stack

- **Backend** — Node.js, Express, Socket.IO
- **Frontend** — Vanilla HTML/CSS/JS with Socket.IO client
- **Desktop** — Electron (optional, for portable build)
- **Build** — electron-builder (portable .exe)
- **API** — HenrikDev Valorant API v4
