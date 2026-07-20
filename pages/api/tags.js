import { getDb } from "../../lib/mongodb";
import { TAGS as TAGS_PADRAO } from "../../lib/crmHelpers";

// Etiquetas do sistema (nome/cor) — editáveis em Configurações e usadas em todo o CRM:
// chips no card, seletor de etiquetas, busca/exportação e colunas do board Etiquetas.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const db = await getDb();
    const col = db.collection("tags");

    if (req.method === "GET") {
      let tags = await col.find({}).sort({ ordem: 1 }).toArray();
      if (tags.length === 0) {
        try {
          await col.insertMany(TAGS_PADRAO.map((t, i) => ({ ...t, ordem: i })), { ordered: false });
        } catch (e) {
          if (e.code !== 11000) throw e;
        }
        tags = await col.find({}).sort({ ordem: 1 }).toArray();
      }
      return res.status(200).json(tags);
    }

    if (req.method === "POST") {
      const { nome, cor } = req.body || {};
      if (!nome) return res.status(400).json({ error: "faltou nome" });
      const id = "t" + Date.now();
      const count = await col.countDocuments({});
      const tag = { id, nome, cor: cor || "#0d9488", ordem: count };
      await col.insertOne(tag);
      // cria também a coluna correspondente no board de Etiquetas, se ele já existir
      const listsCol = db.collection("lists");
      const existeBoard = await listsCol.countDocuments({ board: "tags" });
      if (existeBoard > 0) {
        const maxOrdem = await listsCol.find({ board: "tags" }).sort({ ordem: -1 }).limit(1).toArray();
        await listsCol.insertOne({
          key: "tag_" + id, nome: nome.toUpperCase(), ordem: (maxOrdem[0]?.ordem ?? 0) + 1,
          fixa: false, board: "tags", cor: tag.cor, tagId: id,
        });
      }
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const { id, nome, cor } = req.body || {};
      if (!id) return res.status(400).json({ error: "faltou id" });
      const set = {};
      if (nome !== undefined) set.nome = nome;
      if (cor !== undefined) set.cor = cor;
      if (Object.keys(set).length === 0) return res.status(400).json({ error: "nada para atualizar" });
      await col.updateOne({ id }, { $set: set });
      // reflete o novo nome/cor na coluna correspondente do board de Etiquetas
      const setLista = {};
      if (nome !== undefined) setLista.nome = nome.toUpperCase();
      if (cor !== undefined) setLista.cor = cor;
      if (Object.keys(setLista).length > 0) {
        await db.collection("lists").updateOne({ board: "tags", tagId: id }, { $set: setLista });
      }
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "faltou id" });
      await col.deleteOne({ id });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
