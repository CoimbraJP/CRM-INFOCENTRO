import { useEffect, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import Sidebar from "./Sidebar";
import { Ico } from "../lib/icons";

export default function Layout({ children, titulo, acoes }) {
  const [colapsada, setColapsada] = useState(false);
  const [temaEscuro, setTemaEscuro] = useState(false);
  const [sessao, setSessao] = useState(null); // { usuario, tenant, admin }
  const [logo, setLogo] = useState(null); // logo customizado desta conta, se tiver
  const router = useRouter();

  useEffect(() => {
    try {
      setColapsada(localStorage.getItem("sidebar-colapsada") === "1");
      setTemaEscuro(document.documentElement.getAttribute("data-theme") === "dark");
    } catch (e) {}
  }, []);

  // sessão expirada/deslogado -> manda pro login
  useEffect(() => {
    fetch("/api/auth").then((r) => r.json().then((j) => {
      if (r.status === 401) router.replace("/login");
      else if (!j.tenant) router.replace(j.admin ? "/admin" : "/login"); // master ainda não escolheu uma conta
      else setSessao(j);
    })).catch(() => {});
  }, [router]);

  // logo customizado desta conta (Configurações → Logo da conta) — se não tiver, usa o padrão
  useEffect(() => {
    if (!sessao?.tenant) return;
    fetch("/api/logo").then((r) => r.json()).then((j) => setLogo(j.logo || null)).catch(() => {});
  }, [sessao?.tenant]);

  async function sair() {
    await fetch("/api/auth", { method: "DELETE" }).catch(() => {});
    window.location.href = "/login";
  }

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
      <Sidebar colapsada={colapsada} alternar={alternarSidebar} sessao={sessao} />
      <div className="app-main">
        <div className="topbar">
          <img src={logo || "/logo-wide.png"} alt={sessao?.usuario || "INFO Centro"} className="logo" />
          <span className="espaco" />
          {acoes && <div className="topbar-acoes">{acoes}</div>}
          <button className="btn-tema" onClick={alternarTema} title={temaEscuro ? "Mudar para tema claro" : "Mudar para tema escuro"} aria-label="Alternar tema">
            <Ico n={temaEscuro ? "sun" : "moon"} size={19} />
          </button>
          <button className="btn-tema" onClick={sair} title="Sair do sistema" aria-label="Sair">
            <Ico n="logout" size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
