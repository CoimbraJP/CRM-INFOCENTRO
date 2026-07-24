import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { Ico } from "../lib/icons";

const ITENS = [
  { href: "/", rota: "/", label: "CRM", icone: "layoutKanban" },
  { href: "/os", rota: "/os", label: "OS", icone: "wrench", soInfocentro: true },
  { href: "/metricas", rota: "/metricas", label: "Métricas", icone: "chart" },
  { href: "/estrategias", rota: "/estrategias", label: "Estratégias", icone: "target" },
  { href: "/aniversarios", rota: "/aniversarios", label: "Aniversários", icone: "cake" },
  { href: "/etiquetas", rota: "/etiquetas", label: "Etiquetas", icone: "tag" },
  { href: "/calendario", rota: "/calendario", label: "Calendário", icone: "calendar" },
];

export default function Sidebar({ colapsada, alternar, sessao }) {
  const router = useRouter();
  const [quadros, setQuadros] = useState([]);
  // OS (integração PDV) só existe pra conta INFOCENTRO
  const itens = ITENS.filter((it) => !it.soInfocentro || !sessao || sessao.tenant === "INFOCENTRO");

  async function carregarQuadros() {
    try {
      const r = await fetch("/api/crm-boards");
      const j = await r.json().catch(() => []);
      setQuadros(Array.isArray(j) ? j : []);
    } catch (e) { /* silencioso */ }
  }
  useEffect(() => { if (sessao?.tenant) carregarQuadros(); }, [sessao?.tenant]);
  // se um novo quadro for criado em outra tela (ex: excluído lá), a sidebar recarrega ao trocar de rota
  useEffect(() => { if (sessao?.tenant) carregarQuadros(); }, [router.pathname]);

  async function criarCrm() {
    const nome = prompt("Nome do novo CRM (ex: Revenda, Corporativo, Peças):");
    if (!nome || !nome.trim()) return;
    const r = await fetch("/api/crm-boards", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome: nome.trim() }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.error || "Não consegui criar o CRM."); return; }
    await carregarQuadros();
    router.push(`/crm/${j.key}`);
  }

  return (
    <nav className={"sidebar" + (colapsada ? " colapsada" : "")}>
      <button className="sidebar-toggle" onClick={alternar} title={colapsada ? "Expandir menu" : "Recolher menu"}>
        <Ico n="menu" size={20} />
      </button>
      <div className="sidebar-itens">
        {itens.map((it) => {
          const ativo = router.pathname === it.rota;
          return (
            <Link key={it.href} href={it.href} className={"sidebar-item" + (ativo ? " ativo" : "")} title={it.label}>
              <Ico n={it.icone} size={19} />
              <span className="sidebar-label">{it.label}</span>
            </Link>
          );
        })}
        {quadros.map((q) => {
          const ativo = router.pathname === "/crm/[board]" && router.query.board === q.key;
          return (
            <Link key={q.key} href={`/crm/${q.key}`} className={"sidebar-item" + (ativo ? " ativo" : "")} title={q.nome}>
              <Ico n="layoutKanban" size={19} />
              <span className="sidebar-label">{q.nome}</span>
            </Link>
          );
        })}
      </div>
      <div className="sidebar-rodape">
        {sessao?.usuario && (
          <div className="sidebar-conta" title={"Conta: " + sessao.usuario}>
            <Ico n="user" size={17} />
            <span className="sidebar-label">{sessao.usuario}{sessao.admin ? " (master)" : ""}</span>
          </div>
        )}
        <button className="sidebar-item sidebar-criar-crm" onClick={criarCrm} title="Criar um novo quadro de CRM (para outro tipo de cliente)">
          <Ico n="plus" size={19} />
          <span className="sidebar-label">Criar CRM</span>
        </button>
        <Link href="/configuracoes" className={"sidebar-item" + (router.pathname === "/configuracoes" ? " ativo" : "")} title="Configurações">
          <Ico n="settings" size={19} />
          <span className="sidebar-label">Configurações</span>
        </Link>
      </div>
    </nav>
  );
}
