import { getDb } from "../../lib/mongodb";
import { exigirLogin, filtroTenant } from "../../lib/auth";

// Guarda em qual lista MANUAL (definida pelo usuário no board OS) cada Ordem de Serviço está.
// A OS em si nunca é salva aqui — só a referência osId -> listId (+ ordem), pro board poder
// ser organizado mesmo a OS vindo sempre ao vivo do PDV.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);

    const db = await getDb();
    const col = db.collection("os_placement");

    if (req.method === "GET") {
      const docs = await col.find(filtroT).toArray();
      return res.status(200).json(docs);
    }

    if (req.method === "PUT") {
      const { osId, listId, ordem } = req.body || {};
      if (!osId) return res.status(400).json({ error: "faltou osId" });
      const set = { osId: String(osId), tenant: sessao.tenant, updatedAt: new Date().toISOString() };
      if (listId !== undefined) set.listId = listId;
      if (ordem !== undefined) set.ordem = ordem;
      await col.updateOne({ $and: [{ osId: String(osId) }, filtroT] }, { $set: set }, { upsert: true });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
