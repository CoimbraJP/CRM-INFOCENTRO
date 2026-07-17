import { MongoClient } from "mongodb";

// Padrão de conexão cacheada (mesmo esquema do PDV) — obrigatório no Vercel/M0
let cached = global._mongoCrm;
if (!cached) cached = global._mongoCrm = { client: null, promise: null };

export async function getDb() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI não configurada. Defina nas Environment Variables do Vercel e faça redeploy.");
  if (!cached.client) {
    if (!cached.promise) {
      cached.promise = new MongoClient(uri, { maxPoolSize: 5 }).connect();
    }
    cached.client = await cached.promise;
  }
  // MONGODB_DB garante o banco certo (info_crm) mesmo se a URI não tiver o caminho
  return cached.client.db(process.env.MONGODB_DB || "info_crm");
}
