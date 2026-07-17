// ============================================================
// TEXTOS DA CADÊNCIA — edite à vontade. {nome} vira o nome do cliente.
// Dica: mantenha as variações do D+0 pra não enviar texto idêntico em massa.
// ============================================================

export const TEMPLATES = {
  D0: {
    titulo: "D+0 — Apresentação (mesmo dia)",
    variacoes: [
      "Oi {nome}, tudo bem? 😊 Aqui é da INFO Centro — obrigado pela visita hoje! Aproveitando o contato: além das impressões, somos assistência técnica há 35 anos aqui em São José. Cuidamos de manutenção de computadores e notebooks, upgrades e também vendemos notebooks e PCs gamer. Salva nosso contato aí! Qualquer coisa que precisar, é só chamar. 🖥️",
      "Oi {nome}! Aqui é da INFO Centro 😊 Foi um prazer te atender hoje! Só passando pra dizer que a gente faz muito mais que impressão: manutenção de computador e notebook, limpeza, upgrade de memória e SSD, e venda de notebooks e PCs gamer — tudo com a confiança de quem está há 35 anos no mercado. Salva nosso número: quando o computador der trabalho, você já sabe quem chamar! 💪",
      "{nome}, obrigado pela visita hoje! 🙌 Aqui é da INFO Centro. Uma curiosidade: estamos há 35 anos aqui na cidade e, além das impressões, somos especialistas em manutenção de computadores e notebooks. Também temos notebooks e PCs gamer à venda. Guarda nosso contato — o dia que precisar, o atendimento é rapidinho e sem enrolação. 😉"
    ]
  },
  D5: {
    titulo: "D+5 — Dica + oferta de entrada",
    variacoes: [
      "Oi {nome}! Dica rápida da INFO Centro: se o seu computador está demorando pra ligar, travando ou esquentando muito, geralmente é sinal de que precisa de limpeza ou de um SSD. 🔧 Se quiser, traz ele aqui que fazemos uma avaliação gratuita, sem compromisso — você sai sabendo exatamente o que ele tem. É só chamar aqui pra combinar!",
      "{nome}, tudo bem? 😊 Aqui é da INFO Centro. Sabia que um notebook lento na maioria das vezes se resolve com uma limpeza + SSD, por bem menos do que custa um aparelho novo? Esta semana estamos com avaliação gratuita: você traz, a gente diagnostica na hora e te fala o que vale a pena fazer. Quer aproveitar?"
    ]
  },
  D30: {
    titulo: "D+30 — Oferta principal",
    variacoes: [
      "Oi {nome}! Aqui é da INFO Centro 😊 Novidade que pode te interessar: nosso Plano de Manutenção por R$ 99/mês — inclui manutenção preventiva, suporte remoto ilimitado e prioridade na fila, além de desconto em peças. É a tranquilidade de nunca mais ficar na mão com o computador. Quer que eu te explique como funciona?",
      "{nome}, tudo certo? Aqui é da INFO Centro! Chegaram notebooks revisados com garantia e também temos montagem de PC gamer sob medida — com a segurança de comprar de quem está há 35 anos no mercado. Se você (ou alguém da família) estiver pensando em trocar de máquina, me chama que te mostro as opções. 💻🎮"
    ]
  },
  ANIVERSARIO: {
    titulo: "Aniversário",
    variacoes: [
      "{nome}, hoje o dia é seu! 🎉 Toda a equipe da INFO Centro te deseja um feliz aniversário, com muita saúde e alegria. E como presente, você tem 10% de desconto em qualquer serviço este mês. Parabéns! 🎂",
      "Feliz aniversário, {nome}! 🎂 Aqui é da INFO Centro — passando pra te desejar um dia incrível! E se precisar de qualquer coisa pro seu computador este mês, seu presente é 10% de desconto em qualquer serviço. Aproveite seu dia! 🎉"
    ]
  },
  SAIR: {
    titulo: "Resposta a quem pedir pra sair",
    variacoes: [
      "Tranquilo, {nome}! Você não vai mais receber nossas mensagens. 😊 Nosso contato continua salvo aqui — se um dia precisar de algo pro seu computador, é só chamar. Abraço!"
    ]
  }
};

// Retorna uma variação do template (rotaciona pra não repetir texto idêntico)
export function renderTemplate(tipo, nome, indice = null) {
  const t = TEMPLATES[tipo];
  if (!t) return "";
  const i = indice !== null ? indice % t.variacoes.length : Math.floor(Math.random() * t.variacoes.length);
  return t.variacoes[i].replaceAll("{nome}", nome || "tudo bem");
}

// Igual acima, mas usando um conjunto de templates vindo do banco (editado na tela Estratégias),
// com fallback pros textos padrão acima caso ainda não tenha sido personalizado.
export function renderFrom(templatesObj, tipo, nome, indice = null) {
  const t = (templatesObj && templatesObj[tipo]) || TEMPLATES[tipo];
  if (!t || !t.variacoes || t.variacoes.length === 0) return "";
  const i = indice !== null ? indice % t.variacoes.length : Math.floor(Math.random() * t.variacoes.length);
  return t.variacoes[i].replaceAll("{nome}", nome || "tudo bem");
}

// Metadados dos cards da tela Estratégias — cada um mapeia pra um tipo de TEMPLATES
export const STRATEGY_META = [
  { tipo: "D0", titulo: "Apresentação", subtitulo: "D+0 · mesmo dia da visita", icone: "send", habilitado: true },
  { tipo: "D5", titulo: "Dica + oferta de entrada", subtitulo: "D+5", icone: "target", habilitado: true },
  { tipo: "D30", titulo: "Oferta principal", subtitulo: "D+30", icone: "dollar", habilitado: true },
  { tipo: "ANIVERSARIO", titulo: "Aniversário", subtitulo: "no dia", icone: "cake", habilitado: true },
  { tipo: "SAIR", titulo: "Resposta a quem pedir pra sair", subtitulo: "sob demanda", icone: "eyeOff", habilitado: true },
];
