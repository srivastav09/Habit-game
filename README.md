# Habit-game

## Backend (shared leaderboard)

From `Habit-game/server/`:

```bash
npm install
npm start
```

Open **http://localhost:3000** — the API lives at `/api/*` and data is stored in `server/data/store.json`.

- **Offline:** opening `index.html` as a file still uses browser storage only.
- **Online:** profiles, tasks, XP, level, timer state, and customization sync to the server for everyone using the same URL.