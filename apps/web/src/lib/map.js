import maplibregl from "maplibre-gl";

export function styleUrl(){
  const key = import.meta.env.VITE_MAPTILER_KEY || "";
  return key
    ? `https://api.maptiler.com/maps/streets/style.json?key=${key}`
    : "https://demotiles.maplibre.org/style.json";
}

export function createMap(container){
  const map = new maplibregl.Map({
    container, style: styleUrl(),
    center: [-46.6333, -23.5505], zoom: 10, attributionControl: true
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
  return map;
}

// --- util para montar URL de estilo do MapTiler ---
export function makeStyle(preset = "streets") {
  const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_KEY;
  const ids = {
    streets:   "streets-v2",
    bright:    "bright-v2",
    hybrid:    "hybrid",
    satellite: "satellite-v2"
  };
  const id = ids[preset] || ids.streets;
  return `https://api.maptiler.com/maps/${id}/style.json?key=${MAPTILER_KEY}`;
}
