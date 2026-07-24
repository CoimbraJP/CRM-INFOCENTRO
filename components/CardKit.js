import { useState } from "react";
import { Ico, IcoZap } from "../lib/icons";
import { hoje, fmtBR, fmtDinheiro, ehAniversarioHoje, addDias, primeiroNome } from "../lib/crmHelpers";
import { useTags } from "../lib/TagsContext";
import { useEstrategias } from "../lib/EstrategiasContext";

export function novaCadencia(base) {
  const b = base || hoje();
  const varIdx = Math.floor(Math.random() * 3);
  return [
    { id: "c" + Date.now() + "a", data: b, tipo: "D0", varIdx, enviado: false },
    { id: "c" + Date.now() + "b", data: addDias(b, 5), tipo: "D5", varIdx: 0, enviado: false },
    { id: "c" + Date.now() + "c", data: addDias(b, 30), tipo: "D30", varIdx: 0, enviado: false },
  ];
}

// ---------------- card ----------------
export function Card({ lead, abrir, zapDireto, alternarResposta, onDragStart, onDragOver, onDrop, onDragEnd, dragging, dropPos, pousou }) {
  const { tags: TAGS } = useTags();
  const pendentes = (lead.lembretes || []).filter((l) => !l.enviado).length;
  const totalCompras = (lead.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const enviadas = (lead.lembretes || []).filter((l) => l.enviado).length;
  const respondeu = (lead.respostas || []).length > 0;
  const semResposta = enviadas >= 2 && !respondeu;
  const classe = "card"
    + (dragging ? " card-arrastando" : "")
    + (dropPos === "antes" ? " drop-antes" : dropPos === "depois" ? " drop-depois" : "")
    + (pousou ? " card-pousou" : "");
  return (
    <div className={classe} draggable onDragStart={onDragStart} onDragOver={onDragOver} onDrop={onDrop} onDragEnd={onDragEnd}>
      <div className="nome" style={{ cursor: "pointer" }} onClick={() => abrir("editar")}>
        {lead.nome || "— sem nome —"} {ehAniversarioHoje(lead) && <Ico n="cake" size={15} />}
      </div>
      <div className="servico">{lead.servico} · {lead.telefone}</div>
      {((lead.tags || []).length > 0 || semResposta) && (
        <div className="tags">
          {(lead.tags || []).map((t) => {
            const tag = TAGS.find((x) => x.id === t);
            return tag ? <span key={t} className="tag-chip" style={{ background: tag.cor }}>{tag.nome}</span> : null;
          })}
          {semResposta && <span className="tag-chip" style={{ background: "#6b7280" }} title="2 mensagens enviadas sem resposta — o painel Enviar Hoje para de sugerir envios pra este cliente">sem resposta 2x</span>}
        </div>
      )}
      <div className="icones">
        <button className="icone-btn" title="Observações" onClick={() => abrir("obs")}>
          <Ico n="fileText" />{(lead.observacoes || []).length > 0 && <span className="mini-badge">{lead.observacoes.length}</span>}
        </button>
        <button className="icone-btn" title="Agenda de mensagens" onClick={() => abrir("agenda")}>
          <Ico n="calendar" />{pendentes > 0 && <span className="mini-badge alerta">{pendentes}</span>}
        </button>
        <button className="icone-btn zap-btn" title="Abrir WhatsApp" onClick={zapDireto}><IcoZap /></button>
        <button className="icone-btn" title="Compras e gastos" onClick={() => abrir("compras")}>
          <Ico n="dollar" />{totalCompras > 0 && <span className="mini-badge">{Math.round(totalCompras)}</span>}
        </button>
        <button className="icone-btn" title="Etiquetas" onClick={() => abrir("tags")}><Ico n="tag" /></button>
      </div>
      <div className="card-rodape">
        <button className="btn-disparo" onClick={() => abrir("disparo")}><Ico n="send" size={14} /> DISPARO</button>
        {/* só aparece depois que existe pelo menos um envio — antes disso não há o que responder */}
        {enviadas > 0 && alternarResposta && (
          <button
            className={"toggle-resposta" + (respondeu ? " ligado" : "")}
            onClick={() => alternarResposta(lead)}
            title={respondeu ? "Cliente respondeu — clique para desmarcar" : "Sem resposta — clique para marcar que respondeu"}>
            <span className="toggle-trilho"><span className="toggle-bolinha" /></span>
            <span className="toggle-texto">{respondeu ? "respondeu" : "sem resposta"}</span>
          </button>
        )}
      </div>
    </div>
  );
}

// menu de opções da lista (engrenagem no cabeçalho): agrupa Definir prazo / Renomear / Excluir
// num popover, deixando o cabeçalho limpo. Recebe uma lista de ações {label, icone, onClick, perigo}.
export function MenuLista({ acoes }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="menu-lista-wrap">
      <button className="x menu-lista-btn" title="Opções da lista"
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => { e.stopPropagation(); setAberto((v) => !v); }}>
        <Ico n="settings" size={15} />
      </button>
      {aberto && (
        <>
          <div className="menu-lista-backdrop" onMouseDown={() => setAberto(false)} />
          <div className="menu-lista" onClick={(e) => e.stopPropagation()}>
            <div className="menu-lista-topo">
              <span>Opções da lista</span>
              <button className="x" title="Fechar" onClick={() => setAberto(false)}><Ico n="x" size={13} /></button>
            </div>
            {acoes.map((a, i) => (
              <button key={i} className={"menu-lista-item" + (a.perigo ? " perigo" : "")}
                onClick={() => { setAberto(false); a.onClick(); }}>
                <Ico n={a.icone} size={14} /> {a.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ---------------- modais ----------------
export function Modal({ children, fechar }) {
  return (
    <div className="overlay" onClick={(e) => e.target === e.currentTarget && fechar()}>
      <div className="modal">{children}
        <div className="acoes"><button className="btn2" onClick={fechar}><Ico n="x" size={14} /> Fechar</button></div>
      </div>
    </div>
  );
}

export function ModalImportar({ fileRef, onFile }) {
  return (
    <div>
      <h2><Ico n="upload" /> Importar planilha Excel</h2>
      <p style={{ fontSize: 13, color: "var(--cinza)" }}>
        A planilha precisa ter colunas com <b>telefone</b> (obrigatório) e, se tiver, <b>nome</b>, <b>serviço</b> e <b>nascimento</b>.
        Números repetidos são ignorados automaticamente.
      </p>
      <p style={{ fontSize: 13, color: "var(--cinza)" }}>
        Se a planilha tiver as colunas <b>Recorrencia</b> (dia do mês, ex.: 10) e <b>Mensagem Recorrencia</b> (ex.: &quot;cobrar taxa mensal&quot;),
        um lembrete recorrente já entra agendado pra esse cliente, avisando todo mês nesse dia.
      </p>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
    </div>
  );
}

export function ModalEditar({ lead, onSalvar, onExcluir }) {
  const [f, setF] = useState({
    nome: lead?.nome || "", telefone: lead?.telefone || "", servico: lead?.servico || "",
    nascimento: lead?.nascimento || "",
  });
  return (
    <div>
      <h2>{lead ? <><Ico n="fileText" /> Editar cliente</> : <><Ico n="plus" /> Novo cliente</>}</h2>
      <label>Nome</label>
      <input type="text" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
      <label>Telefone (com DDD)</label>
      <input type="text" value={f.telefone} onChange={(e) => setF({ ...f, telefone: e.target.value })} placeholder="11999998888" />
      <label>O que fez / serviço</label>
      <input type="text" value={f.servico} onChange={(e) => setF({ ...f, servico: e.target.value })} placeholder="Impressão, formatação, orçamento…" />
      <label>Data de nascimento</label>
      <input type="date" value={f.nascimento?.includes("-") ? f.nascimento : ""} onChange={(e) => setF({ ...f, nascimento: e.target.value })} />
      <div className="acoes">
        {lead && <button className="btn2 perigo" onClick={onExcluir}><Ico n="trash" size={14} /> Excluir</button>}
        <button className="btn2 primario" onClick={() => f.telefone ? onSalvar(f) : alert("Telefone é obrigatório")}><Ico n="check" size={14} /> Salvar</button>
      </div>
    </div>
  );
}

export function ModalObs({ lead, salvar }) {
  const [texto, setTexto] = useState("");
  if (!lead) return null;
  return (
    <div>
      <h2><Ico n="fileText" /> Observações — {lead.nome || lead.telefone}</h2>
      {(lead.observacoes || []).length === 0 && <div className="vazio">Nenhuma observação ainda.</div>}
      {(lead.observacoes || []).map((o, i) => (
        <div className="linha-item" key={i}>
          <span className="data">{fmtBR(o.data)}</span>
          <span className="desc">{o.texto}</span>
          <button className="btn2" onClick={() => salvar({ ...lead, observacoes: lead.observacoes.filter((_, j) => j !== i) })}><Ico n="trash" size={14} /></button>
        </div>
      ))}
      <textarea placeholder="Nova observação…" value={texto} onChange={(e) => setTexto(e.target.value)} />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!texto.trim()) return;
          salvar({ ...lead, observacoes: [...(lead.observacoes || []), { texto: texto.trim(), data: hoje() }] }); setTexto(""); }}>
          <Ico n="plus" size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}

export function ModalAgenda({ lead, salvar, enviar, templates, msgDoLembrete }) {
  const [novo, setNovo] = useState({ data: hoje(), diaDoMes: 10, texto: "" });
  const [recorrente, setRecorrente] = useState(false);
  if (!lead) return null;
  const anoMesAtual = hoje().slice(0, 7);

  function marcarFeitoRecorrente(lem, desfazer) {
    salvar({ ...lead, lembretes: lead.lembretes.map((l) => (l.id === lem.id ? { ...l, ultimaVezFeito: desfazer ? null : hoje() } : l)) });
  }

  return (
    <div>
      <h2><Ico n="calendar" /> Agenda de mensagens — {lead.nome || lead.telefone}</h2>
      {(lead.lembretes || []).length === 0 && <div className="vazio">Nenhuma mensagem agendada.</div>}
      {(lead.lembretes || []).map((lem) => {
        if (lem.recorrente) {
          const feitoEsteMes = lem.ultimaVezFeito && lem.ultimaVezFeito.slice(0, 7) === anoMesAtual;
          const texto = msgDoLembrete(lead, lem);
          return (
            <div className={"linha-item" + (feitoEsteMes ? " enviado" : "")} key={lem.id}>
              <span className="data">Todo dia {lem.diaDoMes}</span>
              <span className="desc"><b>Recorrente</b> — {lem.texto}</span>
              {!feitoEsteMes && <button className="btn2 zap" onClick={() => enviar(lead, texto)}><Ico n="send" size={14} /> Enviar agora</button>}
              <button className="btn2" title={feitoEsteMes ? "Desmarcar (voltar a lembrar este mês)" : "Marcar feito este mês"} onClick={() => marcarFeitoRecorrente(lem, feitoEsteMes)}>
                <Ico n="check" size={14} /> {feitoEsteMes ? "Feito ✓" : "Feito este mês"}
              </button>
              <button className="btn2" title="Excluir" onClick={() => salvar({ ...lead, lembretes: lead.lembretes.filter((l) => l.id !== lem.id) })}><Ico n="trash" size={14} /></button>
              {!feitoEsteMes && <div className="msg-preview">{texto}</div>}
            </div>
          );
        }
        const texto = msgDoLembrete(lead, lem);
        return (
          <div className={"linha-item" + (lem.enviado ? " enviado" : "")} key={lem.id}>
            <span className="data">{fmtBR(lem.data)}</span>
            <span className="desc"><b>{lem.tipo && templates[lem.tipo] ? templates[lem.tipo].titulo : "Personalizada"}</b></span>
            {!lem.enviado && <button className="btn2 zap" onClick={() => enviar(lead, texto)}><Ico n="send" size={14} /> Enviar agora</button>}
            {!lem.enviado && <button className="btn2" title="Marcar como enviada" onClick={() => salvar({ ...lead, lembretes: lead.lembretes.map((l) => l.id === lem.id ? { ...l, enviado: true } : l) })}><Ico n="check" size={14} /></button>}
            <button className="btn2" title="Excluir" onClick={() => salvar({ ...lead, lembretes: lead.lembretes.filter((l) => l.id !== lem.id) })}><Ico n="trash" size={14} /></button>
            {!lem.enviado && <div className="msg-preview">{texto}</div>}
          </div>
        );
      })}
      <h3>Agendar mensagem {recorrente ? "recorrente" : "personalizada"}</h3>
      <button type="button" className="btn2" style={{ marginBottom: 12 }} onClick={() => setRecorrente((r) => !r)}>
        <Ico n="refresh" size={14} /> {recorrente ? "Usar data única, em vez disso" : "Tornar recorrente (repete todo mês)"}
      </button>
      {recorrente ? (
        <>
          <label>Dia do mês pra lembrar</label>
          <input type="number" min="1" max="31" value={novo.diaDoMes} onChange={(e) => setNovo({ ...novo, diaDoMes: e.target.value })} />
        </>
      ) : (
        <>
          <label>Data</label>
          <input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
        </>
      )}
      <label>Mensagem (use {"{nome}"} para o nome do cliente)</label>
      <textarea value={novo.texto} onChange={(e) => setNovo({ ...novo, texto: e.target.value })} placeholder="Oi {nome}! …" />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => {
          if (!novo.texto.trim()) return;
          if (recorrente) {
            const dia = Math.min(31, Math.max(1, Number(novo.diaDoMes) || 1));
            salvar({ ...lead, lembretes: [...(lead.lembretes || []), { id: "r" + Date.now(), recorrente: true, diaDoMes: dia, texto: novo.texto.trim(), ultimaVezFeito: null }] });
          } else {
            salvar({ ...lead, lembretes: [...(lead.lembretes || []), { id: "p" + Date.now(), data: novo.data, texto: novo.texto.trim(), enviado: false }] });
          }
          setNovo({ data: hoje(), diaDoMes: 10, texto: "" });
        }}>
          <Ico n="calendar" size={14} /> {recorrente ? "Agendar recorrência" : "Agendar"}
        </button>
      </div>
    </div>
  );
}

export function ModalCompras({ lead, salvar }) {
  const [f, setF] = useState({ descricao: "", valor: "", data: hoje() });
  if (!lead) return null;
  const total = (lead.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  return (
    <div>
      <h2><Ico n="dollar" /> Compras — {lead.nome || lead.telefone}</h2>
      <div className="total-gasto">Total gasto: {fmtDinheiro(total)}</div>
      {(lead.compras || []).map((c, i) => (
        <div className="linha-item" key={i}>
          <span className="data">{fmtBR(c.data)}</span>
          <span className="desc">{c.descricao}</span>
          <b>{fmtDinheiro(c.valor)}</b>
          <button className="btn2" onClick={() => salvar({ ...lead, compras: lead.compras.filter((_, j) => j !== i) })}><Ico n="trash" size={14} /></button>
        </div>
      ))}
      <h3>Registrar compra/serviço</h3>
      <label>Descrição</label>
      <input type="text" value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} placeholder="Formatação + SSD 480GB" />
      <label>Valor (R$)</label>
      <input type="number" value={f.valor} onChange={(e) => setF({ ...f, valor: e.target.value })} />
      <label>Data</label>
      <input type="date" value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!f.descricao || !f.valor) return;
          salvar({ ...lead, compras: [...(lead.compras || []), { ...f, valor: Number(f.valor) }] });
          setF({ descricao: "", valor: "", data: hoje() }); }}>
          <Ico n="plus" size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}

export function ModalTags({ lead, salvar }) {
  const { tags: TAGS } = useTags();
  if (!lead) return null;
  const ativa = (id) => (lead.tags || []).includes(id);
  return (
    <div>
      <h2><Ico n="tag" /> Etiquetas — {lead.nome || lead.telefone}</h2>
      <p style={{ fontSize: 13, color: "var(--cinza)", marginBottom: 8 }}>Clique para ativar/desativar. As etiquetas aparecem no card e funcionam na busca. Pra criar, renomear ou mudar a cor das etiquetas, use Configurações.</p>
      {TAGS.map((t) => (
        <button key={t.id} className={"tag-opcao " + (ativa(t.id) ? "on" : "off")} style={{ background: t.cor }}
          onClick={() => salvar({ ...lead, tags: ativa(t.id) ? lead.tags.filter((x) => x !== t.id) : [...(lead.tags || []), t.id] })}>
          {ativa(t.id) && <Ico n="check" size={13} />}{t.nome}
        </button>
      ))}
    </div>
  );
}

// Disparo rápido: escolhe uma estratégia cadastrada (Estratégias), escolhe a variação
// e manda pro WhatsApp já com o texto pronto — sem depender de agenda/cadência.
export function ModalDisparo({ lead, templates, render, enviar }) {
  const { estrategias } = useEstrategias();
  const [tipo, setTipo] = useState(null);
  if (!lead) return null;

  if (!tipo) {
    // já vem ordenado pelo campo "ordem" (definido em Estratégias, arrastando os cards)
    const disponiveis = estrategias.filter((m) => m.habilitado);
    return (
      <div>
        <h2><Ico n="send" /> Disparo — {lead.nome || lead.telefone}</h2>
        <p style={{ fontSize: 13, color: "var(--cinza)", marginBottom: 10 }}>Escolha a estratégia que você quer acionar agora pra este cliente.</p>
        <div className="grid-estrategias grid-estrategias-compacta">
          {disponiveis.map((m) => (
            <div key={m.tipo} className="card-estrategia" onClick={() => setTipo(m.tipo)}>
              <div className="icone-grande"><Ico n={m.icone} size={18} /></div>
              <h3>{m.titulo}</h3>
              <p>{m.subtitulo}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const meta = estrategias.find((m) => m.tipo === tipo);
  const variacoes = templates?.[tipo]?.variacoes || [];
  return (
    <div>
      <button className="btn2" style={{ marginBottom: 14 }} onClick={() => setTipo(null)}><Ico n="chevronLeft" size={14} /> Trocar estratégia</button>
      <h2><Ico n={meta.icone} /> {meta.titulo} — {lead.nome || lead.telefone}</h2>
      {variacoes.length === 0 && <div className="vazio">Nenhuma variação cadastrada pra essa estratégia ainda — edite em Estratégias.</div>}
      {variacoes.map((_, i) => {
        const texto = render(tipo, primeiroNome(lead.nome), i);
        return (
          <div className="variacao-box" key={i} style={{ marginBottom: 10 }}>
            <label><span>Variação {i + 1}</span></label>
            <div className="variacao-preview" style={{ marginTop: 0 }}>{texto}</div>
            <div className="acoes" style={{ marginTop: 10, justifyContent: "flex-end" }}>
              <button className="btn2 zap" onClick={() => enviar(lead, tipo, texto)}><IcoZap size={14} /> Enviar</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
