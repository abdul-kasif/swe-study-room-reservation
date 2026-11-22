import "dotenv/config";
import { db } from "./index";
import bcrypt from "bcryptjs";
import { resources, users } from "./schema";

const DEFAULT_RESOURCES = [
  { resourceId: "Room-A", name: "Standard Study Room A", isActive: true },
  { resourceId: "Room-B", name: "Standard Study Room B", isActive: true },
  { resourceId: "Room-C", name: "Standard Study Room C", isActive: true },
  { resourceId: "VIP_Room-A", name: "VIP Conference Room A", isActive: true },
  { resourceId: "VIP_Room-B", name: "VIP Conference Room B", isActive: true },
];

async function seed() {
  console.log("Seeding study room resources...");

  await db
    .insert(resources)
    .values(DEFAULT_RESOURCES)
    .onConflictDoNothing({ target: resources.resourceId });

  const studentHash = await bcrypt.hash("student123", 10);
  const adminHash = await bcrypt.hash("admin123", 10);

  await db
    .insert(users)
    .values([
      {
        username: "student1",
        fullName: "Alice Student",
        passwordHash: studentHash,
        role: "STUDENT",
      },
      {
        username: "student2",
        fullName: "Bob Student",
        passwordHash: studentHash,
        role: "STUDENT",
      },
      {
        username: "admin1",
        fullName: "Campus Admin",
        passwordHash: adminHash,
        role: "ADMIN",
      },
    ])
    .onConflictDoNothing({ target: users.username });

  console.log(`Seed complete (${DEFAULT_RESOURCES.length} resources ensured).`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
