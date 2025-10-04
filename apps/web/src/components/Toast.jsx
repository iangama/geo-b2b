import React, { createContext, useContext, useState, useCallback } from "react";
const Ctx = createContext({ push: ()=>{} });
export function ToastProvider({ children }){
  const [list,setList] = useState([]);
  const push = useCallback((msg, type="info")=>{
    const id = crypto.randomUUID();
    setList(x=>[...x,{id,msg,type}]); setTimeout(()=>setList(x=>x.filter(i=>i.id!==id)), 3200);
  },[]);
  return (
    <Ctx.Provider value={{push}}>
      {children}
      <div className="toastbox">
        {list.map(t=>(
          <div key={t.id} className="toast"><strong>{t.type==="error"?"Erro":"Ok"}:</strong> {t.msg}</div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
export const useToast = ()=>useContext(Ctx);
