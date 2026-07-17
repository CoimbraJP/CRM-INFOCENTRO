import { MongoClient } from "mongodb";

const uri = process.env.MONGODB_URI;
if (!uri) throw new Error("Defina MONGODB_URI no .env.local ou nas variáveis do Vercel");

let cached = global._mongo;
if (!cached) cached = global._mongo = { client: null, promise: null };

export async function getDb() {
  if (!cached.client) {
    if (!cached.promise) {
      cached.promise = new MongoClient(uri).connect();
    }
    cached.client = await cached.promise;
  }
  return cached.client.db();
}
