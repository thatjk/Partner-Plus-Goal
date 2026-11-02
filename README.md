# Twitch Partner Plus Goal and OBS Overlays

A lightweight Node.js server that reads public Twitch Partner Plus data, provides a JSON API, and serves customizable overlays for OBS Studio.

## Requirements

- Node.js 18 or newer
- npm (included with Node.js)
- Optional: PM2 for process management

The application has no npm runtime dependencies.

## Start the server

Open a terminal in this `outputs` directory and run either:

```bash
npm start
```

or:

```bash
node server.js
```

By default, the server listens on [http://localhost:8413](http://localhost:8413). Set the `PORT` environment variable to use a different port.

Open the overlay builder at:

```text
http://localhost:8413/
```

Enter a Twitch channel name, choose a style and theme, review the live preview, and copy the generated URL into an OBS Browser Source. Set the source dimensions to the recommendation shown on the selected style tile.

## Run with PM2

The included `ecosystem.config.js` starts the server with the PM2 process name `partnerplus` and port 8413. Install PM2 globally if needed:

```bash
npm install -g pm2
```

From this directory, start and manage the app with:

```bash
pm2 start ecosystem.config.js
pm2 status
pm2 logs partnerplus
pm2 restart partnerplus
pm2 stop partnerplus
```

After changing `overlay.html` or `server.js`, restart the process so it loads the updated files.

## API and utility routes

| URL | Description |
|---|---|
| `/plusgoal=powergpu` | JSON goal data for a channel |
| `/plusgoal/powergpu` | Alternate JSON route |
| `/plusgoal=powergpu?format=text` | Plain text current and target points |
| `/plusgoal=powergpu?format=text&label=1` | Plain text with the goal level |
| `/health` | Server health and uptime |
| `/gqldebug=powergpu` | Raw Twitch persisted-query request and response for troubleshooting |

Replace `powergpu` with the channel login. Channel names are case-insensitive and validated by the server. Successful API results are cached for 10 seconds.

The API uses Twitch's public GraphQL endpoint and persisted queries. It does not require a Twitch access token or client secret.

## Data discovery and extraction

### Twitch response structure

The public persisted query for a channel's Plus program returns the program under:

```text
data.plusStatus.partnerPlusProgram
```

The `partnerPlusProgram` object contains `l1Threshold`, `l2Threshold`, `level`, `canShowWidget`, `widgetSetting`, and `subPoints`. Each `subPoints` item has `year`, `month`, `count`, and `updatedAt`. Twitch currently sends these monthly entries newest first. The server sorts them by year and month before building its API response, so `history` is chronological and the qualification months are newest first.

Channel lookup is a separate persisted query. Its response path is `data.user.id`; for `powergpu`, the observed channel ID is `54276431`. The Plus program response is not nested under `data.user`.

### Direct API extraction

To retrieve the app's processed data, request:

```bash
curl "http://localhost:8413/plusgoal=powergpu"
```

The JSON includes current points, target, thresholds, selected goal level and source, previous month, the latest six months, qualification streaks, cache status, and fetch time. For example, the current month is in `month` and `current`; its point history is in `history`; qualification details are in `qualification`.

Plain text forms are available at:

```text
http://localhost:8413/plusgoal=powergpu?format=text
http://localhost:8413/plusgoal=powergpu?format=text&label=1
```

### Extracting directly from Twitch GraphQL

The server first resolves the channel login using Twitch's `GetUserID` persisted query, then sends `PartnerPlusPublicQuery` with the resolved ID. Both requests are POSTs to `https://gql.twitch.tv/gql` with these headers:

```text
Client-ID: kimne78kx3ncx6brgo4mv6wki5h1ko
Content-Type: application/json
```

The login lookup request body uses this fixed persisted-query hash:

```json
{
  "operationName": "GetUserID",
  "variables": { "login": "powergpu", "lookupType": "ACTIVE" },
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "bf6c594605caa0c63522f690156aa04bd434870bf963deb76668c381d16fcaa5"
    }
  }
}
```

Read the returned channel ID from `data.user.id`, then pass it as `variables.channelID` in the Plus request:

```json
{
  "operationName": "PartnerPlusPublicQuery",
  "variables": { "channelID": "54276431" },
  "extensions": {
    "persistedQuery": {
      "version": 1,
      "sha256Hash": "47af8e6f5ca964540743363dcd5c38e79b1a4375e42ba14b9a69b199c7302cee"
    }
  }
}
```

Extract the raw monthly points from `data.plusStatus.partnerPlusProgram.subPoints`. These persisted-query hashes are implementation inputs, not credentials. The application requests only the fields returned by this persisted query and does not perform schema introspection.

For raw request and response troubleshooting for a channel, use:

```text
http://localhost:8413/gqldebug=powergpu
```

### Route map

| Route | Purpose | Result |
|---|---|---|
| `/` | Overlay builder | HTML builder with channel history, visual style/theme selectors, live preview, and generated OBS URL |
| `/plusgoal=LOGIN` | Main data route | Processed JSON; unknown/no-data channel returns 404, Twitch upstream failure returns 502 |
| `/plusgoal/LOGIN` | Alternate data route | Same processed JSON as `/plusgoal=LOGIN` |
| `/plusgoal=LOGIN?format=text` | Text data route | `current / target` as plain text |
| `/overlay=LOGIN?style=STYLE&theme=THEME` | OBS overlay route | Overlay HTML with the channel injected into the page |
| `/overlay?channel=LOGIN` or `/overlay?c=LOGIN` | Query-based overlay route | Original overlay HTML; settings are read from its query string |
| `/overlay.html` | Overlay file route | Original overlay HTML, using the default channel unless configured in the URL |
| `/health` | Health route | JSON status, build version, and uptime |
| `/gqldebug=LOGIN` | Diagnostic route | Persisted-query request body and raw Twitch response; rate limited like other routes |

The server also applies per-IP rate limiting to these routes and logs each HTTP request with its response status and duration.

## OBS overlay URLs

The builder generates URLs in this form:

```text
http://localhost:8413/overlay=powergpu?style=full&theme=grape
```

You can also use `/overlay.html?channel=powergpu&style=full&theme=grape`, or `/overlay?c=powergpu&style=full&theme=grape`.

Supported styles and recommended OBS Browser Source dimensions:

| Style | Dimensions |
|---|---:|
| Text | 640 × 150 |
| Compact | 400 × 200 |
| Full | 640 × 340 |
| Ticker | 640 × 150 |
| Hero | 640 × 260 |
| Ring | 640 × 320 |
| Banner | 800 × 160 |
| Pill | 640 × 150 |

Available themes are **Silver (mono)**, **Grape**, **Mint**, **Gold**, **Ocean**, **Sunset**, **Rose**, and **Emerald**. The query options `channel` or `c`, `style`, `theme`, `w`, `hide=1`, `refresh`, and `stage=1` are supported. Overlays refresh every 10 seconds by default. Refresh intervals can be set from 10–300 seconds, and custom card widths from 220–900 pixels. `stage=1` is for browser previewing and should be omitted from the OBS URL.

## Technologies used

- **Node.js 18+** with built-in `http`, `fs`, and `path` modules
- Native `fetch` and `AbortSignal.timeout()` for Twitch GraphQL requests
- **HTML, CSS, and browser JavaScript** for the builder and OBS overlays
- **PM2** ecosystem configuration for optional process management

No Express, browser automation, external API service, or additional npm runtime package is used.
