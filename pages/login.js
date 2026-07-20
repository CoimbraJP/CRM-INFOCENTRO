import { useState } from "react";
import Head from "next/head";
import { Ico } from "../lib/icons";

// Login só por senha: a senha identifica o usuário.
// A senha mestre cai direto na área de administração.
export default function LoginPage() {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState(null);
  const [entrando, setEntrando] = useState(false);

  async function entrar(e) {
    e.preventDefault();
    if (!senha) return;
    setEntrando(true); setErro(null);
    try {
      const r = await fetch("/api/auth", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setErro(j.error || "Não consegui entrar"); setEntrando(false); return; }
      // recarrega tudo pra etiquetas/estratégias carregarem já autenticadas
      window.location.href = j.admin ? "/admin" : "/";
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
        <label>Senha</label>
        <input type="password" autoFocus autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="••••••" />
        {erro && <div className="login-erro"><Ico n="alerta" size={14} /> {erro}</div>}
        <button className="btn2 primario login-botao" type="submit" disabled={entrando}>
          {entrando ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
