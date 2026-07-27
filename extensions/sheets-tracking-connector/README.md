[README.md](https://github.com/user-attachments/files/30404961/README.md)
# Google Sheets Tracking Connector

This is an independent Node.js service. It does not import, edit, or replace the
LANXGROW frontend, Supabase services, authentication, routing, or database.
Deleting this directory removes the connector without affecting the old app.

## Google Sheet

Create a Google Spreadsheet (or let the service create missing tabs). It uses:

- `Raw_Pings`: `Timestamp, Device_ID, Latitude, Longitude, Speed_KMH, Ping_ID`
- `Trip_Summary`: `Date, Device_ID, Event_Type, Time_Triggered, Duration_Minutes, Google_Maps_Link, Event_ID`

`Ping_ID` prevents duplicate raw rows after webhook retries. `Device_ID` and
`Event_ID` make multi-device summaries attributable and retry-safe.

## Google Cloud setup

1. Open Google Cloud Console and create/select a project.
2. Go to **APIs & Services → Library** and enable **Google Sheets API**.
3. Go to **IAM & Admin → Service Accounts**, create `tracker-writer`, and create
   a JSON key.
4. Open the target Google Sheet and share it with the JSON key's
   `client_email` as **Editor**. Do not give the service account broad project
   roles; Sheet sharing is the required data permission.
5. Copy `.env.example` to `.env`, then copy `client_email` and `private_key`
   from the JSON into the matching variables.
6. Never commit `.env` or the downloaded JSON key. Store the same values as
   encrypted secrets in the deployment platform.

## LANXGROW UI connection

The connector also writes each accepted ping to the existing Supabase
`vehicle_locations` table. Existing database triggers update
`vehicle_current_location`, `vehicle_events`, and `gps_devices.last_seen_at`.
The existing LANXGROW GPS screen therefore shows the live map location,
moving/stopped state, speed, and recent events without replacing frontend code.

Before sending pings:

1. In LANXGROW, open the relevant school's **GPS Tracking** screen.
2. Create a vehicle.
3. Create a GPS device and set **Device UID** to exactly the mobile app's
   `deviceId`.
4. Assign that GPS device to the vehicle and keep it active.
5. As Super Admin, open **Schools**, click **Add Sheet/Change Sheet** on that
   school, and paste the Sheet ID from the URL segment between `/d/` and
   `/edit`.

Each school can use a different Google Sheet. The connector resolves the
incoming device to its school and writes only to that school's configured
spreadsheet.

Set `SUPABASE_URL` and a backend-only Supabase secret key in the connector's
deployment environment. Never use or expose this secret in the Vite frontend.

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

Set `INPUT_SPEED_UNIT=knots` for standard Traccar speed values. Supported values
are `kmh`, `knots`, `mph`, and `mps`; all stored/output speeds are normalized to
km/h.

## Processing rules

- Moving: speed above `STOP_SPEED_KMH`, or movement outside the configured
  `STOP_RADIUS_METERS`.
- Stop: while a journey is active, the phone stays at or below the speed
  threshold and within 20m for at least 3 minutes. The stop row is written when
  movement resumes, so its duration is exact.
- Journey start: the first moving ping after startup or a completed journey.
- Journey end: the first ping confirming stationary time has reached
  `JOURNEY_END_MINUTES` (default 10).
- Pings are serialized before writes and receive a stable `Ping_ID`.
  Out-of-order pings do not mutate journey state. On restart, state is rebuilt
  from `Raw_Pings`.

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
