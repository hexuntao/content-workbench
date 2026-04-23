import type { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "@/server/db/client";

export type DatabaseClient = PrismaClient | Prisma.TransactionClient;

export async function runInTransaction<T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction((tx: Prisma.TransactionClient): Promise<T> => callback(tx));
}
