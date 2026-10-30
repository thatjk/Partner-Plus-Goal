# Twitch Plus Goal API and OBS Overlays

## Requirements
- Node.js 18 or newer
- Internet access to Twitch public GraphQL

No npm dependencies are required.

## Start
```bash
npm start
```
Or:
```bash
node server.js
```

Default port: `8408`. Override with `PORT=9000` (Linux/macOS) or `$env:PORT=9000` in PowerShell.

## API
- `http://localhost:8408/health`
- `http://localhost:8408/plusgoal=powergpu`
- `http://localhost:8408/plusgoal=powergpu?format=text`
- `http://localhost:8408/plusgoal=powergpu?format=text&label=1`
- `http://localhost:8408/plusgoal/powergpu`
- `http://localhost:8408/gqldebug=powergpu`

## OBS Browser Sources
Base URL: `http://localhost:8408/overlay=powergpu`

| Style | Example URL | Recommended Size |
|---|---|---|
| Text | `http://localhost:8408/overlay=powergpu?style=text` | 640x150 |
| Compact | `http://localhost:8408/overlay=powergpu?style=compact` | 400x200 |
| Full | `http://localhost:8408/overlay=powergpu?style=full` | 640x340 |
| Ticker | `http://localhost:8408/overlay=powergpu?style=ticker` | 640x150 |
| Hero | `http://localhost:8408/overlay=powergpu?style=hero` | 640x260 |
| Ring | `http://localhost:8408/overlay=powergpu?style=ring` | 640x320 |
| Banner | `http://localhost:8408/overlay=powergpu?style=banner` | 800x160 |
| Pill | `http://localhost:8408/overlay=powergpu?style=pill` | 640x150 |

Themes: `mono`, `grape`, `mint`, `gold`.

Examples:
- `http://localhost:8408/overlay=powergpu?style=compact&theme=grape`
- `http://localhost:8408/overlay=powergpu?style=full&theme=mint`
- `http://localhost:8408/overlay=powergpu?style=hero&theme=gold`

Optional parameters:
- `channel=` or `c=` selects the channel on `/overlay`.
- `server=` sets the API base URL.
- `w=` sets inner width, clamped to 220-900 pixels.
- `hide=1` hides the overlay if data is unavailable.
- `refresh=` sets polling seconds, clamped to 10-300.
- `stage=1` adds a preview background. Do not use `stage=1` in OBS.

For remote OBS machines, replace `localhost` with the host running this server and ensure the port is reachable. Do not expose this service directly to the public internet without a reverse proxy/firewall and additional access controls.
