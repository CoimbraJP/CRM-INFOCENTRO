import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import { TAGS } from "../../lib/crmHelpers";

const DEFAULT_LISTS_CRM = [
  { key: "inbox", nome: "INBOX", ordem: 0, fixa: true, board: "crm" },
  { key: "contactado", nome: "CONTACTADO", ordem: 1, fixa: false, board: "crm" },
  { key: "conversando", nome: "CONVERSANDO", ordem: 2, fixa: false, board: "crm" },
  { key: "cliente", nome: "CLIENTE 💰", ordem: 3, fixa: false, board: "crm" },
  { key: "recorrente", nome: "RECORRENTE", ordem: 4, fixa: false, board: "crm" },
  { key: "nao_perturbe", nome: "NÃO PERTURBE 🚫", ordem: 5, fixa: true, board: "crm" },
];

function defaultListsTags() {
  return [
    { key: "sem_etiqueta", nome: "SEM ETIQUETA", ordem: 0, fixa: true, board: "tags" },
    ...TAGS.map((t, i) => ({ key: "tag_" + t.id, nome: t.nome.toUpperCase(), ordem: i + 1, fixa: false, board: "tags", cor: t.cor, tagId: t.id })),
  ];
}

const PLACEMENT_FIELD = { crm: "listId", tags: "tagListId" };

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const db = await getDb();
    const col = db.collection("lists");
    const board = (req.query.board || req.body?.board || "crm").toString();

    if (req.method === "GET") {
      // trata registros antigos (sem campo board) como pertencentes ao board "crm"
      const filtro = board === "crm" ? { $or: [{ board: "crm" }, { board: { $exists: false } }] } : { board };
      let lists = await col.find(filtro).sort({ ordem: 1 }).toArray();

      if (lists.length === 0) {
        const seed = board === "tags" ? defaultListsTags() : DEFAULT_LISTS_CRM;
        try {
          await col.insertMany(seed.map((l) => ({ ...l })), { ordered: false });
        } catch (e) {
          // 11000 = chave duplicada — algum seed já existe (corrida entre duas abas, por ex.);
          // não é erro fatal, só recarrega o que já está salvo
          if (e.code !== 11000) throw e;
        }
        lists = await col.find(filtro).sort({ ordem: 1 }).toArray();
      }
      return res.status(200).json(lists);
    }

    if (req.method === "POST") {
      const { nome } = req.body || {};
      if (!nome) return res.status(400).json({ error: "faltou nome" });
      const filtro = board === "crm" ? { $or: [{ board: "crm" }, { board: { $exists: false } }] } : { board };
      const count = await col.countDocuments(filtro);
      const key = "l_" + Date.now();
      await col.insertOne({ key, nome, ordem: count, fixa: false, board });
      return res.status(200).json({ ok: true, key });
    }

    if (req.method === "PUT") {
      const { _id, nome } = req.body || {};
      if (!_id) return res.status(400).json({ error: "faltou _id" });
      await col.updateOne({ _id: new ObjectId(_id) }, { $set: { nome } });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { _id, key } = req.query;
      if (!_id) return res.status(400).json({ error: "faltou _id" });
      const campo = PLACEMENT_FIELD[board] || "listId";
      const leads = await db.collection("leads").countDocuments({ [campo]: key });
      if (leads > 0) return res.status(400).json({ error: "Mova os cards antes de excluir a lista" });
      await col.deleteOne({ _id: new ObjectId(_id) });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e), code: e.code });
  }
}
