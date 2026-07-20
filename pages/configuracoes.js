import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Ico } from "../lib/icons";
import { useTags } from "../lib/TagsContext";

const CONFIG_META = [
  { id: "etiquetas", titulo: "Etiquetas", subtitulo: "Nomes e cores — usados em todo o sistema", icone: "tag" },
  { id: "pdv", titulo: "Integração PDV", subtitulo: "Status da conexão com as Ordens de Serviço", icone: "wrench" },
  { id: "sobre", titulo: "Sobre o sistema", subtitulo: "Banco de dados e ambiente", icone: "info" },
];

export default function ConfiguracoesPage() {
  const [aberta, setAberta] = useState(null);
  const meta = CONFIG_META.find((m) => m.id === aberta);

  return (
    <Layout titulo="Configurações">
      <div className="pagina">
        <div className="pagina-titulo"><Ico n="settings" size={20} /> Configurações</div>
        <div className="pagina-sub">Ajustes que valem pro sistema inteiro — CRM e OS.</div>

        {!aberta && (
          <div className="grid-estrategias">
            {CONFIG_META.map((m) => (
              <div key={m.id} className="card-estrategia" onClick={() => setAberta(m.id)}>
                <div className="icone-grande"><Ico n={m.icone} size={20} /></div>
                <h3>{m.titulo}</h3>
                <p>{m.subtitulo}</p>
              </div>
            ))}
          </div>
        )}

        {aberta && (
          <div style={{ maxWidth: 720 }}>
            <button className="btn2" style={{ marginBottom: 16 }} onClick={() => setAberta(null)}><Ico n="chevronLeft" size={15} /> Voltar</button>
            <div className="editor-estrategia-head">
              <div className="icone-grande"><Ico n={meta.icone} size={22} /></div>
              <div>
                <h2 style={{ fontSize: 18, marginBottom: 2 }}>{meta.titulo}</h2>
                <div style={{ fontSize: 13, color: "var(--cinza)" }}>{meta.subtitulo}</div>
              </div>
            </div>
            {aberta === "etiquetas" && <EditorEtiquetas />}
            {aberta === "pdv" && <PainelPdv />}
            {aberta === "sobre" && <PainelSobre />}
          </div>
        )}
      </div>
    </Layout>
  );
}

function EditorEtiquetas() {
  const { tags, carregado, salvar, excluir } = useTags();
  const [novo, setNovo] = useState({ nome: "", cor: "#0d9488" });
  const [criando, setCriando] = useState(false);

  async function criar() {
    if (!novo.nome.trim()) return;
    setCriando(true);
    const ok = await salvar({ nome: novo.nome.trim(), cor: novo.cor });
    setCriando(false);
    if (ok) setNovo({ nome: "", cor: "#0d9488" });
    else alert("Não consegui criar a etiqueta — tenta de novo.");
  }
  async function apagar(t) {
    if (!confirm(`Excluir a etiqueta "${t.nome}"? Ela some do sistema, mas clientes que já tinham essa etiqueta não são alterados.`)) return;
    await excluir(t.id);
  }

  if (!carregado) return <div className="vazio">Carregando…</div>;

  return (
    <div>
      {tags.map((t) => (
        <div className="etiqueta-linha" key={t.id}>
          <input type="color" value={t.cor} onChange={(e) => salvar({ id: t.id, cor: e.target.value })} title="Cor" />
          <input type="text" defaultValue={t.nome}
            onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== t.nome) salvar({ id: t.id, nome: v }); else e.target.value = t.nome; }} />
          <button className="btn2 perigo" onClick={() => apagar(t)} title="Excluir etiqueta"><Ico n="trash" size={14} /></button>
        </div>
      ))}
      <div className="nova-etiqueta">
        <input type="color" value={novo.cor} onChange={(e) => setNovo({ ...novo, cor: e.target.value })} title="Cor" />
        <input type="text" placeholder="Nome da nova etiqueta" value={novo.nome}
          onChange={(e) => setNovo({ ...novo, nome: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && criar()} />
        <button className="btn2 primario" disabled={criando} onClick={criar}><Ico n="plus" size={14} /> Adicionar</button>
      </div>
      <p style={{ fontSize: 12.5, color: "var(--cinza)", marginTop: 10 }}>
        Mudanças de nome e cor aparecem na hora nos cards, no seletor de etiquetas e nas colunas do quadro Etiquetas.
      </p>
    </div>
  );
}

function PainelPdv() {
  const [estado, setEstado] = useState({ carregando: true });
  useEffect(() => {
    fetch("/api/os").then((r) => r.json().then((j) => ({ status: r.status, j })))
      .then(({ status, j }) => setEstado({ carregando: false, status, ...j }))
      .catch((e) => setEstado({ carregando: false, erro: String(e.message || e) }));
  }, []);
  if (estado.carregando) return <div className="vazio">Consultando…</div>;
  return (
    <div>
      <div className="info-linha"><span>Status</span><b>{estado.configurado ? "Conectado ✅" : "Não configurado"}</b></div>
      {estado.configurado && !estado.erro && <div className="info-linha"><span>Ordens de Serviço recebidas</span><b>{(estado.ordens || []).length}</b></div>}
      {estado.erro && <div className="info-linha"><span>Detalhe</span><b style={{ color: "var(--vermelho)" }}>{estado.erro}</b></div>}
      {!estado.configurado && <p style={{ fontSize: 13, color: "var(--cinza)", marginTop: 8 }}>Configure <b>PDV_API_URL</b> e <b>PDV_API_TOKEN</b> nas Environment Variables do Vercel pra ativar a tela de OS.</p>}
    </div>
  );
}

function PainelSobre() {
  return (
    <div>
      <div className="info-linha"><span>Banco de dados</span><b>info_crm (MongoDB Atlas)</b></div>
      <div className="info-linha"><span>Integração PDV</span><b>somente leitura, via HTTP</b></div>
      <div className="info-linha"><span>Envio de mensagens</span><b>WhatsApp manual (wa.me)</b></div>
    </div>
  );
}
