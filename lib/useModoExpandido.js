import { useEffect, useState, useCallback } from "react";

// Liga/desliga o "modo expandido" das telas de quadro (Kanban): esconde painéis extras
// (quando a página tiver) e aumenta a altura útil das listas, além de recolher a barra
// lateral pra ganhar espaço dos lados. A preferência fica salva e vale em todas as telas.
export function useModoExpandido() {
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    try { setExpandido(localStorage.getItem("board-expandido") === "1"); } catch (e) {}
  }, []);

  const alternar = useCallback(() => {
    setExpandido((atual) => {
      const novo = !atual;
      try { localStorage.setItem("board-expandido", novo ? "1" : "0"); } catch (e) {}
      try { window.dispatchEvent(new CustomEvent("crm-forcar-sidebar", { detail: novo })); } catch (e) {}
      return novo;
    });
  }, []);

  return [expandido, alternar];
}
