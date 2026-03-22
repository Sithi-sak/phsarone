export function buildOpenStreetMapUrl(
  latitude: number,
  longitude: number,
  zoom = 17,
) {
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=${zoom}/${latitude}/${longitude}`;
}

export function buildOpenStreetMapSearchUrl(query: string) {
  return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`;
}
