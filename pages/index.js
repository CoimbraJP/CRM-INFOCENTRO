import { useEffect, useMemo, useRef, useState } from "react";
import { TEMPLATES, renderTemplate } from "../lib/messages";

// ---------------- ícones SVG (Lucide) ----------------
const PATHS = {
  fileText: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></>,
  calendar: <><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></>,
  dollar: <><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></>,
  tag: <><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z"/><line x1="7" y1="7" x2="7.01" y2="7"/></>,
  sun: <><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></>,
  moon: <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>,
  plus: <><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></>,
  upload: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></>,
  trash: <><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></>,
  check: <polyline points="20 6 9 17 4 12"/>,
  x: <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>,
  send: <><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></>,
  zapRaio: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>,
  cake: <><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M2 21h20"/><path d="M4 16s.5-1.5 2-1.5 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1.5 2-1.5"/><line x1="12" y1="11" x2="12" y2="8"/><line x1="7" y1="11" x2="7" y2="9"/><line x1="17" y1="11" x2="17" y2="9"/></>,
  inbox: <><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></>,
  alerta: <><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></>,
  refresh: <><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></>,
};
function Ico({ n, size = 18, className = "" }) {
  return (
    <svg className={"ico " + className} style={size !== 18 ? { width: size, height: size } : undefined}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[n]}
    </svg>
  );
}
function IcoZap({ size = 18 }) {
  return (
    <svg className="ico" style={size !== 18 ? { width: size, height: size } : undefined} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.52.149-.174.198-.298.297-.497.1-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413" />
    </svg>
  );
}

// ---------------- helpers ----------------
const TAGS = [
  { id: "pgto", nome: "Pagamento pendente", cor: "#dc2626" },
  { id: "orc", nome: "Orçamento aberto", cor: "#f59e0b" },
  { id: "acomp", nome: "Acompanhar", cor: "#3b82f6" },
  { id: "impressao", nome: "Lead impressão", cor: "#0d9488" },
  { id: "notebook", nome: "Interessado em notebook", cor: "#8b5cf6" },
  { id: "gamer", nome: "PC Gamer", cor: "#111827" },
  { id: "vip", nome: "VIP", cor: "#ca8a04" },
];

const hoje = () => new Date().toISOString().slice(0, 10);
const addDias = (iso, n) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
const fmtDinheiro = (v) =>
  "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

function normalizaFone(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}
const waLink = (fone, texto) =>
  "https://wa.me/" + normalizaFone(fone) + (texto ? "?text=" + encodeURIComponent(texto) : "");

function novaCadencia(base) {
  const b = base || hoje();
  const varIdx = Math.floor(Math.random() * TEMPLATES.D0.variacoes.length);
  return [
    { id: "c" + Date.now() + "a", data: b, tipo: "D0", varIdx, enviado: false },
    { id: "c" + Date.now() + "b", data: addDias(b, 5), tipo: "D5", varIdx: 0, enviado: false },
    { id: "c" + Date.now() + "c", data: addDias(b, 30), tipo: "D30", varIdx: 0, enviado: false },
  ];
}

function msgDoLembrete(lead, lem) {
  if (lem.tipo && TEMPLATES[lem.tipo]) return renderTemplate(lem.tipo, primeiroNome(lead.nome), lem.varIdx ?? 0);
  return (lem.texto || "").replaceAll("{nome}", primeiroNome(lead.nome));
}
function primeiroNome(n) {
  const p = String(n || "").trim().split(" ")[0];
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
}
function ehAniversarioHoje(lead) {
  if (!lead.nascimento) return false;
  const h = hoje().slice(5);
  const n = String(lead.nascimento);
  if (n.includes("-")) return n.slice(5, 10) === h;
  const partes = n.split("/");
  if (partes.length >= 2) {
    const mmdd = partes[1].padStart(2, "0") + "-" + partes[0].padStart(2, "0");
    return mmdd === h;
  }
  return false;
}

