import { useEffect, useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Ico } from "../lib/icons";

// Área master: gestão de usuários do sistema (nome e senha) + entrada direta em qualquer conta.
export default function AdminPage() {
  const [logado, setLogado] = useState(false);
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [usuarios, setUsuarios] = useState(null);
  const [novo, setNovo] = useState({ nome: "", senha: "" });

  useEffect(() => {
    fetch("/api/auth").then((r) => r.json().then((j) => {
      if (r.ok && j.admin) { setLogado(true); carregar(); }
    })).catch(() => {});
  }, []);

  async function entrar(e) {
    e.preventDefault();
    setErro(null);
    const r = await fetch("/api/auth", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ master: senha }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.admin) { setErro(j.error || "senha incorreta"); return; }
    setLogado(true);
    carregar();
  }

  async function carregar() {
    const r = await fetch("/api/tenants");
    const j = await r.json().catch(() => []);
    if (r.ok) setUsuarios(j);
  }

  async function salvarUsuario(u, campos) {
    const r = await fetch("/api/tenants", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: u._id, ...campos }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || "erro ao salvar"); }
    carregar();
  }

  async function entrarNaConta(u) {
    const r = await fetch("/api/tenants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entrar: u._id }),
    });
    if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || "erro ao entrar"); return; }
    window.location.href = "/";
  }

  async function criarUsuario() {
    if (!novo.nome.trim() || !novo.senha) { alert("Preencha nome e senha do novo usuário."); return; }
    const r = await fetch("/api/tenants", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(novo),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { alert(j.error || "erro ao criar"); return; }
    setNovo({ nome: "", senha: "" });
    carregar();
  }

  async function sair() {
    await fetch("/api/auth", { method: "DELETE" });
    window.location.href = "/login";
  }

  if (!logado) {
    return (
      <div className="login-fundo">
        <Head><title>Administração — CRM INFO Centro</title></Head>
        <form className="login-card" onSubmit={entrar}>
          <img src="/logo-wide.png" alt="INFO Centro" className="login-logo" />
          <h1><Ico n="settings" size={18} /> Área do administrador</h1>
          <label>Senha mestre</label>
          <input type="password" autoFocus value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••••" />
          {erro && <div className="login-erro"><Ico n="alerta" size={14} /> {erro}</div>}
          <button className="btn2 primario login-botao" type="submit">Abrir</button>
          <Link href="/login" className="login-master">← Voltar ao login</Link>
        </form>
      </div>
    );
  }

  return (
    <div className="login-fundo" style={{ alignItems: "flex-start", paddingTop: 60 }}>
      <Head><title>Usuários — CRM INFO Centro</title></Head>
      <div className="login-card" style={{ maxWidth: 620 }}>
        <h1><Ico n="user" size={18} /> Usuários do sistema</h1>
        <p style={{ fontSize: 12.5, color: "var(--cinza)", marginBottom: 14 }}>
          Edite nome e senha, ou use <b>Entrar</b> pra abrir a conta do usuário direto, já autenticado.
          Cada senha precisa ser única — é ela que identifica o usuário no login.
        </p>

        {!usuarios && <div className="vazio">Carregando…</div>}
        {usuarios && usuarios.map((u) => <LinhaUsuario key={u._id} u={u} salvar={salvarUsuario} entrarNaConta={entrarNaConta} />)}

        <h2 style={{ fontSize: 14, margin: "18px 0 6px" }}>Novo usuário</h2>
        <div className="etiqueta-linha" style={{ marginBottom: 0 }}>
          <input type="text" placeholder="Nome" value={novo.nome} onChange={(e) => setNovo({ ...novo, nome: e.target.value })} />
          <input type="text" placeholder="Senha" value={novo.senha} onChange={(e) => setNovo({ ...novo, senha: e.target.value })} style={{ maxWidth: 140 }} />
          <button className="btn2 primario" onClick={criarUsuario}><Ico n="plus" size={14} /> Criar</button>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
          <button className="btn2" onClick={sair}><Ico n="logout" size={14} /> Sair da administração</button>
        </div>
      </div>
    </div>
  );
}

function LinhaUsuario({ u, salvar, entrarNaConta }) {
  const [f, setF] = useState({ nome: u.nome, senha: u.senha });
  const mudou = f.nome !== u.nome || f.senha !== u.senha;
  return (
    <div className="etiqueta-linha">
      <input type="text" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} title="Nome do usuário" />
      <input type="text" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} title="Senha" style={{ maxWidth: 130 }} />
      <button className={"btn2" + (mudou ? " primario" : "")} disabled={!mudou} onClick={() => salvar(u, f)} title="Salvar alterações">
        <Ico n="save" size={14} />
      </button>
      <button className="btn2" onClick={() => entrarNaConta(u)} title={"Entrar na conta " + u.nome}>
        <Ico n="logout" size={14} /> Entrar
      </button>
    </div>
  );
}
