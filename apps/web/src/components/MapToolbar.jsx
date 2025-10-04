import React from "react";
import { Search, Flame, Palette } from "lucide-react";
import { makeStyle } from "../lib/map";

export default function MapToolbar({
  q, setQ,
  onFilter, onGeocode,
  heat, setHeat,
  styleUrl, setStyleUrl
}) {
  const styles = [
    { name: "Streets",  url: makeStyle("streets")  },
    { name: "Bright",   url: makeStyle("bright")   },
    { name: "Hybrid",   url: makeStyle("hybrid")   },
  ];

  return (
    <div className="toolbar flex flex-wrap gap-3 items-center">
      <div className="flex items-center gap-2">
        <Search size={16} className="opacity-80" />
        <input
          className="input w-[260px]"
          placeholder="Texto ou endereço..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button className="btn btn-primary" onClick={onFilter}>Filtrar</button>
        <button className="btn btn-accent"  onClick={onGeocode}>Geocodificar</button>
      </div>

      <label className="ml-2 text-sm flex items-center gap-2">
        <Flame size={16} className="opacity-80" />
        <input
          type="checkbox"
          checked={heat}
          onChange={(e) => setHeat(e.target.checked)}
        />
        Heatmap
      </label>

      <div className="ml-2 flex items-center gap-2">
        <Palette size={16} className="opacity-80" />
        <select
          className="select w-[160px]"
          value={styleUrl}
          onChange={(e) => setStyleUrl(e.target.value)}
        >
          {styles.map((s) => (
            <option key={s.name} value={s.url}>{s.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
