import { PrismaClient } from "@prisma/client";
import { defaultGradeGroupNames } from "../src/lib/teacher/default-groups";

const prisma = new PrismaClient();

async function main() {
  for (const [index, name] of defaultGradeGroupNames.entries()) {
    const existing = await prisma.group.findFirst({
      where: { name, parentId: null },
    });

    if (existing) {
      await prisma.group.update({
        where: { id: existing.id },
        data: { sortOrder: index + 1 },
      });
    } else {
      await prisma.group.create({
        data: { name, sortOrder: index + 1 },
      });
    }
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
