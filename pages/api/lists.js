import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";

const DEFAULT_LISTS = [
  { key: "inbox", nome: "INBOX", ordem: 0, fixa: true },
  { key: "contactado", nome: "CONTACTADO", ordem: 1, fixa: false },
  { key: "conversando", nome: "CONVERSANDO", ordem: 2, fixa: false },
  { key: "cliente", nome: "CLIENTE 💰", ordem: 3, fixa: false },
  { key: "recorrente", nome: "RECORRENTE", ordem: 4, fixa: false },
  { key: "nao_perturbe", nome: "NÃO PERTURBE 🚫", ordem: 5, fixa: true },
];

export default async function handler(req, res) {
  try {
    const db = await getDb();
    const col = db.collection("lists");

    if (req.method === "GET") {
      let lists = await col.find({}).sort({ ordem: 1 }).toArray();
      if (lists.length === 0) {
        await col.insertMany(DEFAULT_LISTS.map((l) => ({ ...l })));
        lists = await col.find({}).sort({ ordem: 1 }).toArray();
      }
      return res.json(lists);
    }

    if (req.method === "POST") {
      const { nome } = req.body;
      if (!nome) return res.status(400).json({ error: "faltou nome" });
      const count = await col.countDocuments();
      const key = "l_" + Date.now();
      await col.insertOne({ key, nome, ordem: count, fixa: false });
      return res.json({ ok: true, key });
    }

    if (req.method === "PUT") {
      const { _id, nome } = req.body;
      await col.updateOne({ _id: new ObjectId(_id) }, { $set: { nome } });
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { _id, key } = req.query;
      const leads = await db.collection("leads").countDocuments({ listId: key });
      if (leads > 0) return res.status(400).json({ error: "Mova os cards antes de excluir a lista" });
      await col.deleteOne({ _id: new ObjectId(_id) });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
