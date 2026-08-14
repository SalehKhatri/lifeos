// Seeds the default, shared task categories (userId = null).
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const DEFAULT_CATEGORIES = ["Work", "Personal", "Health", "Learning", "Admin", "Other"];

async function main() {
  const adapter = new PrismaPg({ connectionString: process.env["DATABASE_URL"] });
  const prisma = new PrismaClient({ adapter });

  // One findMany + one createMany — never query in a loop (see CLAUDE.md).
  // (Also: Prisma's compound-unique `where` input doesn't accept null for a
  // nullable field (userId), so upsert-by-compound-key isn't usable here anyway.)
  const existing = await prisma.category.findMany({
    where: { userId: null, name: { in: DEFAULT_CATEGORIES } },
    select: { name: true },
  });
  const existingNames = new Set(existing.map((c) => c.name));
  const missing = DEFAULT_CATEGORIES.filter((name) => !existingNames.has(name));

  if (missing.length > 0) {
    await prisma.category.createMany({
      data: missing.map((name) => ({ userId: null, name })),
    });
  }

  console.log(
    `Seeded ${missing.length} new default categories (${DEFAULT_CATEGORIES.length - missing.length} already existed).`,
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
