import { useEffect, useState } from "react";
import Head from "next/head";
import Sidebar from "./Sidebar";
import { Ico } from "../lib/icons";

export default function Layout({ children, titulo }) {
  const [colapsada, setColapsada] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(false);

  useEffect(() => {
    try {
      setColapsada(localStorage.getItem("sidebar-colapsada") === "1");
      setTemaEscuro(document.documentElement.getAttribute("data-theme") === "dark");
    } catch (e) {}
  }, []);

  function alternarSidebar() {
    const novo = !colapsada;
    setColapsada(novo);
    try { localStorage.setItem("sidebar-colapsada", novo ? "1" : "0"); } catch (e) {}
  }
  function alternarTema() {
    const novo = !temaEscuro;
    setTemaEscuro(novo);
    if (novo) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("tema-crm", novo ? "escuro" : "claro"); } catch (e) {}
  }

  return (
    <div className="app-shell">
      <Head><title>{titulo ? titulo + " — INFO Centro" : "CRM INFO Centro"}</title></Head>
      <Sidebar colapsada={colapsada} alternar={alternarSidebar} />
      <div className="app-main">
        <div className="topbar">
          <img src="/logo-wide.png" alt="INFO Centro — Assistência Especializada" className="logo" />
          <span className="espaco" />
          <button className="btn-tema" onClick={alternarTema} title={temaEscuro ? "Mudar para tema claro" : "Mudar para tema escuro"} aria-label="Alternar tema">
            <Ico n={temaEscuro ? "sun" : "moon"} size={19} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
