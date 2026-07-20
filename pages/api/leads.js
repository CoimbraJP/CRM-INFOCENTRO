import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const col = db.collection("leads");

    if (req.method === "GET") {
      const leads = await col.find({}).sort({ createdAt: -1 }).toArray();
      return res.json(leads);
    }

    if (req.method === "POST") {
      // aceita um lead ou um array (importação)
      const body = req.body;
      const now = new Date().toISOString();
      const docs = (Array.isArray(body) ? body : [body]).map((l) => ({
        nome: l.nome || "",
        telefone: l.telefone || "",
        servico: l.servico || "",
        nascimento: l.nascimento || "",
        listId: l.listId || "inbox",
        ordem: l.ordem ?? Date.now(),
        tagListId: l.tagListId || "sem_etiqueta",
        tags: l.tags || [],
        observacoes: l.observacoes || [],
        compras: l.compras || [],
        lembretes: l.lembretes || [],
        createdAt: l.createdAt || now,
      }));
      const r = await col.insertMany(docs);
      return res.json({ inserted: r.insertedCount, ids: Object.values(r.insertedIds) });
    }

    if (req.method === "PUT") {
      const { _id, ...rest } = req.body;
      if (!_id) return res.status(400).json({ error: "faltou _id" });
      delete rest.createdAt;
      await col.updateOne({ _id: new ObjectId(_id) }, { $set: rest });
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { _id, all, confirmar } = req.query;

      // apaga TODOS os clientes do CRM (leads) — nunca toca em OS/PDV, que nem fica neste banco.
      if (all === "1") {
        if (confirmar !== "APAGAR") return res.status(400).json({ error: "confirmação inválida" });
        const r = await col.deleteMany({});
        return res.json({ ok: true, apagados: r.deletedCount });
      }

      if (!_id) return res.status(400).json({ error: "faltou _id" });
      await col.deleteOne({ _id: new ObjectId(_id) });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
