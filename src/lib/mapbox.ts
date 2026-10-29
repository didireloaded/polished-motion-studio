// Public Mapbox display token, supplied by the deployment environment at build time.
export const mapboxPublicToken = import.meta.env["VITE_MAPBOX_ACCESS_TOKEN"] ?? "";

export const mapboxTileUrl = mapboxPublicToken
  ? `https://api.mapbox.com/styles/v1/mapbox/light-v11/tiles/256/{z}/{x}/{y}?access_token=${mapboxPublicToken}`
  : "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png";
