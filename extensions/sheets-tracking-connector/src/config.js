const required = [
  'GOOGLE_SERVICE_ACCOUNT_EMAIL',
  'GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY',
  'TELEMETRY_WEBHOOK_SECRET',
  'SUPABASE_URL',
  'SUPABASE_SECRET_KEY'
];

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing required environment variable: ${key}`);
}

const positiveNumber = (name, fallback) => {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number`);
  return value;
};

const inputSpeedUnit = process.env.INPUT_SPEED_UNIT || 'kmh';
if (!['kmh', 'knots', 'mph', 'mps'].includes(inputSpeedUnit)) {
  throw new Error('INPUT_SPEED_UNIT must be kmh, knots, mph, or mps');
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 8080),
  serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
  serviceAccountPrivateKey: process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, '\n'),
  webhookSecret: process.env.TELEMETRY_WEBHOOK_SECRET,
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseSecretKey: process.env.SUPABASE_SECRET_KEY,
  inputSpeedUnit,
  stopSpeedKmh: positiveNumber('STOP_SPEED_KMH', 2),
  stopRadiusMeters: positiveNumber('STOP_RADIUS_METERS', 20),
  stopMinutes: positiveNumber('STOP_MINUTES', 3),
  journeyEndMinutes: positiveNumber('JOURNEY_END_MINUTES', 10)
});
