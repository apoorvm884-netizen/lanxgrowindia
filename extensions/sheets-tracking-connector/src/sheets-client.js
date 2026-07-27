import { google } from 'googleapis';

const RAW_TAB = 'Raw_Pings';
const SUMMARY_TAB = 'Trip_Summary';
const RAW_HEADER = ['Timestamp', 'Device_ID', 'Latitude', 'Longitude', 'Speed_KMH', 'Ping_ID'];
const SUMMARY_HEADER = ['Date', 'Device_ID', 'Event_Type', 'Time_Triggered', 'Duration_Minutes', 'Google_Maps_Link', 'Event_ID'];

export class SheetsClient {
  constructor(config) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.serviceAccountEmail,
        private_key: config.serviceAccountPrivateKey
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    this.api = google.sheets({ version: 'v4', auth });
    this.sheets = new Map();
  }

  async ensureSchema(sheetId) {
    const metadata = await this.api.spreadsheets.get({ spreadsheetId: sheetId });
    const existing = new Set(metadata.data.sheets.map(sheet => sheet.properties.title));
    const requests = [RAW_TAB, SUMMARY_TAB]
      .filter(title => !existing.has(title))
      .map(title => ({ addSheet: { properties: { title } } }));

    if (requests.length) {
      await this.api.spreadsheets.batchUpdate({
        spreadsheetId: sheetId,
        requestBody: { requests }
      });
    }

    const refreshed = await this.api.spreadsheets.get({ spreadsheetId: sheetId });
    const state = { tabIds: {}, pingIds: new Set() };
    for (const sheet of refreshed.data.sheets) {
      state.tabIds[sheet.properties.title] = sheet.properties.sheetId;
    }
    this.sheets.set(sheetId, state);

    await Promise.all([
      this.#setHeader(sheetId, `${RAW_TAB}!A1:F1`, RAW_HEADER),
      this.#setHeader(sheetId, `${SUMMARY_TAB}!A1:G1`, SUMMARY_HEADER)
    ]);
  }

  async appendTelemetry(sheetId, ping, events) {
    const state = this.sheets.get(sheetId);
    if (!state) throw new Error('Google Sheet is not initialized');
    if (state.pingIds.has(ping.pingId)) return false;
    const requests = [
      this.#appendCells(state.tabIds[RAW_TAB], [[
        ping.timestamp,
        ping.deviceId,
        ping.latitude,
        ping.longitude,
        ping.speed,
        ping.pingId
      ]])
    ];
    if (events.length) {
      requests.push(this.#appendCells(state.tabIds[SUMMARY_TAB], events.map(event => [
        event.date,
        event.deviceId,
        event.eventType,
        event.timeTriggered,
        event.durationMinutes,
        event.googleMapsLink,
        `${ping.pingId}:${event.eventType}`
      ])));
    }
    await this.api.spreadsheets.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { requests }
    });
    state.pingIds.add(ping.pingId);
    return true;
  }

  async readPings(sheetId) {
    const response = await this.api.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: `${RAW_TAB}!A2:F`
    });
    const state = this.sheets.get(sheetId);
    return (response.data.values || []).map(row => ({
      timestamp: row[0],
      deviceId: row[1],
      latitude: Number(row[2]),
      longitude: Number(row[3]),
      speed: Number(row[4]),
      pingId: row[5] || null
    })).filter(ping =>
      ping.timestamp &&
      ping.deviceId &&
      Number.isFinite(ping.latitude) &&
      Number.isFinite(ping.longitude) &&
      Number.isFinite(ping.speed)
    ).map(ping => {
      if (ping.pingId) state?.pingIds.add(ping.pingId);
      return ping;
    });
  }

  async #setHeader(sheetId, range, values) {
    await this.api.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [values] }
    });
  }

  #appendCells(sheetId, rows) {
    const value = item => typeof item === 'number'
      ? { userEnteredValue: { numberValue: item } }
      : { userEnteredValue: { stringValue: String(item ?? '') } };
    return {
      appendCells: {
        sheetId,
        rows: rows.map(row => ({ values: row.map(value) })),
        fields: 'userEnteredValue'
      }
    };
  }
}
