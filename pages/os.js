import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { Modal } from "../components/CardKit";
import { Ico, IcoZap } from "../lib/icons";
import { waLink, normalizaFone } from "../lib/crmHelpers";

// Tenta descobrir os campos mais comuns dentro de data.* sem travar se o formato do PDV for diferente.
// Cobre variações em PT/EN, camelCase e snake_case — cada atributo tem várias chaves candidatas.
const CAMPOS = {
  cliente: ["cliente", "clienteNome", "nomeCliente", "nome", "customer", "customerName", "cliente_nome"],
  cpf: ["cpf", "cpfCnpj", "cpf_cnpj", "documento", "doc"],
  telefone: ["telefone", "celular", "whatsapp", "fone", "contato", "phone", "telefoneCliente"],
  equipamento: ["equipamento", "aparelho", "produto", "device", "modelo", "item"],
  defeito: ["defeito", "problema", "descricao", "reclamacao", "relato", "issue", "observacao", "obs"],
  valor: ["valor", "valorTotal", "total", "preco", "price", "valor_total"],
  servicos: ["servicos", "services", "itens", "pecas", "servicosRealizados"],
  data: ["dataAbertura", "criadoEm", "createdAt", "data", "abertura", "dataEntrada"],
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
  "sem status": "#6b7280",
};
function corStatus(status) {
  const key = String(status).toLowerCase().trim();
  if (CORES_STATUS[key]) return CORES_STATUS[key];
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = key.charCodeAt(i) + ((hash << 5) - hash);
  return `hsl(${Math.abs(hash) % 360}, 60%, 45%)`;
}

export default function OsPage() {
  const [estado, setEstado] = useState({ carregando: true, configurado: false, erro: null, ordens: [] });
  const [busca, setBusca] = useState("");
  const [detalhe, setDetalhe] = useState(null);
  const [leadsPorTelefone, setLeadsPorTelefone] = useState(new Map());

  useEffect(() => {
    fetch("/api/os")
      .then((r) => r.json().then((j) => ({ status: r.status, j })))
      .then(({ status, j }) => {
        if (status === 501) setEstado({ carregando: false, configurado: false, erro: null, ordens: [] });
        else if (j.error) setEstado({ carregando: false, configurado: !!j.configurado, erro: j.error, ordens: [] });
        else setEstado({ carregando: false, configurado: true, erro: null, ordens: j.ordens || [] });
      })
      .catch((e) => setEstado({ carregando: false, configurado: false, erro: String(e.message || e), ordens: [] }));

    // cruza telefone da OS com clientes já cadastrados no CRM
    fetch("/api/leads")
      .then((r) => r.json())
      .then((j) => {
        if (!Array.isArray(j)) return;
        const m = new Map();
        for (const l of j) {
          const k = normalizaFone(l.telefone);
          if (k) m.set(k, l);
        }
        setLeadsPorTelefone(m);
      })
      .catch(() => {});
  }, []);

  const ordensFiltradas = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return estado.ordens;
    return estado.ordens.filter((o) => {
      const texto = [campo(o.data, "cliente"), campo(o.data, "telefone"), campo(o.data, "equipamento"), campo(o.data, "cpf")].join(" ").toLowerCase();
      return texto.includes(q);
    });
  }, [estado.ordens, busca]);

  const colunas = {};
  for (const o of ordensFiltradas) {
    const status = campo(o.data, "status") || "Sem status";
    (colunas[status] ||= []).push(o);
  }

  return (
    <Layout titulo="OS">
      <div className="pagina" style={{ paddingBottom: 0 }}>
        <div className="pagina-titulo"><Ico n="wrench" size={20} /> Ordens de Serviço</div>
        <div className="pagina-sub">Espelho somente-leitura das OS do PDV — nada aqui é editável nem grava de volta no PDV.</div>
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
              Essa tela vai mostrar as Ordens de Serviço do PDV em tempo real, sem tocar no banco <code>infopdv</code>.
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
            {Object.keys(colunas).length === 0 && <div className="vazio" style={{ padding: "0 20px" }}>Nenhuma ordem de serviço encontrada.</div>}
            {Object.entries(colunas).map(([status, ordens]) => {
              const cor = corStatus(status);
              const soma = ordens.reduce((s, o) => s + numeroValor(campo(o.data, "valor")), 0);
              return (
                <div className="lista" key={status} style={{ borderTopColor: cor }}>
                  <div className="lista-head">
                    <span className="titulo" style={{ color: cor }}>● {String(status).toUpperCase()}</span>
                    <span className="qtd">{ordens.length}</span>
                    {soma > 0 && <span className="soma">{fmtValor(soma)}</span>}
                  </div>
                  {ordens.map((o) => {
                    const cliente = campo(o.data, "cliente") || "OS #" + o.id;
                    const telefone = campo(o.data, "telefone");
                    const equipamento = campo(o.data, "equipamento");
                    const defeito = campo(o.data, "defeito");
                    const valor = campo(o.data, "valor");
                    const leadCRM = telefone ? leadsPorTelefone.get(normalizaFone(telefone)) : null;
                    return (
                      <div className="card" key={o.id} onClick={() => setDetalhe(o)} style={{ cursor: "pointer", borderLeft: `3px solid ${cor}` }}>
                        <div className="nome">{cliente}</div>
                        <div className="servico">
                          {[equipamento, defeito].filter(Boolean).join(" · ") || "sem detalhes de equipamento"}
                        </div>
                        <div className="icones" style={{ marginTop: 8, justifyContent: "space-between" }}>
                          <span style={{ fontSize: 12, color: "var(--cinza)" }}>{telefone || "—"}</span>
                          {valor ? <span style={{ fontSize: 12, fontWeight: 800, color: "var(--accent-forte)" }}>{fmtValor(valor)}</span> : null}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
                          {telefone && (
                            <button className="icone-btn zap-btn" title="WhatsApp"
                              onClick={(e) => { e.stopPropagation(); window.open(waLink(telefone), "_blank"); }}>
                              <IcoZap size={15} />
                            </button>
                          )}
                          {leadCRM && (
                            <Link href={`/?tel=${encodeURIComponent(telefone)}`} onClick={(e) => e.stopPropagation()}
                              className="tag-chip" style={{ background: "var(--accent)", color: "var(--accent-texto)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                              title={`Abrir ${leadCRM.nome || "cliente"} no CRM`}>
                              <Ico n="check" size={11} /> Já é cliente CRM
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}

      {detalhe && (
        <Modal fechar={() => setDetalhe(null)}>
          <h2><Ico n="wrench" /> OS #{detalhe.id}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {Object.entries(CAMPOS).map(([chave]) => {
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