// ---------------- componente principal ----------------
export default function Home() {
  const [leads, setLeads] = useState([]);
  const [lists, setLists] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [painelAberto, setPainelAberto] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erroConexao, setErroConexao] = useState(null);
  const [temaEscuro, setTemaEscuro] = useState(false);
  const fileRef = useRef(null);
  const [importOpts, setImportOpts] = useState({ cadencia: true });
  const dragId = useRef(null);

  useEffect(() => {
    setTemaEscuro(document.documentElement.getAttribute("data-theme") === "dark");
  }, []);
  function alternarTema() {
    const novo = !temaEscuro;
    setTemaEscuro(novo);
    if (novo) document.documentElement.setAttribute("data-theme", "dark");
    else document.documentElement.removeAttribute("data-theme");
    try { localStorage.setItem("tema-crm", novo ? "escuro" : "claro"); } catch (e) {}
  }

  async function carregar() {
    try {
      const [r1, r2] = await Promise.all([fetch("/api/leads"), fetch("/api/lists")]);
      const l1 = await r1.json().catch(() => null);
      const l2 = await r2.json().catch(() => null);
      if (!r1.ok || !r2.ok || !Array.isArray(l1) || !Array.isArray(l2)) {
        setErroConexao((l1 && l1.error) || (l2 && l2.error) || `Erro ${r1.status}/${r2.status} na API — verifique a MONGODB_URI no Vercel.`);
      } else {
        setLeads(l1);
        setLists(l2);
        setErroConexao(null);
      }
    } catch (e) {
      setErroConexao(String(e.message || e));
    }
    setCarregando(false);
  }
  useEffect(() => { carregar(); }, []);

  async function salvarLead(lead) {
    setLeads((ls) => ls.map((x) => (x._id === lead._id ? lead : x)));
    await fetch("/api/leads", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    });
  }
  async function excluirLead(id) {
    if (!confirm("Excluir este cliente definitivamente?")) return;
    setLeads((ls) => ls.filter((x) => x._id !== id));
    setModal(null);
    await fetch("/api/leads?_id=" + id, { method: "DELETE" });
  }

  const keyNaoPerturbe = "nao_perturbe";
  function bloqueado(lead) { return lead.listId === keyNaoPerturbe; }
  function abrirZapComMsg(lead, texto) {
    if (bloqueado(lead)) { alert("Este cliente está em NÃO PERTURBE — envio bloqueado."); return; }
    window.open(waLink(lead.telefone, texto), "_blank");
  }

  const pendencias = useMemo(() => {
    const h = hoje();
    const itens = [];
    for (const lead of leads) {
      if (bloqueado(lead)) continue;
      for (const lem of lead.lembretes || []) {
        if (!lem.enviado && lem.data <= h)
          itens.push({ lead, lem, atrasado: lem.data < h });
      }
      if (ehAniversarioHoje(lead)) {
        const jaFeito = (lead.lembretes || []).some((l) => l.tipo === "ANIVERSARIO" && l.data === h);
        if (!jaFeito) itens.push({ lead, niver: true });
      }
    }
    itens.sort((a, b) => (a.lem?.data || h).localeCompare(b.lem?.data || h));
    return itens;
  }, [leads]);

  const proximos = useMemo(() => {
    const h = hoje(), fim = addDias(h, 7);
    const itens = [];
    for (const lead of leads) {
      if (bloqueado(lead)) continue;
      for (const lem of lead.lembretes || [])
        if (!lem.enviado && lem.data > h && lem.data <= fim) itens.push({ lead, lem });
    }
    itens.sort((a, b) => a.lem.data.localeCompare(b.lem.data));
    return itens;
  }, [leads]);

  function marcarEnviado(lead, lem) {
    const novo = { ...lead, lembretes: lead.lembretes.map((l) => (l.id === lem.id ? { ...l, enviado: true } : l)) };
    salvarLead(novo);
  }
  function marcarNiverFeito(lead) {
    const novo = { ...lead, lembretes: [...(lead.lembretes || []), { id: "n" + Date.now(), data: hoje(), tipo: "ANIVERSARIO", varIdx: 0, enviado: true }] };
    salvarLead(novo);
  }

  async function importarArquivo(e) {
    const file = e.target.files[0];
    if (!file) return;
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { cellDates: true });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { raw: false, defval: "" });
    const acha = (row, chaves) => {
      for (const k of Object.keys(row)) {
        const kn = k.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (chaves.some((c) => kn.includes(c))) return String(row[k]).trim();
      }
      return "";
    };
    const jaExiste = new Set(leads.map((l) => normalizaFone(l.telefone)));
    const novos = [];
    for (const row of rows) {
      const telefone = acha(row, ["telefone", "numero", "número", "celular", "fone", "whats"]);
      if (!telefone || normalizaFone(telefone).length < 12) continue;
      if (jaExiste.has(normalizaFone(telefone))) continue;
      jaExiste.add(normalizaFone(telefone));
      novos.push({
        nome: acha(row, ["nome", "cliente"]),
        telefone,
        servico: acha(row, ["servico", "o que fez", "atividade", "descricao"]) || "Impressão",
        nascimento: acha(row, ["nascimento", "aniversario", "niver"]),
        listId: "inbox",
        tags: [],
        lembretes: importOpts.cadencia ? novaCadencia(hoje()) : [],
      });
    }
    e.target.value = "";
    if (novos.length === 0) { alert("Nenhum número novo encontrado na planilha (duplicados são ignorados)."); return; }
    await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(novos) });
    await carregar();
    alert(novos.length + " cliente(s) importado(s)" + (importOpts.cadencia ? " com cadência D+0 / D+5 / D+30 agendada." : "."));
  }

  async function exportar() {
    const XLSX = await import("xlsx");
    const mapaListas = Object.fromEntries(lists.map((l) => [l.key, l.nome]));
    const cli = leads.map((l) => ({
      Nome: l.nome, Telefone: l.telefone, Servico: l.servico, Nascimento: l.nascimento,
      Lista: mapaListas[l.listId] || l.listId,
      Etiquetas: (l.tags || []).map((t) => TAGS.find((x) => x.id === t)?.nome || t).join(", "),
      TotalGasto: (l.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0),
      Observacoes: (l.observacoes || []).map((o) => `[${fmtBR(o.data)}] ${o.texto}`).join(" | "),
      CadastradoEm: (l.createdAt || "").slice(0, 10),
    }));
    const compras = leads.flatMap((l) => (l.compras || []).map((c) => ({ Cliente: l.nome, Telefone: l.telefone, Descricao: c.descricao, Valor: Number(c.valor) || 0, Data: fmtBR(c.data) })));
    const lembretes = leads.flatMap((l) => (l.lembretes || []).map((m) => ({ Cliente: l.nome, Telefone: l.telefone, Data: fmtBR(m.data), Tipo: m.tipo || "personalizada", Enviado: m.enviado ? "SIM" : "NÃO" })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(cli), "Clientes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(compras.length ? compras : [{}]), "Compras");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(lembretes.length ? lembretes : [{}]), "Mensagens");
    XLSX.writeFile(wb, "CRM_InfoCentro_Backup_" + hoje() + ".xlsx");
  }

  async function novaLista() {
    const nome = prompt("Nome da nova lista:");
    if (!nome) return;
    await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) });
    carregar();
  }
  async function excluirLista(l) {
    if (!confirm("Excluir a lista " + l.nome + "?")) return;
    const r = await fetch(`/api/lists?_id=${l._id}&key=${l.key}`, { method: "DELETE" });
    if (!r.ok) { const j = await r.json(); alert(j.error); return; }
    carregar();
  }

  const leadsFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter((l) => {
      const tagsNomes = (l.tags || []).map((t) => TAGS.find((x) => x.id === t)?.nome || "").join(" ");
      return (l.nome + " " + l.telefone + " " + l.servico + " " + tagsNomes).toLowerCase().includes(q);
    });
  }, [leads, busca]);

  if (carregando) return <div style={{ padding: 40, textAlign: "center" }}>Carregando CRM…</div>;
  if (erroConexao)
    return (
      <div style={{ padding: 40, maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ color: "var(--vermelho)", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
          <Ico n="alerta" size={22} /> Não consegui conectar ao banco
        </h2>
        <div className="aviso" style={{ wordBreak: "break-word" }}>{erroConexao}</div>
        <ol style={{ fontSize: 14, lineHeight: 1.9, paddingLeft: 20, marginTop: 10 }}>
          <li>No Vercel: Settings → Environment Variables → confira <b>MONGODB_URI</b> e <b>MONGODB_DB=info_crm</b></li>
          <li>No Atlas: Network Access precisa ter <b>0.0.0.0/0</b> liberado</li>
          <li>No Atlas: usuário <b>crm_user</b> com role readWrite no banco <b>info_crm</b></li>
          <li>Depois de mudar variável de ambiente, faça <b>Redeploy</b> no Vercel</li>
        </ol>
        <button className="btn2 primario" onClick={() => { setCarregando(true); carregar(); }}>
          <Ico n="refresh" size={15} /> Tentar novamente
        </button>
      </div>
    );

  return (
    <div>
      <div className="topbar">
        <img src="/logo-wide.png" alt="INFO Centro — Assistência Especializada" className="logo" />
        <span className="espaco" />
        <input type="text" placeholder="Buscar nome, telefone, serviço ou etiqueta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="btn" onClick={() => setModal({ tipo: "novo" })} title="Novo cliente">
          <Ico n="plus" size={15} /><span className="btn-rotulo">Cliente</span>
        </button>
        <button className="btn" onClick={() => setModal({ tipo: "importar" })} title="Importar Excel">
          <Ico n="upload" size={15} /><span className="btn-rotulo">Importar</span>
        </button>
        <button className="btn destaque" onClick={exportar} title="Backup Excel">
          <Ico n="download" size={15} /><span className="btn-rotulo">Backup</span>
        </button>
        <button className="btn-tema" onClick={alternarTema} title={temaEscuro ? "Mudar para tema claro" : "Mudar para tema escuro"} aria-label="Alternar tema">
          <Ico n={temaEscuro ? "sun" : "moon"} size={19} />
        </button>
      </div>

      {/* PAINEL ENVIAR HOJE */}
      <div className="painel-hoje">
        <div className="ph-head" onClick={() => setPainelAberto(!painelAberto)}>
          <Ico n="inbox" /> Enviar hoje {pendencias.length > 0 && <span className="ph-badge">{pendencias.length}</span>}
          <span style={{ marginLeft: "auto", fontSize: 12 }}>{painelAberto ? "▲" : "▼"}</span>
        </div>
        {painelAberto && (
          <div>
            {pendencias.length === 0 && <div className="ph-item vazio">Nenhuma mensagem pendente — tudo em dia!</div>}
            {pendencias.map((p, i) => {
              const texto = p.niver ? renderTemplate("ANIVERSARIO", primeiroNome(p.lead.nome), 0) : msgDoLembrete(p.lead, p.lem);
              return (
                <div className="ph-item" key={i}>
                  <span className={"tipo " + (p.niver ? "niver" : p.atrasado ? "atrasado" : "")}>
                    {p.niver ? "ANIVERSÁRIO" : (p.atrasado ? "ATRASADA · " : "") + (p.lem.tipo && TEMPLATES[p.lem.tipo] ? p.lem.tipo.replace("D", "D+") : "PERSONALIZADA")}
                  </span>
                  <span className="nome">{p.lead.nome || p.lead.telefone}</span>
                  <button className="btn2 zap" onClick={() => abrirZapComMsg(p.lead, texto)}><IcoZap size={15} /> Enviar</button>
                  <button className="btn2" onClick={() => (p.niver ? marcarNiverFeito(p.lead) : marcarEnviado(p.lead, p.lem))}><Ico n="check" size={15} /> Enviado</button>
                  <div className="ph-msg">{texto}</div>
                </div>
              );
            })}
            {proximos.length > 0 && (
              <div className="ph-item" style={{ background: "var(--fundo)" }}>
                <span style={{ fontSize: 12, color: "var(--cinza)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <Ico n="calendar" size={14} /> Próximos 7 dias: {proximos.map((p) => `${fmtBR(p.lem.data)} — ${p.lead.nome || p.lead.telefone}`).join("  ·  ")}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* BOARD KANBAN */}
      <div className="board">
        {lists.map((lista) => {
          const cards = leadsFiltrados.filter((l) => l.listId === lista.key);
          const soma = cards.reduce((s, l) => s + (l.compras || []).reduce((a, c) => a + (Number(c.valor) || 0), 0), 0);
          return (
            <div key={lista.key} className="lista"
              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
              onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
              onDrop={(e) => {
                e.currentTarget.classList.remove("drag-over");
                const id = dragId.current;
                const lead = leads.find((x) => x._id === id);
                if (lead && lead.listId !== lista.key) salvarLead({ ...lead, listId: lista.key });
              }}>
              <div className="lista-head">
                <span className="titulo">{lista.nome}</span>
                <span className="qtd">{cards.length}</span>
                <span className="soma">{soma > 0 ? fmtDinheiro(soma) : ""}</span>
                {!lista.fixa && <button className="x" title="Excluir lista" onClick={() => excluirLista(lista)}><Ico n="x" size={14} /></button>}
              </div>
              {cards.map((lead) => (
                <Card key={lead._id} lead={lead}
                  onDragStart={() => (dragId.current = lead._id)}
                  abrir={(tipo) => setModal({ tipo, lead })}
                  zapDireto={() => window.open(waLink(lead.telefone), "_blank")} />
              ))}
            </div>
          );
        })}
        <button className="add-lista" onClick={novaLista}><Ico n="plus" size={16} /> Nova lista</button>
      </div>

      {/* MODAIS */}
      {modal && (
        <Modal fechar={() => setModal(null)}>
          {modal.tipo === "importar" && <ModalImportar opts={importOpts} setOpts={setImportOpts} fileRef={fileRef} onFile={importarArquivo} />}
          {modal.tipo === "novo" && <ModalEditar lead={null} onSalvar={async (dados) => {
            await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dados, lembretes: dados.cadencia ? novaCadencia(hoje()) : [] }) });
            setModal(null); carregar();
          }} />}
          {modal.tipo === "editar" && <ModalEditar lead={leads.find((l) => l._id === modal.lead._id)} onSalvar={(dados) => { salvarLead({ ...modal.lead, ...dados }); setModal(null); }} onExcluir={() => excluirLead(modal.lead._id)} />}
          {modal.tipo === "obs" && <ModalObs lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
          {modal.tipo === "agenda" && <ModalAgenda lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} enviar={abrirZapComMsg} />}
          {modal.tipo === "compras" && <ModalCompras lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
          {modal.tipo === "tags" && <ModalTags lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
        </Modal>
      )}
    </div>
  );
}

// ---------------- card ----------------
function Card({ lead, abrir, zapDireto, onDragStart }) {
  const pendentes = (lead.lembretes || []).filter((l) => !l.enviado).length;
  const totalCompras = (lead.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  return (
    <div className="card" draggable onDragStart={onDragStart}>
      <div className="nome" style={{ cursor: "pointer" }} onClick={() => abrir("editar")}>
        {lead.nome || "— sem nome —"} {ehAniversarioHoje(lead) && <Ico n="cake" size={15} />}
      </div>
      <div className="servico">{lead.servico} · {lead.telefone}</div>
      {(lead.tags || []).length > 0 && (
        <div className="tags">
          {lead.tags.map((t) => {
            const tag = TAGS.find((x) => x.id === t);
            return tag ? <span key={t} className="tag-chip" style={{ background: tag.cor }}>{tag.nome}</span> : null;
          })}
        </div>
      )}
      <div className="icones">
        <button className="icone-btn" title="Observações" onClick={() => abrir("obs")}>
          <Ico n="fileText" />{(lead.observacoes || []).length > 0 && <span className="mini-badge">{lead.observacoes.length}</span>}
        </button>
        <button className="icone-btn" title="Agenda de mensagens" onClick={() => abrir("agenda")}>
          <Ico n="calendar" />{pendentes > 0 && <span className="mini-badge alerta">{pendentes}</span>}
        </button>
        <button className="icone-btn zap-btn" title="Abrir WhatsApp" onClick={zapDireto}><IcoZap /></button>
        <button className="icone-btn" title="Compras e gastos" onClick={() => abrir("compras")}>
          <Ico n="dollar" />{totalCompras > 0 && <span className="mini-badge">{Math.round(totalCompras)}</span>}
        </button>
        <button className="icone-btn" title="Etiquetas" onClick={() => abrir("tags")}><Ico n="tag" /></button>
      </div>
    </div>
  );
}

// ---------------- modais ----------------
function Modal({ children, fechar }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal">{children}
        <div className="acoes"><button className="btn2" onClick={fechar}><Ico n="x" size={14} /> Fechar</button></div>
      </div>
    </div>
  );
}

function ModalImportar({ opts, setOpts, fileRef, onFile }) {
  return (
    <div>
      <h2><Ico n="upload" /> Importar planilha Excel</h2>
      <p style={{ fontSize: 13, color: "var(--cinza)" }}>
        A planilha precisa ter colunas com <b>telefone</b> (obrigatório) e, se tiver, <b>nome</b>, <b>serviço</b> e <b>nascimento</b>.
        Números repetidos são ignorados automaticamente.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", fontSize: 14, color: "var(--texto)", fontWeight: 400 }}>
        <input type="checkbox" checked={opts.cadencia} onChange={(e) => setOpts({ ...opts, cadencia: e.target.checked })} />
        Preencher agenda automática: <b>D+0, D+5 e D+30</b> com as mensagens prontas
      </label>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
    </div>
  );
}

function ModalEditar({ lead, onSalvar, onExcluir }) {
  const [f, setF] = useState({
    nome: lead?.nome || "", telefone: lead?.telefone || "", servico: lead?.servico || "",
    nascimento: lead?.nascimento || "", cadencia: !lead,
  });
  return (
    <div>
      <h2>{lead ? <><Ico n="fileText" /> Editar cliente</> : <><Ico n="plus" /> Novo cliente</>}</h2>
      <label>Nome</label>
      <input type="text" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <label>Telefone (com DDD)</label>
      <input type="text" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder="11999998888" />
      <label>O que fez / serviço</label>
      <input type="text" value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })} placeholder="Impressão, formatação, orçamento…" />
      <label>Data de nascimento</label>
      <input type="date" value={f.nascimento?.includes("-") ? f.nascimento : ""} onChange={(e) => setF({ ...f, nascimento: e.target.value })} />
      {!lead && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "var(--texto)", fontWeight: 400, fontSize: 14 }}>
          <input type="checkbox" checked={f.cadencia} onChange={(e) => setF({ ...f, cadencia: e.target.checked })} />
          Preencher agenda D+0 / D+5 / D+30
        </label>
      )}
      <div className="acoes">
        {lead && <button className="btn2 perigo" onClick={onExcluir}><Ico n="trash" size={14} /> Excluir</button>}
        <button className="btn2 primario" onClick={() => f.telefone ? onSalvar(f) : alert("Telefone é obrigatório")}><Ico n="check" size={14} /> Salvar</button>
      </div>
    </div>
  );
}

