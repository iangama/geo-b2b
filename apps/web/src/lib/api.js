const BASE = import.meta.env.VITE_API_BASE || "/api";

export async function api(path, { method="GET", body, auth=true } = {}){
  const headers = { "Content-Type":"application/json" };
  if(auth){
    const t = localStorage.getItem("token");
    if(t) headers.Authorization = `Bearer ${t}`;
  }
  const res = await fetch(`${BASE}${path}`, { method, headers, body: body?JSON.stringify(body):undefined });
  if(!res.ok){
    let e="request_failed"; try{ const j=await res.json(); e=j.error||e; }catch{}
    throw new Error(e);
  }
  return res.json();
}

export const session = {
  set(token,user){ localStorage.setItem("token",token); localStorage.setItem("user",JSON.stringify(user)); },
  clear(){ localStorage.clear(); },
  user(){ try{ return JSON.parse(localStorage.getItem("user")||"null"); }catch{ return null; } }
};
