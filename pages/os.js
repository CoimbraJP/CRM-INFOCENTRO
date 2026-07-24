import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Layout from "../components/Layout";
import { Modal, ModalObs, ModalAgenda, ModalCompras, ModalTags, ModalDisparo, MenuLista } from "../components/CardKit";
import { Ico, IcoZap } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { STRATEGY_META } from "../lib/messages";
import { waLink, normalizaFone, primeiroNome, hoje, addDias } from "../lib/crmHelpers";
import { useModoExpandido } from "../lib/useModoExpandido";
import { useAutoScrollDrag } from "../lib/useAutoScrollDrag";

const STATUS_ENTREGUE = ["entregue", "encerrado", "encerrada", "finalizada", "concluida", "concluída", "pronta"];
function foiEntregue(status) {
  return STATUS_ENTREGUE.includes(String(status || "").toLowerCase().trim());
}
// por hora, só a Apresentação (D0) conta como enviada automaticamente e move o card pra uma
// lista própria da estratégia — as demais o usuário liga depois.
const TIPOS_COM_AUTOMACAO = ["D0"];

// Nomes reais confirmados no retorno do PDV (api/crm-sync): client, clientCPF, clientPhone,
// clientBirthDate, clientAddress{}, device, deviceFull, devicePassword, defect, accessories,
// status, date, readyDate, services[{id,description,price}], serviceValue, updatedAt.
// As listas mantêm nomes alternativos como fallback caso o PDV mude no futuro.
const CAMPOS = {
  cliente: ["client", "cliente", "clienteNome", "nomeCliente", "nome", "customer", "customerName"],
  cpf: ["clientCPF", "cpf", "cpfCnpj", "documento"],
  telefone: ["clientPhone", "telefone", "celular", "whatsapp", "fone", "contato", "phone"],
  nascimento: ["clientBirthDate", "nascimento", "aniversario"],
  endereco: ["clientAddress", "endereco"],
  equipamento: ["device", "equipamento", "aparelho", "produto", "modelo"],
  equipamentoCompleto: ["deviceFull"],
  senha: ["devicePassword", "senha"],
  defeito: ["defect", "defeito", "problema", "descricao", "reclamacao", "relato"],
  acessorios: ["accessories", "acessorios"],
  valor: ["serviceValue", "valor", "valorTotal", "total", "preco"],
  servicos: ["services", "servicos", "itens", "pecas"],
  data: ["date", "dataAbertura", "criadoEm", "createdAt", "abertura"],
  dataPronto: ["readyDate", "dataPronta", "previsao"],
  status: ["status", "situacao", "etapa"],
};
const CAMPOS_DATA = new Set(["data", "dataPronto"]);
const ORDEM_CAMPOS = ["cliente", "telefone", "cpf", "nascimento", "endereco", "equipamento", "equipamentoCompleto", "defeito", "acessorios", "senha", "servicos", "valor", "status", "data", "dataPronto"];
const LABELS_CAMPOS = {
  cliente: "Cliente", telefone: "Telefone", cpf: "CPF", nascimento: "Nascimento", endereco: "Endereço",
  equipamento: "Equipamento", equipamentoCompleto: "Equipamento (completo)", defeito: "Defeito relatado",
  acessorios: "Acessórios", senha: "Senha do aparelho", servicos: "Serviços realizados", valor: "Valor",
  status: "Status", data: "Abertura", dataPronto: "Previsão / pronto",
};

