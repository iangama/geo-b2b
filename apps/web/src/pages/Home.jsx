import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, session } from "../lib/api";
import { useToast } from "../components/Toast.jsx";

export default function Home(){
  const [tenants,setTenants] = useState([]);
  const [login,setLogin] = useState({email:"",password:""});
  const [reg,setReg]   = useState({email:"",password:"",name:""});
  const { push } = useToast();

  useEffect(()=>{ api("/tenants",{auth:false}).then(setTenants).catch(()=>{}); },[]);

  const doLogin = async (e)=>{ e.preventDefault();
    try{
      const r = await api("/auth/login",{method:"POST",body:login,auth:false});
      session.set(r.token, r.user); push("Login ok"); location.href="/dashboard";
    }catch{ push("Credenciais inválidas","error"); }
  };

  const doRegister = async (e)=>{ e.preventDefault();
    try{
      const r = await api("/auth/register",{method:"POST",body:reg,auth:false});
      session.set(r.token, r.user); push("Cadastro ok"); location.href="/dashboard";
    }catch{ push("Falha no cadastro (email em uso?)","error"); }
  };

  return (
    <div style={{display:"grid", gap:12, gridTemplateColumns:"repeat(2, minmax(0,1fr))"}}>
      <div className="card">
        <h2 style={{fontWeight:800, marginBottom:8}}>Entrar</h2>
        <form onSubmit={doLogin} style={{display:"grid", gap:8}}>
          <input className="input" placeholder="Email" value={login.email} onChange={e=>setLogin({...login,email:e.target.value})}/>
          <input className="input" placeholder="Senha" type="password" value={login.password} onChange={e=>setLogin({...login,password:e.target.value})}/>
          <button className="btn">Entrar</button>
        </form>
      </div>

      <div className="card">
        <h2 style={{fontWeight:800, marginBottom:8}}>Criar conta</h2>
        <form onSubmit={doRegister} style={{display:"grid", gap:8}}>
          <input className="input" placeholder="Nome (opcional)" value={reg.name} onChange={e=>setReg({...reg,name:e.target.value})}/>
          <input className="input" placeholder="Email" value={reg.email} onChange={e=>setReg({...reg,email:e.target.value})}/>
          <input className="input" placeholder="Senha (min 6)" type="password" value={reg.password} onChange={e=>setReg({...reg,password:e.target.value})}/>
          <button className="btn">Cadastrar</button>
        </form>
      </div>

      <div className="card" style={{gridColumn:"1 / -1"}}>
        <h2 style={{fontWeight:800, marginBottom:8}}>Empresas (tenants)</h2>
        <div style={{display:"grid", gap:12, gridTemplateColumns:"repeat(3, minmax(0,1fr))"}}>
          {tenants.map(t=>(
            <div key={t.slug} className="card">
              <div style={{display:"flex", justifyContent:"space-between"}}>
                <strong>{t.name}</strong>
                <span style={{fontSize:12, opacity:.8}}>/ {t.slug}</span>
              </div>
              <Link className="btn" style={{marginTop:8, display:"inline-block"}} to={`/t/${t.slug}`}>Abrir mapa</Link>
            </div>
          ))}
          {!tenants.length && <div style={{opacity:.7}}>Nenhuma empresa ainda. Crie uma no Dashboard.</div>}
        </div>
      </div>
    </div>
  );
}
