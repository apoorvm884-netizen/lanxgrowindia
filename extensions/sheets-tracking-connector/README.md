# Google Sheets Tracking Connector

This is an independent Node.js service. It does not import, edit, or replace the
LANXGROW frontend, Supabase services, authentication, routing, or database.
Deleting this directory removes the connector without affecting the old app.

## Google Sheet

Create a Google Spreadsheet (or let the service create missing tabs). It uses:

- `Raw_Pings`: `Timestamp, Device_ID, Latitude, Longitude, Speed`
- `Trip_Summary`: `Date, Event_Type, Time_Triggered, Duration_Minutes, Google_Maps_Link`

The summary schema requested does not contain `Device_ID`. For one shared sheet
with multiple tracked phones, adding `Device_ID` to `Trip_Summary` is strongly
recommended in a later schema version so events can be attributed unambiguously.

## Google Cloud setup

1. Open Google Cloud Console and create/select a project.
2. Go to **APIs & Services → Library** and enable **Google Sheets API**.
3. Go to **IAM & Admin → Service Accounts**, create `tracker-writer`, and create
   a JSON key.
4. Open the target Google Sheet and share it with the JSON key's
   `client_email` as **Editor**. Do not give the service account broad project
   roles; Sheet sharing is the required data permission.
5. Copy `.env.example` to `.env`. Set `GOOGLE_SHEET_ID` from the URL segment
   between `/d/` and `/edit`, then copy `client_email` and `private_key` from
   the JSON into the matching variables.
6. Never commit `.env` or the downloaded JSON key. Store the same values as
   encrypted secrets in the deployment platform.

## Run

```bash
cd extensions/sheets-tracking-connector
npm install
npm test
npm start
```

Health check:

```bash
curl http://localhost:8080/health
```

Send a canonical ping:

```bash
curl -X POST http://localhost:8080/webhooks/telemetry \
  -H "content-type: application/json" \
  -H "x-telemetry-secret: YOUR_SECRET" \
  -d '{"deviceId":"phone-001","latitude":28.6139,"longitude":77.2090,"timestamp":"2026-07-27T08:00:00Z","speed":18}'
```

The normalizer also accepts common Traccar-like aliases:
`id/device_id`, `lat`, `lon/lng`, and `time/fixTime`.
Configure Traccar/custom mobile middleware to POST each position to this URL
and include `x-telemetry-secret`.

## Processing rules

- Moving: speed above `STOP_SPEED_KMH`, or movement outside the configured
  `STOP_RADIUS_METERS`.
- Stop: while a journey is active, the phone stays at or below the speed
  threshold and within 20m for at least 3 minutes. The stop row is written when
  movement resumes, so its duration is exact.
- Journey start: the first moving ping after startup or a completed journey.
- Journey end: the first ping confirming stationary time has reached
  `JOURNEY_END_MINUTES` (default 10).
- Pings are serialized before sheet writes. Out-of-order pings do not mutate
  journey state. On restart, state is rebuilt from `Raw_Pings`.

## Safe integration

No existing LANXGROW code needs modification. Deploy this directory as a
separate Node service (Cloud Run, Render, Railway, or a dedicated VM) with one
instance. Point the mobile app or Traccar forwarding webhook directly at:

`POST https://YOUR-CONNECTOR/webhooks/telemetry`

To disable or roll back, stop the connector or remove the forwarding webhook.
The existing platform continues operating normally.

For horizontal scaling or very high write volume, replace the in-memory queue
with a durable queue/state store and batch Google Sheets writes. Google Sheets
is suitable for modest tracking volume, not high-frequency fleet telemetry.
