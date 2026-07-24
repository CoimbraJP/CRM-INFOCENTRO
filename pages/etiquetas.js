import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { Card, Modal, ModalEditar, ModalObs, ModalAgenda, ModalCompras, ModalTags, ModalDisparo } from "../components/CardKit";
import { Ico } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { useTags } from "../lib/TagsContext";
import { STRATEGY_META } from "../lib/messages";
import { hoje, waLink, primeiroNome, fmtDinheiro } from "../lib/crmHelpers";
import { useModoExpandido } from "../lib/useModoExpandido";

// por hora, só a Apresentação (D0) conta como enviada automaticamente e move o card pra uma
// lista própria da estratégia (no board do CRM) — as demais o usuário liga depois.
const TIPOS_COM_AUTOMACAO = ["D0"];

// Etiquetas é só uma tela de visualização: cada coluna é uma etiqueta cadastrada em
// Configurações (nada de criar/renomear/excluir coluna nem arrastar cliente pra mudar isso).
// Um cliente aparece em toda coluna cuja etiqueta ele tiver marcada — pra editar as etiquetas
// de um cliente, usa o botão de etiqueta no card (mesmo de sempre).
export default function EtiquetasPage() {
  const { templates, render } = useTemplates();
  const { tags: TAGS, carregado: tagsCarregado } = useTags();
  const msgDoLembrete = (lead, lem) => (lem.tipo ? render(lem.tipo, primeiroNome(lead.nome), lem.varIdx ?? 0) : (lem.texto || "").replaceAll("{nome}", primeiroNome(lead.nome)));

  const [leads, setLeads] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [expandido, alternarExpandido] = useModoExpandido();

  async function carregar() {
    const r = await fetch("/api/leads");
    const j = await r.json().catch(() => []);
    setLeads(Array.isArray(j) ? j : []);
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
  // (esta tela é a de Etiquetas — não tem lista própria aqui, é só visualização).
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

  const leadsFiltrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter((l) => {
      const tagsNomes = (l.tags || []).map((t) => TAGS.find((x) => x.id === t)?.nome || "").join(" ");
      return (l.nome + " " + l.telefone + " " + l.servico + " " + tagsNomes).toLowerCase().includes(q);
    });
  }, [leads, busca, TAGS]);

  // colunas = etiquetas cadastradas (nessa ordem) + uma coluna fixa "Sem etiqueta" no final
  const semEtiqueta = useMemo(() => leadsFiltrados.filter((l) => (l.tags || []).length === 0), [leadsFiltrados]);

  return (
    <Layout titulo="Etiquetas">
      {carregando || !tagsCarregado ? (
        <div style={{ padding: 40, textAlign: "center" }}>Carregando…</div>
      ) : (
        <>
          {!expandido && (
          <div className="pagina" style={{ paddingBottom: 0 }}>
            <div className="pagina-titulo"><Ico n="tag" size={20} /> Etiquetas</div>
            <div className="pagina-sub">Só visualização — cada coluna é uma etiqueta cadastrada em Configurações. Um cliente aparece em todas as colunas das etiquetas que ele tiver. Pra marcar ou desmarcar uma etiqueta, usa o botão de etiqueta no card.</div>
          </div>
          )}
          <div className="toolbar" style={{ paddingTop: 0 }}>
            <input type="text" placeholder="Buscar nome, telefone ou etiqueta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <button className="btn" onClick={alternarExpandido} title={expandido ? "Voltar ao normal" : "Expandir quadro (mais espaço pras listas)"}>
              <Ico n={expandido ? "recolher" : "expandir"} size={15} /> <span className="btn-rotulo">{expandido ? "Recolher" : "Expandir"}</span>
            </button>
          </div>

          <div className={"board" + (expandido ? " board-expandido" : "")}>
            {TAGS.map((tag) => {
              const cards = leadsFiltrados.filter((l) => (l.tags || []).includes(tag.id));
              const soma = cards.reduce((s, l) => s + (l.compras || []).reduce((a, c) => a + (Number(c.valor) || 0), 0), 0);
              return (
                <div key={tag.id} className="lista" style={{ borderTopColor: tag.cor }}>
                  <div className="lista-head">
                    <span className="titulo">{tag.nome}</span>
                    <span className="qtd">{cards.length}</span>
                    <span className="soma">{soma > 0 ? fmtDinheiro(soma) : ""}</span>
                  </div>
                  <div className="lista-corpo">
                  {cards.map((lead) => (
                    <Card key={lead._id} lead={lead}
                      abrir={(tipo) => setModal({ tipo, lead })}
                      alternarResposta={alternarResposta}
                      zapDireto={() => window.open(waLink(lead.telefone), "_blank")} />
                  ))}
                  {cards.length === 0 && <div className="vazio">Nenhum cliente com essa etiqueta.</div>}
                  </div>
                </div>
              );
            })}
            <div className="lista">
              <div className="lista-head">
                <span className="titulo">Sem etiqueta</span>
                <span className="qtd">{semEtiqueta.length}</span>
              </div>
              <div className="lista-corpo">
              {semEtiqueta.map((lead) => (
                <Card key={lead._id} lead={lead}
                  abrir={(tipo) => setModal({ tipo, lead })}
                  alternarResposta={alternarResposta}
                  zapDireto={() => window.open(waLink(lead.telefone), "_blank")} />
              ))}
              {semEtiqueta.length === 0 && <div className="vazio">Todo mundo já tem etiqueta.</div>}
              </div>
            </div>
          </div>

          {modal && (
            <Modal fechar={() => setModal(null)}>
              {modal.tipo === "editar" && <ModalEditar lead={leads.find((l) => l._id === modal.lead._id)} onSalvar={(dados) => { salvarLead({ ...modal.lead, ...dados }); setModal(null); }} onExcluir={() => excluirLead(modal.lead._id)} />}
              {modal.tipo === "obs" && <ModalObs lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
              {modal.tipo === "agenda" && <ModalAgenda lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} enviar={abrirZapComMsg} templates={templates} msgDoLembrete={msgDoLembrete} />}
              {modal.tipo === "compras" && <ModalCompras lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
              {modal.tipo === "tags" && <ModalTags lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
              {modal.tipo === "disparo" && <ModalDisparo lead={leads.find((l) => l._id === modal.lead._id)} templates={templates} render={render} enviar={(lead, tipo, texto) => { dispararEstrategia(lead, tipo, texto); setModal(null); }} />}
            </Modal>
          )}
        </>
      )}
    </Layout>
  );
}
