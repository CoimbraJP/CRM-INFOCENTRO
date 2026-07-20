import { useState } from "react";
import { Ico, IcoZap } from "../lib/icons";
import { hoje, fmtBR, fmtDinheiro, ehAniversarioHoje, addDias } from "../lib/crmHelpers";
import { useTags } from "../lib/TagsContext";

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
export function Card({ lead, abrir, zapDireto, onDragStart, onDragOver, onDrop, onDragEnd, dragging, dropPos, pousou }) {
  const { tags: TAGS } = useTags();
  const pendentes = (lead.lembretes || []).filter((l) => !l.enviado).length;
  const totalCompras = (lead.compras || []).reduce((s, c) => s + (Number(c.valor) || 0), 0);
  const semResposta = (lead.lembretes || []).filter((l) => l.enviado).length >= 2 && (lead.respostas || []).length === 0;
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

export function ModalImportar({ opts, setOpts, fileRef, onFile }) {
  return (
    <div>
      <h2><Ico n="upload" /> Importar planilha Excel</h2>
      <p style={{ fontSize: 13, color: "var(--cinza)" }}>
        A planilha precisa ter colunas com <b>telefone</b> (obrigatório) e, se tiver, <b>nome</b>, <b>serviço</b> e <b>nascimento</b>.
        Números repetidos são ignorados automaticamente.
      </p>
      <label style={{ display: "flex", alignItems: "center", gap: 8, margin: "14px 0", fontSize: 14, color: "var(--texto)", fontWeight: 400 }}>
        <input type="checkbox" checked={opts.cadencia} onChange={(e) => setOpts({ ...opts, cadencia: e.target.checked })} />
        Preencher agenda automática: <b>D+0, D+5 e D+30</b> com as mensagens prontas
      </label>
      <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onFile} />
    </div>
  );
}

export function ModalEditar({ lead, onSalvar, onExcluir }) {
  const [f, setF] = useState({
    nome: lead?.nome || "", telefone: lead?.telefone || "", servico: lead?.servico || "",
    nascimento: lead?.nascimento || "", cadencia: !lead,
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
      {!lead && (
        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: "var(--texto)", fontWeight: 400, fontSize: 14 }}>
          <input type="checkbox" checked={f.cadencia} onChange={(e) => setF({ ...f, cadencia: e.target.checked })} />
          Preencher agenda D+0 / D+5 / D+30
        </label>
      )}
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
  const [novo, setNovo] = useState({ data: hoje(), texto: "" });
  if (!lead) return null;
  const temCadencia = (lead.lembretes || []).some((l) => l.tipo === "D0");
  return (
    <div>
      <h2><Ico n="calendar" /> Agenda de mensagens — {lead.nome || lead.telefone}</h2>
      {!temCadencia && (
        <button className="btn2 primario" style={{ marginBottom: 10 }}
          onClick={() => salvar({ ...lead, lembretes: [...(lead.lembretes || []), ...novaCadencia(hoje())] })}>
          <Ico n="zapRaio" size={15} /> Preencher cadência D+0 / D+5 / D+30
        </button>
      )}
      {(lead.lembretes || []).length === 0 && <div className="vazio">Nenhuma mensagem agendada.</div>}
      {(lead.lembretes || []).map((lem) => {
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
      <h3>Agendar mensagem personalizada</h3>
      <label>Data</label>
      <input type="date" value={novo.data} onChange={(e) => setNovo({ ...novo, data: e.target.value })} />
      <label>Mensagem (use {"{nome}"} para o nome do cliente)</label>
      <textarea value={novo.texto} onChange={(e) => setNovo({ ...novo, texto: e.target.value })} placeholder="Oi {nome}! …" />
      <div className="acoes">
        <button className="btn2 primario" onClick={() => { if (!novo.texto.trim()) return;
          salvar({ ...lead, lembretes: [...(lead.lembretes || []), { id: "p" + Date.now(), data: novo.data, texto: novo.texto.trim(), enviado: false }] });
          setNovo({ data: hoje(), texto: "" }); }}>
          <Ico n="calendar" size={14} /> Agendar
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
