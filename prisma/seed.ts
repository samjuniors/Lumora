import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🚀 Starting database seeding operations...");

  // 1. Seed Global Settings
  console.log("⚙️  Configuring global billing settings...");
  await prisma.settings.upsert({
    where: { id: "global" },
    update: {},
    create: {
      id: "global",
      upiHandle: "lumina@okaxis",
      mobileNumber: "+919876543210",
      payeeName: "Lumina Academy Admin Operations",
      paymentLink: "https://pay.lumina.academy/process-deposit",
    },
  });

  // 2. Pre-register initial admin and superadmin emails
  console.log("🔑 Registering high-stakes administrative accounts...");
  const preRegistered = [
    {
      email: "luvkus8@gmail.com",
      name: "Lead Enforcer / Admin",
      role: "superadmin",
      coins: 500000,
    },
    {
      email: "admin@lumina-academy.com",
      name: "System Trustee",
      role: "superadmin",
      coins: 250000,
    },
    {
      email: "reviewer@lumina-academy.com",
      name: "Lead Academic Auditor",
      role: "admin",
      coins: 100000,
    },
  ];

  for (const pr of preRegistered) {
    await prisma.preRegisteredUser.upsert({
      where: { email: pr.email },
      update: {
        name: pr.name,
        role: pr.role,
        coins: pr.coins,
      },
      create: {
        id: `pr_${Math.random().toString(36).substring(2, 11)}`,
        email: pr.email,
        name: pr.name,
        role: pr.role,
        coins: pr.coins,
        status: "pending",
      },
    });
  }

  // 3. Create initial premium invite codes
  console.log("🎟️  Creating active elite invitation codes...");
  const inviteCodes = [
    {
      code: "LUMINA-ADMIN-SUPER",
      role: "superadmin",
      maxUses: 5,
    },
    {
      code: "LUMINA-ADMIN-EXEC",
      role: "admin",
      maxUses: 15,
    },
    {
      code: "LUMINA-ELITE-STUDENT",
      role: "student",
      maxUses: 100,
    },
  ];

  for (const ic of inviteCodes) {
    await prisma.inviteCode.upsert({
      where: { code: ic.code },
      update: {
        role: ic.role,
        maxUses: ic.maxUses,
      },
      create: {
        id: `ic_${Math.random().toString(36).substring(2, 11)}`,
        code: ic.code,
        role: ic.role,
        createdBy: "system-bootstrap",
        used: false,
        usedBy: [],
        maxUses: ic.maxUses,
        currentUses: 0,
      },
    });
  }

  console.log("✅ Seeding completed successfully. Operational parameters initialized.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Database seeding encountered a failure:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
