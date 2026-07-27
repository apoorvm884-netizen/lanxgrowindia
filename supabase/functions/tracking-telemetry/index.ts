import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { importPKCS8, SignJWT } from 'npm:jose@6.1.2';

const RAW_TAB = 'Raw_Pings';
const SUMMARY_TAB = 'Trip_Summary';
const RAW_HEADER = ['Timestamp', 'Device_ID', 'Latitude', 'Longitude', 'Speed_KMH', 'Ping_ID'];
const SUMMARY_HEADER = ['Date', 'Device_ID', 'Event_Type', 'Time_Triggered', 'Duration_Minutes', 'Google_Maps_Link', 'Event_ID'];
const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets';

type RuntimeConfig = {
  serviceAccountEmail: string;
  privateKey: string;
  webhookSecret: string;
  inputSpeedUnit: 'kmh' | 'knots' | 'mph' | 'mps';
  stopSpeedKmh: number;
  stopRadiusMeters: number;
  stopMinutes: number;
  journeyEndMinutes: number;
};

type Ping = {
  deviceId: string;
  latitude: number;
  longitude: number;
  timestamp: string;
  speed: number;
  heading: number | null;
  accuracy: number | null;
  ignition: boolean | null;
  pingId: string;
};

type JourneyEvent = {
  date: string;
  deviceId: string;
  eventType: 'Journey Start' | 'Journey Stop' | 'Journey End';
  timeTriggered: string;
  durationMinutes: number | '';
  googleMapsLink: string;
  eventId: string;
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' }
});

const numberValue = (value: unknown, field: string) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a number`);
  return parsed;
};

const optionalNumber = (value: unknown, field: string) => {
  if (value === null || value === undefined || value === '') return null;
  return numberValue(value, field);
};

const optionalBoolean = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || String(value).toLowerCase() === 'true') return true;
  if (value === 0 || value === '0' || String(value).toLowerCase() === 'false') return false;
  throw new Error('ignition must be a boolean');
};

const hex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes)).map(byte => byte.toString(16).padStart(2, '0')).join('');

const digest = async (value: string) =>
  hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)));

const safeEqual = async (left: string, right: string) => {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a.charCodeAt(index) || 0) ^ (b.charCodeAt(index) || 0);
  }
  return difference === 0;
};

const normalizePing = async (input: Record<string, unknown>, unit: RuntimeConfig['inputSpeedUnit']): Promise<Ping> => {
  const deviceId = String(input.deviceId ?? input.device_id ?? input.id ?? '').trim();
  if (!deviceId) throw new Error('deviceId is required');
  const latitude = numberValue(input.latitude ?? input.lat, 'latitude');
  const longitude = numberValue(input.longitude ?? input.lon ?? input.lng, 'longitude');
  const rawSpeed = numberValue(input.speed ?? 0, 'speed');
  const factors = { kmh: 1, knots: 1.852, mph: 1.609344, mps: 3.6 };
  const speed = rawSpeed * factors[unit];
  const timestamp = new Date(String(input.timestamp ?? input.time ?? input.fixTime ?? Date.now())).toISOString();
  const heading = optionalNumber(input.heading ?? input.bearing, 'heading');
  const accuracy = optionalNumber(input.accuracy, 'accuracy');
  if (latitude < -90 || latitude > 90) throw new Error('latitude is out of range');
  if (longitude < -180 || longitude > 180) throw new Error('longitude is out of range');
  if (speed < 0) throw new Error('speed cannot be negative');
  if (heading !== null && (heading < 0 || heading >= 360)) throw new Error('heading is out of range');
  if (accuracy !== null && accuracy < 0) throw new Error('accuracy cannot be negative');
  const stable = [deviceId, timestamp, latitude, longitude, speed].join('|');
  return {
    deviceId,
    latitude,
    longitude,
    timestamp,
    speed,
    heading,
    accuracy,
    ignition: optionalBoolean(input.ignition),
    pingId: String(input.pingId ?? input.ping_id ?? '').trim() || await digest(stable)
  };
};

const distanceMeters = (
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number }
) => {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const dLat = radians(second.latitude - first.latitude);
  const dLon = radians(second.longitude - first.longitude);
  const lat1 = radians(first.latitude);
  const lat2 = radians(second.latitude);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const mapsLink = (latitude: number, longitude: number) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;

const getGoogleToken = async (config: RuntimeConfig) => {
  const now = Math.floor(Date.now() / 1000);
  const privateKey = await importPKCS8(config.privateKey.replace(/\\n/g, '\n'), 'RS256');
  const assertion = await new SignJWT({ scope: GOOGLE_SCOPE })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(config.serviceAccountEmail)
    .setAudience('https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(privateKey);
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion
    })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) {
    throw new Error(`Google authentication failed: ${result.error_description || result.error || response.status}`);
  }
  return String(result.access_token);
};

const googleRequest = async (path: string, token: string, init: RequestInit = {}) => {
  const response = await fetch(`https://sheets.googleapis.com/v4/${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Google Sheets request failed: ${result?.error?.message || response.status}`);
  }
  return result;
};

