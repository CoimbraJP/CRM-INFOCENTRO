import crypto from "crypto";

// Segredo usado pra assinar o cookie de sessão. Em produção, defina AUTH_SECRET
// nas Environment Variables do Vercel (qualquer texto longo aleatório).
const SECRET = process.env.AUTH_SECRET || "infocentro-crm-troque-este-segredo";
// Senha mestre da área de administração de usuários. Recomendado mover pra
// MASTER_PASSWORD nas envs do Vercel — o fallback abaixo é o valor definido pelo dono.
export const MASTER_PASSWORD = process.env.MASTER_PASSWORD || "John1991?";

const TRINTA_DIAS_MS = 30 * 24 * 60 * 60 * 1000;

export function assinarSessao(payload) {
  const corpo = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + TRINTA_DIAS_MS })).toString("base64url");
  const assinatura = crypto.createHmac("sha256", SECRET).update(corpo).digest("base64url");
  return corpo + "." + assinatura;
}

export function verificarToken(token) {
  if (!token) return null;
  const [corpo, assinatura] = token.split(".");
  if (!corpo || !assinatura) return null;
  const esperada = crypto.createHmac("sha256", SECRET).update(corpo).digest("base64url");
  try {
    if (!crypto.timingSafeEqual(Buffer.from(assinatura), Buffer.from(esperada))) return null;
  } catch (e) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(corpo, "base64url").toString());
    if (payload.exp && payload.exp < Date.now()) return null;
    return payload;
  } catch (e) {
    return null;
  }
}

export function lerSessao(req) {
  const raw = req.headers.cookie || "";
  const m = raw.match(/crm_sessao=([^;]+)/);
  return verificarToken(m && m[1]);
}

export function gravarCookie(res, token) {
  res.setHeader("Set-Cookie", `crm_sessao=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${TRINTA_DIAS_MS / 1000}`);
}
export function limparCookie(res) {
  res.setHeader("Set-Cookie", "crm_sessao=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
}

// Bloqueia a rota se não houver sessão válida de usuário. Devolve a sessão ou null (já respondendo 401).
export function exigirLogin(req, res) {
  const s = lerSessao(req);
  if (!s || !s.tenant) {
    res.status(401).json({ error: "não autenticado" });
    return null;
  }
  return s;
}
export function exigirMaster(req, res) {
  const s = lerSessao(req);
  if (!s || !s.admin) {
    res.status(401).json({ error: "não autenticado como master" });
    return null;
  }
  return s;
}

// Filtro de dados por usuário. Registros antigos (sem campo tenant) pertencem ao INFOCENTRO.
export function filtroTenant(sessao) {
  const t = sessao.tenant;
  return t === "INFOCENTRO" ? { $or: [{ tenant: "INFOCENTRO" }, { tenant: { $exists: false } }] } : { tenant: t };
}
