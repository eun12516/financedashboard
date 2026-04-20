import { Prisma } from "@prisma/client";

/** Prisma codes for unreachable DB / pool / network (not query logic). */
const CONNECTION_CODES = new Set(["P1001", "P1002", "P1017"]);

export function isPrismaConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    CONNECTION_CODES.has(error.code)
  );
}
