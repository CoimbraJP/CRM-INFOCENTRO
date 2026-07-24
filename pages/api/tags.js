import { getDb } from "../../lib/mongodb";
import { TAGS as TAGS_PADRAO } from "../../lib/crmHelpers";
import { exigirLogin, filtroTenant } from "../../lib/auth";

// Etiquetas do sistema (nome/cor) — editáveis em Configurações e usadas em todo o CRM:
// chips no card, seletor de etiquetas, busca/exportação e colunas do board Etiquetas.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);

    const db = await getDb();
    const col = db.collection("tags");

    if (req.method === "GET") {
      let tags = await col.find(filtroT).sort({ ordem: 1 }).toArray();
      if (tags.length === 0) {
        try {
          await col.insertMany(TAGS_PADRAO.map((t, i) => ({ ...t, ordem: i, tenant: sessao.tenant })), { ordered: false });
        } catch (e) {
          if (e.code !== 11000) throw e;
        }
        tags = await col.find(filtroT).sort({ ordem: 1 }).toArray();
      }
      return res.status(200).json(tags);
    }

    if (req.method === "POST") {
      const { nome, cor } = req.body || {};
      if (!nome) return res.status(400).json({ error: "faltou nome" });
      const id = "t" + Date.now();
      const count = await col.countDocuments(filtroT);
      const tag = { id, nome, cor: cor || "#0d9488", ordem: count, tenant: sessao.tenant };
      await col.insertOne(tag);
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const { id, nome, cor } = req.body || {};
      if (!id) return res.status(400).json({ error: "faltou id" });
      const set = {};
      if (nome !== undefined) set.nome = nome;
      if (cor !== undefined) set.cor = cor;
      if (Object.keys(set).length === 0) return res.status(400).json({ error: "nada para atualizar" });
      await col.updateOne({ $and: [{ id }, filtroT] }, { $set: set });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: "faltou id" });
      // bloqueia a exclusão se algum cliente ainda estiver com essa etiqueta marcada
      const emUso = await db.collection("leads").countDocuments({ $and: [{ tags: id }, filtroT] });
      if (emUso > 0) {
        return res.status(400).json({ error: `Essa etiqueta está em uso em ${emUso} cliente${emUso === 1 ? "" : "s"}. Remova a etiqueta desses clientes antes de excluir.` });
      }
      await col.deleteOne({ $and: [{ id }, filtroT] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
