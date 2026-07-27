import { createHash } from 'node:crypto';

const parseNumber = (value, field) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a number`);
  return parsed;
};

const speedInKmh = (speed, unit) => {
  const factors = { kmh: 1, knots: 1.852, mph: 1.609344, mps: 3.6 };
  if (!factors[unit]) throw new Error('INPUT_SPEED_UNIT must be kmh, knots, mph, or mps');
  return speed * factors[unit];
};

const parseOptionalBoolean = value => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || String(value).toLowerCase() === 'true') return true;
  if (value === 0 || value === '0' || String(value).toLowerCase() === 'false') return false;
  throw new Error('ignition must be a boolean');
};

export function normalizePing(input, inputSpeedUnit = 'kmh') {
  const rawSpeed = parseNumber(input.speed ?? 0, 'speed');
  const ping = {
    deviceId: String(input.deviceId ?? input.device_id ?? input.id ?? '').trim(),
    latitude: parseNumber(input.latitude ?? input.lat, 'latitude'),
    longitude: parseNumber(input.longitude ?? input.lon ?? input.lng, 'longitude'),
    timestamp: new Date(input.timestamp ?? input.time ?? input.fixTime ?? Date.now()).toISOString(),
    speed: speedInKmh(rawSpeed, inputSpeedUnit),
    heading: input.heading ?? input.bearing ?? null,
    accuracy: input.accuracy ?? null,
    ignition: input.ignition ?? null
  };

  if (!ping.deviceId) throw new Error('deviceId is required');
  if (ping.latitude < -90 || ping.latitude > 90) throw new Error('latitude is out of range');
  if (ping.longitude < -180 || ping.longitude > 180) throw new Error('longitude is out of range');
  if (ping.speed < 0) throw new Error('speed cannot be negative');
  if (ping.heading !== null) {
    ping.heading = parseNumber(ping.heading, 'heading');
    if (ping.heading < 0 || ping.heading >= 360) throw new Error('heading is out of range');
  }
  if (ping.accuracy !== null) {
    ping.accuracy = parseNumber(ping.accuracy, 'accuracy');
    if (ping.accuracy < 0) throw new Error('accuracy cannot be negative');
  }
  ping.ignition = parseOptionalBoolean(ping.ignition);
  ping.pingId = String(input.pingId ?? input.ping_id ?? '').trim() ||
    createHash('sha256')
      .update([ping.deviceId, ping.timestamp, ping.latitude, ping.longitude, ping.speed].join('|'))
      .digest('hex');
  return ping;
}

export class TelemetryService {
  constructor(sheets, processor, trackingStore, options = {}) {
    this.sheets = sheets;
    this.processor = processor;
    this.trackingStore = trackingStore;
    this.inputSpeedUnit = options.inputSpeedUnit || 'kmh';
    this.initializedSheets = new Set();
    this.queue = Promise.resolve();
  }

  initialize() {
    return this.queue;
  }

  async ensureSheet(sheetId) {
    if (this.initializedSheets.has(sheetId)) return;
    await this.sheets.ensureSchema(sheetId);
    const history = await this.sheets.readPings(sheetId);
      history
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .forEach(ping => this.processor.process(ping, { emit: false }));
    this.initializedSheets.add(sheetId);
  }

  ingest(input) {
    const ping = normalizePing(input, this.inputSpeedUnit);
    const operation = this.queue.then(async () => {
      const device = await this.trackingStore.resolveDevice(ping.deviceId);
      await this.ensureSheet(device.tracking_sheet_id);
      const checkpoint = this.processor.checkpoint();
      const events = this.processor.process(ping);
      try {
        await this.trackingStore.appendLocation(device, ping);
        await this.sheets.appendTelemetry(device.tracking_sheet_id, ping, events);
        return { ping, events, device };
      } catch (error) {
        this.processor.restore(checkpoint);
        throw error;
      }
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
