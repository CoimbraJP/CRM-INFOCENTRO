// ============================================================
// Helpers e constantes compartilhadas entre páginas do CRM
// ============================================================
export const TAGS = [
  { id: "pgto", nome: "Pagamento pendente", cor: "#dc2626" },
  { id: "orc", nome: "Orçamento aberto", cor: "#f59e0b" },
  { id: "acomp", nome: "Acompanhar", cor: "#3b82f6" },
  { id: "impressao", nome: "Lead impressão", cor: "#0d9488" },
  { id: "notebook", nome: "Interessado em notebook", cor: "#8b5cf6" },
  { id: "gamer", nome: "PC Gamer", cor: "#111827" },
  { id: "vip", nome: "VIP", cor: "#ca8a04" },
];

export const hoje = () => new Date().toISOString().slice(0, 10);
export const addDias = (iso, n) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
export const fmtBR = (iso) => (iso ? iso.split("-").reverse().join("/") : "");
export const fmtDinheiro = (v) =>
  "R$ " + (Number(v) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export function normalizaFone(t) {
  let d = String(t || "").replace(/\D/g, "");
  if (d.startsWith("0")) d = d.slice(1);
  if (d.length === 10 || d.length === 11) d = "55" + d;
  return d;
}
export const waLink = (fone, texto) =>
  "https://wa.me/" + normalizaFone(fone) + (texto ? "?text=" + encodeURIComponent(texto) : "");

export function primeiroNome(n) {
  const p = String(n || "").trim().split(" ")[0];
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
}

// aceita YYYY-MM-DD, DD/MM ou DD/MM/YYYY — devolve {mes, dia} ou null
export function partesNascimento(lead) {
  const n = String(lead?.nascimento || "").trim();
  if (!n) return null;
  if (n.includes("-")) {
    const [, m, d] = n.split("-");
    if (m && d) return { mes: Number(m), dia: Number(d.slice(0, 2)) };
  }
  const partes = n.split("/");
  if (partes.length >= 2) return { dia: Number(partes[0]), mes: Number(partes[1]) };
  return null;
}
export function ehAniversarioHoje(lead) {
  const p = partesNascimento(lead);
  if (!p) return false;
  const agora = new Date();
  return p.mes === agora.getMonth() + 1 && p.dia === agora.getDate();
}
// quantos dias faltam para o próximo aniversário (0 = hoje)
export function diasAteAniversario(lead) {
  const p = partesNascimento(lead);
  if (!p) return null;
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  let alvo = new Date(hoje.getFullYear(), p.mes - 1, p.dia);
  if (alvo < hoje) alvo = new Date(hoje.getFullYear() + 1, p.mes - 1, p.dia);
  return Math.round((alvo - hoje) / 86400000);
}
