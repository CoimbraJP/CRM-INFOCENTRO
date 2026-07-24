import { getDb } from "../../lib/mongodb";
import { exigirLogin, filtroTenant } from "../../lib/auth";
import { STRATEGY_META } from "../../lib/messages";

function removerAcentos(s) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}
function slugify(nome) {
  return removerAcentos(nome.toString().toLowerCase())
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 24) || "estrategia";
}

// Metadados das estratégias (cards da tela Estratégias + picker do DISPARO), por usuário.
// Guarda os builtins (D0, D5, D30...) + as estratégias que o usuário criar, com uma "ordem"
// que o usuário pode reorganizar arrastando — essa ordem é a mesma usada no botão DISPARO.
export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const filtroT = filtroTenant(sessao);
    const db = await getDb();
    const col = db.collection("estrategias_meta");

    if (req.method === "GET") {
      let docs = await col.find(filtroT).toArray();
      // as estratégias padrão (D0, D5, D30, Aniversário...) só existem de fábrica pra INFOCENTRO —
      // os demais clientes começam sem nenhuma e criam só as que quiserem, do zero.
      if (sessao.tenant === "INFOCENTRO") {
        const existentes = new Set(docs.map((d) => d.tipo));
        // "cura" os builtins que ainda não foram semeados pra este tenant (primeira vez, ou
        // builtin novo adicionado depois — ex.: quando POS7/POS90 foram criados)
        const faltando = STRATEGY_META.filter((m) => !existentes.has(m.tipo));
        if (faltando.length > 0) {
          const maxOrdem = docs.length ? Math.max(...docs.map((d) => d.ordem ?? 0)) : -1;
          const novos = faltando.map((m, i) => ({
            tipo: m.tipo, titulo: m.titulo, subtitulo: m.subtitulo, icone: m.icone,
            ordem: maxOrdem + 1 + i, custom: false, habilitado: true, tenant: sessao.tenant,
          }));
          await col.insertMany(novos, { ordered: false }).catch(() => {});
          docs = await col.find(filtroT).toArray();
        }
      }
      docs.sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));
      return res.status(200).json(docs);
    }

    if (req.method === "POST") {
      const { titulo, subtitulo, icone } = req.body || {};
      if (!titulo || !titulo.trim()) return res.status(400).json({ error: "faltou título" });
      const tipo = "custom_" + slugify(titulo) + "_" + Date.now().toString(36);
      const docs = await col.find(filtroT).toArray();
      const maxOrdem = docs.length ? Math.max(...docs.map((d) => d.ordem ?? 0)) : -1;
      const doc = {
        tipo, titulo: titulo.trim(), subtitulo: (subtitulo || "sob demanda").trim(),
        icone: icone || "send", ordem: maxOrdem + 1, custom: true, habilitado: true, tenant: sessao.tenant,
      };
      await col.insertOne(doc);
      return res.status(200).json({ ok: true, estrategia: doc });
    }

    if (req.method === "PUT") {
      const { tipo, ordem, titulo, subtitulo, icone, habilitado } = req.body || {};
      if (!tipo) return res.status(400).json({ error: "faltou tipo" });
      const set = {};
      if (ordem !== undefined) set.ordem = ordem;
      if (titulo !== undefined) set.titulo = titulo;
      if (subtitulo !== undefined) set.subtitulo = subtitulo;
      if (icone !== undefined) set.icone = icone;
      if (habilitado !== undefined) set.habilitado = !!habilitado;
      if (Object.keys(set).length === 0) return res.status(400).json({ error: "nada para atualizar" });
      await col.updateOne({ $and: [{ tipo }, filtroT] }, { $set: set });
      return res.status(200).json({ ok: true });
    }

    if (req.method === "DELETE") {
      const { tipo } = req.query;
      if (!tipo) return res.status(400).json({ error: "faltou tipo" });
      const doc = await col.findOne({ $and: [{ tipo }, filtroT] });
      if (!doc) return res.status(404).json({ error: "não encontrada" });
      await col.deleteOne({ $and: [{ tipo }, filtroT] });
      await db.collection("templates").deleteOne({ $and: [{ tipo }, filtroT] });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "método não permitido" });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
