import { getDb } from "../../lib/mongodb";

// Guarda em qual lista MANUAL (definida pelo usuário no board OS) cada Ordem de Serviço está.
// A OS em si nunca é salva aqui — só a referência osId -> listId, pro board poder ser organizado
// mesmo a OS vindo sempre ao vivo do PDV.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const db = await getDb();
    const col = db.collection("os_placement");

    if (req.method === "GET") {
      const docs = await col.find({}).toArray();
      return res.status(200).json(docs);
    }

    if (req.method === "PUT") {
      const { osId, listId } = req.body || {};
      if (!osId || !listId) return res.status(400).json({ error: "faltou osId ou listId" });
      await col.updateOne(
        { osId: String(osId) },
        { $set: { osId: String(osId), listId, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
