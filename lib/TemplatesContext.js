import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { TEMPLATES as DEFAULTS, renderFrom } from "./messages";

const Ctx = createContext(null);

export function TemplatesProvider({ children }) {
  const [overrides, setOverrides] = useState({});
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch("/api/templates");
      const j = await r.json();
      if (r.ok && j && typeof j === "object") setOverrides(j);
    } catch (e) { /* silencioso — cai no fallback padrão */ }
    setCarregado(true);
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  // mescla: usa override do banco se existir e tiver variações; senão usa o padrão do arquivo
  const templates = { ...DEFAULTS };
  for (const tipo of Object.keys(DEFAULTS)) {
    if (overrides[tipo]?.variacoes?.length) templates[tipo] = overrides[tipo];
  }

  async function salvar(tipo, titulo, variacoes) {
    const r = await fetch("/api/templates", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, titulo, variacoes }),
    });
    if (r.ok) await recarregar();
    return r.ok;
  }

  function render(tipo, nome, indice = null) {
    return renderFrom(templates, tipo, nome, indice);
  }

  return (
    <Ctx.Provider value={{ templates, carregado, salvar, render, recarregar, personalizados: overrides }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTemplates() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTemplates precisa estar dentro de <TemplatesProvider>");
  return ctx;
}
