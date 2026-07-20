import { useState } from "react";
import Layout from "../components/Layout";
import { Ico } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { STRATEGY_META } from "../lib/messages";

export default function EstrategiasPage() {
  const { templates, personalizados, salvar, carregado } = useTemplates();
  const [aberta, setAberta] = useState(null); // tipo selecionado (ex: "D0")

  return (
    <Layout titulo="Estratégias">
      <div className="pagina">
        <div className="pagina-titulo"><Ico n="target" size={20} /> Estratégias</div>
        <div className="pagina-sub">Cada card é uma etapa da cadência de mensagens. Edite os textos aqui — as mudanças valem pra todo envio no CRM e no painel &quot;Enviar hoje&quot;.</div>

        {!aberta && carregado && (
          <div className="grid-estrategias">
            {STRATEGY_META.map((m) => {
              const personalizado = !!personalizados[m.tipo]?.variacoes?.length;
              const qtdVariacoes = (templates[m.tipo]?.variacoes || []).length;
              return (
                <div key={m.tipo} className="card-estrategia" onClick={() => setAberta(m.tipo)}>
                  <div className="icone-grande"><Ico n={m.icone} size={20} /></div>
                  <h3>{m.titulo}</h3>
                  <p>{m.subtitulo} · {qtdVariacoes} variaç{qtdVariacoes === 1 ? "ão" : "ões"}</p>
                  <span className={"badge-status " + (personalizado ? "ok" : "pendente")}>
                    {personalizado ? "Personalizada" : "Modelo padrão"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {aberta && (
          <EditorEstrategia
            tipo={aberta}
            meta={STRATEGY_META.find((m) => m.tipo === aberta)}
            variacoesAtuais={templates[aberta]?.variacoes || []}
            salvar={salvar}
            voltar={() => setAberta(null)}
          />
        )}
      </div>
    </Layout>
  );
}

function EditorEstrategia({ tipo, meta, variacoesAtuais, salvar, voltar }) {
  const [variacoes, setVariacoes] = useState(variacoesAtuais.length ? variacoesAtuais : [""]);
  const [salvando, setSalvando] = useState(false);
  const nomeExemplo = "João";

  function atualizar(i, valor) {
    setVariacoes((vs) => vs.map((v, j) => (j === i ? valor : v)));
  }
  function remover(i) {
    setVariacoes((vs) => vs.filter((_, j) => j !== i));
  }
  function adicionar() {
    setVariacoes((vs) => [...vs, ""]);
  }
  async function onSalvar() {
    setSalvando(true);
    const ok = await salvar(tipo, meta.titulo, variacoes);
    setSalvando(false);
    if (ok) alert("Estratégia salva! Já vale pros próximos envios.");
    else alert("Não consegui salvar — confira a conexão e tente de novo.");
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <button className="btn2" style={{ marginBottom: 16 }} onClick={voltar}><Ico n="chevronLeft" size={15} /> Voltar</button>

      <div className="editor-estrategia-head">
        <div className="icone-grande"><Ico n={meta.icone} size={22} /></div>
        <div>
          <h2 style={{ fontSize: 18, marginBottom: 2 }}>{meta.titulo}</h2>
          <div style={{ fontSize: 13, color: "var(--cinza)" }}>{meta.subtitulo} — use <code>{"{nome}"}</code> onde quiser o primeiro nome do cliente.</div>
        </div>
      </div>

      <div className="editor-variacoes">
        {variacoes.map((v, i) => (
          <div className="variacao-box" key={i}>
            <label>
              <span>Variação {i + 1}</span>
              {variacoes.length > 1 && (
                <button className="btn2 perigo" style={{ padding: "4px 8px" }} onClick={() => remover(i)}><Ico n="trash" size={13} /></button>
              )}
            </label>
            <textarea value={v} onChange={(e) => atualizar(i, e.target.value)} placeholder="Oi {nome}! …" />
            <div className="variacao-preview">Prévia: {(v || "").replaceAll("{nome}", nomeExemplo) || "—"}</div>
          </div>
        ))}
        <button className="btn2" onClick={adicionar} style={{ alignSelf: "flex-start" }}><Ico n="plus" size={14} /> Adicionar variação</button>
      </div>

      <div className="editor-rodape">
        <button className="btn2 primario" disabled={salvando} onClick={onSalvar}>
          <Ico n="save" size={15} /> {salvando ? "Salvando…" : "Salvar estratégia"}
        </button>
      </div>
    </div>
  );
}
