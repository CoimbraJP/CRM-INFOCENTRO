import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import CrmBoard from "../../components/CrmBoard";
import Layout from "../../components/Layout";

export default function QuadroCrmPage() {
  const router = useRouter();
  const { board } = router.query;
  const [nome, setNome] = useState(null);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    if (!router.isReady || !board) return;
    fetch("/api/crm-boards")
      .then((r) => r.json())
      .then((lista) => {
        const achado = Array.isArray(lista) ? lista.find((b) => b.key === board) : null;
        if (achado) setNome(achado.nome);
        else setNaoEncontrado(true);
      })
      .catch(() => setNaoEncontrado(true));
  }, [router.isReady, board]);

  if (naoEncontrado) {
    return (
      <Layout titulo="CRM">
        <div style={{ padding: 40, textAlign: "center", color: "var(--cinza)" }}>Este quadro de CRM não existe (ou foi excluído).</div>
      </Layout>
    );
  }
  if (!router.isReady || !board || nome === null) {
    return (
      <Layout titulo="CRM">
        <div style={{ padding: 40, textAlign: "center" }}>Carregando…</div>
      </Layout>
    );
  }
  return <CrmBoard board={board} titulo={nome} />;
}
