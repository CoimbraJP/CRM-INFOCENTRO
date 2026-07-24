import { getDb } from "../../lib/mongodb";
import { exigirLogin, filtroTenant } from "../../lib/auth";

function removerAcentos(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function slugify(nome) {
  return removerAcentos(nome.toString().toLowerCase())
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "crm";
}

// board de leads (CRM legado sem campo "board" = pertence ao CRM principal)
function filtroBoardLeads(board) {
  return board === "crm" ? { $or: [{ board: "crm" }, { board: { $exists: false } }] } : { board };
}

// registro dos quadros de CRM extras que o usuário cria (o quadro "crm" principal não fica aqui,
// ele é implícito). Cada quadro tem sua própria "key" (prefixo crmb_) que isola leads e listas.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);
    const db = await getDb();
    const col = db.collection("crm_boards");

    if (req.method === "GET") {
      const boards = await col.find(filtroT).sort({ criadoEm: 1 }).toArray();
      return res.status(200).json(boards);
    }

    if (req.method === "POST") {
      const { nome } = req.body || {};
      if (!nome || !nome.trim()) return res.status(400).json({ error: "faltou nome" });
      const key = "crmb_" + slugify(nome) + "_" + Date.now().toString(36);
      await col.insertOne({ key, nome: nome.trim(), tenant: sessao.tenant, criadoEm: new Date().toISOString() });
      return res.status(200).json({ ok: true, key, nome: nome.trim() });
    }

    if (req.method === "DELETE") {
      const { key } = req.query;
      if (!key) return res.status(400).json({ error: "faltou key" });
      if (key === "crm") return res.status(400).json({ error: "o CRM principal não pode ser excluído" });
      // apaga o quadro inteiro: seus clientes e suas listas. Nunca toca em outros quadros/tenants.
      await db.collection("leads").deleteMany({ $and: [filtroBoardLeads(key), filtroT] });
      await db.collection("lists").deleteMany({ $and: [{ board: key }, filtroT] });
      await col.deleteOne({ $and: [{ key }, filtroT] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
