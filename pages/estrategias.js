import { useRef, useState } from "react";
import Layout from "../components/Layout";
import { Ico } from "../lib/icons";
import { useTemplates } from "../lib/TemplatesContext";
import { useEstrategias } from "../lib/EstrategiasContext";

// ícones disponíveis pra escolher ao criar uma estratégia nova
const ICONES_ESCOLHA = ["send", "target", "dollar", "cake", "eyeOff", "wrench", "clock", "tag", "msgCheck", "clipboardCheck"];

export default function EstrategiasPage() {
  const { templates, personalizados, salvar, carregado: templatesCarregado } = useTemplates();
  const { estrategias, carregado, criar, reordenar, excluir } = useEstrategias();
  const [aberta, setAberta] = useState(null); // tipo selecionado (ex: "D0")
  const [criando, setCriando] = useState(false);
  const dragRef = useRef(null);
  const [arrastando, setArrastando] = useState(null);
  const [dropAlvo, setDropAlvo] = useState(null); // { tipo, pos }

  async function moverParaPosicao(e, alvo) {
    e.preventDefault(); e.stopPropagation();
    const tipoOrigem = dragRef.current;
    dragRef.current = null;
    if (!tipoOrigem || tipoOrigem === alvo.tipo) return;
    const semOrigem = estrategias.filter((m) => m.tipo !== tipoOrigem).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
    const rect = e.currentTarget.getBoundingClientRect();
    const antes = (e.clientX - rect.left) < rect.width / 2;
    const idxAlvo = semOrigem.findIndex((m) => m.tipo === alvo.tipo);
    const viz1 = antes ? semOrigem[idxAlvo - 1] : semOrigem[idxAlvo];
    const viz2 = antes ? semOrigem[idxAlvo] : semOrigem[idxAlvo + 1];
    const o1 = viz1?.ordem ?? null, o2 = viz2?.ordem ?? null;
    const novaOrdem = o1 == null && o2 == null ? Date.now() : o1 == null ? o2 - 1 : o2 == null ? o1 + 1 : (o1 + o2) / 2;
    await reordenar(tipoOrigem, novaOrdem);
  }

  async function excluirEstrategia(m) {
    const aviso = m.custom
      ? `Excluir a estratégia "${m.titulo}"? Os textos cadastrados nela também somem.`
      : `Excluir a estratégia padrão "${m.titulo}"? Ela é usada nos envios automáticos desse tipo — depois de excluída, esse tipo de mensagem some do botão DISPARO e os textos cadastrados somem junto. Dá pra criar de novo do zero se precisar.`;
    if (!confirm(aviso)) return false;
    const r = await excluir(m.tipo);
    if (!r.ok) { alert(r.error || "Não consegui excluir."); return false; }
    return true;
  }

  return (
    <Layout titulo="Estratégias">
      <div className="pagina">
        <div className="pagina-titulo"><Ico n="target" size={20} /> Estratégias</div>
        <div className="pagina-sub">Cada card é uma etapa da cadência de mensagens. Arraste os cards pra reorganizar a ordem — é a mesma ordem que aparece no botão DISPARO. Edite os textos clicando no card.</div>

        {!aberta && carregado && (
          <>
            <div className="grid-estrategias">
              {estrategias.map((m) => {
                const personalizado = !!personalizados[m.tipo]?.variacoes?.length;
                const qtdVariacoes = (templates[m.tipo]?.variacoes || []).length;
                const classe = "card-estrategia"
                  + (arrastando === m.tipo ? " card-arrastando" : "")
                  + (dropAlvo?.tipo === m.tipo ? (dropAlvo.pos === "antes" ? " drop-antes" : " drop-depois") : "");
                return (
                  <div key={m.tipo} className={classe} draggable
                    onClick={() => setAberta(m.tipo)}
                    onDragStart={(e) => { e.stopPropagation(); dragRef.current = m.tipo; setArrastando(m.tipo); }}
                    onDragEnd={() => { setArrastando(null); setDropAlvo(null); }}
                    onDragOver={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      if (!dragRef.current || dragRef.current === m.tipo) return;
                      const rect = e.currentTarget.getBoundingClientRect();
                      const antes = (e.clientX - rect.left) < rect.width / 2;
                      setDropAlvo({ tipo: m.tipo, pos: antes ? "antes" : "depois" });
                    }}
                    onDrop={(e) => { moverParaPosicao(e, m); setArrastando(null); setDropAlvo(null); }}>
                    <div className="card-estrategia-topo">
                      <Ico n="gripVertical" size={14} className="arrasta-lista" />
                      <button className="x" title="Excluir estratégia" onClick={(e) => { e.stopPropagation(); excluirEstrategia(m); }}>
                        <Ico n="x" size={13} />
                      </button>
                    </div>
                    <div className="icone-grande"><Ico n={m.icone} size={20} /></div>
                    <h3>{m.titulo}</h3>
                    <p>{m.subtitulo} · {qtdVariacoes} variaç{qtdVariacoes === 1 ? "ão" : "ões"}</p>
                    <span className={"badge-status " + (personalizado ? "ok" : "pendente")}>
                      {personalizado ? "Personalizada" : "Modelo padrão"}
                    </span>
                  </div>
                );
              })}
              <button className="card-estrategia card-estrategia-nova" onClick={() => setCriando(true)}>
                <div className="icone-grande"><Ico n="plus" size={20} /></div>
                <h3>Criar estratégia</h3>
                <p>Nova etapa da cadência, sob demanda</p>
              </button>
            </div>
            {criando && <ModalCriarEstrategia criar={criar} fechar={() => setCriando(false)} abrirEditor={setAberta} />}
          </>
        )}

        {aberta && templatesCarregado && (
          <EditorEstrategia
            tipo={aberta}
            meta={estrategias.find((m) => m.tipo === aberta)}
            variacoesAtuais={templates[aberta]?.variacoes || []}
            salvar={salvar}
            voltar={() => setAberta(null)}
            excluir={async (m) => { if (await excluirEstrategia(m)) setAberta(null); }}
          />
        )}
      </div>
    </Layout>
  );
}

