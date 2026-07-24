import { useEffect, useMemo, useRef, useState } from "react";
import Layout from "../components/Layout";
import { Card, Modal, ModalEditar, ModalObs, ModalAgenda, ModalCompras, ModalTags, ModalDisparo } from "../components/CardKit";
import { Ico } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { useTags } from "../lib/TagsContext";
import { STRATEGY_META } from "../lib/messages";
import { hoje, waLink, primeiroNome, fmtDinheiro } from "../lib/crmHelpers";

// por hora, só a Apresentação (D0) conta como enviada automaticamente e move o card pra uma
// lista própria da estratégia (no board do CRM) — as demais o usuário liga depois.
const TIPOS_COM_AUTOMACAO = ["D0"];

export default function EtiquetasPage() {
  const { templates, render } = useTemplates();
  const { tags: TAGS } = useTags();
  const msgDoLembrete = (lead, lem) => (lem.tipo ? render(lem.tipo, primeiroNome(lead.nome), lem.varIdx ?? 0) : (lem.texto || "").replaceAll("{nome}", primeiroNome(lead.nome)));

  const [leads, setLeads] = useState([]);
  const [lists, setLists] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const dragId = useRef(null);

  async function carregar() {
    const [r1, r2] = await Promise.all([fetch("/api/leads"), fetch("/api/lists?board=tags")]);
    const l1 = await r1.json().catch(() => []);
    const l2 = await r2.json().catch(() => []);
    setLeads(Array.isArray(l1) ? l1 : []);
    setLists(Array.isArray(l2) ? l2 : []);
    setCarregando(false);
  }
  useEffect(() => { carregar(); }, []);

  async function salvarLead(lead) {
    setLeads((ls) => ls.map((x) => (x._id === lead._id ? lead : x)));
    await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
  }
  async function excluirLead(id) {
    if (!confirm("Excluir este cliente definitivamente?")) return;
    setLeads((ls) => ls.filter((x) => x._id !== id));
    setModal(null);
    await fetch("/api/leads?_id=" + id, { method: "DELETE" });
  }
  function abrirZapComMsg(lead, texto) {
    window.open(waLink(lead.telefone, texto), "_blank");
  }

  // DISPARO: abre o WhatsApp com o texto escolhido. Por hora, só a Apresentação (D0) também
  // conta como enviada e move o card pra uma lista própria da estratégia no board do CRM
  // (esta tela é a de Etiquetas — o listId movido é o do quadro CRM, não afeta a coluna aqui).
  async function dispararEstrategia(lead, tipo, texto) {
    window.open(waLink(lead.telefone, texto), "_blank");
    if (!TIPOS_COM_AUTOMACAO.includes(tipo)) return;

    const meta = STRATEGY_META.find((m) => m.tipo === tipo);
    const keyLista = "estrategia_" + tipo;
    await fetch("/api/lists", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome: (meta?.titulo || tipo).toUpperCase(), board: "crm", key: keyLista }),
    });
    const h = hoje();
    salvarLead({
      ...lead,
      listId: keyLista,
      ordem: Date.now(),
      lembretes: [...(lead.lembretes || []), { id: "disp" + Date.now(), data: h, tipo, varIdx: 0, enviado: true, enviadoEm: h }],
    });
  }

  // liga/desliga "respondeu" direto no card. Ligar registra a resposta de hoje; desligar limpa
  // todas (o que interessa é o booleano — o array alimenta as Métricas e a regra "sem resposta 2x").
  function alternarResposta(lead) {
    const jaTem = (lead.respostas || []).length > 0;
    salvarLead({ ...lead, respostas: jaTem ? [] : [{ data: hoje() }] });
  }

  // arrastar pra uma coluna de etiqueta também aplica a tag no cliente (sincronizado com os chips do CRM)
  function moverParaColuna(lead, lista) {
    const novo = { ...lead, tagListId: lista.key };
    if (lista.tagId && !(novo.tags || []).includes(lista.tagId)) {
      novo.tags = [...(novo.tags || []), lista.tagId];
    }
    salvarLead(novo);
  }

  async function novaLista() {
    const nome = prompt("Nome da nova coluna de etiqueta:");
    if (!nome) return;
    await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, board: "tags" }) });
    carregar();
  }
  async function excluirLista(l) {
    if (!confirm("Excluir a coluna " + l.nome + "?")) return;
    const r = await fetch(`/api/lists?_id=${l._id}&key=${l.key}&board=tags`, { method: "DELETE" });
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

  return (
    <Layout titulo="Etiquetas">
      {carregando ? (
        <div style={{ padding: 40, textAlign: "center" }}>Carregando…</div>
      ) : (
        <>
          <div className="pagina" style={{ paddingBottom: 0 }}>
            <div className="pagina-titulo"><Ico n="tag" size={20} /> Etiquetas</div>
            <div className="pagina-sub">Quadro separado do CRM — arraste um cliente pra uma coluna e a etiqueta é aplicada automaticamente no card dele.</div>
          </div>
          <div className="toolbar" style={{ paddingTop: 0 }}>
            <input type="text" placeholder="Buscar nome, telefone ou etiqueta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          </div>

          <div className="board">
            {lists.map((lista) => {
              const cards = leadsFiltrados.filter((l) => (l.tagListId || "sem_etiqueta") === lista.key);
              const soma = cards.reduce((s, l) => s + (l.compras || []).reduce((a, c) => a + (Number(c.valor) || 0), 0), 0);
              return (
                <div key={lista.key} className="lista"
                  style={lista.cor ? { borderTopColor: lista.cor } : undefined}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag-over"); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
                  onDrop={(e) => {
                    e.currentTarget.classList.remove("drag-over");
                    const id = dragId.current;
                    const lead = leads.find((x) => x._id === id);
                    if (lead) moverParaColuna(lead, lista);
                  }}>
                  <div className="lista-head">
                    <span className="titulo">{lista.nome}</span>
                    <span className="qtd">{cards.length}</span>
                    <span className="soma">{soma > 0 ? fmtDinheiro(soma) : ""}</span>
                    {!lista.fixa && <button className="x" title="Excluir coluna" onClick={() => excluirLista(lista)}><Ico n="x" size={14} /></button>}
                  </div>
                  <div className="lista-corpo">
                  {cards.map((lead) => (
                    <Card key={lead._id} lead={lead}
                      onDragStart={() => (dragId.current = lead._id)}
                      abrir={(tipo) => setModal({ tipo, lead })}
                      alternarResposta={alternarResposta}
                      zapDireto={() => window.open(waLink(lead.telefone), "_blank")} />
                  ))}
                  </div>
                </div>
              );
            })}
            <button className="add-lista" onClick={novaLista}><Ico n="plus" size={16} /> Nova coluna</button>
          </div>

          {modal && (
            <Modal fechar={() => setModal(null)}>
              {modal.tipo === "editar" && <ModalEditar lead={leads.find((l) => l._id === modal.lead._id)} onSalvar={(dados) => { salvarLead({ ...modal.lead, ...dados }); setModal(null); }} onExcluir={() => excluirLead(modal.lead._id)} />}
              {modal.tipo === "obs" && <ModalObs lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
              {modal.tipo === "agenda" && <ModalAgenda lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} enviar={abrirZapComMsg} templates={templates} msgDoLembrete={msgDoLembrete} />}
              {modal.tipo === "compras" && <ModalCompras lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
              {modal.tipo === "tags" && <ModalTags lead={leads.find((l) => l._id === modal.lead._id)} salvar={(novo) => {
                // se desmarcar a tag que corresponde à coluna atual, devolve o card pra "sem etiqueta"
                const listaAtual = lists.find((x) => x.key === novo.tagListId);
                if (listaAtual?.tagId && !(novo.tags || []).includes(listaAtual.tagId)) novo.tagListId = "sem_etiqueta";
                salvarLead(novo);
              }} />}
              {modal.tipo === "disparo" && <ModalDisparo lead={leads.find((l) => l._id === modal.lead._id)} templates={templates} render={render} enviar={(lead, tipo, texto) => { dispararEstrategia(lead, tipo, texto); setModal(null); }} />}
            </Modal>
          )}
        </>
      )}
    </Layout>
  );
}
