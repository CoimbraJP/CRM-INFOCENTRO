import { getDb } from "../../lib/mongodb";
import { exigirLogin, filtroTenant } from "../../lib/auth";

// Mini-CRM próprio da tela de OS: observações, agenda de mensagens, compras e etiquetas
// para clientes que vieram só pela Ordem de Serviço (ainda não promovidos ao CRM geral).
// Guardado por osId — nunca mistura com a collection "leads" do CRM geral, nem com infopdv.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);

    const db = await getDb();
    const col = db.collection("os_leads");

    if (req.method === "GET") {
      const docs = await col.find(filtroT).toArray();
      return res.status(200).json(docs);
    }

    if (req.method === "PUT") {
      const { osId, tags, observacoes, compras, lembretes } = req.body || {};
      if (!osId) return res.status(400).json({ error: "faltou osId" });
      await col.updateOne(
        { $and: [{ osId: String(osId) }, filtroT] },
        { $set: {
            osId: String(osId),
            tags: tags || [],
            observacoes: observacoes || [],
            compras: compras || [],
            lembretes: lembretes || [],
            tenant: sessao.tenant,
            updatedAt: new Date().toISOString(),
          } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
