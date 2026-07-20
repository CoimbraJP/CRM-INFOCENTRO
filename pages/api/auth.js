import { getDb } from "../../lib/mongodb";
import { assinarSessao, lerSessao, gravarCookie, limparCookie, MASTER_PASSWORD } from "../../lib/auth";

// Login do sistema (multiusuário) e da área master.
// POST { usuario, senha }  -> sessão de usuário (tenant)
// POST { master: senha }   -> sessão master (só gerencia usuários)
// GET                       -> sessão atual (401 se deslogado)
// DELETE                    -> sair
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
      return res.status(200).json({ usuario: s.nome || s.tenant || null, admin: !!s.admin });
    }

    if (req.method === "POST") {
      const { usuario, senha, master } = req.body || {};

      if (master !== undefined) {
        if (String(master) !== MASTER_PASSWORD) return res.status(401).json({ error: "senha mestre incorreta" });
        gravarCookie(res, assinarSessao({ admin: true }));
        return res.status(200).json({ ok: true, admin: true });
      }

      if (!usuario || !senha) return res.status(400).json({ error: "informe usuário e senha" });
      const db = await getDb();
      const col = db.collection("tenants");
      await garantirUsuarioInicial(col);
      const doc = await col.findOne({ nome: { $regex: `^${String(usuario).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" } });
      if (!doc || String(doc.senha) !== String(senha)) return res.status(401).json({ error: "usuário ou senha incorretos" });
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
