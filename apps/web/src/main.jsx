import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import "./index.css";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Tenant from "./pages/Tenant.jsx";
import { ToastProvider } from "./components/Toast.jsx";

function Nav(){
  const user = JSON.parse(localStorage.getItem("user")||"null");
  const out = () => { localStorage.clear(); location.href="/"; };
  return (
    <div className="nav">
      <Link to="/" className="btn">GeoSaaS</Link>
      <Link to="/dashboard" className="btn btn-ghost">Dashboard</Link>
      <div style={{marginLeft:"auto"}}/>
      {user ? (
        <>
          <span style={{opacity:.8, fontSize:14, marginRight:8}}>Olá, {user.email}</span>
          <button className="btn btn-danger" onClick={out}>Sair</button>
        </>
      ) : <Link className="btn" to="/">Entrar</Link>}
    </div>
  );
}

function App(){
  return (
    <ToastProvider>
      <BrowserRouter>
        <Nav/>
        <div className="container">
          <Routes>
            <Route path="/" element={<Home/>}/>
            <Route path="/dashboard" element={<Dashboard/>}/>
            <Route path="/t/:slug" element={<Tenant/>}/>
          </Routes>
        </div>
      </BrowserRouter>
    </ToastProvider>
  );
}

createRoot(document.getElementById("root")).render(<App/>);
