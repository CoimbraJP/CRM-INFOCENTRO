import { getDb } from "../../lib/mongodb";
import { exigirLogin, filtroTenant } from "../../lib/auth";

// logo e nome exibido customizados por conta (aparecem no topo só pra quem está logado nessa
// conta). Guardado como data URL (base64) direto no Mongo — a imagem já vem redimensionada
// e comprimida pelo navegador antes de subir, então cabe tranquilo num documento.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);
    const db = await getDb();
    const col = db.collection("tenant_config");

    if (req.method === "GET") {
      const doc = await col.findOne(filtroT);
      return res.status(200).json({ logo: doc?.logo || null, nome: doc?.nome || null });
    }

    if (req.method === "PUT") {
      const { logo, nome } = req.body || {};
      const set = {};
      if (logo !== undefined) {
        if (!logo || typeof logo !== "string" || !logo.startsWith("data:image/")) {
          return res.status(400).json({ error: "imagem inválida" });
        }
        if (logo.length > 900_000) return res.status(400).json({ error: "imagem grande demais — tente outra menor" });
        set.logo = logo;
      }
      if (nome !== undefined) set.nome = String(nome || "").trim().slice(0, 60) || null;
      if (Object.keys(set).length === 0) return res.status(400).json({ error: "nada para salvar" });
      set.tenant = sessao.tenant;
      set.atualizadoEm = new Date().toISOString();
      await col.updateOne(filtroT, { $set: set }, { upsert: true });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const campo = req.query.campo === "nome" ? "nome" : "logo";
      await col.updateOne(filtroT, { $set: { [campo]: null } });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
