import { useEffect, useState, useCallback } from "react";

// Liga/desliga o mini-calendário fixo na barra lateral (visível em qualquer tela, não só na
// tela Calendário). Preferência salva; avisa a Sidebar via evento pra atualizar na hora.
export function useCalendarioLateral() {
  const [ativo, setAtivo] = useState(false);

  useEffect(() => {
    try { setAtivo(localStorage.getItem("sidebar-mini-calendario") === "1"); } catch (e) {}
  }, []);

  const alternar = useCallback(() => {
    setAtivo((atual) => {
      const novo = !atual;
      try { localStorage.setItem("sidebar-mini-calendario", novo ? "1" : "0"); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent("crm-mini-calendario", { detail: novo })); } catch (e) {}
      return novo;
    });
  }, []);

  return [ativo, alternar];
}
