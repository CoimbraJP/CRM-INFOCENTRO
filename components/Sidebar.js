import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Ico } from "../lib/icons";
import { partesNascimento } from "../lib/crmHelpers";

const ITENS = [
  { href: "/", rota: "/", label: "CRM", icone: "layoutKanban" },
  { href: "/os", rota: "/os", label: "OS", icone: "wrench", soInfocentro: true },
  { href: "/metricas", rota: "/metricas", label: "Métricas", icone: "chart" },
  { href: "/estrategias", rota: "/estrategias", label: "Estratégias", icone: "target" },
  { href: "/aniversarios", rota: "/aniversarios", label: "Aniversários", icone: "cake" },
  { href: "/etiquetas", rota: "/etiquetas", label: "Etiquetas", icone: "tag" },
  { href: "/calendario", rota: "/calendario", label: "Calendário", icone: "calendar" },
];

const MES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DOW_LETRA = ["D", "S", "T", "Q", "Q", "S", "S"];

// mini-calendário do mês atual, com pontinho nos dias que têm mensagem agendada ou aniversário —
// liga/desliga pelo botão "Manter calendário lateral" na tela Calendário (fica visível em qualquer tela)
function MiniCalendario() {
  const [leads, setLeads] = useState([]);
  const hoje0 = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const ano = hoje0.getFullYear(), mes = hoje0.getMonth(); // 0-11

  useEffect(() => {
    fetch("/api/leads").then((r) => r.json()).then((j) => setLeads(Array.isArray(j) ? j : [])).catch(() => {});
  }, []);

  const diasComEvento = useMemo(() => {
    const set = new Set();
    for (const lead of leads) {
      for (const lem of lead.lembretes || []) {
        if (lem.enviado || lem.recorrente || !lem.data) continue;
        const [y, m, d] = lem.data.split("-").map(Number);
        if (y === ano && m - 1 === mes) set.add(d);
      }
      const p = partesNascimento(lead);
      if (p && p.mes - 1 === mes) set.add(p.dia);
    }
    return set;
  }, [leads, ano, mes]);

  const celulas = useMemo(() => {
    const primeiro = new Date(ano, mes, 1);
    const inicioSemana = primeiro.getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < inicioSemana; i++) arr.push(null);
    for (let d = 1; d <= totalDias; d++) arr.push(d);
    return arr;
  }, [ano, mes]);

  return (
    <div className="mini-calendario">
      <Link href="/calendario" className="mini-cal-titulo">{MES_ABREV[mes]} {ano}</Link>
      <div className="mini-cal-grid">
        {DOW_LETRA.map((d, i) => <span key={i} className="mini-cal-dow">{d}</span>)}
        {celulas.map((d, i) => (
          <Link key={i} href="/calendario" className={"mini-cal-dia" + (d === hoje0.getDate() ? " hoje" : "") + (!d ? " vazio" : "")}>
            {d || ""}
            {d && diasComEvento.has(d) && <span className="mini-cal-dot" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

export default function Sidebar({ colapsada, alternar, sessao }) {
  const router = useRouter();
  const [quadros, setQuadros] = useState([]);
  const [miniCalAtivo, setMiniCalAtivo] = useState(false);
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

  // mini-calendário lateral: lê a preferência salva e escuta o botão da tela Calendário
  useEffect(() => {
    try { setMiniCalAtivo(localStorage.getItem("sidebar-mini-calendario") === "1"); } catch (e) {}
    function onAlternar(e) { setMiniCalAtivo(!!e.detail); }
    window.addEventListener("crm-mini-calendario", onAlternar);
    return () => window.removeEventListener("crm-mini-calendario", onAlternar);
  }, []);

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
            <div key={it.href}>
              <Link href={it.href} className={"sidebar-item" + (ativo ? " ativo" : "")} title={it.label}>
                <Ico n={it.icone} size={19} />
                <span className="sidebar-label">{it.label}</span>
              </Link>
              {it.label === "Calendário" && miniCalAtivo && !colapsada && <MiniCalendario />}
            </div>
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
