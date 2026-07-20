import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import { exigirMaster } from "../../lib/auth";

// Gestão de usuários do sistema — acessível SOMENTE com a sessão master.
// O master enxerga e edita apenas nome e senha; nunca os dados (clientes/OS) de cada usuário.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirMaster(req, res);
    if (!sessao) return;

    const db = await getDb();
    const col = db.collection("tenants");

    if (req.method === "GET") {
      const docs = await col.find({}).sort({ criadoEm: 1 }).toArray();
      return res.status(200).json(docs.map((d) => ({ _id: d._id, id: d.id, nome: d.nome, senha: d.senha, criadoEm: d.criadoEm })));
    }

    if (req.method === "POST") {
      const { nome, senha } = req.body || {};
      if (!nome || !senha) return res.status(400).json({ error: "informe nome e senha" });
      const existe = await col.findOne({ nome: { $regex: `^${String(nome).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
      if (existe) return res.status(400).json({ error: "já existe um usuário com esse nome" });
      const id = "u" + Date.now();
      await col.insertOne({ id, nome: String(nome).trim(), senha: String(senha), criadoEm: new Date().toISOString() });
      return res.status(200).json({ ok: true, id });
    }

    if (req.method === "PUT") {
      const { _id, nome, senha } = req.body || {};
      if (!_id) return res.status(400).json({ error: "faltou _id" });
      const set = {};
      if (nome !== undefined && String(nome).trim()) set.nome = String(nome).trim();
      if (senha !== undefined && String(senha)) set.senha = String(senha);
      if (Object.keys(set).length === 0) return res.status(400).json({ error: "nada para atualizar" });
      await col.updateOne({ _id: new ObjectId(_id) }, { $set: set });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
