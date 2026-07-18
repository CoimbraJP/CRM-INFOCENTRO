import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import { Modal, ModalEditar, ModalObs, ModalAgenda, ModalCompras, ModalTags } from "../components/CardKit";
import { Ico, IcoZap } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { TAGS, waLink, normalizaFone, primeiroNome, ehAniversarioHoje } from "../lib/crmHelpers";

// Tenta descobrir os campos mais comuns dentro de data.* sem travar se o formato do PDV for diferente.
// Edite estas listas se souber o nome exato dos campos do seu PDV — quanto mais na frente, maior a prioridade.
const CAMPOS = {
  cliente: ["cliente", "clienteNome", "nomeCliente", "nome", "customer", "customerName", "cliente_nome", "client"],
  cpf: ["cpf", "cpfCnpj", "cpf_cnpj", "documento", "doc"],
  telefone: ["telefone", "celular", "whatsapp", "fone", "contato", "phone", "telefoneCliente", "clienteTelefone"],
  equipamento: ["equipamento", "aparelho", "produto", "device", "modelo", "item", "tipo"],
  defeito: ["defeito", "problema", "descricao", "reclamacao", "relato", "issue", "observacao", "obs"],
  valor: ["valor", "valorTotal", "total", "preco", "price", "valor_total"],
  servicos: ["servicos", "services", "itens", "pecas", "servicosRealizados"],
  data: ["dataAbertura", "criadoEm", "createdAt", "data", "abertura", "dataEntrada"],
  status: ["status", "situacao", "etapa"],
};

function campo(data, chave) {
  const opcoes = CAMPOS[chave] || [chave];
  for (const k of opcoes) {
    const v = data?.[k];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) return v.map((x) => (typeof x === "object" ? x.nome || x.descricao || JSON.stringify(x) : x)).join(", ");
    if (typeof v === "object") return JSON.stringify(v);
    return String(v);
  }
  return "";
}
function fmtValor(v) {
  const n = Number(String(v).replace(",", "."));
  return isNaN(n) ? v : "R$ " + n.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}
