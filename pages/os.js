import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { Modal } from "../components/CardKit";
import { Ico, IcoZap } from "../lib/icons";
import { waLink, normalizaFone } from "../lib/crmHelpers";

// Tenta descobrir os campos mais comuns dentro de data.* sem travar se o formato do PDV for diferente.
const CAMPOS = {
  cliente: ["cliente", "clienteNome", "nomeCliente", "nome", "customer", "customerName", "cliente_nome"],
  cpf: ["cpf", "cpfCnpj", "cpf_cnpj", "documento", "doc"],
  telefone: ["telefone", "celular", "whatsapp", "fone", "contato", "phone", "telefoneCliente"],
  equipamento: ["equipamento", "aparelho", "produto", "device", "modelo", "item"],
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
  const [estado, setEstado] = useState({ carregando: true, configurado: false, erro: null, ordens: [] });
  const [lists, setLists] = useState([]);
  const [placement, setPlacement] = useState(new Map()); // osId -> listKey
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [leadsPorTelefone, setLeadsPorTelefone] = useState(new Map());
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
      if (!Array.isArray(j)) return;
      setPlacement(new Map(j.map((p) => [p.osId, p.listId])));
    }).catch(() => {});

    // cruza telefone da OS com clientes já cadastrados no CRM
    fetch("/api/leads").then((r) => r.json()).then((j) => {
      if (!Array.isArray(j)) return;
      const m = new Map();
      for (const l of j) { const k = normalizaFone(l.telefone); if (k) m.set(k, l); }
      setLeadsPorTelefone(m);
    }).catch(() => {});
  }
  useEffect(() => { carregarTudo(); }, []);

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

  return (
    <Layout titulo="OS">
      <div className="pagina" style={{ paddingBottom: 0 }}>
        <div className="pagina-titulo"><Ico n="wrench" size={20} /> Ordens de Serviço</div>
        <div className="pagina-sub">Dados vêm ao vivo do PDV (somente leitura). As listas abaixo são organização sua, só do CRM — arraste os cards à vontade.</div>
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
              Essa tela mostra as Ordens de Serviço do PDV em tempo real, sem tocar no banco <code>infopdv</code>.
            </p>
            <div className="aviso" style={{ textAlign: "left" }}>
              Falta configurar no Vercel (Settings → Environment Variables):
              <ol style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.9 }}>
                <li><b>PDV_API_URL</b> — a URL pública do PDV</li>
                <li><b>PDV_API_TOKEN</b> — token próprio do CRM, só leitura</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {!estado.carregando && estado.erro && (
        <div className="pagina">
          <div className="aviso" style={{ maxWidth: 640 }}><b>Erro ao consultar o PDV:</b> {estado.erro}</div>
        </div>
      )}

      {!estado.carregando && estado.configurado && !estado.erro && (
        <>
          <div className="toolbar" style={{ paddingTop: 0 }}>
            <input type="text" placeholder="Buscar cliente, telefone, CPF ou equipamento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          <div className="board">
            {lists.map((lista) => {
              const cards = ordensFiltradas.filter((o) => listaDe(o.id) === lista.key);
              const soma = cards.reduce((s, o) => s + numeroValor(campo(o.data, "valor")), 0);
              return (
                <div key={lista.key} className="lista"
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove("drag-over");
                    if (dragId.current) moverOs(dragId.current, lista.key);
                  }}>
                  <div className="lista-head">
                    <span className="titulo">{lista.nome}</span>
                    <span className="qtd">{cards.length}</span>
                    {soma > 0 && <span className="soma">{fmtValor(soma)}</span>}
                    {!lista.fixa && <button className="x" title="Excluir lista" onClick={() => excluirLista(lista)}><Ico n="x" size={14} /></button>}
                  </div>

                  {cards.map((o) => {
                    const cliente = campo(o.data, "cliente") || "OS #" + o.id;
                    const telefone = campo(o.data, "telefone");
                    const equipamento = campo(o.data, "equipamento");
                    const defeito = campo(o.data, "defeito");
                    const valor = campo(o.data, "valor");
                    const status = campo(o.data, "status");
                    const leadCRM = telefone ? leadsPorTelefone.get(normalizaFone(telefone)) : null;
                    return (
                      <div className="card" key={o.id} draggable onDragStart={() => (dragId.current = String(o.id))}>
                        <div className="nome" style={{ cursor: "pointer" }} onClick={() => setDetalhe(o)}>{cliente}</div>
                        <div className="servico">
                          {[equipamento, defeito].filter(Boolean).join(" · ") || "sem detalhes de equipamento"}
                        </div>
                        <div className="tags">
                          {status && <span className="tag-chip" style={{ background: corStatus(status) }}>{status}</span>}
                          {valor ? <span className="tag-chip" style={{ background: "var(--accent-forte)" }}>{fmtValor(valor)}</span> : null}
                          {leadCRM && <span className="tag-chip" style={{ background: "#111827" }}>Cliente CRM</span>}
                        </div>
                        <div className="icones">
                          <span style={{ fontSize: 12, color: "var(--cinza)", flex: 1 }}>{telefone || "—"}</span>
                          {telefone && (
                            <button className="icone-btn zap-btn" title="WhatsApp" onClick={() => window.open(waLink(telefone), "_blank")}>
                              <IcoZap />
                            </button>
                          )}
                          {leadCRM && (
                            <Link href={`/?tel=${encodeURIComponent(telefone)}`} className="icone-btn" title={`Abrir ${leadCRM.nome || "cliente"} no CRM`}>
                              <Ico n="check" />
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <button className="add-lista" onClick={novaLista}><Ico n="plus" size={16} /> Nova lista</button>
          </div>
        </>
      )}

      {detalhe && (
        <Modal fechar={() => setDetalhe(null)}>
          <h2><Ico n="wrench" /> OS #{detalhe.id}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {Object.keys(CAMPOS).map((chave) => {
              const v = campo(detalhe.data, chave);
              if (!v) return null;
              return (
                <div key={chave} className="linha-item">
                  <span className="data" style={{ minWidth: 90, textTransform: "capitalize" }}>{chave}</span>
                  <span className="desc">{chave === "valor" ? fmtValor(v) : v}</span>
                </div>
              );
            })}
          </div>
          {(() => {
            const tel = campo(detalhe.data, "telefone");
            const lead = tel ? leadsPorTelefone.get(normalizaFone(tel)) : null;
            return lead ? (
              <div className="aviso" style={{ marginTop: 10 }}>
                Este telefone já está cadastrado no CRM como <b>{lead.nome || "cliente sem nome"}</b>.{" "}
                <Link href={`/?tel=${encodeURIComponent(tel)}`} style={{ color: "inherit", fontWeight: 800 }}>Abrir no CRM →</Link>
              </div>
            ) : null;
          })()}
          <h3>Todos os dados brutos (caso algum campo não tenha sido reconhecido acima)</h3>
          <pre style={{ background: "var(--fundo)", border: "1px solid var(--borda)", borderRadius: 10, padding: 12, fontSize: 12, overflowX: "auto" }}>
            {JSON.stringify(detalhe.data, null, 2)}
          </pre>
        </Modal>
      )}
    </Layout>
  );
}
