import { useEffect, useMemo, useState } from "react";
import Layout from "../components/Layout";
import { Ico } from "../lib/icons";
import { useTags } from "../lib/TagsContext";
import { hoje, addDias, fmtBR, fmtDinheiro } from "../lib/crmHelpers";

// Números que dizem se a estratégia está funcionando — tudo calculado a partir
// dos dados que o CRM já guarda: lembretes enviados (enviadoEm), respostas
// registradas (botão "Respondeu"), clientes criados e compras.
export default function MetricasPage() {
  const { tags: TAGS } = useTags();
  const [leads, setLeads] = useState(null);

  useEffect(() => {
    fetch("/api/leads").then((r) => r.json()).then((j) => setLeads(Array.isArray(j) ? j : [])).catch(() => setLeads([]));
  }, []);

  const mes = hoje().slice(0, 7); // YYYY-MM

  const resumo = useMemo(() => {
    if (!leads) return null;
    let enviadas = 0, respostas = 0, novos = 0, receita = 0;
    for (const l of leads) {
      for (const lem of l.lembretes || []) if (lem.enviadoEm && lem.enviadoEm.startsWith(mes)) enviadas++;
      for (const r of l.respostas || []) if (r.data && r.data.startsWith(mes)) respostas++;
      if ((l.createdAt || "").startsWith(mes)) novos++;
      for (const c of l.compras || []) if ((c.data || "").startsWith(mes)) receita += Number(c.valor) || 0;
    }
    return { enviadas, respostas, novos, receita };
  }, [leads, mes]);

  // 8 semanas: envios vs respostas
  const semanas = useMemo(() => {
    if (!leads) return [];
    const h = hoje();
    const buckets = [];
    for (let i = 7; i >= 0; i--) {
      const fim = addDias(h, -7 * i);
      const inicio = addDias(fim, -6);
      buckets.push({ inicio, fim, envios: 0, respostas: 0 });
    }
    const dentro = (d, b) => d && d >= b.inicio && d <= b.fim;
    for (const l of leads) {
      for (const lem of l.lembretes || []) if (lem.enviadoEm) for (const b of buckets) if (dentro(lem.enviadoEm, b)) b.envios++;
      for (const r of l.respostas || []) for (const b of buckets) if (dentro(r.data, b)) b.respostas++;
    }
    return buckets;
  }, [leads]);

  // desempenho por etiqueta
  const porTag = useMemo(() => {
    if (!leads) return [];
    const linhas = TAGS.map((t) => ({ id: t.id, nome: t.nome, cor: t.cor, clientes: 0, enviadas: 0, respostas: 0, receita: 0 }));
    const semTag = { id: null, nome: "Sem etiqueta", cor: "#9ca3af", clientes: 0, enviadas: 0, respostas: 0, receita: 0 };
    for (const l of leads) {
      const alvos = (l.tags || []).length
        ? linhas.filter((x) => l.tags.includes(x.id))
        : [semTag];
      const env = (l.lembretes || []).filter((x) => x.enviado).length;
      const resp = (l.respostas || []).length;
      const rec = (l.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
      for (const a of alvos) { a.clientes++; a.enviadas += env; a.respostas += resp; a.receita += rec; }
    }
    return [...linhas, semTag].filter((x) => x.clientes > 0);
  }, [leads, TAGS]);

  const maxBarra = Math.max(1, ...semanas.map((s) => Math.max(s.envios, s.respostas)));

  return (
    <Layout titulo="Métricas">
      <div className="pagina">
        <div className="pagina-titulo"><Ico n="chart" size={20} /> Métricas</div>
        <div className="pagina-sub">
          Resultados do mês e das últimas semanas. Use o botão <b>Respondeu</b> no painel Enviar Hoje pra alimentar a taxa de resposta.
        </div>

        {!leads && <div className="vazio">Carregando…</div>}

        {leads && resumo && (
          <>
            <div className="grid-metricas">
              <div className="card-metrica">
                <span className="metrica-rotulo"><Ico n="send" size={14} /> Mensagens enviadas</span>
                <span className="metrica-num">{resumo.enviadas}</span>
                <span className="metrica-sub">neste mês</span>
              </div>
              <div className="card-metrica">
                <span className="metrica-rotulo"><Ico n="msgCheck" size={14} /> Respostas</span>
                <span className="metrica-num">{resumo.respostas}</span>
                <span className="metrica-sub">{resumo.enviadas > 0 ? Math.round((resumo.respostas / resumo.enviadas) * 100) + "% das enviadas" : "neste mês"}</span>
              </div>
              <div className="card-metrica">
                <span className="metrica-rotulo"><Ico n="user" size={14} /> Novos clientes</span>
                <span className="metrica-num">{resumo.novos}</span>
                <span className="metrica-sub">neste mês</span>
              </div>
              <div className="card-metrica">
                <span className="metrica-rotulo"><Ico n="dollar" size={14} /> Compras registradas</span>
                <span className="metrica-num" style={{ fontSize: 24 }}>{fmtDinheiro(resumo.receita)}</span>
                <span className="metrica-sub">neste mês</span>
              </div>
            </div>

            <h3 className="metrica-secao">Últimas 8 semanas — enviadas × respondidas</h3>
            <div className="grafico-box">
              <svg viewBox="0 0 640 160" style={{ width: "100%", height: "auto" }} role="img" aria-label="Gráfico de envios e respostas por semana">
                {semanas.map((s, i) => {
                  const x = 20 + i * 78;
                  const hEnv = Math.round((s.envios / maxBarra) * 105);
                  const hResp = Math.round((s.respostas / maxBarra) * 105);
                  return (
                    <g key={i}>
                      <rect x={x} y={125 - hEnv} width={26} height={hEnv || 1} rx={4} fill="var(--accent)" opacity={0.9} />
                      <rect x={x + 30} y={125 - hResp} width={26} height={hResp || 1} rx={4} fill="var(--zap)" opacity={0.9} />
                      {s.envios > 0 && <text x={x + 13} y={119 - hEnv} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--texto)">{s.envios}</text>}
                      {s.respostas > 0 && <text x={x + 43} y={119 - hResp} textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--texto)">{s.respostas}</text>}
                      <text x={x + 28} y={145} textAnchor="middle" fontSize="10" fill="var(--cinza)">{fmtBR(s.fim).slice(0, 5)}</text>
                    </g>
                  );
                })}
              </svg>
              <div className="grafico-legenda">
                <span><i style={{ background: "var(--accent)" }} /> Enviadas</span>
                <span><i style={{ background: "var(--zap)" }} /> Respondidas</span>
              </div>
            </div>

            <h3 className="metrica-secao">Desempenho por etiqueta</h3>
            {porTag.length === 0 && <div className="vazio">Nenhum cliente ainda.</div>}
            {porTag.length > 0 && (
              <div className="tabela-wrap">
                <table className="tabela-metricas">
                  <thead>
                    <tr><th>Etiqueta</th><th>Clientes</th><th>Enviadas</th><th>Respostas</th><th>Taxa</th><th>Receita</th></tr>
                  </thead>
                  <tbody>
                    {porTag.map((t) => (
                      <tr key={t.id || "sem"}>
                        <td><span className="tag-chip" style={{ background: t.cor }}>{t.nome}</span></td>
                        <td>{t.clientes}</td>
                        <td>{t.enviadas}</td>
                        <td>{t.respostas}</td>
                        <td>{t.enviadas > 0 ? Math.round((t.respostas / t.enviadas) * 100) + "%" : "—"}</td>
                        <td><b>{fmtDinheiro(t.receita)}</b></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
