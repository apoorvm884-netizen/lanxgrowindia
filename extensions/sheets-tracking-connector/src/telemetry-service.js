const parseNumber = (value, field) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${field} must be a number`);
  return parsed;
};

export function normalizePing(input) {
  const ping = {
    deviceId: String(input.deviceId ?? input.device_id ?? input.id ?? '').trim(),
    latitude: parseNumber(input.latitude ?? input.lat, 'latitude'),
    longitude: parseNumber(input.longitude ?? input.lon ?? input.lng, 'longitude'),
    timestamp: new Date(input.timestamp ?? input.time ?? input.fixTime ?? Date.now()).toISOString(),
    speed: parseNumber(input.speed ?? 0, 'speed')
  };

  if (!ping.deviceId) throw new Error('deviceId is required');
  if (ping.latitude < -90 || ping.latitude > 90) throw new Error('latitude is out of range');
  if (ping.longitude < -180 || ping.longitude > 180) throw new Error('longitude is out of range');
  if (ping.speed < 0) throw new Error('speed cannot be negative');
  return ping;
}

export class TelemetryService {
  constructor(sheets, processor) {
    this.sheets = sheets;
    this.processor = processor;
    this.queue = Promise.resolve();
  }

  initialize() {
    this.queue = this.queue.then(async () => {
      await this.sheets.ensureSchema();
      const history = await this.sheets.readPings();
      history
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
        .forEach(ping => this.processor.process(ping, { emit: false }));
    });
    return this.queue;
  }

  ingest(input) {
    const ping = normalizePing(input);
    const operation = this.queue.then(async () => {
      await this.sheets.appendPing(ping);
      const events = this.processor.process(ping);
      await this.sheets.appendEvents(events);
      return { ping, events };
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
