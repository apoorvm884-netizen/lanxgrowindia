import test from 'node:test';
import assert from 'node:assert/strict';
import { JourneyProcessor } from '../src/journey-processor.js';
import { normalizePing, TelemetryService } from '../src/telemetry-service.js';

const processor = () => new JourneyProcessor({
  stopSpeedKmh: 2,
  stopRadiusMeters: 20,
  stopMinutes: 3,
  journeyEndMinutes: 10
});

const ping = (minutes, speed, latitude = 28.6139, longitude = 77.209) => ({
  deviceId: 'phone-1',
  timestamp: new Date(Date.UTC(2026, 6, 27, 8, minutes)).toISOString(),
  speed,
  latitude,
  longitude
});

test('starts a journey on first movement', () => {
  const events = processor().process(ping(0, 15));
  assert.equal(events[0].eventType, 'Journey Start');
});

test('creates a stop after remaining within 20m for over 3 minutes then leaving', () => {
  const engine = processor();
  engine.process(ping(0, 20));
  engine.process(ping(1, 0));
  engine.process(ping(5, 0, 28.61391, 77.20901));
  const events = engine.process(ping(6, 20, 28.6145, 77.209));
  assert.equal(events[0].eventType, 'Journey Stop');
  assert.equal(events[0].durationMinutes, 5);
});

test('ends a journey after ten stationary minutes and restarts on movement', () => {
  const engine = processor();
  engine.process(ping(0, 20));
  engine.process(ping(1, 0));
  const ended = engine.process(ping(11, 0));
  assert.equal(ended[0].eventType, 'Journey End');
  const restarted = engine.process(ping(12, 20, 28.6145, 77.209));
  assert.equal(restarted[0].eventType, 'Journey Start');
});

test('ignores out-of-order pings', () => {
  const engine = processor();
  engine.process(ping(5, 20));
  assert.deepEqual(engine.process(ping(4, 20)), []);
});

test('normalizes Traccar knots to km/h and creates a stable ping ID', () => {
  const input = {
    deviceId: 'phone-1',
    latitude: 28.6139,
    longitude: 77.209,
    timestamp: '2026-07-27T08:00:00Z',
    speed: 10,
    ignition: 'false'
  };
  const first = normalizePing(input, 'knots');
  const second = normalizePing(input, 'knots');
  assert.equal(first.speed, 18.52);
  assert.equal(first.ignition, false);
  assert.equal(first.pingId, second.pingId);
});

test('writes a ping to Supabase and Sheets through the isolated pipeline', async () => {
  const calls = [];
  const sheets = {
    ensureSchema: async sheetId => calls.push(['schema', sheetId]),
    readPings: async () => [],
    appendTelemetry: async (sheetId, location, events) => calls.push(['sheet', sheetId, location, events])
  };
  const store = {
    resolveDevice: async () => ({
      id: 'device-db-id',
      school_id: 'school-id',
      vehicle_id: 'vehicle-id',
      tracking_sheet_id: 'school-sheet-id'
    }),
    appendLocation: async (device, location) => calls.push(['supabase', device, location])
  };
  const service = new TelemetryService(sheets, processor(), store);
  await service.initialize();
  const result = await service.ingest(ping(0, 15));
  assert.equal(result.device.vehicle_id, 'vehicle-id');
  assert.deepEqual(calls.map(call => call[0]), ['schema', 'supabase', 'sheet']);
  assert.equal(result.events[0].eventType, 'Journey Start');
});