function ModalObs({ lead, salvar }) {
  const [texto, setTexto] = useState("");
  if (!lead) return null;
  return (
    <div>
      <h2><Ico n="fileText" /> Observações — {lead.nome || lead.telefone}</h2>
      {(lead.observacoes || []).length === 0 && <div className="vazio">Nenhuma observação ainda.</div>}
      {(lead.observacoes || []).map((o, i) => (
        <div className="linha-item" key={i}>
          <span className="data">{fmtBR(o.data)}</span>
          <span className="desc">{o.texto}</span>
          <button className="btn2" onClick={() => salvar({ ...lead, observacoes: lead.observacoes.filter((_, j) => j !== i) })}><Ico n="trash" size={14} /></button>
        </div>
      ))}
      <textarea placeholder="Nova observação…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!texto.trim()) return;
          salvar({ ...lead, observacoes: [...(lead.observacoes || []), { texto: texto.trim(), data: hoje() }] }); setTexto(""); }}>
          <Ico n="plus" size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}

function ModalAgenda({ lead, salvar, enviar }) {
  const [novo, setNovo] = useState({ data: hoje(), texto: "" });
  if (!lead) return null;
  const temCadencia = (lead.lembretes || []).some((l) => l.tipo === "D0");
  return (
    <div>
      <h2><Ico n="calendar" /> Agenda de mensagens — {lead.nome || lead.telefone}</h2>
      {!temCadencia && (
        <button className="btn2 primario" style={{ marginBottom: 10 }}
          onClick={() => salvar({ ...lead, lembretes: [...(lead.lembretes || []), ...novaCadencia(hoje())] })}>
          <Ico n="zapRaio" size={15} /> Preencher cadência D+0 / D+5 / D+30
        </button>
      )}
      {(lead.lembretes || []).length === 0 && <div className="vazio">Nenhuma mensagem agendada.</div>}
      {(lead.lembretes || []).map((lem) => {
        const texto = msgDoLembrete(lead, lem);
        return (
          <div className={"linha-item" + (lem.enviado ? " enviado" : "")} key={lem.id}>
            <span className="data">{fmtBR(lem.data)}</span>
            <span className="desc"><b>{lem.tipo && TEMPLATES[lem.tipo] ? TEMPLATES[lem.tipo].titulo : "Personalizada"}</b></span>
            {!lem.enviado && <button className="btn2 zap" onClick={() => enviar(lead, texto)}><Ico n="send" size={14} /> Enviar agora</button>}
            {!lem.enviado && <button className="btn2" title="Marcar como enviada" onClick={() => salvar({ ...lead, lembretes: lead.lembretes.map((l) => l.id === lem.id ? { ...l, enviado: true } : l) })}><Ico n="check" size={14} /></button>}
            <button className="btn2" title="Excluir" onClick={() => salvar({ ...lead, lembretes: lead.lembretes.filter((l) => l.id !== lem.id) })}><Ico n="trash" size={14} /></button>
            {!lem.enviado && <div className="msg-preview">{texto}</div>}
          </div>
        );
      })}
      <h3>Agendar mensagem personalizada</h3>
      <label>Data</label>
      <input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
      <label>Mensagem (use {"{nome}"} para o nome do cliente)</label>
      <textarea value={novo.texto} onChange={(e) => setNovo({ ...novo, texto: e.target.value })} placeholder="Oi {nome}! …" />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!novo.texto.trim()) return;
          salvar({ ...lead, lembretes: [...(lead.lembretes || []), { id: "p" + Date.now(), data: novo.data, texto: novo.texto.trim(), enviado: false }] });
          setNovo({ data: hoje(), texto: "" }); }}>
          <Ico n="calendar" size={14} /> Agendar
        </button>
      </div>
    </div>
  );
}

