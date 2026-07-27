const EARTH_RADIUS_METERS = 6371000;

const radians = degrees => degrees * Math.PI / 180;

export function distanceMeters(a, b) {
  const lat1 = radians(a.latitude);
  const lat2 = radians(b.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLng = radians(b.longitude - a.longitude);
  const h =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(h));
}

export const mapsLink = ({ latitude, longitude }) =>
  `https://www.google.com/maps?q=${latitude},${longitude}`;
