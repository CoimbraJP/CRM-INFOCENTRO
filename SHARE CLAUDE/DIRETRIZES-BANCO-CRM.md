# Diretrizes de Banco de Dados — CRM no mesmo cluster do PDV

## 1. O que já existe (NÃO tocar)

- **Cluster Atlas:** `john.cmwcewu.mongodb.net`
- **Banco do PDV:** `infopdv`
- **Collections do PDV:** `products`, `sales`, `serviceorders`, `settings`
  (todas com documentos no formato `{ id, updatedAt, deleted, data }` — usados pelo sync do PDV)

O CRM **nunca** lê ou escreve em `infopdv`. Qualquer integração futura será via API HTTP entre os dois sistemas, não banco-a-banco.

## 2. Configuração do CRM

**Banco:** `info_crm` (o Mongo cria automaticamente na primeira escrita — não precisa criar nada no painel).

**String de conexão do CRM** (note o `/info_crm` no caminho):

```
MONGODB_URI=mongodb+srv://crm_user:<SENHA>@john.cmwcewu.mongodb.net/info_crm?retryWrites=true&w=majority
MONGODB_DB=info_crm
```

Se o código do seu CRM usa `dbName` na conexão (como o PDV faz em `_db.js`), garanta que aponte para `info_crm` — esse é o único ponto onde os dois sistemas poderiam se misturar.

## 3. Usuário Atlas separado (proteção real, 5 min no painel)

Não reutilize o usuário do PDV. Crie um usuário que só enxerga o banco do CRM — assim, mesmo um bug no CRM fica impedido de tocar no PDV:

1. Atlas → **Database Access** → **Add New Database User**
2. Nome: `crm_user`, senha longa/aleatória
3. Em privilégios: **Specific Privileges** → Role `readWrite` → Database `info_crm` (deixe Collection em branco)
4. Use esse usuário na string de conexão acima

(O usuário atual do PDV, `joaopaulocoimbras_db_user`, tem acesso amplo — aproveite para trocar a senha dele, como já apontado na auditoria.)

## 4. Regras de convivência

- **Nomes de collections podem repetir** entre bancos sem conflito (ex.: um `customers` em `info_crm` não interfere em nada do `infopdv`) — bancos são isolados dentro do cluster.
- **Não reutilize o `SYNC_TOKEN` do PDV** no CRM; cada sistema tem suas próprias credenciais e envs.
- **Free tier (M0):** os dois bancos dividem os mesmos 512 MB e limites de conexão do cluster. Ambos os projetos serverless devem manter o padrão de conexão cacheada (`global._mongoose`) que o PDV já usa, senão as funções esgotam o pool.
- **Correlação futura PDV↔CRM:** use CPF/CNPJ normalizado (só dígitos) como chave de correlação entre clientes — é o identificador que já existe nas OS do PDV. Guarde no CRM como campo próprio; nada de referência obrigatória.
- **Backup:** o backup automático do PDV cobre só o `infopdv`; o `info_crm` precisa do seu próprio (mongodump/export ou rotina do CRM).
