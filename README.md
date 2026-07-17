# CRM INFO Centro — Kanban de Leads com WhatsApp

CRM estilo Kanban para transformar os leads de impressão em clientes de manutenção e vendas.

## O que ele faz

- **Kanban drag & drop** — listas INBOX → CONTACTADO → CONVERSANDO → CLIENTE 💰 → RECORRENTE + NÃO PERTURBE 🚫 (e crie quantas quiser no botão ＋)
- **Importação de Excel** — lê sua planilha (nome, telefone, serviço, nascimento) e cria os cards no INBOX; ao importar, pode preencher automaticamente a agenda **D+0 / D+5 / D+30** de cada cliente com as mensagens prontas
- **Painel "📬 Enviar hoje"** — abre todo dia mostrando as mensagens vencendo, atrasadas e aniversariantes; botão do WhatsApp já abre a conversa com o texto personalizado, você só aperta enviar
- **Card completo** — 📝 observações, 📅 agenda de mensagens, 💬 WhatsApp direto, 💰 histórico de compras (com soma por lista, igual você queria), 🏷️ etiquetas coloridas pesquisáveis, 🎂 aniversário
- **Backup Excel** — botão que exporta tudo (clientes, compras, mensagens) pra planilha, mantendo seu backup local sempre igual ao online
- **NÃO PERTURBE** — cards nessa lista têm envio bloqueado (proteção LGPD e do seu número)

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

Tudo em **`lib/messages.js`** — edite os textos, adicione variações. `{nome}` vira o primeiro nome do cliente automaticamente.

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
