// import { betterAuth } from "better-auth";
// import { prismaAdapter } from "better-auth/adapters/prisma";
// import { PrismaClient } from "../generated/prisma/client.js";
// import { Pool } from "pg";
// import { PrismaPg } from "@prisma/adapter-pg";

// // 1. Create a standard industry connection pool using your Neon/PG URL
// const pool = new Pool({ 
//   connectionString: process.env.DATABASE_URL 
// });

// // 2. Instantiate the Prisma PG adapter
// const adapter = new PrismaPg(pool);

// // 3. Pass the adapter options into the required PrismaClient argument
// const prisma = new PrismaClient({ adapter });

// export const auth = betterAuth({
//   database: prismaAdapter(prisma, {
//     provider: "postgresql",
//   }),
//   emailAndPassword: {
//     enabled: true,
//   },
//   session: {
//     expiresIn: 60 * 60 * 24 * 30, // 30 days long session
//     updateAge: 60 * 60 * 2,      // Update session expiration every 2 hours
//   },
//   user: {
//     additionalFields: {
//       location: {
//         type: "string",
//         required: false,
//       },
//     },
//   },
// });

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaNeon } from "@prisma/adapter-neon";  // Keep this official wrapper

// 1. Initialize PrismaNeon by passing the connection string options directly
// (This automatically handles serverless pool allocation over WebSockets under the hood)
const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

// 2. Initialize Prisma Client passing the required option argument
const prisma = new PrismaClient({ adapter });

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 2,      // 2 hours
  },
  user: {
    additionalFields: {
      location: {
        type: "string",
        required: false,
      },
    },
  },
});
