import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { Ico, IcoZap } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { fmtBR, primeiroNome, waLink, partesNascimento, hoje, addDias } from "../lib/crmHelpers";
import { useCalendarioLateral } from "../lib/useCalendarioLateral";

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const DOW = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function isoLocal(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export default function CalendarioPage() {
  const { render } = useTemplates();
  const [leads, setLeads] = useState([]);
  const [listas, setListas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const hoje0 = new Date(); hoje0.setHours(0, 0, 0, 0);
  const [ano, setAno] = useState(hoje0.getFullYear());
  const [mes, setMes] = useState(hoje0.getMonth()); // 0-11
  const [selecionado, setSelecionado] = useState(isoLocal(hoje0.getFullYear(), hoje0.getMonth(), hoje0.getDate()));
  const [calendarioLateral, alternarCalendarioLateral] = useCalendarioLateral();

  useEffect(() => {
    Promise.all([
      fetch("/api/leads").then((r) => r.json()).catch(() => []),
      fetch("/api/lists?todos=1").then((r) => r.json()).catch(() => []),
    ]).then(([jl, jli]) => {
      setLeads(Array.isArray(jl) ? jl : []);
      setListas(Array.isArray(jli) ? jli : []);
      setCarregando(false);
    });
  }, []);

  // marca-texto do PRAZO das listas: pinta de hoje até o dia do prazo (inclusive), mas só das
  // listas que têm prazo E pelo menos um cliente dentro (mesma regra do aviso de prazo vencido).
  const diasPrazo = useMemo(() => {
    const set = new Set();
    const h = hoje();
    for (const l of listas) {
      if (!l.prazo) continue;
      const lb = l.board || "crm";
      const temCliente = leads.some((x) => (x.board || "crm") === lb && x.listId === l.key);
      if (!temCliente) continue;
      const inicio = l.prazo < h ? l.prazo : h; // se já venceu, pinta do prazo até hoje
      const fim = l.prazo < h ? h : l.prazo;
      let cur = inicio, guarda = 0;
      while (cur <= fim && guarda++ < 400) { set.add(cur); cur = addDias(cur, 1); }
    }
    return set;
  }, [listas, leads]);

  // mapa data(YYYY-MM-DD) -> lista de eventos {tipo:'msg'|'niver', lead, lem?, atrasado?}
  const eventosPorDia = useMemo(() => {
    const mapa = {};
    const add = (data, ev) => { (mapa[data] ||= []).push(ev); };
    const hojeIso = isoLocal(hoje0.getFullYear(), hoje0.getMonth(), hoje0.getDate());
    for (const lead of leads) {
      for (const lem of lead.lembretes || []) {
        if (lem.enviado) continue;
        add(lem.data, { tipo: "msg", lead, lem, atrasado: lem.data < hojeIso });
      }
      const p = partesNascimento(lead);
      if (p) {
        // aniversário recorrente: plota no ano corrente e no próximo (visão de 12 meses do calendário)
        for (const y of [ano, ano + 1]) {
          try { add(isoLocal(y, p.mes - 1, p.dia), { tipo: "niver", lead }); } catch (e) {}
        }
      }
    }
    return mapa;
  }, [leads, ano]);

  const diasDoMes = useMemo(() => {
    const primeiro = new Date(ano, mes, 1);
    const inicioSemana = primeiro.getDay(); // 0=dom
    const totalDias = new Date(ano, mes + 1, 0).getDate();
    const celulas = [];
    for (let i = 0; i < inicioSemana; i++) celulas.push(null);
    for (let d = 1; d <= totalDias; d++) celulas.push(d);
    while (celulas.length % 7 !== 0) celulas.push(null);
    return celulas;
  }, [ano, mes]);

  function mudarMes(delta) {
    let m = mes + delta, y = ano;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setMes(m); setAno(y);
  }

  const eventosDoDia = eventosPorDia[selecionado] || [];

  // timeline: próximos eventos a partir de hoje (qualquer mês), até 60 dias
  const timeline = useMemo(() => {
    const todasDatas = Object.keys(eventosPorDia).sort();
    const hojeIso = isoLocal(hoje0.getFullYear(), hoje0.getMonth(), hoje0.getDate());
    const futuras = todasDatas.filter((d) => d >= hojeIso).slice(0, 30);
    const linhas = [];
    for (const d of futuras) for (const ev of eventosPorDia[d]) linhas.push({ data: d, ...ev });
    return linhas.slice(0, 25);
  }, [eventosPorDia]);

  function abrirZap(lead, texto) {
    window.open(waLink(lead.telefone, texto), "_blank");
  }
  function textoDoEvento(ev) {
    if (ev.tipo === "niver") return render("ANIVERSARIO", primeiroNome(ev.lead.nome), 0);
    if (ev.lem.tipo) return render(ev.lem.tipo, primeiroNome(ev.lead.nome), ev.lem.varIdx ?? 0);
    return (ev.lem.texto || "").replaceAll("{nome}", primeiroNome(ev.lead.nome));
  }

  const hojeIso = isoLocal(hoje0.getFullYear(), hoje0.getMonth(), hoje0.getDate());

  const acoesTopbar = (
    <button className="btn" onClick={alternarCalendarioLateral} title="Mostra um mini-calendário do mês atual na barra lateral, em qualquer tela">
      <Ico n="calendar" size={15} /> <span className="btn-rotulo">{calendarioLateral ? "Calendário lateral: ON" : "Manter calendário lateral"}</span>
    </button>
  );

  return (
    <Layout titulo="Calendário" acoes={acoesTopbar}>
      <div className="pagina">
        <div className="pagina-titulo"><Ico n="calendar" size={20} /> Calendário</div>
        <div className="pagina-sub">Pontos indicam mensagens agendadas e aniversários. Clique num dia pra ver os detalhes.</div>

        {carregando ? <div>Carregando…</div> : (
          <div className="calendario-wrap">
            <div className="cal-card">
              <div className="cal-header">
                <button className="cal-nav-btn" onClick={() => mudarMes(-1)}><Ico n="chevronLeft" size={16} /></button>
                <h2>{MESES[mes]} {ano}</h2>
                <button className="cal-nav-btn" onClick={() => mudarMes(1)}><Ico n="chevronRight" size={16} /></button>
                <span style={{ flex: 1 }} />
                <button className="btn2" onClick={() => { setMes(hoje0.getMonth()); setAno(hoje0.getFullYear()); setSelecionado(hojeIso); }}>Hoje</button>
              </div>
              <div className="cal-grid">
                {DOW.map((d) => <div className="cal-dow" key={d}>{d}</div>)}
                {diasDoMes.map((d, i) => {
                  if (!d) return <div key={i} />;
                  const iso = isoLocal(ano, mes, d);
                  const evs = eventosPorDia[iso] || [];
                  const temMsg = evs.some((e) => e.tipo === "msg" && !e.atrasado);
                  const temAtrasada = evs.some((e) => e.tipo === "msg" && e.atrasado);
                  const temNiver = evs.some((e) => e.tipo === "niver");
                  return (
                    <div key={i}
                      className={"cal-dia" + (iso === hojeIso ? " hoje" : "") + (iso === selecionado ? " selecionado" : "") + (diasPrazo.has(iso) ? " prazo" : "")}
                      onClick={() => setSelecionado(iso)}>
                      <span>{d}</span>
                      {(temMsg || temAtrasada || temNiver) && (
                        <div className="cal-dots">
                          {temAtrasada && <span className="cal-dot atrasado" />}
                          {temMsg && <span className="cal-dot msg" />}
                          {temNiver && <span className="cal-dot niver" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cal-side">
              <div className="cal-card">
                <h3><Ico n="calendar" size={15} /> {fmtBR(selecionado)}</h3>
                {eventosDoDia.length === 0 && <div className="vazio">Nenhum evento neste dia.</div>}
                {eventosDoDia.map((ev, i) => {
                  const texto = textoDoEvento(ev);
                  return (
                    <div className="cal-evento" key={i}>
                      <span style={{ fontWeight: 800 }}>
                        {ev.tipo === "niver" ? "🎂" : ev.atrasado ? "⏰" : "💬"} {ev.lead.nome || ev.lead.telefone}
                      </span>
                      <button className="btn2 zap" style={{ marginLeft: "auto", padding: "5px 9px" }} onClick={() => abrirZap(ev.lead, texto)}>
                        <IcoZap size={13} /> Enviar
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="cal-card">
                <h3><Ico n="clock" size={15} /> Próximos eventos</h3>
                {timeline.length === 0 && <div className="vazio">Nada agendado nos próximos dias.</div>}
                {timeline.map((ev, i) => (
                  <div className="cal-evento" key={i}>
                    <span className="data-mini">{fmtBR(ev.data).slice(0, 5)}</span>
                    <span>{ev.tipo === "niver" ? "🎂" : "💬"} {ev.lead.nome || ev.lead.telefone}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
