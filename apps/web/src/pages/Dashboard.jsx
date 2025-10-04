import React, { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { createMap } from "../lib/map";
import maplibregl from "maplibre-gl";
import { useToast } from "../components/Toast.jsx";
import Spinner from "../components/Spinner.jsx";

export default function Dashboard(){
  const [tenantName,setTenantName] = useState("");
  const [slugActive,setSlugActive] = useState("");
  const [form,setForm] = useState({ title:"", description:"", tags:"" });
  const [saving,setSaving] = useState(false);
  const { push } = useToast();

  const mapRef = useRef(null);
  const mapObj = useRef(null);
  const picked = useRef(null);

  useEffect(()=>{
    mapObj.current = createMap(mapRef.current);
    const marker = new maplibregl.Marker({ color:"#22c55e" });
    mapObj.current.on("click", (e)=>{
      picked.current = { type:"Point", coordinates:[e.lngLat.lng, e.lngLat.lat] };
      marker.setLngLat(e.lngLat).addTo(mapObj.current);
    });
  },[]);

  const createTenant = async (e)=>{ e.preventDefault();
    try{
      const r = await api("/tenants",{method:"POST",body:{name:tenantName}});
      setTenantName(""); setSlugActive(r.tenant.slug); push("Empresa criada!");
    }catch{ push("Falha ao criar empresa","error"); }
  };

  const savePlace = async (e)=>{ e.preventDefault();
    if(!slugActive) return push("Defina o slug ativo","error");
    if(!picked.current) return push("Clique no mapa para definir o ponto","error");
    const body = {
      title: form.title,
      description: form.description || undefined,
      point: picked.current,
      tags: form.tags ? form.tags.split(",").map(s=>s.trim()).filter(Boolean) : []
    };
    try{
      setSaving(true);
      await api(`/t/${slugActive}/places`,{method:"POST",body});
      push("Place criado!");
      setForm({ title:"", description:"", tags:"" });
    }catch{ push("Falha ao criar place","error"); }
    finally{ setSaving(false); }
  };

  return (
    <div style={{display:"grid", gap:12, gridTemplateColumns:"repeat(2, minmax(0,1fr))"}}>
      <div className="card">
        <h2 style={{fontWeight:800, marginBottom:8}}>Criar Empresa</h2>
        <form onSubmit={createTenant} style={{display:"grid", gap:8}}>
          <input className="input" placeholder="Nome da empresa" value={tenantName} onChange={e=>setTenantName(e.target.value)}/>
          <button className="btn">Criar</button>
        </form>
        <div style={{marginTop:10}}>
          <h3 style={{fontWeight:700}}>Slug ativo</h3>
          <input className="input" placeholder="ex.: acme-ltda" value={slugActive} onChange={e=>setSlugActive(e.target.value)}/>
          <p style={{fontSize:12, opacity:.7, marginTop:6}}>Use esse slug em /t/:slug.</p>
        </div>
      </div>

      <div className="card">
        <h2 style={{fontWeight:800, marginBottom:8}}>Novo Place</h2>
        <form onSubmit={savePlace} style={{display:"grid", gap:8}}>
          <input className="input" placeholder="Título" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>
          <input className="input" placeholder="Descrição" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
          <input className="input" placeholder="Tags (vírgula)" value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})}/>
          <button className="btn" disabled={saving}>{saving ? <span style={{display:"inline-flex",alignItems:"center",gap:8}}><span className="spinner"/> Salvando...</span> : "Salvar Place"}</button>
        </form>
      </div>

      <div className="card" style={{gridColumn:"1 / -1"}}>
        <h2 style={{fontWeight:800, marginBottom:8}}>Mapa (clique para marcar ponto)</h2>
        <div className="mapwrap"><div ref={mapRef} style={{width:"100%",height:"100%"}}/></div>
      </div>
    </div>
  );
}
