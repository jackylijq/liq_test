import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const grades = [
  "1年级上册",
  "1年级下册",
  "2年级上册",
  "2年级下册",
  "3年级上册",
  "3年级下册",
  "4年级上册",
  "4年级下册",
  "5年级上册",
  "5年级下册",
  "6年级上册",
  "6年级下册",
];

async function main() {
  for (const [index, name] of grades.entries()) {
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
