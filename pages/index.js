import { useEffect, useMemo, useRef, useState } from "react";
import { TEMPLATES, renderTemplate } from "../lib/messages";

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
  const h = hoje().slice(5); // MM-DD
  const n = String(lead.nascimento);
  // aceita YYYY-MM-DD ou DD/MM ou DD/MM/YYYY
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
  const [modal, setModal] = useState(null); // {tipo, lead}
  const [painelAberto, setPainelAberto] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erroConexao, setErroConexao] = useState(null);
  const fileRef = useRef(null);
  const [importOpts, setImportOpts] = useState({ cadencia: true });
  const dragId = useRef(null);

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

  // ---------- painel enviar hoje ----------
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

  // ---------- importação excel ----------
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

  // ---------- exportação excel (backup) ----------
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

  // ---------- listas ----------
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

  // ---------- busca ----------
  const leadsFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter((l) => {
      const tagsNomes = (l.tags || []).map((t) => TAGS.find((x) => x.id === t)?.nome || "").join(" ");
      return (l.nome + " " + l.telefone + " " + l.servico + " " + tagsNomes).toLowerCase().includes(q);
    });
  }, [leads, busca]);

  // ---------- render ----------
  if (carregando) return <div style={{ padding: 40, textAlign: "center" }}>Carregando CRM…</div>;
  if (erroConexao)
    return (
      <div style={{ padding: 40, maxWidth: 640, margin: "0 auto" }}>
        <h2 style={{ color: "#991b1b", marginBottom: 12 }}>⚠️ Não consegui conectar ao banco</h2>
        <div className="aviso" style={{ wordBreak: "break-word" }}>{erroConexao}</div>
        <ol style={{ fontSize: 14, lineHeight: 1.9, paddingLeft: 20, marginTop: 10 }}>
          <li>No Vercel: Settings → Environment Variables → confira <b>MONGODB_URI</b> e <b>MONGODB_DB=info_crm</b></li>
          <li>No Atlas: Network Access precisa ter <b>0.0.0.0/0</b> liberado</li>
          <li>No Atlas: usuário <b>crm_user</b> com role readWrite no banco <b>info_crm</b></li>
          <li>Depois de mudar variável de ambiente, faça <b>Redeploy</b> no Vercel</li>
        </ol>
        <button className="btn2 primario" onClick={() => { setCarregando(true); carregar(); }}>🔄 Tentar novamente</button>
      </div>
    );

  return (
    <div>
      <div className="topbar">
        <h1>📇 CRM INFO Centro</h1>
        <input type="text" placeholder="🔍 Buscar nome, telefone, serviço ou etiqueta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <button className="btn" onClick={() => setModal({ tipo: "novo" })}>+ Cliente</button>
        <button className="btn" onClick={() => setModal({ tipo: "importar" })}>📥 Importar Excel</button>
        <button className="btn escuro" onClick={exportar}>💾 Backup Excel</button>
      </div>

      {/* PAINEL ENVIAR HOJE */}
      <div className="painel-hoje">
        <div className="ph-head" onClick={() => setPainelAberto(!painelAberto)}>
          📬 Enviar hoje {pendencias.length > 0 && <span className="ph-badge">{pendencias.length}</span>}
          <span style={{ marginLeft: "auto", fontSize: 12 }}>{painelAberto ? "▲ fechar" : "▼ abrir"}</span>
        </div>
        {painelAberto && (
          <div>
            {pendencias.length === 0 && <div className="ph-item vazio">Nenhuma mensagem pendente — tudo em dia! ✅</div>}
            {pendencias.map((p, i) => {
              const texto = p.niver ? renderTemplate("ANIVERSARIO", primeiroNome(p.lead.nome), 0) : msgDoLembrete(p.lead, p.lem);
              return (
                <div className="ph-item" key={i}>
                  <span className={"tipo " + (p.niver ? "niver" : p.atrasado ? "atrasado" : "")}>
                    {p.niver ? "🎂 ANIVERSÁRIO" : (p.atrasado ? "ATRASADA · " : "") + (p.lem.tipo && TEMPLATES[p.lem.tipo] ? p.lem.tipo.replace("D", "D+") : "PERSONALIZADA")}
                  </span>
                  <span className="nome">{p.lead.nome || p.lead.telefone}</span>
                  <button className="btn2 zap" onClick={() => abrirZapComMsg(p.lead, texto)}>WhatsApp 📤</button>
                  <button className="btn2" onClick={() => (p.niver ? marcarNiverFeito(p.lead) : marcarEnviado(p.lead, p.lem))}>✓ Enviado</button>
                  <div className="ph-msg">{texto}</div>
                </div>
              );
            })}
            {proximos.length > 0 && (
              <div className="ph-item" style={{ background: "#fafafa" }}>
                <span style={{ fontSize: 12, color: "var(--cinza)" }}>
                  📅 Próximos 7 dias: {proximos.map((p) => `${fmtBR(p.lem.data)} — ${p.lead.nome || p.lead.telefone}`).join("  ·  ")}
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
                {!lista.fixa && <button className="x" title="Excluir lista" onClick={() => excluirLista(lista)}>✕</button>}
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
        <button className="add-lista" onClick={novaLista}>＋ Nova lista</button>
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
        {lead.nome || "— sem nome —"} {ehAniversarioHoje(lead) && "🎂"}
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
          📝{(lead.observacoes || []).length > 0 && <span className="mini-badge">{lead.observacoes.length}</span>}
        </button>
        <button className="icone-btn" title="Agenda de mensagens" onClick={() => abrir("agenda")}>
          📅{pendentes > 0 && <span className="mini-badge alerta">{pendentes}</span>}
        </button>
        <button className="icone-btn" title="Abrir WhatsApp" onClick={zapDireto}>💬</button>
        <button className="icone-btn" title="Compras e gastos" onClick={() => abrir("compras")}>
          💰{totalCompras > 0 && <span className="mini-badge">{Math.round(totalCompras)}</span>}
        </button>
        <button className="icone-btn" title="Etiquetas" onClick={() => abrir("tags")}>🏷️</button>
      </div>
    </div>
  );
}

// ---------------- modais ----------------
function Modal({ children, fechar }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal">{children}
        <div className="acoes"><button className="btn2" onClick={fechar}>Fechar</button></div>
      </div>
    </div>
  );
}

function ModalImportar({ opts, setOpts, fileRef, onFile }) {
  return (
    <div>
      <h2>📥 Importar planilha Excel</h2>
      <p style={{ fontSize: 13, color: "var(--cinza)" }}>
        A planilha precisa ter colunas com <b>telefone</b> (obrigatório) e, se tiver, <b>nome</b>, <b>serviço</b> e <b>nascimento</b>.
        Números repetidos são ignorados automaticamente.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", fontSize: 14, color: "var(--texto)" }}>
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
      <h2>{lead ? "✏️ Editar cliente" : "➕ Novo cliente"}</h2>
      <label>Nome</label>
      <input type="text" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <label>Telefone (com DDD)</label>
      <input type="text" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder="11999998888" />
      <label>O que fez / serviço</label>
      <input type="text" value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })} placeholder="Impressão, formatação, orçamento…" />
      <label>Data de nascimento 🎂</label>
      <input type="date" value={f.nascimento?.includes("-") ? f.nascimento : ""} onChange={(e) => setF({ ...f, nascimento: e.target.value })} />
      {!lead && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "var(--texto)", fontWeight: 400, fontSize: 14 }}>
          <input type="checkbox" checked={f.cadencia} onChange={(e) => setF({ ...f, cadencia: e.target.checked })} />
          Preencher agenda D+0 / D+5 / D+30
        </label>
      )}
      <div className="acoes">
        {lead && <button className="btn2 perigo" onClick={onExcluir}>Excluir</button>}
        <button className="btn2 primario" onClick={() => f.telefone ? onSalvar(f) : alert("Telefone é obrigatório")}>Salvar</button>
      </div>
    </div>
  );
}

