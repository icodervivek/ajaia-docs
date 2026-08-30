import { PrismaClient } from "@prisma/client";

// Single shared Prisma client instance (avoids exhausting connections
// during dev hot-reload / serverless cold starts).
export const prisma = new PrismaClient();
