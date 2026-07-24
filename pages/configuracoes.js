import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { Ico } from "../lib/icons";
import { useTags } from "../lib/TagsContext";

const CONFIG_META_BASE = [
  { id: "etiquetas", titulo: "Etiquetas", subtitulo: "Nomes e cores — usados em todo o sistema", icone: "tag" },
  { id: "logo", titulo: "Logo da conta", subtitulo: "Imagem exibida no topo, só nesta conta", icone: "laptop" },
  { id: "limpar", titulo: "Limpar dados", subtitulo: "Apagar todos os clientes do CRM", icone: "trash" },
];
// Integração PDV e Sobre só existem na conta INFOCENTRO (é onde a integração com o PDV acontece)
const CONFIG_META_INFOCENTRO = [
  { id: "pdv", titulo: "Integração PDV", subtitulo: "Status da conexão com as Ordens de Serviço", icone: "wrench" },
  { id: "sobre", titulo: "Sobre o sistema", subtitulo: "Banco de dados e ambiente", icone: "info" },
];

export default function ConfiguracoesPage() {
  const [aberta, setAberta] = useState(null);
  const [tenant, setTenant] = useState(null);
  useEffect(() => {
    fetch("/api/auth").then((r) => r.json()).then((j) => setTenant(j.tenant || null)).catch(() => {});
  }, []);
  const CONFIG_META = [...CONFIG_META_BASE, ...(tenant === "INFOCENTRO" ? CONFIG_META_INFOCENTRO : [])];
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
            {aberta === "logo" && <PainelLogo tenant={tenant} />}
            {aberta === "limpar" && <PainelLimparDados />}
            {aberta === "pdv" && <PainelPdv />}
            {aberta === "sobre" && <PainelSobre />}
          </div>
        )}
      </div>
    </Layout>
  );
}

