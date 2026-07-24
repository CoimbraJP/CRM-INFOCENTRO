import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { TAGS as PADRAO } from "./crmHelpers";

const Ctx = createContext(null);

// Etiquetas do sistema (nome/cor) — carregadas do banco (collection "tags") e usadas em
// todo o CRM: chips do card, seletor de etiquetas, busca/exportação e board Etiquetas.
export function TagsProvider({ children }) {
  const [tags, setTags] = useState(PADRAO);
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch("/api/tags");
      const j = await r.json();
      if (r.ok && Array.isArray(j) && j.length) setTags(j);
    } catch (e) { /* silencioso — cai no fallback padrão */ }
    setCarregado(true);
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  async function salvar(tag) {
    const r = await fetch("/api/tags", {
      method: tag.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(tag),
    });
    if (r.ok) await recarregar();
    return r.ok;
  }
  async function excluir(id) {
    const r = await fetch("/api/tags?id=" + encodeURIComponent(id), { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) await recarregar();
    return { ok: r.ok, error: j.error };
  }

  return (
    <Ctx.Provider value={{ tags, carregado, salvar, excluir, recarregar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTags() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTags precisa estar dentro de <TagsProvider>");
  return ctx;
}
