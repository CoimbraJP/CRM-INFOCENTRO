import { getDb } from "../../lib/mongodb";
import { exigirLogin, filtroTenant } from "../../lib/auth";

export default async function handler(req, res) {
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);

    const db = await getDb();
    const col = db.collection("templates");

    if (req.method === "GET") {
      const docs = await col.find(filtroT).toArray();
      const porTipo = {};
      for (const d of docs) porTipo[d.tipo] = { titulo: d.titulo, variacoes: d.variacoes };
      return res.json(porTipo);
    }

    if (req.method === "PUT") {
      const { tipo, titulo, variacoes } = req.body;
      if (!tipo || !Array.isArray(variacoes)) return res.status(400).json({ error: "faltou tipo ou variacoes" });
      const limpo = variacoes.map((v) => String(v || "").trim()).filter(Boolean);
      if (limpo.length === 0) return res.status(400).json({ error: "precisa de pelo menos 1 variação" });
      await col.updateOne(
        { $and: [{ tipo }, filtroT] },
        { $set: { tipo, titulo: titulo || tipo, variacoes: limpo, tenant: sessao.tenant, updatedAt: new Date().toISOString() } },
        { upsert: true }
      );
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