function ModalCompras({ lead, salvar }) {
  const [f, setF] = useState({ descricao: "", valor: "", data: hoje() });
  if (!lead) return null;
  const total = (lead.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  return (
    <div>
      <h2><Ico n="dollar" /> Compras — {lead.nome || lead.telefone}</h2>
      <div className="total-gasto">Total gasto: {fmtDinheiro(total)}</div>
      {(lead.compras || []).map((c, i) => (
        <div className="linha-item" key={i}>
          <span className="data">{fmtBR(c.data)}</span>
          <span className="desc">{c.descricao}</span>
          <b>{fmtDinheiro(c.valor)}</b>
          <button className="btn2" onClick={() => salvar({ ...lead, compras: lead.compras.filter((_, j) => j !== i) })}><Ico n="trash" size={14} /></button>
        </div>
      ))}
      <h3>Registrar compra/serviço</h3>
      <label>Descrição</label>
      <input type="text" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Formatação + SSD 480GB" />
      <label>Valor (R$)</label>
      <input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
      <label>Data</label>
      <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!f.descricao || !f.valor) return;
          salvar({ ...lead, compras: [...(lead.compras || []), { ...f, valor: Number(f.valor) }] });
          setF({ descricao: "", valor: "", data: hoje() }); }}>
          <Ico n="plus" size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}

function ModalTags({ lead, salvar }) {
  if (!lead) return null;
  const ativa = (id) => (lead.tags || []).includes(id);
  return (
    <div>
      <h2><Ico n="tag" /> Etiquetas — {lead.nome || lead.telefone}</h2>
      <p style={{ fontSize: 13, color: "var(--cinza)", marginBottom: 8 }}>Clique para ativar/desativar. As etiquetas aparecem no card e funcionam na busca.</p>
      {TAGS.map((t) => (
        <button key={t.id} className={"tag-opcao " + (ativa(t.id) ? "on" : "off")} style={{ background: t.cor }}
          onClick={() => salvar({ ...lead, tags: ativa(t.id) ? lead.tags.filter((x) => x !== t.id) : [...(lead.tags || []), t.id] })}>
          {ativa(t.id) && <Ico n="check" size={13} />}{t.nome}
        </button>
      ))}
    </div>
  );
}
