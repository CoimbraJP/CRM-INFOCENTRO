import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { Ico } from "../lib/icons";

export default function LoginPage() {
  const [f, setF] = useState({ usuario: "", senha: "" });
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    if (!f.usuario || !f.senha) return;
    setEntrando(true); setErro(null);
    try {
      const r = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario: f.usuario, senha: f.senha }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j.error || "Não consegui entrar"); setEntrando(false); return; }
      // recarrega tudo pra etiquetas/estratégias carregarem já autenticadas
      window.location.href = "/";
    } catch (err) {
      setErro(String(err.message || err)); setEntrando(false);
    }
  }

  return (
    <div className="login-fundo">
      <Head><title>Entrar — CRM INFO Centro</title></Head>
      <form className="login-card" onSubmit={entrar}>
        <img src="/logo-wide.png" alt="INFO Centro" className="login-logo" />
        <h1><Ico n="lock" size={18} /> Acesso ao sistema</h1>
        <label>Usuário</label>
        <input type="text" autoFocus autoComplete="username" value={f.usuario} onChange={(e) => setF({ ...f, usuario: e.target.value })} placeholder="Nome do usuário" />
        <label>Senha</label>
        <input type="password" autoComplete="current-password" value={f.senha} onChange={(e) => setF({ ...f, senha: e.target.value })} placeholder="••••••" />
        {erro && <div className="login-erro"><Ico n="alerta" size={14} /> {erro}</div>}
        <button className="btn2 primario login-botao" type="submit" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
        <Link href="/admin" className="login-master">Área do administrador</Link>
      </form>
    </div>
  );
}