const ensureSheetSchema = async (sheetId: string, token: string) => {
  const metadata = await googleRequest(
    `spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties`,
    token
  );
  const existing = new Set<string>(
    (metadata.sheets || []).map((sheet: { properties: { title: string } }) => sheet.properties.title)
  );
  const requests = [RAW_TAB, SUMMARY_TAB]
    .filter(title => !existing.has(title))
    .map(title => ({ addSheet: { properties: { title } } }));
  if (requests.length) {
    await googleRequest(`spreadsheets/${encodeURIComponent(sheetId)}:batchUpdate`, token, {
      method: 'POST',
      body: JSON.stringify({ requests })
    });
  }
  await Promise.all([
    googleRequest(
      `spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(`${RAW_TAB}!A1:F1`)}?valueInputOption=RAW`,
      token,
      { method: 'PUT', body: JSON.stringify({ values: [RAW_HEADER] }) }
    ),
    googleRequest(
      `spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(`${SUMMARY_TAB}!A1:G1`)}?valueInputOption=RAW`,
      token,
      { method: 'PUT', body: JSON.stringify({ values: [SUMMARY_HEADER] }) }
    )
  ]);
};

const appendRows = async (sheetId: string, token: string, range: string, rows: unknown[][]) => {
  if (!rows.length) return;
  await googleRequest(
    `spreadsheets/${encodeURIComponent(sheetId)}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`,
    token,
    { method: 'POST', body: JSON.stringify({ values: rows }) }
  );
};

