# CRM INFO Centro — Kanban de Leads com WhatsApp

CRM estilo Kanban para transformar os leads de impressão em clientes de manutenção e vendas.

## Páginas (menu lateral)

- **CRM** — Kanban principal: INBOX → CONTACTADO → CONVERSANDO → CLIENTE 💰 → RECORRENTE + NÃO PERTURBE 🚫 (crie mais listas no botão ＋)
- **OS** — espelho somente-leitura das Ordens de Serviço do PDV. Precisa de `PDV_API_URL` e `PDV_API_TOKEN` nas envs (ver seção own abaixo); até lá mostra uma tela explicando o que falta.
- **Estratégias** — cada card é uma etapa da cadência (Apresentação D+0, Dica D+5, Oferta D+30, Aniversário, Resposta a SAIR). Edite os textos ali e o CRM inteiro passa a usar a versão nova.
- **Aniversários** — lista de clientes ordenada pelo próximo aniversário, com botão de parabéns via WhatsApp.
- **Etiquetas** — segundo Kanban, independente do board do CRM: colunas = etiquetas. Arrastar um cliente pra uma coluna aplica a etiqueta nele (sincronizado com os chips do card).
- **Calendário** — mês grande com pontos coloridos (mensagem agendada, atrasada, aniversário), painel do dia selecionado e timeline dos próximos eventos.

## O que o Kanban principal faz

- **Kanban drag & drop** com o board acima
- **Importação de Excel** — lê sua planilha (nome, telefone, serviço, nascimento) e cria os cards no INBOX; ao importar, pode preencher automaticamente a agenda **D+0 / D+5 / D+30** de cada cliente com as mensagens prontas
- **Painel "📬 Enviar hoje"** — abre todo dia mostrando as mensagens vencendo, atrasadas e aniversariantes; botão do WhatsApp já abre a conversa com o texto personalizado, você só aperta enviar
- **Card completo** — 📝 observações, 📅 agenda de mensagens, 💬 WhatsApp direto, 💰 histórico de compras (com soma por lista), 🏷️ etiquetas coloridas pesquisáveis, 🎂 aniversário
- **Backup Excel** — botão que exporta tudo (clientes, compras, mensagens) pra planilha, mantendo seu backup local sempre igual ao online
- **NÃO PERTURBE** — cards nessa lista têm envio bloqueado (proteção LGPD e do seu número)
- **Tema claro/escuro** — ícone de sol/lua na topbar (escuro = preto + dourado do logo)

## Deploy passo a passo (grátis)

### 1. MongoDB Atlas (banco grátis)
1. Crie conta em https://www.mongodb.com/cloud/atlas/register
2. Crie um cluster **M0 (Free)** — região São Paulo (aws sa-east-1)
3. Em **Database Access**: crie um usuário com senha
4. Em **Network Access**: adicione `0.0.0.0/0` (necessário para o Vercel)
5. Clique **Connect → Drivers** e copie a string de conexão. Troque `<password>` pela senha e adicione o nome do banco:
   `mongodb+srv://usuario:SENHA@cluster0.xxxxx.mongodb.net/crm_infocentro?retryWrites=true&w=majority`

### 2. Vercel
1. Suba esta pasta para um repositório no GitHub (privado)
2. Em https://vercel.com → **Add New Project** → importe o repositório
3. Em **Environment Variables**, adicione:
   - `MONGODB_URI` = a string do passo 1
4. Deploy. Pronto — seu CRM estará em `https://seu-projeto.vercel.app`

### 3. Rodar local (opcional, para testar)
```bash
npm install
cp .env.local.example .env.local   # e preencha o MONGODB_URI
npm run dev                        # abre em http://localhost:3000
```

## Editar as mensagens da cadência

Duas formas: pela tela **Estratégias** dentro do app (recomendado — salva no banco e já vale pros próximos envios), ou direto em **`lib/messages.js`** (são os textos padrão usados até você personalizar cada um pela tela). `{nome}` vira o primeiro nome do cliente automaticamente nos dois casos.

## Ativar a página OS (espelho do PDV)

O CRM nunca acessa o banco `infopdv` diretamente — a leitura é via HTTP, seguindo as diretrizes de convivência dos dois sistemas. Pra ativar:

1. O PDV precisa expor um endpoint de leitura (ex.: `GET /api/sync?collection=serviceorders`) protegido por um token.
2. No Vercel do **CRM**, adicione as envs:
   - `PDV_API_URL` = URL pública do PDV (ex.: `https://seu-pdv.vercel.app`)
   - `PDV_API_TOKEN` = um token novo, só de leitura, próprio do CRM — **não reutilize o `SYNC_TOKEN`** do PDV
3. Redeploy. A tela OS passa a listar as ordens automaticamente, agrupadas por status.

Até isso estar configurado, a tela mostra um aviso explicando o que falta.

## Formato da planilha de importação

| nome | telefone | servico | nascimento |
|------|----------|---------|------------|
| Maria Silva | 12997762117 | Impressão | 15/03 |
| (vazio funciona) | 11988887777 | Formatação | |

- Só o **telefone é obrigatório** (com DDD). Duplicados são ignorados.
- Os nomes das colunas são flexíveis: "número", "celular", "o que fez", "aniversário" etc. também funcionam.

## Dica de rotina (o hábito que faz o CRM funcionar)

1. **Manhã**: abra o CRM → painel "Enviar hoje" → dispare as mensagens pendentes (10 min)
2. **Durante o dia**: cada cliente novo de impressão → anote nome + telefone + o que fez na planilha
3. **Fim do dia**: importe a planilha → cadência já agendada automaticamente
4. **Sexta**: clique em 💾 Backup Excel
