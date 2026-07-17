import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Ico } from "../lib/icons";

// Tenta descobrir os campos mais comuns dentro de data.* sem travar se o formato do PDV for diferente
function campo(data, opcoes) {
  for (const k of opcoes) if (data?.[k] !== undefined && data[k] !== "") return data[k];
  return null;
}

export default function OsPage() {
  const [estado, setEstado] = useState({ carregando: true, configurado: false, erro: null, ordens: [] });

  useEffect(() => {
    fetch("/api/os")
      .then((r) => r.json().then((j) => ({ status: r.status, j })))
      .then(({ status, j }) => {
        if (status === 501) setEstado({ carregando: false, configurado: false, erro: null, ordens: [] });
        else if (j.error) setEstado({ carregando: false, configurado: !!j.configurado, erro: j.error, ordens: [] });
        else setEstado({ carregando: false, configurado: true, erro: null, ordens: j.ordens || [] });
      })
      .catch((e) => setEstado({ carregando: false, configurado: false, erro: String(e.message || e), ordens: [] }));
  }, []);

  const colunas = {};
  for (const o of estado.ordens) {
    const status = campo(o.data, ["status", "situacao", "etapa"]) || "Sem status";
    (colunas[status] ||= []).push(o);
  }

  return (
    <Layout titulo="OS">
      <div className="pagina">
        <div className="pagina-titulo"><Ico n="wrench" size={20} /> Ordens de Serviço</div>
        <div className="pagina-sub">Espelho somente-leitura das OS do PDV — nada aqui é editável nem grava de volta no PDV.</div>

        {estado.carregando && <div>Carregando…</div>}

        {!estado.carregando && !estado.configurado && !estado.erro && (
          <div className="os-placeholder">
            <div className="icone-grande" style={{ background: "var(--accent-suave)", color: "var(--accent-forte)", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ico n="info" size={26} />
            </div>
            <h3 style={{ marginBottom: 8 }}>Aguardando configuração</h3>
            <p style={{ color: "var(--cinza)", fontSize: 13.5, marginBottom: 16, lineHeight: 1.6 }}>
              Essa tela vai mostrar as Ordens de Serviço do PDV em tempo real, sem tocar no banco <code>infopdv</code> —
              a leitura é feita por uma API HTTP, como definido nas diretrizes de convivência dos dois sistemas.
            </p>
            <div className="aviso" style={{ textAlign: "left" }}>
              Falta configurar no Vercel (Settings → Environment Variables):
              <ol style={{ paddingLeft: 20, marginTop: 8, lineHeight: 1.9 }}>
                <li><b>PDV_API_URL</b> — a URL pública do PDV (ex.: https://seu-pdv.vercel.app)</li>
                <li><b>PDV_API_TOKEN</b> — um token novo, próprio do CRM, com acesso só de leitura (não reutilizar o SYNC_TOKEN do PDV)</li>
              </ol>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--cinza)", marginTop: 14 }}>
              Se o PDV ainda não tem um endpoint de leitura exposto (algo como <code>/api/sync?collection=serviceorders</code>), esse é o próximo passo — me avisa quando tiver isso definido que eu conecto.
            </p>
          </div>
        )}

        {!estado.carregando && estado.erro && (
          <div className="aviso" style={{ maxWidth: 640 }}>
            <b>Erro ao consultar o PDV:</b> {estado.erro}
          </div>
        )}

        {!estado.carregando && estado.configurado && !estado.erro && (
          <div className="board">
            {Object.keys(colunas).length === 0 && <div className="vazio">Nenhuma ordem de serviço encontrada.</div>}
            {Object.entries(colunas).map(([status, ordens]) => (
              <div className="lista" key={status}>
                <div className="lista-head">
                  <span className="titulo">{String(status).toUpperCase()}</span>
                  <span className="qtd">{ordens.length}</span>
                </div>
                {ordens.map((o) => (
                  <div className="card" key={o.id} style={{ cursor: "default" }}>
                    <div className="nome">{campo(o.data, ["cliente", "nome", "clienteNome"]) || "OS #" + o.id}</div>
                    <div className="servico">
                      {campo(o.data, ["equipamento", "aparelho", "produto"]) || ""} {campo(o.data, ["defeito", "descricao", "problema"]) ? "· " + campo(o.data, ["defeito", "descricao", "problema"]) : ""}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
