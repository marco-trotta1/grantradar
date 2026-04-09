/**
 * Seed script: Pull 50 real grants from Grants.gov for local dev.
 * Run with: npm run seed
 */
import "dotenv/config";
import { syncGrants } from "../src/services/grantService";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("Seeding database with grants from Grants.gov...");

  // Pull a mix of categories relevant to nonprofits and schools
  const filters = {
    eligibilities: [
      "12", // Nonprofits (no 501c3)
      "13", // Nonprofits (501c3)
      "05", // Independent school districts
      "06", // Public colleges/universities
    ],
  };

  const { synced, errors } = await syncGrants(50, filters);
  console.log(`\nSeed complete: ${synced} grants added, ${errors} errors`);

  const count = await prisma.grant.count();
  console.log(`Total grants in DB: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