function ModalCriarEstrategia({ criar, fechar, abrirEditor }) {
  const [titulo, setTitulo] = useState("");
  const [subtitulo, setSubtitulo] = useState("");
  const [icone, setIcone] = useState(ICONES_ESCOLHA[0]);
  const [criando, setCriando] = useState(false);

  async function onCriar() {
    if (!titulo.trim()) { alert("Dá um nome pra estratégia."); return; }
    setCriando(true);
    const nova = await criar({ titulo, subtitulo, icone });
    setCriando(false);
    if (!nova) { alert("Não consegui criar — confira a conexão e tente de novo."); return; }
    fechar();
    abrirEditor(nova.tipo);
  }

  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal">
        <h2><Ico n="plus" /> Criar estratégia</h2>
        <label>Título</label>
        <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Convite pra avaliação" autoFocus />
        <label>Quando usar (subtítulo, opcional)</label>
        <input type="text" value={subtitulo} onChange={(e) => setSubtitulo(e.target.value)} placeholder="Ex: sob demanda, D+15…" />
        <label>Ícone</label>
        <div className="seletor-icones">
          {ICONES_ESCOLHA.map((n) => (
            <button key={n} type="button" className={"icone-opcao" + (icone === n ? " on" : "")} onClick={() => setIcone(n)}>
              <Ico n={n} size={18} />
            </button>
          ))}
        </div>
        <div className="acoes">
          <button className="btn2" onClick={fechar}><Ico n="x" size={14} /> Cancelar</button>
          <button className="btn2 primario" disabled={criando} onClick={onCriar}><Ico n="check" size={14} /> {criando ? "Criando…" : "Criar e editar textos"}</button>
        </div>
      </div>
    </div>
  );
}

function EditorEstrategia({ tipo, meta, variacoesAtuais, salvar, voltar, excluir }) {
  const [variacoes, setVariacoes] = useState(variacoesAtuais.length ? variacoesAtuais : [""]);
  const [salvando, setSalvando] = useState(false);
  const nomeExemplo = "João";

  if (!meta) return (
    <div style={{ maxWidth: 820 }}>
      <button className="btn2" style={{ marginBottom: 16 }} onClick={voltar}><Ico n="chevronLeft" size={15} /> Voltar</button>
      <div className="vazio">Estratégia não encontrada.</div>
    </div>
  );

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
        <button className="btn2 perigo" onClick={() => excluir(meta)}>
          <Ico n="trash" size={14} /> Excluir estratégia
        </button>
      </div>
      {!meta.custom && (
        <div className="vazio" style={{ marginTop: 10 }}>
          Essa é uma estratégia padrão do sistema — excluir ela remove esse tipo de mensagem do botão DISPARO e apaga os textos cadastrados. Se precisar depois, é só criar de novo em "Criar estratégia".
        </div>
      )}
    </div>
  );
}
