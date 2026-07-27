import { distanceMeters, mapsLink } from './geo.js';

const minutesBetween = (from, to) => (to.getTime() - from.getTime()) / 60000;

export class JourneyProcessor {
  constructor(options) {
    this.options = options;
    this.devices = new Map();
  }

  process(ping, { emit = true } = {}) {
    const timestamp = new Date(ping.timestamp);
    const previous = this.devices.get(ping.deviceId);
    const state = previous || {
      lastPing: null,
      journeyStartedAt: null,
      stationarySince: null,
      stationaryAnchor: null,
      journeyEndedForStop: false
    };

    if (state.lastPing && timestamp <= new Date(state.lastPing.timestamp)) {
      return [];
    }

    const events = [];
    const slow = ping.speed <= this.options.stopSpeedKmh;
    const insideRadius = state.stationaryAnchor
      ? distanceMeters(state.stationaryAnchor, ping) <= this.options.stopRadiusMeters
      : false;

    if (slow && (!state.stationaryAnchor || insideRadius)) {
      if (!state.stationarySince) {
        state.stationarySince = timestamp;
        state.stationaryAnchor = ping;
        state.journeyEndedForStop = false;
      }

      const stationaryMinutes = minutesBetween(state.stationarySince, timestamp);
      if (
        state.journeyStartedAt &&
        stationaryMinutes >= this.options.journeyEndMinutes &&
        !state.journeyEndedForStop
      ) {
        events.push(this.#event(
          'Journey End',
          timestamp,
          minutesBetween(state.journeyStartedAt, state.stationarySince),
          state.stationaryAnchor
        ));
        state.journeyStartedAt = null;
        state.journeyEndedForStop = true;
      }
    } else {
      if (state.stationarySince) {
        const stationaryMinutes = minutesBetween(state.stationarySince, timestamp);
        if (
          state.journeyStartedAt &&
          stationaryMinutes >= this.options.stopMinutes &&
          stationaryMinutes < this.options.journeyEndMinutes
        ) {
          events.push(this.#event(
            'Journey Stop',
            state.stationarySince,
            stationaryMinutes,
            state.stationaryAnchor
          ));
        }
      }

      if (!state.journeyStartedAt) {
        state.journeyStartedAt = timestamp;
        events.push(this.#event('Journey Start', timestamp, null, ping));
      }

      state.stationarySince = null;
      state.stationaryAnchor = null;
      state.journeyEndedForStop = false;
    }

    state.lastPing = ping;
    this.devices.set(ping.deviceId, state);
    return emit ? events : [];
  }

  checkpoint() {
    return structuredClone(this.devices);
  }

  restore(checkpoint) {
    this.devices = checkpoint;
  }

  #event(type, time, durationMinutes, location) {
    return {
      date: time.toISOString().slice(0, 10),
      deviceId: location.deviceId,
      eventType: type,
      timeTriggered: time.toISOString(),
      durationMinutes: durationMinutes === null ? '' : Number(durationMinutes.toFixed(2)),
      googleMapsLink: mapsLink(location)
    };
  }
}
