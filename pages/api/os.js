// Proxy somente-leitura para as Ordens de Serviço do PDV.
// Ainda não ativado: precisa de PDV_API_URL e PDV_API_TOKEN nas envs do Vercel.
// O CRM nunca acessa o banco infopdv diretamente — só via HTTP, como definido nas diretrizes.
export default async function handler(req, res) {
  const { PDV_API_URL, PDV_API_TOKEN } = process.env;
  if (!PDV_API_URL || !PDV_API_TOKEN) {
    return res.status(501).json({
      configurado: false,
      error: "Integração com o PDV ainda não configurada — faltam PDV_API_URL e PDV_API_TOKEN nas variáveis de ambiente.",
    });
  }
  try {
    const r = await fetch(`${PDV_API_URL.replace(/\/$/, "")}/api/sync?collection=serviceorders`, {
      headers: { Authorization: `Bearer ${PDV_API_TOKEN}` },
    });
    const j = await r.json();
    if (!r.ok) return res.status(r.status).json({ configurado: true, error: j.error || "Erro ao consultar o PDV" });
    // formato esperado do PDV: [{ id, updatedAt, deleted, data }]
    const ordens = (Array.isArray(j) ? j : j.data || []).filter((x) => !x.deleted);
    return res.json({ configurado: true, ordens });
  } catch (e) {
    return res.status(502).json({ configurado: true, error: "Não consegui conectar ao PDV: " + e.message });
  }
}
