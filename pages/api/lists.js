import { getDb } from "../../lib/mongodb";
import { ObjectId } from "mongodb";
import { TAGS as TAGS_PADRAO } from "../../lib/crmHelpers";
import { exigirLogin, filtroTenant } from "../../lib/auth";

const DEFAULT_LISTS_CRM = [
  { key: "inbox", nome: "INBOX", ordem: 0, fixa: true, board: "crm" },
  { key: "contactado", nome: "CONTACTADO", ordem: 1, fixa: false, board: "crm" },
  { key: "conversando", nome: "CONVERSANDO", ordem: 2, fixa: false, board: "crm" },
  { key: "cliente", nome: "CLIENTE 💰", ordem: 3, fixa: false, board: "crm" },
  { key: "recorrente", nome: "RECORRENTE", ordem: 4, fixa: false, board: "crm" },
  { key: "nao_perturbe", nome: "NÃO PERTURBE 🚫", ordem: 5, fixa: true, board: "crm" },
];

// as colunas do board de Etiquetas espelham as etiquetas cadastradas em Configurações
// (collection "tags"), pra manter nome/cor sempre sincronizados em todo o sistema.
async function defaultListsTags(db, filtroT, tenant) {
  const tagsCol = db.collection("tags");
  let tags = await tagsCol.find(filtroT).sort({ ordem: 1 }).toArray();
  if (tags.length === 0) {
    try {
      await tagsCol.insertMany(TAGS_PADRAO.map((t, i) => ({ ...t, ordem: i, tenant })), { ordered: false });
    } catch (e) {
      if (e.code !== 11000) throw e;
    }
    tags = await tagsCol.find(filtroT).sort({ ordem: 1 }).toArray();
  }
  return [
    { key: "sem_etiqueta", nome: "SEM ETIQUETA", ordem: 0, fixa: true, board: "tags" },
    ...tags.map((t, i) => ({ key: "tag_" + t.id, nome: t.nome.toUpperCase(), ordem: i + 1, fixa: false, board: "tags", cor: t.cor, tagId: t.id })),
  ];
}

function defaultListsOs() {
  return [
    { key: "todas", nome: "TODAS AS OS", ordem: 0, fixa: true, board: "os" },
  ];
}

async function seedPara(board, db, filtroT, tenant) {
  if (board === "crm") return DEFAULT_LISTS_CRM;
  if (board === "tags") return defaultListsTags(db, filtroT, tenant);
  if (board === "os") return defaultListsOs();
  // board novo/desconhecido — pelo menos uma coluna inicial, já com o board certo
  return [{ key: "todas", nome: "TODAS", ordem: 0, fixa: true, board }];
}

// em qual collection/campo verificar se a lista está em uso antes de excluir
const CHECAGEM_EXCLUSAO = {
  crm: { collection: "leads", campo: "listId" },
  tags: { collection: "leads", campo: "tagListId" },
  os: { collection: "os_placement", campo: "listId" },
};

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);

    const db = await getDb();
    const col = db.collection("lists");
    const board = (req.query.board || req.body?.board || "crm").toString();
    // trata registros antigos (sem campo board) como pertencentes ao board "crm"
    const filtroBoard = board === "crm" ? { $or: [{ board: "crm" }, { board: { $exists: false } }] } : { board };
    const filtro = { $and: [filtroBoard, filtroT] };

    if (req.method === "GET") {
      let lists = await col.find(filtro).sort({ ordem: 1 }).toArray();

      if (lists.length === 0) {
        const seed = await seedPara(board, db, filtroT, sessao.tenant);
        try {
          await col.insertMany(seed.map((l) => ({ ...l, tenant: sessao.tenant })), { ordered: false });
        } catch (e) {
          // 11000 = chave duplicada (corrida entre duas abas abrindo ao mesmo tempo) — não é fatal
          if (e.code !== 11000) throw e;
        }
        lists = await col.find(filtro).sort({ ordem: 1 }).toArray();
      }
      return res.status(200).json(lists);
    }

    if (req.method === "POST") {
      const { nome, key: keyDesejada } = req.body || {};
      if (!nome) return res.status(400).json({ error: "faltou nome" });
      const key = keyDesejada || "l_" + Date.now();
      // idempotente: se já existe uma lista com essa key neste board/usuário, só devolve ela
      // (usado pelo DISPARO pra criar a lista da estratégia só na primeira vez)
      if (keyDesejada) {
        const existente = await col.findOne({ $and: [{ key }, filtro] });
        if (existente) return res.status(200).json({ ok: true, key, jaExistia: true });
      }
      const count = await col.countDocuments(filtro);
      await col.insertOne({ key, nome, ordem: count, fixa: false, board, tenant: sessao.tenant });
      return res.status(200).json({ ok: true, key });
    }

    if (req.method === "PUT") {
      const { _id, nome, ordem } = req.body || {};
      if (!_id) return res.status(400).json({ error: "faltou _id" });
      const set = {};
      if (nome !== undefined) set.nome = nome;
      if (ordem !== undefined) set.ordem = ordem;
      if (Object.keys(set).length === 0) return res.status(400).json({ error: "nada para atualizar" });
      await col.updateOne({ $and: [{ _id: new ObjectId(_id) }, filtroT] }, { $set: set });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { _id, key } = req.query;
      if (!_id) return res.status(400).json({ error: "faltou _id" });
      const checagem = CHECAGEM_EXCLUSAO[board] || CHECAGEM_EXCLUSAO.crm;
      const emUso = await db.collection(checagem.collection).countDocuments({ $and: [{ [checagem.campo]: key }, filtroT] });
      if (emUso > 0) return res.status(400).json({ error: "Mova os cards antes de excluir a lista" });
      await col.deleteOne({ $and: [{ _id: new ObjectId(_id) }, filtroT] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e), code: e.code });
  }
}