const buildEvents = (
  ping: Ping,
  state: Record<string, unknown> | null,
  config: RuntimeConfig
) => {
  const next = {
    journey_started_at: state?.journey_started_at as string | null || null,
    stationary_since: state?.stationary_since as string | null || null,
    stationary_latitude: state?.stationary_latitude as number | null ?? null,
    stationary_longitude: state?.stationary_longitude as number | null ?? null,
    journey_ended_for_stop: Boolean(state?.journey_ended_for_stop),
    last_ping_at: state?.last_ping_at as string | null || null
  };
  const events: JourneyEvent[] = [];
  const timestamp = new Date(ping.timestamp);
  if (next.last_ping_at && timestamp <= new Date(next.last_ping_at)) return { events, next, ignored: true };

  const slow = ping.speed <= config.stopSpeedKmh;
  const anchor = next.stationary_latitude === null || next.stationary_longitude === null
    ? null
    : { latitude: next.stationary_latitude, longitude: next.stationary_longitude };
  const insideRadius = anchor ? distanceMeters(anchor, ping) <= config.stopRadiusMeters : false;
  const minutesBetween = (from: string | Date, to: Date) =>
    (to.getTime() - new Date(from).getTime()) / 60000;
  const event = (
    eventType: JourneyEvent['eventType'],
    time: Date,
    durationMinutes: number | '',
    latitude: number,
    longitude: number
  ): JourneyEvent => ({
    date: time.toISOString().slice(0, 10),
    deviceId: ping.deviceId,
    eventType,
    timeTriggered: time.toISOString(),
    durationMinutes: durationMinutes === '' ? '' : Number(durationMinutes.toFixed(2)),
    googleMapsLink: mapsLink(latitude, longitude),
    eventId: `${ping.pingId}:${eventType}`
  });

  if (slow && (!anchor || insideRadius)) {
    if (!next.stationary_since) {
      next.stationary_since = ping.timestamp;
      next.stationary_latitude = ping.latitude;
      next.stationary_longitude = ping.longitude;
      next.journey_ended_for_stop = false;
    }
    const stationaryMinutes = minutesBetween(next.stationary_since, timestamp);
    if (
      next.journey_started_at &&
      stationaryMinutes >= config.journeyEndMinutes &&
      !next.journey_ended_for_stop
    ) {
      events.push(event(
        'Journey End',
        timestamp,
        minutesBetween(next.journey_started_at, new Date(next.stationary_since)),
        next.stationary_latitude!,
        next.stationary_longitude!
      ));
      next.journey_started_at = null;
      next.journey_ended_for_stop = true;
    }
  } else {
    if (next.stationary_since) {
      const stationaryMinutes = minutesBetween(next.stationary_since, timestamp);
      if (
        next.journey_started_at &&
        stationaryMinutes >= config.stopMinutes &&
        stationaryMinutes < config.journeyEndMinutes
      ) {
        events.push(event(
          'Journey Stop',
          new Date(next.stationary_since),
          stationaryMinutes,
          next.stationary_latitude!,
          next.stationary_longitude!
        ));
      }
    }
    if (!next.journey_started_at) {
      next.journey_started_at = ping.timestamp;
      events.push(event('Journey Start', timestamp, '', ping.latitude, ping.longitude));
    }
    next.stationary_since = null;
    next.stationary_latitude = null;
    next.stationary_longitude = null;
    next.journey_ended_for_stop = false;
  }
  next.last_ping_at = ping.timestamp;
  return { events, next, ignored: false };
};

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Supabase function environment is incomplete');
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const { data: runtimeData, error: runtimeError } = await admin.rpc('tracking_runtime_config');
    if (runtimeError) throw runtimeError;
    const config = runtimeData as RuntimeConfig;
    if (!config?.serviceAccountEmail || !config.privateKey || !config.webhookSecret) {
      return json({ error: 'Tracking backend is not fully configured' }, 503);
    }
    const suppliedSecret = request.headers.get('x-telemetry-secret') || '';
    if (!suppliedSecret || !await safeEqual(suppliedSecret, config.webhookSecret)) {
      return json({ error: 'Unauthorized' }, 401);
    }

    const input = await request.json() as Record<string, unknown>;
    const ping = await normalizePing(input, config.inputSpeedUnit);
    const { data: device, error: deviceError } = await admin
      .from('gps_devices')
      .select('id, school_id, vehicle_id, status')
      .eq('device_uid', ping.deviceId)
      .eq('status', 'active')
      .maybeSingle();
    if (deviceError) throw deviceError;
    if (!device) throw new Error(`No active GPS device matches deviceId: ${ping.deviceId}`);
    if (!device.vehicle_id) throw new Error(`GPS device is not assigned to a vehicle: ${ping.deviceId}`);

    const { data: school, error: schoolError } = await admin
      .from('schools')
      .select('tracking_sheet_id')
      .eq('id', device.school_id)
      .single();
    if (schoolError) throw schoolError;
    if (!school?.tracking_sheet_id) throw new Error(`Tracking Sheet ID is not configured for deviceId: ${ping.deviceId}`);

    const { data: duplicate, error: duplicateError } = await admin
      .from('vehicle_locations')
      .select('id')
      .eq('device_id', device.id)
      .eq('recorded_at', ping.timestamp)
      .limit(1);
    if (duplicateError) throw duplicateError;
    if (duplicate?.length) {
      return json({ accepted: true, duplicate: true, deviceId: ping.deviceId }, 200);
    }

    const { data: state, error: stateError } = await admin
      .from('tracking_device_state')
      .select('*')
      .eq('device_id', device.id)
      .maybeSingle();
    if (stateError) throw stateError;
    const processed = buildEvents(ping, state, config);
    if (processed.ignored) return json({ accepted: true, ignored: true, deviceId: ping.deviceId }, 200);

    const googleToken = await getGoogleToken(config);
    await ensureSheetSchema(school.tracking_sheet_id, googleToken);
    await appendRows(school.tracking_sheet_id, googleToken, `${RAW_TAB}!A:F`, [[
      ping.timestamp, ping.deviceId, ping.latitude, ping.longitude, ping.speed, ping.pingId
    ]]);
    await appendRows(
      school.tracking_sheet_id,
      googleToken,
      `${SUMMARY_TAB}!A:G`,
      processed.events.map(event => [
        event.date,
        event.deviceId,
        event.eventType,
        event.timeTriggered,
        event.durationMinutes,
        event.googleMapsLink,
        event.eventId
      ])
    );

    const { error: locationError } = await admin.from('vehicle_locations').insert({
      school_id: device.school_id,
      vehicle_id: device.vehicle_id,
      device_id: device.id,
      latitude: ping.latitude,
      longitude: ping.longitude,
      speed_kmph: ping.speed,
      heading: ping.heading,
      accuracy_m: ping.accuracy,
      ignition: ping.ignition,
      recorded_at: ping.timestamp
    });
    if (locationError) throw locationError;

    const { error: upsertError } = await admin.from('tracking_device_state').upsert({
      device_id: device.id,
      ...processed.next,
      updated_at: new Date().toISOString()
    });
    if (upsertError) throw upsertError;

    return json({
      accepted: true,
      deviceId: ping.deviceId,
      vehicleId: device.vehicle_id,
      eventsCreated: processed.events.map(event => event.eventType)
    }, 202);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isInputError = /required|number|range|boolean|Invalid time value|No active GPS device|not assigned to a vehicle|Tracking Sheet ID is not configured/.test(message);
    console.error('Telemetry ingestion failed', { message });
    return json({ error: isInputError ? message : 'Telemetry could not be processed' }, isInputError ? 400 : 500);
  }
});
