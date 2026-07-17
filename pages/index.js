import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/router";
import Layout from "../components/Layout";
import { Card, Modal, ModalImportar, ModalEditar, ModalObs, ModalAgenda, ModalCompras, ModalTags, novaCadencia } from "../components/CardKit";
import { Ico, IcoZap } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { TAGS, hoje, addDias, fmtBR, fmtDinheiro, normalizaFone, waLink, primeiroNome, ehAniversarioHoje } from "../lib/crmHelpers";

function msgDoLembreteFactory(render) {
  return function msgDoLembrete(lead, lem) {
    if (lem.tipo) return render(lem.tipo, primeiroNome(lead.nome), lem.varIdx ?? 0);
    return (lem.texto || "").replaceAll("{nome}", primeiroNome(lead.nome));
  };
}

export default function CrmPage() {
  const { templates, render } = useTemplates();
  const msgDoLembrete = msgDoLembreteFactory(render);
  const router = useRouter();

  const [leads, setLeads] = useState([]);
  const [lists, setLists] = useState([]);
  const [busca, setBusca] = useState("");
  const [modal, setModal] = useState(null);
  const [painelAberto, setPainelAberto] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [erroConexao, setErroConexao] = useState(null);
  const fileRef = useRef(null);
  const [importOpts, setImportOpts] = useState({ cadencia: true });
  const dragId = useRef(null);

  async function carregar() {
    try {
      const [r1, r2] = await Promise.all([fetch("/api/leads"), fetch("/api/lists?board=crm")]);
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

  // chegou aqui vindo da tela OS com ?tel=... — já filtra pelo cliente
  useEffect(() => {
    if (router.isReady && router.query.tel) setBusca(String(router.query.tel));
  }, [router.isReady, router.query.tel]);

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
    salvarLead({ ...lead, lembretes: lead.lembretes.map((l) => (l.id === lem.id ? { ...l, enviado: true } : l)) });
  }
  function marcarNiverFeito(lead) {
    salvarLead({ ...lead, lembretes: [...(lead.lembretes || []), { id: "n" + Date.now(), data: hoje(), tipo: "ANIVERSARIO", varIdx: 0, enviado: true }] });
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
        tagListId: "sem_etiqueta",
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

  async function limparTudo() {
    if (leads.length === 0) { alert("Já não há clientes cadastrados no CRM."); return; }
    const passo1 = confirm(
      `Isso vai apagar PERMANENTEMENTE os ${leads.length} clientes do CRM (cards, observações, compras, mensagens agendadas).\n\n` +
      `NÃO afeta a página OS (que é só um espelho do PDV, não fica salvo aqui).\n\n` +
      `Recomendo clicar em "Backup" antes, se ainda não fez. Quer continuar?`
    );
    if (!passo1) return;
    const digitado = prompt('Última confirmação: digite APAGAR (tudo maiúsculo) para excluir todos os clientes.');
    if (digitado !== "APAGAR") { if (digitado !== null) alert("Não bateu com \"APAGAR\" — nada foi apagado."); return; }
    const r = await fetch("/api/leads?all=1&confirmar=APAGAR", { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert("Não consegui limpar: " + (j.error || r.status)); return; }
    setLeads([]);
    alert(`${j.apagados ?? 0} cliente(s) apagado(s). O CRM está zerado.`);
  }

  async function novaLista() {
    const nome = prompt("Nome da nova lista:");
    if (!nome) return;
    await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome, board: "crm" }) });
    carregar();
  }
  async function excluirLista(l) {
    if (!confirm("Excluir a lista " + l.nome + "?")) return;
    const r = await fetch(`/api/lists?_id=${l._id}&key=${l.key}&board=crm`, { method: "DELETE" });
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
    <Layout titulo="CRM">
      {carregando && <div style={{ padding: 40, textAlign: "center" }}>Carregando CRM…</div>}
      {!carregando && erroConexao && (
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
      )}
      {!carregando && !erroConexao && (
        <>
          <div className="toolbar">
            <input type="text" placeholder="Buscar nome, telefone, serviço ou etiqueta…" value={busca} onChange={(e) => setBusca(e.target.value)} />
            <span className="espaco" />
            <button className="btn2" onClick={() => setModal({ tipo: "novo" })}><Ico n="plus" size={15} /> Cliente</button>
            <button className="btn2" onClick={() => setModal({ tipo: "importar" })}><Ico n="upload" size={15} /> Importar</button>
            <button className="btn2 primario" onClick={exportar}><Ico n="download" size={15} /> Backup</button>
            <button className="btn2 perigo" onClick={limparTudo} title="Apaga todos os clientes do CRM (não afeta a página OS)"><Ico n="trash" size={15} /> Limpar dados</button>
          </div>

          <div className="painel-hoje">
            <div className="ph-head" onClick={() => setPainelAberto(!painelAberto)}>
              <Ico n="inbox" /> Enviar hoje {pendencias.length > 0 && <span className="ph-badge">{pendencias.length}</span>}
              <span style={{ marginLeft: "auto", fontSize: 12 }}>{painelAberto ? "▲" : "▼"}</span>
            </div>
            {painelAberto && (
              <div>
                {pendencias.length === 0 && <div className="ph-item vazio">Nenhuma mensagem pendente — tudo em dia!</div>}
                {pendencias.map((p, i) => {
                  const texto = p.niver ? render("ANIVERSARIO", primeiroNome(p.lead.nome), 0) : msgDoLembrete(p.lead, p.lem);
                  return (
                    <div className="ph-item" key={i}>
                      <span className={"tipo " + (p.niver ? "niver" : p.atrasado ? "atrasado" : "")}>
                        {p.niver ? "ANIVERSÁRIO" : (p.atrasado ? "ATRASADA · " : "") + (p.lem.tipo && templates[p.lem.tipo] ? p.lem.tipo.replace("D", "D+") : "PERSONALIZADA")}
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

          {modal && (
            <Modal fechar={() => setModal(null)}>
              {modal.tipo === "importar" && <ModalImportar opts={importOpts} setOpts={setImportOpts} fileRef={fileRef} onFile={importarArquivo} />}
              {modal.tipo === "novo" && <ModalEditar lead={null} onSalvar={async (dados) => {
                await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...dados, listId: "inbox", tagListId: "sem_etiqueta", tags: [], lembretes: dados.cadencia ? novaCadencia(hoje()) : [] }) });
                setModal(null); carregar();
              }} />}
              {modal.tipo === "editar" && <ModalEditar lead={leads.find((l) => l._id === modal.lead._id)} onSalvar={(dados) => { salvarLead({ ...modal.lead, ...dados }); setModal(null); }} onExcluir={() => excluirLead(modal.lead._id)} />}
              {modal.tipo === "obs" && <ModalObs lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
              {modal.tipo === "agenda" && <ModalAgenda lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} enviar={abrirZapComMsg} templates={templates} msgDoLembrete={msgDoLembrete} />}
              {modal.tipo === "compras" && <ModalCompras lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
              {modal.tipo === "tags" && <ModalTags lead={leads.find((l) => l._id === modal.lead._id)} salvar={salvarLead} />}
            </Modal>
          )}
        </>
      )}
    </Layout>
  );
}
