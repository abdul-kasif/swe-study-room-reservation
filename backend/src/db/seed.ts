import "dotenv/config";
import { db } from "./index";
import { resources } from "./schema";

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

  console.log(`Seed complete (${DEFAULT_RESOURCES.length} resources ensured).`);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
