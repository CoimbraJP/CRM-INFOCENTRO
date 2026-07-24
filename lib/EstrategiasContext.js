import { createContext, useContext, useEffect, useState, useCallback } from "react";

const Ctx = createContext(null);

// Lista ordenável de estratégias (builtins do sistema + criadas pelo usuário). A ordem definida
// aqui é a mesma usada no grid de Estratégias e no picker do botão DISPARO.
export function EstrategiasProvider({ children }) {
  const [estrategias, setEstrategias] = useState([]);
  const [carregado, setCarregado] = useState(false);

  const recarregar = useCallback(async () => {
    try {
      const r = await fetch("/api/estrategias");
      const j = await r.json();
      if (r.ok && Array.isArray(j)) setEstrategias(j);
    } catch (e) { /* silencioso */ }
    setCarregado(true);
  }, []);

  useEffect(() => { recarregar(); }, [recarregar]);

  async function criar({ titulo, subtitulo, icone }) {
    const r = await fetch("/api/estrategias", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, subtitulo, icone }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok) await recarregar();
    return r.ok ? j.estrategia : null;
  }

  // reordenação otimista (like o drag&drop de listas): já atualiza local, depois persiste
  async function reordenar(tipo, novaOrdem) {
    setEstrategias((es) => es.map((e) => (e.tipo === tipo ? { ...e, ordem: novaOrdem } : e)).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0)));
    await fetch("/api/estrategias", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, ordem: novaOrdem }),
    });
  }

  async function atualizarMeta(tipo, dados) {
    setEstrategias((es) => es.map((e) => (e.tipo === tipo ? { ...e, ...dados } : e)));
    const r = await fetch("/api/estrategias", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, ...dados }),
    });
    return r.ok;
  }

  async function excluir(tipo) {
    const r = await fetch("/api/estrategias?tipo=" + encodeURIComponent(tipo), { method: "DELETE" });
    const j = await r.json().catch(() => ({}));
    if (r.ok) setEstrategias((es) => es.filter((e) => e.tipo !== tipo));
    return { ok: r.ok, error: j.error };
  }

  return (
    <Ctx.Provider value={{ estrategias, carregado, criar, reordenar, atualizarMeta, excluir, recarregar }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEstrategias() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEstrategias precisa estar dentro de <EstrategiasProvider>");
  return ctx;
}