function ModalObs({ lead, salvar }) {
  const [texto, setTexto] = useState("");
  if (!lead) return null;
  return (
    <div>
      <h2>📝 Observações — {lead.nome || lead.telefone}</h2>
      {(lead.observacoes || []).length === 0 && <div className="vazio">Nenhuma observação ainda.</div>}
      {(lead.observacoes || []).map((o, i) => (
        <div className="linha-item" key={i}>
          <span className="data">{fmtBR(o.data)}</span>
          <span className="desc">{o.texto}</span>
          <button className="btn2" onClick={() => salvar({ ...lead, observacoes: lead.observacoes.filter((_, j) => j !== i) })}>🗑</button>
        </div>
      ))}
      <textarea placeholder="Nova observação…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!texto.trim()) return;
          salvar({ ...lead, observacoes: [...(lead.observacoes || []), { texto: texto.trim(), data: hoje() }] }); setTexto(""); }}>
          Adicionar
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
      <h2>📅 Agenda de mensagens — {lead.nome || lead.telefone}</h2>
      {!temCadencia && (
        <button className="btn2 primario" style={{ marginBottom: 10 }}
          onClick={() => salvar({ ...lead, lembretes: [...(lead.lembretes || []), ...novaCadencia(hoje())] })}>
          ⚡ Preencher cadência D+0 / D+5 / D+30
        </button>
      )}
      {(lead.lembretes || []).length === 0 && <div className="vazio">Nenhuma mensagem agendada.</div>}
      {(lead.lembretes || []).map((lem) => {
        const texto = msgDoLembrete(lead, lem);
        return (
          <div className={"linha-item" + (lem.enviado ? " enviado" : "")} key={lem.id}>
            <span className="data">{fmtBR(lem.data)}</span>
            <span className="desc"><b>{lem.tipo && TEMPLATES[lem.tipo] ? TEMPLATES[lem.tipo].titulo : "Personalizada"}</b></span>
            {!lem.enviado && <button className="btn2 zap" onClick={() => enviar(lead, texto)}>📤 Enviar agora</button>}
            {!lem.enviado && <button className="btn2" onClick={() => salvar({ ...lead, lembretes: lead.lembretes.map((l) => l.id === lem.id ? { ...l, enviado: true } : l) })}>✓</button>}
            <button className="btn2" onClick={() => salvar({ ...lead, lembretes: lead.lembretes.filter((l) => l.id !== lem.id) })}>🗑</button>
            {!lem.enviado && <div className="msg-preview">{texto}</div>}
          </div>
        );
      })}
      <h3>➕ Agendar mensagem personalizada</h3>
      <label>Data</label>
      <input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
      <label>Mensagem (use {"{nome}"} para o nome do cliente)</label>
      <textarea value={novo.texto} onChange={(e) => setNovo({ ...novo, texto: e.target.value })} placeholder="Oi {nome}! …" />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!novo.texto.trim()) return;
          salvar({ ...lead, lembretes: [...(lead.lembretes || []), { id: "p" + Date.now(), data: novo.data, texto: novo.texto.trim(), enviado: false }] });
          setNovo({ data: hoje(), texto: "" }); }}>
          Agendar
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
      <h2>💰 Compras — {lead.nome || lead.telefone}</h2>
      <div className="total-gasto">Total gasto: {fmtDinheiro(total)}</div>
      {(lead.compras || []).map((c, i) => (
        <div className="linha-item" key={i}>
          <span className="data">{fmtBR(c.data)}</span>
          <span className="desc">{c.descricao}</span>
          <b>{fmtDinheiro(c.valor)}</b>
          <button className="btn2" onClick={() => salvar({ ...lead, compras: lead.compras.filter((_, j) => j !== i) })}>🗑</button>
        </div>
      ))}
      <h3>➕ Registrar compra/serviço</h3>
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
          Adicionar
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
      <h2>🏷️ Etiquetas — {lead.nome || lead.telefone}</h2>
      <p style={{ fontSize: 13, color: "var(--cinza)", marginBottom: 8 }}>Clique para ativar/desativar. As etiquetas aparecem no card e funcionam na busca.</p>
      {TAGS.map((t) => (
        <button key={t.id} className={"tag-opcao " + (ativa(t.id) ? "on" : "off")} style={{ background: t.cor }}
          onClick={() => salvar({ ...lead, tags: ativa(t.id) ? lead.tags.filter((x) => x !== t.id) : [...(lead.tags || []), t.id] })}>
          {ativa(t.id) ? "✓ " : ""}{t.nome}
        </button>
      ))}
    </div>
  );
}
