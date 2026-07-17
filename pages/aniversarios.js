import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { Ico, IcoZap } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { diasAteAniversario, primeiroNome, waLink, hoje } from "../lib/crmHelpers";

export default function AniversariosPage() {
  const { render } = useTemplates();
  const [leads, setLeads] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch("/api/leads").then((r) => r.json()).then((j) => { setLeads(Array.isArray(j) ? j : []); setCarregando(false); });
  }, []);

  async function salvarLead(lead) {
    setLeads((ls) => ls.map((x) => (x._id === lead._id ? lead : x)));
    await fetch("/api/leads", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(lead) });
  }
  function marcarParabensEnviado(lead) {
    salvarLead({ ...lead, lembretes: [...(lead.lembretes || []), { id: "n" + Date.now(), data: hoje(), tipo: "ANIVERSARIO", varIdx: 0, enviado: true }] });
  }
  function jaEnviouHoje(lead) {
    const h = hoje();
    return (lead.lembretes || []).some((l) => l.tipo === "ANIVERSARIO" && l.data === h && l.enviado);
  }

  const lista = useMemo(() => {
    return leads
      .map((l) => ({ lead: l, dias: diasAteAniversario(l) }))
      .filter((x) => x.dias !== null)
      .sort((a, b) => a.dias - b.dias);
  }, [leads]);

  function chip(dias) {
    if (dias === 0) return { cls: "hoje", label: "Hoje 🎂" };
    if (dias <= 7) return { cls: "semana", label: `Em ${dias} dia${dias > 1 ? "s" : ""}` };
    if (dias <= 31) return { cls: "mes", label: `Em ${dias} dias` };
    return { cls: "mes", label: `Em ${dias} dias` };
  }

  return (
    <Layout titulo="Aniversários">
      <div className="pagina">
        <div className="pagina-titulo"><Ico n="cake" size={20} /> Aniversários</div>
        <div className="pagina-sub">Clientes ordenados pelo próximo aniversário — manda parabéns direto pelo WhatsApp.</div>

        {carregando ? (
          <div>Carregando…</div>
        ) : lista.length === 0 ? (
          <div className="vazio">Nenhum cliente com data de nascimento cadastrada ainda. Preencha esse campo no card do CRM (ícone de editar).</div>
        ) : (
          <div className="lista-aniversarios">
            {lista.map(({ lead, dias }) => {
              const c = chip(dias);
              const texto = render("ANIVERSARIO", primeiroNome(lead.nome), 0);
              const enviado = jaEnviouHoje(lead);
              return (
                <div className="linha-niver" key={lead._id}>
                  <div className="avatar">{(lead.nome || "?").charAt(0).toUpperCase()}</div>
                  <div className="infos">
                    <div className="nome">{lead.nome || lead.telefone}</div>
                    <div className="quando">{lead.telefone}</div>
                  </div>
                  <span className={"chip-quando " + c.cls}>{c.label}</span>
                  {dias === 0 && !enviado && (
                    <button className="btn2 zap" onClick={() => window.open(waLink(lead.telefone, texto), "_blank")}><IcoZap size={15} /> Parabenizar</button>
                  )}
                  {dias === 0 && enviado && (
                    <span className="btn2" style={{ opacity: .6 }}><Ico n="check" size={14} /> Enviado hoje</span>
                  )}
                  {dias === 0 && !enviado && (
                    <button className="btn2" onClick={() => marcarParabensEnviado(lead)}><Ico n="check" size={14} /></button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
