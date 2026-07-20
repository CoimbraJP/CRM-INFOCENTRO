// Proxy somente-leitura para as Ordens de Serviço do PDV.
// Chama o endpoint real do PDV: GET /api/crm-sync?since=<epoch ms>
// Precisa de PDV_API_URL e PDV_API_TOKEN nas envs do Vercel do CRM.
// O CRM nunca acessa o banco infopdv diretamente — só via HTTP, como definido nas diretrizes.
//
// Blindado pra NUNCA estourar sem resposta: qualquer erro (URL inválida, timeout,
// PDV fora do ar, resposta não-JSON) sempre volta como JSON com status e mensagem.
import { exigirLogin } from "../../lib/auth";

export default async function handler(req, res) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const sessao = exigirLogin(req, res);
    if (!sessao) return;
    const PDV_API_URL = (process.env.PDV_API_URL || "").trim();
    const PDV_API_TOKEN = (process.env.PDV_API_TOKEN || "").trim();

    if (!PDV_API_URL || !PDV_API_TOKEN) {
      return res.status(501).json({
        configurado: false,
        error: "Integração com o PDV ainda não configurada — faltam PDV_API_URL e PDV_API_TOKEN nas variáveis de ambiente.",
      });
    }

    let base;
    try {
      base = new URL(PDV_API_URL).origin; // valida e normaliza a URL, sem barra sobrando
    } catch (e) {
      return res.status(500).json({ configurado: true, error: `PDV_API_URL inválida: "${PDV_API_URL}"` });
    }
    const alvo = `${base}/api/crm-sync?since=0`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    let r;
    try {
      r = await fetch(alvo, {
        headers: { Authorization: `Bearer ${PDV_API_TOKEN}` },
        signal: controller.signal,
      });
    } catch (e) {
      const motivo = e.name === "AbortError" ? "o PDV demorou demais pra responder (timeout de 8s)" : e.message;
      return res.status(502).json({ configurado: true, error: `Não consegui conectar em ${alvo}: ${motivo}` });
    } finally {
      clearTimeout(timeoutId);
    }

    const bruto = await r.text();
    let j = null;
    try { j = bruto ? JSON.parse(bruto) : null; } catch (e) { /* resposta não era JSON — tratado abaixo */ }

    if (!r.ok) {
      return res.status(r.status).json({
        configurado: true,
        error: (j && j.error) || `PDV respondeu ${r.status} em ${alvo}` + (bruto ? ` — corpo: ${bruto.slice(0, 200)}` : ""),
      });
    }
    if (!Array.isArray(j)) {
      return res.status(502).json({
        configurado: true,
        error: `PDV respondeu 200 mas não veio um array JSON como esperado (formato: [{ id, updatedAt, deleted, data }]). Corpo recebido: ${bruto.slice(0, 200)}`,
      });
    }

    const ordens = j.filter((x) => !x.deleted);
    return res.status(200).json({ configurado: true, ordens });
  } catch (e) {
    // rede de segurança final — nunca deixa a função morrer sem responder algo
    return res.status(500).json({ configurado: true, error: "Erro inesperado no proxy do CRM: " + (e?.message || String(e)) });
  }
}
