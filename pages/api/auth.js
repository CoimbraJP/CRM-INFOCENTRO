import { getDb } from "../../lib/mongodb";
import { assinarSessao, lerSessao, gravarCookie, limparCookie, MASTER_PASSWORD } from "../../lib/auth";

// Login do sistema — SÓ POR SENHA (cada usuário tem uma senha única).
// POST { senha }  -> senha mestre abre a administração; senha de usuário entra na conta dele
// GET             -> sessão atual (401 se deslogado)
// DELETE          -> sair
async function garantirUsuarioInicial(col) {
  const total = await col.countDocuments({});
  if (total === 0) {
    await col.insertOne({ id: "INFOCENTRO", nome: "INFOCENTRO", senha: "0000", criadoEm: new Date().toISOString() });
  }
}

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    if (req.method === "GET") {
      const s = lerSessao(req);
      if (!s) return res.status(401).json({ error: "não autenticado" });
      return res.status(200).json({ usuario: s.nome || null, tenant: s.tenant || null, admin: !!s.admin });
    }

    if (req.method === "POST") {
      const { senha, master } = req.body || {};
      const tentativa = String(master !== undefined ? master : senha || "");
      if (!tentativa) return res.status(400).json({ error: "informe a senha" });

      // senha mestre -> sessão de administração (não enxerga dados de clientes)
      if (tentativa === MASTER_PASSWORD) {
        gravarCookie(res, assinarSessao({ admin: true }));
        return res.status(200).json({ ok: true, admin: true });
      }

      const db = await getDb();
      const col = db.collection("tenants");
      await garantirUsuarioInicial(col);
      const doc = await col.findOne({ senha: tentativa });
      if (!doc) return res.status(401).json({ error: "senha incorreta" });
      gravarCookie(res, assinarSessao({ tenant: doc.id, nome: doc.nome }));
      return res.status(200).json({ ok: true, usuario: doc.nome });
    }

    if (req.method === "DELETE") {
      limparCookie(res);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