function PainelLimparDados() {
  const [apagando, setApagando] = useState(false);

  async function limpar() {
    const passo1 = confirm(
      "Isso vai apagar PERMANENTEMENTE todos os clientes do CRM principal (cards, observações, compras, mensagens agendadas).\n\n" +
      "NÃO afeta a página OS nem os outros quadros de CRM.\n\n" +
      "Recomendo fazer um Backup antes (botão Backup na tela do CRM). Quer continuar?"
    );
    if (!passo1) return;
    const digitado = prompt('Última confirmação: digite APAGAR (tudo maiúsculo) para excluir todos os clientes.');
    if (digitado !== "APAGAR") { if (digitado !== null) alert('Não bateu com "APAGAR" — nada foi apagado.'); return; }
    setApagando(true);
    const r = await fetch("/api/leads?board=crm&all=1&confirmar=APAGAR", { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    setApagando(false);
    if (!r.ok) { alert("Não consegui limpar: " + (j.error || r.status)); return; }
    alert(`${j.apagados ?? 0} cliente(s) apagado(s). O CRM principal está zerado.`);
  }

  return (
    <div>
      <div className="aviso" style={{ marginBottom: 14 }}>
        <b>Atenção:</b> esta ação é permanente e não tem desfazer. Apaga todos os clientes do CRM principal.
        Faça um <b>Backup</b> antes (botão Backup na tela do CRM) se ainda não fez.
      </div>
      <button className="btn2 perigo" disabled={apagando} onClick={limpar}>
        <Ico n="trash" size={15} /> {apagando ? "Apagando…" : "Apagar todos os clientes do CRM"}
      </button>
    </div>
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
    if (!confirm(`Excluir a etiqueta "${t.nome}"?`)) return;
    const r = await excluir(t.id);
    if (!r.ok) alert(r.error || "Não consegui excluir a etiqueta.");
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

function PainelLogo({ tenant }) {
  const [logo, setLogo] = useState(undefined); // undefined = carregando, null = sem logo custom
  const [nome, setNome] = useState("");
  const [nomeSalvo, setNomeSalvo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [salvandoNome, setSalvandoNome] = useState(false);
  const ehInfocentro = tenant === "INFOCENTRO";

  useEffect(() => {
    fetch("/api/logo").then((r) => r.json()).then((j) => {
      setLogo(j.logo || null);
      setNome(j.nome || "");
      setNomeSalvo(j.nome || null);
    }).catch(() => setLogo(null));
  }, []);

  function onArquivo(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    const leitor = new FileReader();
    leitor.onload = () => {
      const img = new Image();
      img.onload = async () => {
        // redimensiona pro logo caber numa topbar (max 480x160) e comprime, pra ficar leve no banco
        const alvoW = 480, alvoH = 160;
        const escala = Math.min(alvoW / img.width, alvoH / img.height, 1);
        const w = Math.round(img.width * escala), h = Math.round(img.height * escala);
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/png");
        setEnviando(true);
        const r = await fetch("/api/logo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ logo: dataUrl }) });
        setEnviando(false);
        if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || "Não consegui salvar o logo."); return; }
        setLogo(dataUrl);
        window.location.reload(); // recarrega pra atualizar o logo já na topbar
      };
      img.src = leitor.result;
    };
    leitor.readAsDataURL(file);
  }

  async function removerLogo() {
    if (!confirm("Remover o logo desta conta?")) return;
    const r = await fetch("/api/logo", { method: "DELETE" });
    if (!r.ok) { alert("Não consegui remover."); return; }
    setLogo(null);
    window.location.reload();
  }

  async function salvarNome() {
    setSalvandoNome(true);
    const r = await fetch("/api/logo", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nome }) });
    setSalvandoNome(false);
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || "Não consegui salvar o nome."); return; }
    setNomeSalvo(nome || null);
    window.location.reload();
  }

  if (logo === undefined) return <div className="vazio">Carregando…</div>;

  return (
    <div>
      <p style={{ fontSize: 13, color: "var(--cinza)", marginBottom: 14 }}>
        Esse logo e nome aparecem no topo do sistema só pra quem está logado nesta conta — as outras contas não são afetadas.
      </p>

      <h3 style={{ fontSize: 14, marginBottom: 6 }}>Imagem do logo</h3>
      <p style={{ fontSize: 12.5, color: "var(--cinza)", marginBottom: 10 }}>
        Formato recomendado: <b>PNG com fundo transparente</b>, imagem larga e baixa (tipo um retângulo, não quadrada) —
        algo em torno de <b>480×160 pixels</b> fica ideal. Qualquer tamanho funciona, a imagem é redimensionada e comprimida automaticamente ao subir.
      </p>
      <div style={{ padding: 16, border: "1px dashed var(--borda)", borderRadius: 12, background: "var(--card)", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 90 }}>
        {logo ? (
          <img src={logo} alt="Logo atual" style={{ maxWidth: "100%", maxHeight: 80 }} />
        ) : (
          <span style={{ fontSize: 12.5, color: "var(--cinza)" }}>
            {ehInfocentro ? "Nenhum logo próprio — usando o logo padrão da INFO Centro." : "Nenhum logo próprio — o topo mostra um ícone simples com o nome desta conta."}
          </span>
        )}
      </div>
      <label className="btn2 primario" style={{ display: "inline-flex", cursor: "pointer" }}>
        <Ico n="upload" size={14} /> {enviando ? "Enviando…" : logo ? "Trocar logo" : "Enviar logo"}
        <input type="file" accept="image/*" onChange={onArquivo} disabled={enviando} style={{ display: "none" }} />
      </label>
      {logo && (
        <button className="btn2 perigo" style={{ marginLeft: 10 }} onClick={removerLogo}><Ico n="trash" size={14} /> Remover logo</button>
      )}

      <h3 style={{ fontSize: 14, margin: "22px 0 6px" }}>Nome exibido</h3>
      <p style={{ fontSize: 12.5, color: "var(--cinza)", marginBottom: 10 }}>
        {ehInfocentro
          ? "Não é obrigatório aqui — o logo padrão já tem o nome embutido na imagem. Se preencher, este texto aparece do lado do logo, sem substituí-lo."
          : "Aparece ao lado do logo, sempre que os dois estiverem preenchidos. Se não subir logo nenhum, aparece só este nome ao lado de um ícone simples."}
      </p>
      <div style={{ display: "flex", gap: 8, maxWidth: 420 }}>
        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Revenda XPTO" style={{ flex: 1 }} />
        <button className="btn2 primario" disabled={salvandoNome || nome === (nomeSalvo || "")} onClick={salvarNome}>
          <Ico n="save" size={14} /> {salvandoNome ? "Salvando…" : "Salvar"}
        </button>
      </div>
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
