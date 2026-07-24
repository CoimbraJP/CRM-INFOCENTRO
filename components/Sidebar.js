import Link from "next/link";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import { Ico } from "../lib/icons";
import { partesNascimento, hoje, addDias } from "../lib/crmHelpers";

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

// um mês do mini-calendário lateral: pontinho nos dias com mensagem agendada/aniversário e
// marca-texto nos dias dentro do intervalo de prazo das listas (só listas com prazo E cliente)
function MesMini({ ano, mes, leads, listas, hoje0 }) {
  const ehMesAtual = hoje0.getFullYear() === ano && hoje0.getMonth() === mes;

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

  const diasPrazo = useMemo(() => {
    const set = new Set();
    const h = hoje();
    const mesIso = `${ano}-${String(mes + 1).padStart(2, "0")}`;
    for (const l of listas) {
      if (!l.prazo) continue;
      const lb = l.board || "crm";
      const temCliente = leads.some((x) => (x.board || "crm") === lb && x.listId === l.key);
      if (!temCliente) continue;
      const inicio = l.prazo < h ? l.prazo : h;
      const fim = l.prazo < h ? h : l.prazo;
      let cur = inicio, guarda = 0;
      while (cur <= fim && guarda++ < 400) {
        if (cur.slice(0, 7) === mesIso) set.add(Number(cur.slice(8, 10)));
        cur = addDias(cur, 1);
      }
    }
    return set;
  }, [listas, leads, ano, mes]);

  const celulas = useMemo(() => {
    const inicioSemana = new Date(ano, mes, 1).getDay();
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const arr = [];
    for (let i = 0; i < inicioSemana; i++) arr.push(null);
    for (let d = 1; d <= totalDias; d++) arr.push(d);
    return arr;
  }, [ano, mes]);

  return (
    <div className="mini-cal-mes">
      <Link href="/calendario" className="mini-cal-titulo">{MES_ABREV[mes]} {ano}</Link>
      <div className="mini-cal-grid">
        {DOW_LETRA.map((d, i) => <span key={i} className="mini-cal-dow">{d}</span>)}
        {celulas.map((d, i) => (
          <Link key={i} href="/calendario" className={"mini-cal-dia" + (ehMesAtual && d === hoje0.getDate() ? " hoje" : "") + (!d ? " vazio" : "") + (d && diasPrazo.has(d) ? " prazo" : "")}>
            {d || ""}
            {d && diasComEvento.has(d) && <span className="mini-cal-dot" />}
          </Link>
        ))}
      </div>
    </div>
  );
}

// mini-calendário lateral: mostra o mês atual e o próximo mês logo abaixo —
// liga/desliga pelo botão "Manter calendário lateral" na tela Calendário
function MiniCalendario() {
  const [leads, setLeads] = useState([]);
  const [listas, setListas] = useState([]);
  const hoje0 = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);

  useEffect(() => {
    fetch("/api/leads").then((r) => r.json()).then((j) => setLeads(Array.isArray(j) ? j : [])).catch(() => {});
    fetch("/api/lists?todos=1").then((r) => r.json()).then((j) => setListas(Array.isArray(j) ? j : [])).catch(() => {});
  }, []);

  const meses = useMemo(() => {
    const a = hoje0.getFullYear(), m = hoje0.getMonth();
    const prox = m === 11 ? { ano: a + 1, mes: 0 } : { ano: a, mes: m + 1 };
    return [{ ano: a, mes: m }, prox];
  }, [hoje0]);

  return (
    <div className="mini-calendario">
      {meses.map((mm) => (
        <MesMini key={mm.ano + "-" + mm.mes} ano={mm.ano} mes={mm.mes} leads={leads} listas={listas} hoje0={hoje0} />
      ))}
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
        {/* CRM principal primeiro, depois os quadros criados pelo usuário (um embaixo do outro),
            e só então o resto do menu (OS, Métricas, Estratégias...) */}
        {itens[0] && (() => {
          const it = itens[0];
          const ativo = router.pathname === it.rota;
          return (
            <Link key={it.href} href={it.href} className={"sidebar-item" + (ativo ? " ativo" : "")} title={it.label}>
              <Ico n={it.icone} size={19} />
              <span className="sidebar-label">{it.label}</span>
            </Link>
          );
        })()}
        {quadros.map((q) => {
          const ativo = router.pathname === "/crm/[board]" && router.query.board === q.key;
          return (
            <Link key={q.key} href={`/crm/${q.key}`} className={"sidebar-item" + (ativo ? " ativo" : "")} title={q.nome}>
              <Ico n="layoutKanban" size={19} />
              <span className="sidebar-label">{q.nome}</span>
            </Link>
          );
        })}
        {itens.slice(1).map((it) => {
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
