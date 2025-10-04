import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import { createMap, makeStyle } from "../lib/map";
import maplibregl from "maplibre-gl";
import MapToolbar from "../components/MapToolbar.jsx";
import { useToast } from "../components/Toast.jsx";

export default function Tenant(){
  const { slug } = useParams();
  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const [q, setQ] = useState("");
  const [heat, setHeat] = useState(false);
  const [items, setItems] = useState([]);
  const [styleUrl, setStyleUrl] = useState(makeStyle("streets"));
  const { push } = useToast();

  // controle de requests
  const abortRef = useRef(null);
  const fetchingRef = useRef(false);
  const debounceRef = useRef(null);

  useEffect(()=>{ init(); },[slug]);
  async function init(){
    mapObj.current = createMap(mapRef.current, styleUrl);
    mapObj.current.on("load", async ()=>{
      await loadPlaces(true);
      addSourcesAndLayers();
      fitToData();
    });
  }

  async function loadPlaces(initial=false){
    // cancela requisição anterior, se houver
    if (abortRef.current) { try{ abortRef.current.abort(); }catch{} }
    const controller = new AbortController();
    abortRef.current = controller;

    // evita concorrência
    if (fetchingRef.current) return;
    fetchingRef.current = true;

    try{
      const bounds = mapObj.current.getBounds();
      const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()].join(",");
      const res = await fetch(`${import.meta.env.VITE_API_BASE || "/api"}/t/${slug}/places?q=${encodeURIComponent(q)}&bbox=${bbox}`, {
        signal: controller.signal,
        headers: { "Content-Type":"application/json" }
      });
      if(!res.ok) throw new Error("request_failed");
      const list = await res.json();
      setItems(list);

      // atualiza fonte do mapa se já criada
      const src = mapObj.current.getSource("places");
      if (src) src.setData(fc(list));
      if (initial) fitToData();
    } catch(err){
      if (err?.name !== "AbortError") {
        console.warn("loadPlaces err:", err?.message || err);
      }
    } finally {
      fetchingRef.current = false;
    }
  }

  function fc(list=items){
    return {
      type: "FeatureCollection",
      features: list.map(p => ({
        type: "Feature",
        properties: { id:p.id, title:p.title, description:p.description||"", tags:(p.tags||[]).join(",") },
        geometry: p.point
      }))
    };
  }

  function addSourcesAndLayers(){
    if(mapObj.current.getSource("places")) return;

    mapObj.current.addSource("places", {
      type: "geojson",
      data: fc([]),
      cluster: true,
      clusterMaxZoom: 14,
      clusterRadius: 50
    });

    mapObj.current.addLayer({
      id: "clusters",
      type: "circle",
      source: "places",
      filter: ["has", "point_count"],
      paint: { "circle-color": "#60a5fa", "circle-radius": ["step", ["get","point_count"], 15, 20, 20, 50, 30] }
    });
    mapObj.current.addLayer({
      id: "cluster-count",
      type: "symbol",
      source: "places",
      filter: ["has", "point_count"],
      layout: { "text-field": ["get","point_count_abbreviated"], "text-size": 12 },
      paint: { "text-color":"#000" }
    });
    mapObj.current.addLayer({
      id: "unclustered",
      type: "circle",
      source: "places",
      filter: ["!", ["has","point_count"]],
      paint: { "circle-color":"#22c55e", "circle-radius": 6, "circle-stroke-width": 1, "circle-stroke-color": "#083" }
    });

    if(heat){
      mapObj.current.addLayer({
        id: "heat",
        type: "heatmap",
        source: "places",
        maxzoom: 15,
        paint: {
          "heatmap-weight": 1,
          "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 0.5, 15, 3],
          "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 2, 15, 40],
          "heatmap-opacity": 0.6
        }
      }, "unclustered");
    }

    mapObj.current.on("click", "unclustered", (e)=>{
      const f = e.features[0];
      const p = f.properties;
      new maplibregl.Popup()
        .setLngLat(e.lngLat)
        .setHTML(`<strong>${p.title}</strong><br/><small>${p.description||"—"}</small>`)
        .addTo(mapObj.current);
    });

    // DEBOUNCE de 400ms e cancela anterior
    mapObj.current.on("moveend", ()=>{
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(()=> loadPlaces(false), 400);
    });
  }

  function fitToData(){
    if(!items.length) return;
    const b = new maplibregl.LngLatBounds();
    items.forEach(p => b.extend(p.point.coordinates));
    mapObj.current.fitBounds(b, { padding: 40, maxZoom: 14 });
  }

  const searchText = async ()=>{
    await loadPlaces(false);
  };

  const geocode = async ()=>{
    if(!q.trim()) return;
    try{
      const r = await api(`/geo/geocode?q=${encodeURIComponent(q)}`, {auth:false});
      if(r[0]){
        const lng = parseFloat(r[0].lon), lat = parseFloat(r[0].lat);
        mapObj.current.flyTo({ center:[lng,lat], zoom:13 });
      } else {
        push("Endereço não encontrado","error");
      }
    }catch{ push("Falha na geocodificação","error"); }
  };

  // troca de estilo – recria fontes/camadas com os dados atuais, sem múltiplas chamadas
  useEffect(()=>{
    if(!mapObj.current) return;
    mapObj.current.setStyle(styleUrl);
    mapObj.current.once("styledata", ()=>{
      if(mapObj.current.getSource("places")){
        if(mapObj.current.getLayer("heat")) mapObj.current.removeLayer("heat");
        ["clusters","cluster-count","unclustered"].forEach(id=>{ if(mapObj.current.getLayer(id)) mapObj.current.removeLayer(id); });
        mapObj.current.removeSource("places");
      }
      addSourcesAndLayers();
      const src = mapObj.current.getSource("places");
      if (src) src.setData(fc(items));
    });
    // eslint-disable-next-line
  },[styleUrl, heat]);

  return (
    <div className="grid gap-3">
      <div className="card">
        <h2 className="text-xl font-bold">Mapa /{slug}</h2>
        <div className="relative mt-2">
          <MapToolbar
            q={q} setQ={setQ}
            onFilter={searchText}
            onGeocode={geocode}
            heat={heat} setHeat={(v)=>{ setHeat(v); }}
            styleUrl={styleUrl} setStyleUrl={setStyleUrl}
          />
          <div className="mapwrap"><div ref={mapRef} className="w-full h-full"/></div>
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold">Resultados ({items.length})</h3>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {items.map(p=>(
            <div key={p.id} className="card">
              <div className="flex justify-between">
                <strong>{p.title}</strong>
                <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-900 bg-emerald-900/30">{(p.tags||[]).join(", ")||"—"}</span>
              </div>
              <p className="text-sm opacity-80 mt-1">{p.description||"—"}</p>
              <button className="btn btn-primary mt-2" onClick={()=>mapObj.current.flyTo({ center:p.point.coordinates, zoom:15 })}>Ir no mapa</button>
            </div>
          ))}
          {!items.length && <div className="opacity-70">Sem resultados no recorte atual.</div>}
        </div>
      </div>
    </div>
  );
}
