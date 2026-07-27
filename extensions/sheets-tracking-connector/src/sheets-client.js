import { google } from 'googleapis';

const RAW_TAB = 'Raw_Pings';
const SUMMARY_TAB = 'Trip_Summary';
const RAW_HEADER = ['Timestamp', 'Device_ID', 'Latitude', 'Longitude', 'Speed'];
const SUMMARY_HEADER = ['Date', 'Event_Type', 'Time_Triggered', 'Duration_Minutes', 'Google_Maps_Link'];

export class SheetsClient {
  constructor(config) {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: config.serviceAccountEmail,
        private_key: config.serviceAccountPrivateKey
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    this.sheetId = config.sheetId;
    this.api = google.sheets({ version: 'v4', auth });
  }

  async ensureSchema() {
    const metadata = await this.api.spreadsheets.get({ spreadsheetId: this.sheetId });
    const existing = new Set(metadata.data.sheets.map(sheet => sheet.properties.title));
    const requests = [RAW_TAB, SUMMARY_TAB]
      .filter(title => !existing.has(title))
      .map(title => ({ addSheet: { properties: { title } } }));

    if (requests.length) {
      await this.api.spreadsheets.batchUpdate({
        spreadsheetId: this.sheetId,
        requestBody: { requests }
      });
    }

    await Promise.all([
      this.#setHeader(`${RAW_TAB}!A1:E1`, RAW_HEADER),
      this.#setHeader(`${SUMMARY_TAB}!A1:E1`, SUMMARY_HEADER)
    ]);
  }

  async appendPing(ping) {
    await this.#append(`${RAW_TAB}!A:E`, [[
      ping.timestamp,
      ping.deviceId,
      ping.latitude,
      ping.longitude,
      ping.speed
    ]]);
  }

  async appendEvents(events) {
    if (!events.length) return;
    await this.#append(`${SUMMARY_TAB}!A:E`, events.map(event => [
      event.date,
      event.eventType,
      event.timeTriggered,
      event.durationMinutes,
      event.googleMapsLink
    ]));
  }

  async readPings() {
    const response = await this.api.spreadsheets.values.get({
      spreadsheetId: this.sheetId,
      range: `${RAW_TAB}!A2:E`
    });
    return (response.data.values || []).map(row => ({
      timestamp: row[0],
      deviceId: row[1],
      latitude: Number(row[2]),
      longitude: Number(row[3]),
      speed: Number(row[4])
    })).filter(ping =>
      ping.timestamp &&
      ping.deviceId &&
      Number.isFinite(ping.latitude) &&
      Number.isFinite(ping.longitude) &&
      Number.isFinite(ping.speed)
    );
  }

  async #setHeader(range, values) {
    await this.api.spreadsheets.values.update({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [values] }
    });
  }

  async #append(range, values) {
    await this.api.spreadsheets.values.append({
      spreadsheetId: this.sheetId,
      range,
      valueInputOption: 'USER_ENTERED',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values }
    });
  }
}