function numeroValor(v) {
  const n = Number(String(v || "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}
const CORES_STATUS = {
  aberta: "#3b82f6", "em aberto": "#3b82f6",
  "em andamento": "#f59e0b", andamento: "#f59e0b",
  "aguardando peca": "#a855f7", "aguardando peça": "#a855f7", orcamento: "#a855f7", "orçamento": "#a855f7",
  pronta: "#22c55e", concluida: "#22c55e", "concluída": "#22c55e",
  entregue: "#0d9488", finalizada: "#0d9488",
  cancelada: "#dc2626",
};
function corStatus(status) {
  const key = String(status || "").toLowerCase().trim();
  if (!key) return "#6b7280";
  if (CORES_STATUS[key]) return CORES_STATUS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 55%, 42%)`;
}

export default function OsPage() {
  const { templates, render } = useTemplates();
  const msgDoLembrete = (lead, lem) => (lem.tipo ? render(lem.tipo, primeiroNome(lead.nome), lem.varIdx ?? 0) : (lem.texto || "").replaceAll("{nome}", primeiroNome(lead.nome)));

  const [estado, setEstado] = useState({ carregando: true, configurado: false, erro: null, ordens: [] });
  const [lists, setLists] = useState([]);
  const [placement, setPlacement] = useState(new Map()); // osId -> listKey
  const [leads, setLeads] = useState([]);
  const [busca, setBusca] = useState("");
  const [osDetalhe, setOsDetalhe] = useState(null); // OS bruta (equipamento/defeito/valor/status)
  const [modal, setModal] = useState(null); // modal de cliente CRM (obs/agenda/compras/tags/editar)
  const dragId = useRef(null);

  function carregarTudo() {
    fetch("/api/os")
      .then((r) => r.json().then((j) => ({ status: r.status, j })))
      .then(({ status, j }) => {
        if (status === 501) setEstado({ carregando: false, configurado: false, erro: null, ordens: [] });
        else if (j.error) setEstado({ carregando: false, configurado: !!j.configurado, erro: j.error, ordens: [] });
        else setEstado({ carregando: false, configurado: true, erro: null, ordens: j.ordens || [] });
      })
      .catch((e) => setEstado({ carregando: false, configurado: false, erro: String(e.message || e), ordens: [] }));

    fetch("/api/lists?board=os").then((r) => r.json()).then((j) => setLists(Array.isArray(j) ? j : [])).catch(() => {});
    fetch("/api/os-placement").then((r) => r.json()).then((j) => {
      if (Array.isArray(j)) setPlacement(new Map(j.map((p) => [p.osId, p.listId])));
    }).catch(() => {});
    fetch("/api/leads").then((r) => r.json()).then((j) => setLeads(Array.isArray(j) ? j : [])).catch(() => {});
  }
  useEffect(() => { carregarTudo(); }, []);

  const leadsPorTelefone = useMemo(() => {
    const m = new Map();
    for (const l of leads) { const k = normalizaFone(l.telefone); if (k) m.set(k, l); }
    return m;
  }, [leads]);

  async function salvarLead(lead) {
    setLeads((ls) => ls.map((x) => (x._id === lead._id ? lead : x)));
    await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
  }
  async function excluirLead(id) {
    if (!confirm("Excluir este cliente definitivamente do CRM?")) return;
    setLeads((ls) => ls.filter((x) => x._id !== id));
    setModal(null);
    await fetch("/api/leads?_id=" + id, { method: "DELETE" });
  }
  async function adicionarAoCrm(o) {
    const nome = campo(o.data, "cliente");
    const telefone = campo(o.data, "telefone");
    if (!telefone) { alert("Essa OS não tem telefone — não dá pra criar o cliente no CRM."); return; }
    const servico = [campo(o.data, "equipamento"), campo(o.data, "defeito")].filter(Boolean).join(" — ") || "Serviço via PDV";
    const r = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone, servico, listId: "inbox", tagListId: "sem_etiqueta", tags: [] }),
    });
    if (r.ok) { alert("Cliente adicionado ao CRM!"); carregarTudo(); }
    else alert("Não consegui adicionar — tenta de novo.");
  }

  async function moverOs(osId, listId) {
    setPlacement((m) => new Map(m).set(osId, listId));
    await fetch("/api/os-placement", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ osId, listId }) });
  }
  async function novaLista() {
    const nome = prompt("Nome da nova lista:");
    if (!nome) return;
    await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, board: "os" }) });
    carregarTudo();
  }
  async function excluirLista(l) {
    if (!confirm("Excluir a lista " + l.nome + "?")) return;
    const r = await fetch(`/api/lists?_id=${l._id}&key=${l.key}&board=os`, { method: "DELETE" });
    if (!r.ok) { const j = await r.json(); alert(j.error); return; }
    carregarTudo();
  }

  const ordensFiltradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return estado.ordens;
    return estado.ordens.filter((o) => {
      const texto = [campo(o.data, "cliente"), campo(o.data, "telefone"), campo(o.data, "equipamento"), campo(o.data, "cpf")].join(" ").toLowerCase();
      return texto.includes(q);
    });
  }, [estado.ordens, busca]);

  const primeiraLista = lists[0]?.key || "todas";
  function listaDe(osId) { return placement.get(String(osId)) || primeiraLista; }

  const acoesTopbar = !estado.carregando && estado.configurado && !estado.erro && (
    <input type="text" placeholder="Buscar cliente, telefone, CPF ou equipamento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
  );

  return (
    <Layout titulo="OS" acoes={acoesTopbar}>
      <div className="pagina" style={{ paddingBottom: 0 }}>
        <div className="pagina-titulo"><Ico n="wrench" size={20} /> Ordens de Serviço</div>
        <div className="pagina-sub">Card idêntico ao do CRM quando o cliente já está cadastrado — clique no nome pra abrir observações, agenda, compras e etiquetas. Listas abaixo são só sua organização, o PDV nunca é alterado.</div>
      </div>

      {estado.carregando && <div className="pagina">Carregando…</div>}

      {!estado.carregando && !estado.configurado && !estado.erro && (
        <div className="pagina">
          <div className="os-placeholder">
            <div className="icone-grande" style={{ background: "var(--accent-suave)", color: "var(--accent-forte)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico n="info" size={26} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Aguardando configuração</h3>
            <p style={{ color: "var(--cinza)", fontSize: 13.5, marginBottom: 16, lineHeight: 1.6 }}>
              Falta configurar <b>PDV_API_URL</b> e <b>PDV_API_TOKEN</b> nas Environment Variables do Vercel.
            </p>
          </div>
        </div>
      )}

      {!estado.carregando && estado.erro && (
        <div className="pagina"><div className="aviso" style={{ maxWidth: 640 }}><b>Erro ao consultar o PDV:</b> {estado.erro}</div></div>
      )}

      {!estado.carregando && estado.configurado && !estado.erro && (
        <>
          <div className="board">
            {lists.map((lista) => {
              const cards = ordensFiltradas.filter((o) => listaDe(o.id) === lista.key);
              const soma = cards.reduce((s, o) => s + numeroValor(campo(o.data, "valor")), 0);
              return (
                <div key={lista.key} className="lista"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                  onDrop={(e) => { e.currentTarget.classList.remove("drag-over"); if (dragId.current) moverOs(dragId.current, lista.key); }}>
                  <div className="lista-head">
                    <span className="titulo">{lista.nome}</span>
                    <span className="qtd">{cards.length}</span>
                    {soma > 0 && <span className="soma">{fmtValor(soma)}</span>}
                    {!lista.fixa && <button className="x" title="Excluir lista" onClick={() => excluirLista(lista)}><Ico n="x" size={14} /></button>}
                  </div>

                  {cards.map((o) => {
                    const telefone = campo(o.data, "telefone");
                    const lead = telefone ? leadsPorTelefone.get(normalizaFone(telefone)) : null;
                    return lead ? (
                      <CardCliente key={o.id} lead={lead} status={campo(o.data, "status")}
                        onDragStart={() => (dragId.current = String(o.id))}
                        abrir={(tipo) => setModal({ tipo, lead })}
                        abrirOs={() => setOsDetalhe(o)}
                        zapDireto={() => window.open(waLink(lead.telefone), "_blank")} />
                    ) : (
                      <CardPendente key={o.id} o={o}
                        onDragStart={() => (dragId.current = String(o.id))}
                        abrirOs={() => setOsDetalhe(o)}
                        adicionar={() => adicionarAoCrm(o)} />
                    );
                  })}
                </div>
              );
            })}
            <button className="add-lista" onClick={novaLista}><Ico n="plus" size={16} /> Nova lista</button>
          </div>
        </>
      )}

      {/* modais do cliente — mesmos do CRM */}
      {modal && (
        <Modal fechar={() => setModal(null)}>
          {modal.tipo === "editar" && <ModalEditar lead={leads.find((l) => l._id === modal.lead._id)} onSalvar={(dados) => { salvarLead({ ...modal.lead, ...dados }); setModal(null); }} onExcluir={() => excluirLead(modal.lead._id)} />}
          {modal.tipo === "obs" && <ModalObs lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
          {modal.tipo === "agenda" && <ModalAgenda lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} enviar={(lead, texto) => window.open(waLink(lead.telefone, texto), "_blank")} templates={templates} msgDoLembrete={msgDoLembrete} />}
          {modal.tipo === "compras" && <ModalCompras lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
          {modal.tipo === "tags" && <ModalTags lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
        </Modal>
      )}

      {/* dados da própria OS (equipamento, defeito, valor, status, brutos) */}
      {osDetalhe && (
        <Modal fechar={() => setOsDetalhe(null)}>
          <h2><Ico n="wrench" /> OS #{osDetalhe.id}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {Object.keys(CAMPOS).map((chave) => {
              const v = campo(osDetalhe.data, chave);
              if (!v) return null;
              return (
                <div key={chave} className="linha-item">
                  <span className="data" style={{ minWidth: 90, textTransform: "capitalize" }}>{chave}</span>
                  <span className="desc">{chave === "valor" ? fmtValor(v) : v}</span>
                </div>
              );
            })}
          </div>
          <h3>Todos os dados brutos</h3>
          <pre style={{ background: "var(--fundo)", border: "1px solid var(--borda)", borderRadius: 10, padding: 12, fontSize: 12, overflowX: "auto" }}>
            {JSON.stringify(osDetalhe.data, null, 2)}
          </pre>
        </Modal>
      )}
    </Layout>
  );
}

// ---------- card idêntico ao do CRM (cliente já cadastrado) + 1 ícone extra pra ver a OS ----------
function CardCliente({ lead, status, abrir, abrirOs, zapDireto, onDragStart }) {
  const pendentes = (lead.lembretes || []).filter((l) => !l.enviado).length;
  const totalCompras = (lead.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  return (
    <div className="card" draggable onDragStart={onDragStart}>
      <div className="nome" style={{ cursor: "pointer" }} onClick={() => abrir("editar")}>
        {lead.nome || "— sem nome —"} {ehAniversarioHoje(lead) && <Ico n="cake" size={15} />}
      </div>
      <div className="servico">{lead.servico} · {lead.telefone}</div>
      <div className="tags">
        {status && <span className="tag-chip" style={{ background: corStatus(status) }}>{status}</span>}
        {(lead.tags || []).map((t) => {
          const tag = TAGS.find((x) => x.id === t);
          return tag ? <span key={t} className="tag-chip" style={{ background: tag.cor }}>{tag.nome}</span> : null;
        })}
      </div>
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
        <button className="icone-btn" title="Ver dados da OS" onClick={abrirOs}><Ico n="wrench" /></button>
      </div>
    </div>
  );
}

// ---------- card de OS cujo cliente ainda não está no CRM ----------
function CardPendente({ o, abrirOs, adicionar, onDragStart }) {
  const cliente = campo(o.data, "cliente") || "OS #" + o.id;
  const telefone = campo(o.data, "telefone");
  const equipamento = campo(o.data, "equipamento");
  const defeito = campo(o.data, "defeito");
  const status = campo(o.data, "status");
  const valor = campo(o.data, "valor");
  return (
    <div className="card" draggable onDragStart={onDragStart} style={{ opacity: .92 }}>
      <div className="nome" style={{ cursor: "pointer" }} onClick={abrirOs}>{cliente}</div>
      <div className="servico">{[equipamento, defeito].filter(Boolean).join(" · ") || "sem detalhes de equipamento"}</div>
      <div className="tags">
        {status && <span className="tag-chip" style={{ background: corStatus(status) }}>{status}</span>}
        {valor ? <span className="tag-chip" style={{ background: "var(--accent-forte)" }}>{fmtValor(valor)}</span> : null}
      </div>
      <div className="icones">
        <span style={{ fontSize: 12, color: "var(--cinza)", flex: 1 }}>{telefone || "sem telefone"}</span>
        {telefone && <button className="icone-btn zap-btn" title="WhatsApp" onClick={() => window.open(waLink(telefone), "_blank")}><IcoZap /></button>}
        <button className="icone-btn" title="Ver OS" onClick={abrirOs}><Ico n="wrench" /></button>
        <button className="icone-btn" title="Adicionar ao CRM" onClick={adicionar}><Ico n="plus" /></button>
      </div>
    </div>
  );
}
