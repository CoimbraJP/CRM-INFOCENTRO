import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import { exigirLogin, filtroTenant } from "../../lib/auth";

export default async function handler(req, res) {
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);
    const board = (req.query.board || req.body?.board || "crm").toString();
    // clientes cadastrados antes de existir "board" pertencem ao CRM principal (compatibilidade)
    const filtroBoard = board === "crm" ? { $or: [{ board: "crm" }, { board: { $exists: false } }] } : { board };
    const filtro = { $and: [filtroBoard, filtroT] };

    const db = await getDb();
    const col = db.collection("leads");

    if (req.method === "GET") {
      const leads = await col.find(filtro).sort({ createdAt: -1 }).toArray();
      return res.json(leads);
    }

    if (req.method === "POST") {
      // aceita um lead ou um array (importação)
      const body = req.body;
      const now = new Date().toISOString();
      const boardAlvo = (Array.isArray(body) ? body[0]?.board : body.board) || board;
      const docs = (Array.isArray(body) ? body : [body]).map((l) => ({
        nome: l.nome || "",
        telefone: l.telefone || "",
        servico: l.servico || "",
        nascimento: l.nascimento || "",
        listId: l.listId || "inbox",
        ordem: l.ordem ?? Date.now(),
        tagListId: l.tagListId || "sem_etiqueta",
        tags: l.tags || [],
        observacoes: l.observacoes || [],
        compras: l.compras || [],
        lembretes: l.lembretes || [],
        createdAt: l.createdAt || now,
        board: boardAlvo,
        tenant: sessao.tenant,
      }));
      const r = await col.insertMany(docs);
      return res.json({ inserted: r.insertedCount, ids: Object.values(r.insertedIds) });
    }

    if (req.method === "PUT") {
      const { _id, ...rest } = req.body;
      if (!_id) return res.status(400).json({ error: "faltou _id" });
      delete rest.createdAt;
      delete rest.tenant;
      delete rest.board; // o board de um cliente não muda por aqui — evita vazar card entre quadros
      await col.updateOne({ $and: [{ _id: new ObjectId(_id) }, filtroT] }, { $set: rest });
      return res.json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { _id, all, confirmar } = req.query;

      // apaga TODOS os clientes DESTE quadro (e usuário) — nunca toca em outros quadros nem em OS/PDV.
      if (all === "1") {
        if (confirmar !== "APAGAR") return res.status(400).json({ error: "confirmação inválida" });
        const r = await col.deleteMany(filtro);
        return res.json({ ok: true, apagados: r.deletedCount });
      }

      if (!_id) return res.status(400).json({ error: "faltou _id" });
      await col.deleteOne({ $and: [{ _id: new ObjectId(_id) }, filtroT] });
      return res.json({ ok: true });
    }

    res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
