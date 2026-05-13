import { PrismaClient } from "../prisma/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from 'dotenv'
dotenv.config()

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL!,
});

const globalForPrisma = globalThis as {
  prisma?: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma

// import { PrismaClient } from "../../../prisma/generated/prisma/client";

// const globalForPrisma = globalThis as { prisma?: PrismaClient };

// const prisma =
//   globalForPrisma.prisma ||
//   new PrismaClient({
//     log: [
//       { level: "query", emit: "event" },
//       { level: "info", emit: "stdout" },
//       { level: "warn", emit: "stdout" },
//       { level: "error", emit: "stdout" },
//     ],
//   });

  
// if (process.env.NODE_ENV !== "prod") {
//   globalForPrisma.prisma = prisma;
// }

// export default prisma;
