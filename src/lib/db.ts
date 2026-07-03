import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaConnectionString: string | undefined;
}

function createPrismaClient(connectionString: string) {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

function getConnectionString() {
  const connectionString = process.env.DATABASE_URL ?? process.env.NETLIFY_DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL (or NETLIFY_DATABASE_URL) is not set");
  }
  return connectionString;
}

// En dev, le port du Postgres local (fourni par `netlify dev`) change à
// chaque redémarrage ; on recrée le client si la connection string a changé
// plutôt que de garder indéfiniment la première capturée par le singleton HMR.
function getPrismaClient() {
  const connectionString = getConnectionString();
  if (!globalThis.__prisma || globalThis.__prismaConnectionString !== connectionString) {
    globalThis.__prisma = createPrismaClient(connectionString);
    globalThis.__prismaConnectionString = connectionString;
  }
  return globalThis.__prisma;
}

const prodClient = process.env.NODE_ENV === "production" ? createPrismaClient(getConnectionString()) : undefined;

export const db: PrismaClient =
  prodClient ??
  new Proxy({} as PrismaClient, {
    get(_target, prop, receiver) {
      return Reflect.get(getPrismaClient(), prop, receiver);
    },
  });
