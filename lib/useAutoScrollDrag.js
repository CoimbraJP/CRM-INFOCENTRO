import { useRef, useEffect, useCallback } from "react";

// Auto-scroll vertical durante drag-and-drop (estilo Trello/HubSpot): quando o ponteiro
// chega perto do topo ou da base de um container rolável (.lista-corpo), ele rola sozinho e
// suave. A velocidade é proporcional à proximidade da borda, então perto da beirada rola mais
// rápido. Usa requestAnimationFrame (não setInterval) pra ficar fluido e leve.
export function useAutoScrollDrag() {
  const alvoRef = useRef(null); // elemento sendo rolado no momento
  const velRef = useRef(0); // velocidade atual em px por frame
  const rafRef = useRef(null);

  const loop = useCallback(() => {
    const el = alvoRef.current;
    if (el && velRef.current !== 0) {
      el.scrollTop += velRef.current;
      rafRef.current = requestAnimationFrame(loop);
    } else {
      rafRef.current = null;
    }
  }, []);

  const pararAutoScroll = useCallback(() => {
    velRef.current = 0;
    alvoRef.current = null;
    if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
  }, []);

  // chamar no onDragOver do container rolável (a área de cards da coluna)
  const aoArrastarSobre = useCallback((e) => {
    const el = e.currentTarget;
    if (!el || el.scrollHeight <= el.clientHeight) { pararAutoScroll(); return; }
    const rect = el.getBoundingClientRect();
    const zona = 70; // px de "gatilho" perto do topo e da base
    const velMax = 16; // px por frame no ponto mais próximo da borda
    const y = e.clientY;
    let vel = 0;
    if (y < rect.top + zona) {
      const intensidade = Math.min(1, (rect.top + zona - y) / zona);
      vel = -Math.ceil(intensidade * velMax);
    } else if (y > rect.bottom - zona) {
      const intensidade = Math.min(1, (y - (rect.bottom - zona)) / zona);
      vel = Math.ceil(intensidade * velMax);
    }
    velRef.current = vel;
    alvoRef.current = vel !== 0 ? el : null;
    if (vel !== 0 && !rafRef.current) rafRef.current = requestAnimationFrame(loop);
  }, [loop, pararAutoScroll]);

  useEffect(() => () => pararAutoScroll(), [pararAutoScroll]);

  return { aoArrastarSobre, pararAutoScroll };
}