function campo(data, chave) {
  const opcoes = CAMPOS[chave] || [chave];
  for (const k of opcoes) {
    const v = data?.[k];
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v)) {
      return v.map((x) => {
        if (typeof x !== "object" || x === null) return x;
        const nome = x.description || x.descricao || x.nome || "";
        const preco = x.price ?? x.valor;
        return preco !== undefined ? `${nome} (${fmtValor(preco)})` : nome || JSON.stringify(x);
      }).join(", ");
    }
    if (typeof v === "object") {
      // endereço estruturado (clientAddress) — monta uma linha legível
      if (v.street || v.city) {
        return [
          [v.street, v.number].filter(Boolean).join(", "),
          v.neighborhood,
          [v.city, v.state].filter(Boolean).join("/"),
          v.cep,
        ].filter(Boolean).join(" — ");
      }
      return JSON.stringify(v);
    }
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
function fmtDataHora(v) {
  const d = new Date(v);
  if (isNaN(d.getTime())) return v;
  const soData = /^\d{4}-\d{2}-\d{2}$/.test(String(v));
  return d.toLocaleDateString("pt-BR") + (soData ? "" : " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
}
const CORES_STATUS = {
  aberta: "#3b82f6", "em aberto": "#3b82f6", "em análise": "#3b82f6", "em analise": "#3b82f6",
  "em andamento": "#f59e0b", andamento: "#f59e0b",
  "aguardando peca": "#a855f7", "aguardando peça": "#a855f7", orcamento: "#a855f7", "orçamento": "#a855f7",
  pronta: "#22c55e", concluida: "#22c55e", "concluída": "#22c55e",
  entregue: "#0d9488", finalizada: "#0d9488", encerrado: "#0d9488", encerrada: "#0d9488",
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
// posição entre dois vizinhos ordenados (indexação fracionada — evita reescrever a coluna inteira)
function ordemEntre(a, b) {
  if (a == null && b == null) return Date.now();
  if (a == null) return b - 1;
  if (b == null) return a + 1;
  return (a + b) / 2;
}

export default function OsPage() {
  const { templates, render } = useTemplates();
  const msgDoLembrete = (lead, lem) => (lem.tipo ? render(lem.tipo, primeiroNome(lead.nome), lem.varIdx ?? 0) : (lem.texto || "").replaceAll("{nome}", primeiroNome(lead.nome)));

  const [estado, setEstado] = useState({ carregando: true, configurado: false, erro: null, ordens: [] });
  const [lists, setLists] = useState([]);
  const [placement, setPlacement] = useState(new Map()); // osId -> { listId, ordem }
  const [osLeads, setOsLeads] = useState(new Map()); // osId -> { tags, observacoes, compras, lembretes } — mini-CRM próprio da OS
  const [leads, setLeads] = useState([]); // CRM geral, só pra saber quem já foi promovido
  const [busca, setBusca] = useState("");
  const [osDetalhe, setOsDetalhe] = useState(null); // OS bruta (equipamento/defeito/valor/status/brutos)
  const [modal, setModal] = useState(null); // modal do mini-CRM da OS (obs/agenda/compras/tags)
  const [menuOrdenar, setMenuOrdenar] = useState(false);
  const dragId = useRef(null);
  const dragListaRef = useRef(null);
  const [arrastandoCard, setArrastandoCard] = useState(null);
  const [dropCard, setDropCard] = useState(null); // { id, pos }
  const [pousouCard, setPousouCard] = useState(null);
  const [arrastandoLista, setArrastandoLista] = useState(null);
  const [dropLista, setDropLista] = useState(null); // { key, pos }
  const [expandido, alternarExpandido] = useModoExpandido();
  const { aoArrastarSobre, pararAutoScroll } = useAutoScrollDrag();

  function marcarPouso(id) {
    setPousouCard(id);
    setTimeout(() => setPousouCard((atual) => (atual === id ? null : atual)), 500);
  }

  function carregarTudo() {
    fetch("/api/os")
      .then((r) => r.json().then((j) => ({ status: r.status, j })))
      .then(({ status, j }) => {
        if (j.restrito) setEstado({ carregando: false, configurado: false, erro: null, restrito: true, ordens: [] });
        else if (status === 501) setEstado({ carregando: false, configurado: false, erro: null, ordens: [] });
        else if (j.error) setEstado({ carregando: false, configurado: !!j.configurado, erro: j.error, ordens: [] });
        else setEstado({ carregando: false, configurado: true, erro: null, ordens: j.ordens || [] });
      })
      .catch((e) => setEstado({ carregando: false, configurado: false, erro: String(e.message || e), ordens: [] }));

    fetch("/api/lists?board=os").then((r) => r.json()).then((j) => setLists(Array.isArray(j) ? j : [])).catch(() => {});
    fetch("/api/os-placement").then((r) => r.json()).then((j) => {
      if (Array.isArray(j)) setPlacement(new Map(j.map((p) => [p.osId, { listId: p.listId, ordem: p.ordem }])));
    }).catch(() => {});
    fetch("/api/os-leads").then((r) => r.json()).then((j) => {
      if (Array.isArray(j)) setOsLeads(new Map(j.map((d) => [d.osId, d])));
    }).catch(() => {});
    fetch("/api/leads").then((r) => r.json()).then((j) => setLeads(Array.isArray(j) ? j : [])).catch(() => {});
  }
  useEffect(() => { carregarTudo(); }, []);

  const leadsPorTelefone = useMemo(() => {
    const m = new Map();
    for (const l of leads) { const k = normalizaFone(l.telefone); if (k) m.set(k, l); }
    return m;
  }, [leads]);

  async function adicionarAoCrm(o) {
    const nome = campo(o.data, "cliente");
    const telefone = campo(o.data, "telefone");
    if (!telefone) { alert("Essa OS não tem telefone — não dá pra criar o cliente no CRM."); return; }
    const servico = [campo(o.data, "equipamento"), campo(o.data, "defeito")].filter(Boolean).join(" — ") || "Serviço via PDV";
    const r = await fetch("/api/leads", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, telefone, servico, listId: "inbox", tagListId: "sem_etiqueta", tags: [] }),
    });
    if (r.ok) { alert("Cliente adicionado ao CRM geral!"); carregarTudo(); }
    else alert("Não consegui adicionar — tenta de novo.");
  }

  // ---------- mini-CRM próprio da OS (observações/agenda/compras/etiquetas) ----------
  function pseudoLeadDe(osId, o) {
    const extra = osLeads.get(String(osId)) || {};
    return {
      nome: o ? campo(o.data, "cliente") : "",
      telefone: o ? campo(o.data, "telefone") : "",
      tags: extra.tags || [],
      observacoes: extra.observacoes || [],
      compras: extra.compras || [],
      lembretes: extra.lembretes || [],
    };
  }
  async function salvarOsLead(osId, lead) {
    const dados = { tags: lead.tags || [], observacoes: lead.observacoes || [], compras: lead.compras || [], lembretes: lead.lembretes || [] };
    setOsLeads((m) => new Map(m).set(String(osId), { osId: String(osId), ...dados }));
    await fetch("/api/os-leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ osId, ...dados }) });
  }
  // DISPARO: abre o WhatsApp com o texto escolhido. Por hora, só a Apresentação (D0) também
  // conta como enviada e move o card pra uma lista própria da estratégia neste board de OS.
  async function dispararEstrategiaOs(osId, o, tipo, texto) {
    const telefone = campo(o.data, "telefone");
    window.open(waLink(telefone, texto), "_blank");
    if (!TIPOS_COM_AUTOMACAO.includes(tipo)) return;

    const meta = STRATEGY_META.find((m) => m.tipo === tipo);
    const keyLista = "estrategia_" + tipo;
    if (!lists.some((l) => l.key === keyLista)) {
      await fetch("/api/lists", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome: (meta?.titulo || tipo).toUpperCase(), board: "os", key: keyLista }),
      });
      setLists((ls) => [...ls, { key: keyLista, nome: (meta?.titulo || tipo).toUpperCase(), ordem: ls.length, fixa: false, board: "os" }]);
    }
    await moverOs(osId, keyLista, Date.now());
    const lead = pseudoLeadDe(osId, o);
    const h = hoje();
    await salvarOsLead(osId, {
      ...lead,
      lembretes: [...(lead.lembretes || []), { id: "disp" + Date.now(), data: h, tipo, varIdx: 0, enviado: true, enviadoEm: h }],
    });
  }
  // liga/desliga "respondeu" no card da OS — grava no mini-CRM da OS (os_leads)
  async function alternarRespostaOs(osId, o) {
    const lead = pseudoLeadDe(osId, o);
    const jaTem = (lead.respostas || []).length > 0;
    await salvarOsLead(osId, { ...lead, respostas: jaTem ? [] : [{ data: hoje() }] });
  }

  // agenda D+7 (tudo funcionando?) e D+90 (revisão preventiva) no mini-CRM da OS
  async function ativarPosVenda(osId, o) {
    const lead = pseudoLeadDe(osId, o);
    const h = hoje();
    await salvarOsLead(osId, {
      ...lead,
      lembretes: [
        ...(lead.lembretes || []),
        { id: "pv7" + Date.now(), data: addDias(h, 7), tipo: "POS7", varIdx: 0, enviado: false },
        { id: "pv90" + Date.now(), data: addDias(h, 90), tipo: "POS90", varIdx: 0, enviado: false },
      ],
    });
  }

  // ---------- organização em listas + ordem dentro da coluna ----------
  async function moverOs(osId, listId, ordem) {
    setPlacement((m) => {
      const novo = new Map(m);
      const atual = novo.get(String(osId)) || {};
      novo.set(String(osId), { listId: listId ?? atual.listId, ordem: ordem ?? atual.ordem });
      return novo;
    });
    const body = { osId };
    if (listId !== undefined) body.listId = listId;
    if (ordem !== undefined) body.ordem = ordem;
    await fetch("/api/os-placement", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
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
  async function renomearLista(l) {
    const novoNome = prompt("Novo nome da lista:", l.nome);
    if (!novoNome || novoNome === l.nome) return;
    setLists((ls) => ls.map((x) => (x._id === l._id ? { ...x, nome: novoNome } : x)));
    await fetch("/api/lists", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _id: l._id, nome: novoNome }) });
  }
  async function moverListaParaPosicao(e, listaAlvo) {
    e.preventDefault(); e.stopPropagation();
    const keyOrigem = dragListaRef.current;
    dragListaRef.current = null;
    if (!keyOrigem || keyOrigem === listaAlvo.key) return;
    const origem = lists.find((l) => l.key === keyOrigem);
    if (!origem) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const antes = (e.clientX - rect.left) < rect.width / 2;
    const semOrigem = lists.filter((l) => l.key !== keyOrigem).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const idxAlvo = semOrigem.findIndex((l) => l.key === listaAlvo.key);
    const viz1 = antes ? semOrigem[idxAlvo - 1] : semOrigem[idxAlvo];
    const viz2 = antes ? semOrigem[idxAlvo] : semOrigem[idxAlvo + 1];
    const o1 = viz1?.ordem ?? null, o2 = viz2?.ordem ?? null;
    const novaOrdem = o1 == null && o2 == null ? Date.now() : o1 == null ? o2 - 1 : o2 == null ? o1 + 1 : (o1 + o2) / 2;
    setLists((ls) => ls.map((l) => (l.key === keyOrigem ? { ...l, ordem: novaOrdem } : l)).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
    await fetch("/api/lists", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ _id: origem._id, ordem: novaOrdem }) });
  }

  // organiza a ordem DENTRO de cada lista (nome / nº da O.S / data de abertura) — nunca move item de lista
  async function organizarPor(criterio, direcao) {
    setMenuOrdenar(false);
    const mult = direcao === "desc" ? -1 : 1;
    const comparadores = {
      nome: (a, b) => mult * campo(a.data, "cliente").localeCompare(campo(b.data, "cliente"), "pt-BR", { sensitivity: "base" }),
      os: (a, b) => mult * ((Number(a.id) - Number(b.id)) || String(a.id).localeCompare(String(b.id))),
      data: (a, b) => mult * (new Date(campo(a.data, "data") || 0) - new Date(campo(b.data, "data") || 0)),
    };
    const comparador = comparadores[criterio];
    const porLista = new Map();
    for (const o of estado.ordens) {
      const key = listaDe(o.id);
      if (!porLista.has(key)) porLista.set(key, []);
      porLista.get(key).push(o);
    }
    const tarefas = [];
    for (const itens of porLista.values()) {
      itens.sort(comparador);
      itens.forEach((o, i) => tarefas.push(moverOs(o.id, undefined, i)));
    }
    await Promise.all(tarefas);
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
  function listaDe(osId) { return placement.get(String(osId))?.listId || primeiraLista; }
  function ordemDe(osId) {
    const p = placement.get(String(osId));
    if (p && p.ordem != null) return p.ordem;
    const n = Number(osId);
    return isNaN(n) ? 0 : n;
  }

  const acoesTopbar = !estado.carregando && estado.configurado && !estado.erro && (
    <>
      <input type="text" placeholder="Buscar cliente, telefone, CPF ou equipamento…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <button className="btn" onClick={alternarExpandido} title={expandido ? "Voltar ao normal" : "Expandir quadro (mais espaço pras listas)"}>
        <Ico n={expandido ? "recolher" : "expandir"} size={15} /> <span className="btn-rotulo">{expandido ? "Recolher" : "Expandir"}</span>
      </button>
      <div className="dropdown-wrap">
        <button className="btn" onClick={() => setMenuOrdenar((v) => !v)}><Ico n="sort" size={15} /> Organizar</button>
        {menuOrdenar && (
          <>
            <div className="dropdown-fundo" onClick={() => setMenuOrdenar(false)} />
            <div className="dropdown-menu">
              <div className="dropdown-linha">
                <span>Nome</span>
                <button onClick={() => organizarPor("nome", "asc")} title="A → Z"><Ico n="arrowUp" size={14} /></button>
                <button onClick={() => organizarPor("nome", "desc")} title="Z → A"><Ico n="arrowDown" size={14} /></button>
              </div>
              <div className="dropdown-linha">
                <span>Nº da O.S</span>
                <button onClick={() => organizarPor("os", "asc")} title="Crescente"><Ico n="arrowUp" size={14} /></button>
                <button onClick={() => organizarPor("os", "desc")} title="Decrescente"><Ico n="arrowDown" size={14} /></button>
              </div>
              <div className="dropdown-linha">
                <span>Data de abertura</span>
                <button onClick={() => organizarPor("data", "asc")} title="Mais antiga primeiro"><Ico n="arrowUp" size={14} /></button>
                <button onClick={() => organizarPor("data", "desc")} title="Mais recente primeiro"><Ico n="arrowDown" size={14} /></button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <Layout titulo="OS" acoes={acoesTopbar}>
      {!expandido && (
      <div className="pagina" style={{ paddingBottom: 0 }}>
        <div className="pagina-titulo"><Ico n="wrench" size={20} /> Ordens de Serviço</div>
        <div className="pagina-sub">Cada OS já é um mini-CRM próprio (observações, agenda, compras, etiquetas) — use o ícone "+" no card pra também adicionar esse cliente ao CRM geral, se quiser. Listas abaixo são só sua organização, o PDV nunca é alterado.</div>
      </div>
      )}

      {estado.carregando && <div className="pagina">Carregando…</div>}

      {!estado.carregando && estado.restrito && (
        <div className="pagina">
          <div className="os-placeholder">
            <div className="icone-grande" style={{ background: "var(--accent-suave)", color: "var(--accent-forte)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico n="lock" size={26} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Disponível só na conta INFO Centro</h3>
            <p style={{ color: "var(--cinza)", fontSize: 13.5, lineHeight: 1.6 }}>
              A integração com o PDV (Ordens de Serviço) pertence à conta INFO Centro. Esta conta usa apenas o CRM.
            </p>
          </div>
        </div>
      )}

      {!estado.carregando && !estado.restrito && !estado.configurado && !estado.erro && (
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
        <div className="board">
          {lists.map((lista) => {
            const cards = ordensFiltradas.filter((o) => listaDe(o.id) === lista.key)
              .sort((a, b) => ordemDe(a.id) - ordemDe(b.id));
            const soma = cards.reduce((s, o) => s + numeroValor(campo(o.data, "valor")), 0);
            const classeLista = "lista"
              + (arrastandoLista === lista.key ? " lista-arrastando" : "")
              + (dropLista?.key === lista.key ? (dropLista.pos === "antes" ? " drop-antes" : " drop-depois") : "");
            return (
              <div key={lista.key} className={classeLista}
                onDragOver={(e) => { if (dragId.current) { e.preventDefault(); e.currentTarget.classList.add("drag-over"); } }}
                onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) e.currentTarget.classList.remove("drag-over"); }}
                onDrop={(e) => {
                  e.currentTarget.classList.remove("drag-over");
                  pararAutoScroll();
                  const id = dragId.current;
                  if (!id) return;
                  const semOrigem = cards.filter((c) => String(c.id) !== String(id));
                  const maxOrdem = semOrigem.length ? Math.max(...semOrigem.map((c) => ordemDe(c.id))) : 0;
                  moverOs(id, lista.key, maxOrdem + 1);
                  marcarPouso(id); setDropCard(null);
                }}>
                <div className="lista-head" draggable
                  onDragStart={(e) => { e.stopPropagation(); dragListaRef.current = lista.key; setArrastandoLista(lista.key); }}
                  onDragEnd={() => { setArrastandoLista(null); setDropLista(null); }}
                  onDragOver={(e) => {
                    e.preventDefault(); e.stopPropagation();
                    if (!dragListaRef.current || dragListaRef.current === lista.key) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const antes = (e.clientX - rect.left) < rect.width / 2;
                    setDropLista({ key: lista.key, pos: antes ? "antes" : "depois" });
                  }}
                  onDrop={(e) => { moverListaParaPosicao(e, lista); setArrastandoLista(null); setDropLista(null); }}>
                  <Ico n="gripVertical" size={14} className="arrasta-lista" />
                  <span className="titulo">{lista.nome}</span>
                  <span className="qtd">{cards.length}</span>
                  {soma > 0 && <span className="soma">{fmtValor(soma)}</span>}
                  <MenuLista acoes={[
                    { label: "Renomear lista", icone: "edit", onClick: () => renomearLista(lista) },
                    ...(!lista.fixa ? [{ label: "Excluir lista", icone: "trash", onClick: () => excluirLista(lista), perigo: true }] : []),
                  ]} />
                </div>

                <div className="lista-corpo" onDragOver={(e) => { if (dragId.current) aoArrastarSobre(e); }}>
                {cards.map((o) => {
                  const telefone = campo(o.data, "telefone");
                  const leadCRM = telefone ? leadsPorTelefone.get(normalizaFone(telefone)) : null;
                  return (
                    <CardOs key={o.id} o={o} osLead={pseudoLeadDe(o.id, o)}
                      leadCRM={leadCRM}
                      dragging={arrastandoCard === String(o.id)}
                      dropPos={dropCard?.id === String(o.id) ? dropCard.pos : null}
                      pousou={pousouCard === String(o.id)}
                      onDragStart={() => { dragId.current = String(o.id); setArrastandoCard(String(o.id)); }}
                      onDragEnd={() => { setArrastandoCard(null); setDropCard(null); pararAutoScroll(); }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        const idOrigem = dragId.current;
                        if (!idOrigem || String(idOrigem) === String(o.id)) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const antes = (e.clientY - rect.top) < rect.height / 2;
                        setDropCard({ id: String(o.id), pos: antes ? "antes" : "depois" });
                      }}
                      onDrop={(e) => {
                        e.preventDefault(); e.stopPropagation();
                        pararAutoScroll();
                        const idOrigem = dragId.current;
                        setDropCard(null);
                        if (!idOrigem || String(idOrigem) === String(o.id)) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const antes = (e.clientY - rect.top) < rect.height / 2;
                        const semOrigem = cards.filter((c) => String(c.id) !== String(idOrigem));
                        const idxAlvo = semOrigem.findIndex((c) => String(c.id) === String(o.id));
                        const viz1 = antes ? semOrigem[idxAlvo - 1] : semOrigem[idxAlvo];
                        const viz2 = antes ? semOrigem[idxAlvo] : semOrigem[idxAlvo + 1];
                        const novaOrdem = ordemEntre(viz1 ? ordemDe(viz1.id) : null, viz2 ? ordemDe(viz2.id) : null);
                        moverOs(idOrigem, lista.key, novaOrdem);
                        marcarPouso(idOrigem);
                      }}
                      abrir={(tipo) => setModal({ tipo, osId: o.id, o })}
                      abrirOs={() => setOsDetalhe(o)}
                      promover={() => adicionarAoCrm(o)}
                      ativarPosVenda={() => ativarPosVenda(String(o.id), o)}
                      alternarResposta={() => alternarRespostaOs(String(o.id), o)}
                      zapDireto={() => window.open(waLink(telefone), "_blank")} />
                  );
                })}
                </div>
              </div>
            );
          })}
          <button className="add-lista" onClick={novaLista}><Ico n="plus" size={16} /> Nova lista</button>
        </div>
      )}

      {/* mini-CRM da OS — observações/agenda/compras/etiquetas, independente do CRM geral */}
      {modal && (
        <Modal fechar={() => setModal(null)}>
          {modal.tipo === "obs" && <ModalObs lead={pseudoLeadDe(modal.osId, modal.o)} salvar={(l) => salvarOsLead(modal.osId, l)} />}
          {modal.tipo === "agenda" && <ModalAgenda lead={pseudoLeadDe(modal.osId, modal.o)} salvar={(l) => salvarOsLead(modal.osId, l)} enviar={(lead, texto) => window.open(waLink(lead.telefone, texto), "_blank")} templates={templates} msgDoLembrete={msgDoLembrete} />}
          {modal.tipo === "compras" && <ModalCompras lead={pseudoLeadDe(modal.osId, modal.o)} salvar={(l) => salvarOsLead(modal.osId, l)} />}
          {modal.tipo === "tags" && <ModalTags lead={pseudoLeadDe(modal.osId, modal.o)} salvar={(l) => salvarOsLead(modal.osId, l)} />}
          {modal.tipo === "disparo" && <ModalDisparo lead={pseudoLeadDe(modal.osId, modal.o)} templates={templates} render={render} enviar={(lead, tipo, texto) => { dispararEstrategiaOs(modal.osId, modal.o, tipo, texto); setModal(null); }} />}
        </Modal>
      )}

      {/* dados da própria OS (equipamento, defeito, valor, status, brutos) */}
      {osDetalhe && (
        <Modal fechar={() => setOsDetalhe(null)}>
          <h2><Ico n="wrench" /> OS #{osDetalhe.id}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {ORDEM_CAMPOS.map((chave) => {
              const v = campo(osDetalhe.data, chave);
              if (!v) return null;
              return (
                <div key={chave} className="linha-item">
                  <span className="data" style={{ minWidth: 130 }}>{LABELS_CAMPOS[chave] || chave}</span>
                  <span className="desc">{chave === "valor" ? fmtValor(v) : CAMPOS_DATA.has(chave) ? fmtDataHora(v) : v}</span>
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

// ---------- card da OS: seu próprio mini-CRM (obs/agenda/whatsapp/compras/etiquetas), no mesmo padrão do CRM geral ----------
function CardOs({ o, osLead, leadCRM, abrir, abrirOs, promover, ativarPosVenda, alternarResposta, zapDireto, onDragStart, onDragOver, onDrop, onDragEnd, dragging, dropPos, pousou }) {
  const cliente = campo(o.data, "cliente") || "sem nome";
  const telefone = campo(o.data, "telefone");
  const equipamento = campo(o.data, "equipamento");
  const defeito = campo(o.data, "defeito");
  const servicos = campo(o.data, "servicos");
  const status = campo(o.data, "status");
  const valor = campo(o.data, "valor");
  const pendentes = (osLead.lembretes || []).filter((l) => !l.enviado).length;
  const totalCompras = (osLead.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const temPosVenda = (osLead.lembretes || []).some((l) => l.tipo === "POS7" || l.tipo === "POS90");
  const enviadas = (osLead.lembretes || []).filter((l) => l.enviado).length;
  const respondeu = (osLead.respostas || []).length > 0;
  const classe = "card"
    + (dragging ? " card-arrastando" : "")
    + (dropPos === "antes" ? " drop-antes" : dropPos === "depois" ? " drop-depois" : "")
    + (pousou ? " card-pousou" : "");
  return (
    <div className={classe} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      <div className="nome" style={{ cursor: "pointer" }} onClick={abrirOs}>{o.id} - {cliente}</div>
      {equipamento && <div className="servico"><Ico n="laptop" className="servico-ico" /><span>{equipamento}</span></div>}
      {defeito && <div className="servico"><Ico n="alerta" className="servico-ico" /><span>{defeito}</span></div>}
      {servicos && <div className="servico"><Ico n="clipboardCheck" className="servico-ico" /><span>{servicos}</span></div>}
      <div className="tags">
        {status && <span className="tag-chip" style={{ background: corStatus(status) }}>{status}</span>}
        {valor ? <span className="tag-chip" style={{ background: "var(--accent-forte)" }}>{fmtValor(valor)}</span> : null}
        {temPosVenda && <span className="tag-chip" style={{ background: "#0e7490" }}>pós-venda ✓</span>}
      </div>
      {foiEntregue(status) && !temPosVenda && telefone && (
        <button className="btn-posvenda" onClick={ativarPosVenda} title="Agendar mensagens de pós-venda: D+7 (tudo funcionando?) e D+90 (revisão preventiva)">
          <Ico n="clock" size={13} /> Ativar pós-venda
        </button>
      )}
      <div className="icones">
        <button className="icone-btn" title="Observações" onClick={() => abrir("obs")}>
          <Ico n="fileText" />{(osLead.observacoes || []).length > 0 && <span className="mini-badge">{osLead.observacoes.length}</span>}
        </button>
        <button className="icone-btn" title="Agenda de mensagens" onClick={() => abrir("agenda")}>
          <Ico n="calendar" />{pendentes > 0 && <span className="mini-badge alerta">{pendentes}</span>}
        </button>
        <button className="icone-btn zap-btn" title="Abrir WhatsApp" onClick={zapDireto}><IcoZap /></button>
        <button className="icone-btn" title="Compras e gastos" onClick={() => abrir("compras")}>
          <Ico n="dollar" />{totalCompras > 0 && <span className="mini-badge">{Math.round(totalCompras)}</span>}
        </button>
        <button className="icone-btn" title="Etiquetas" onClick={() => abrir("tags")}><Ico n="tag" /></button>
        {leadCRM ? (
          <Link href={`/?tel=${encodeURIComponent(telefone)}`} className="icone-btn" title="Já está no CRM geral — abrir lá"><Ico n="check" /></Link>
        ) : (
          <button className="icone-btn" title="Adicionar ao CRM geral" onClick={promover}><Ico n="plus" /></button>
        )}
      </div>
      <div className="card-rodape">
        <button className="btn-disparo" onClick={() => abrir("disparo")}><Ico n="send" size={14} /> DISPARO</button>
        {/* só aparece depois que existe pelo menos um envio — antes disso não há o que responder */}
        {enviadas > 0 && alternarResposta && (
          <button
            className={"toggle-resposta" + (respondeu ? " ligado" : "")}
            onClick={alternarResposta}
            title={respondeu ? "Cliente respondeu — clique para desmarcar" : "Sem resposta — clique para marcar que respondeu"}>
            <span className="toggle-trilho"><span className="toggle-bolinha" /></span>
            <span className="toggle-texto">{respondeu ? "respondeu" : "sem resposta"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
