import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { config } from './config.js';
import { JourneyProcessor } from './journey-processor.js';
import { SheetsClient } from './sheets-client.js';
import { TelemetryService } from './telemetry-service.js';
import { SupabaseTrackingStore } from './supabase-tracking-store.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '32kb' }));

const sheets = new SheetsClient(config);
const processor = new JourneyProcessor(config);
const trackingStore = new SupabaseTrackingStore(config);
const telemetry = new TelemetryService(sheets, processor, trackingStore, {
  inputSpeedUnit: config.inputSpeedUnit
});
await telemetry.initialize();

const authorized = request => {
  const supplied = request.get('x-telemetry-secret') || '';
  const expected = config.webhookSecret;
  const a = Buffer.from(supplied);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

app.get('/health', (_request, response) => {
  response.json({ ok: true, service: 'sheets-tracking-connector' });
});

app.post('/webhooks/telemetry', async (request, response) => {
  if (!authorized(request)) return response.status(401).json({ error: 'Unauthorized' });

  try {
    const result = await telemetry.ingest(request.body);
    return response.status(202).json({
      accepted: true,
      deviceId: result.ping.deviceId,
      vehicleId: result.device.vehicle_id,
      eventsCreated: result.events.map(event => event.eventType)
    });
  } catch (error) {
    const isInputError = /required|number|range|boolean|Invalid time value|No active GPS device|not assigned to a vehicle|Tracking Sheet ID is not configured/.test(error.message);
    console.error('Telemetry ingestion failed', { message: error.message });
    return response.status(isInputError ? 400 : 500).json({
      error: isInputError ? error.message : 'Telemetry could not be processed'
    });
  }
});

app.use((_request, response) => response.status(404).json({ error: 'Not found' }));

app.listen(config.port, () => {
  console.log(`Sheets tracking connector listening on port ${config.port}`);
});
