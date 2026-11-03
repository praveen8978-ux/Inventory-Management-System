/**
 * Demo data. Run with: npm run db:seed
 * Safe to re-run: it resets the demo organization's products each time.
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const DEMO_EMAIL = "demo@stockflow.dev";
const DEMO_PASSWORD = "Demo@12345";

const products = [
  { name: "Logitech Wireless Mouse", sku: "LOG-MOU-001", quantityOnHand: 50, costPrice: 450, sellingPrice: 699, description: "2.4 GHz wireless mouse with USB receiver" },
  { name: "Samsung 128GB Pendrive", sku: "SAM-PEN-128", quantityOnHand: 3, costPrice: 380, sellingPrice: 549 },
  { name: "USB-C Charging Cable 1m", sku: "CAB-USC-001", quantityOnHand: 120, costPrice: 60, sellingPrice: 149 },
  { name: "Mechanical Keyboard", sku: "KEY-MEC-001", quantityOnHand: 18, costPrice: 1800, sellingPrice: 2799, lowStockThreshold: 20, description: "Own threshold of 20, so this is low even though 18 is above the default" },
  { name: "HDMI Cable 2m", sku: "CAB-HDM-002", quantityOnHand: 0, costPrice: 90, sellingPrice: 199 },
  { name: "Aluminium Laptop Stand", sku: "STD-LAP-001", quantityOnHand: 25, costPrice: 700, sellingPrice: 1199 },
  { name: "27-inch Monitor", sku: "MON-27-001", quantityOnHand: 7, costPrice: 9500, sellingPrice: 12999 },
  { name: "Webcam 1080p", sku: "CAM-1080-001", quantityOnHand: 5, costPrice: 1100, sellingPrice: 1799, description: "Exactly at the default threshold of 5, which counts as low" },
  { name: "Bluetooth Speaker", sku: "SPK-BT-001", quantityOnHand: 14, costPrice: 1300, sellingPrice: 1999 },
  { name: "Wireless Earbuds", sku: "EAR-WL-001", quantityOnHand: 2, costPrice: 1500, sellingPrice: 2499, lowStockThreshold: 10 },
  { name: "Desk Mat XL", sku: "MAT-XL-001", quantityOnHand: 40, costPrice: 350, sellingPrice: 599, lowStockThreshold: 0, description: "Threshold of 0, so it only flags when it hits zero" },
  { name: "Phone Case (Assorted)", sku: "CASE-AST-001", quantityOnHand: 200, sellingPrice: 129 },
];

async function main() {
  const existing = await prisma.user.findUnique({ where: { email: DEMO_EMAIL } });

  let organizationId: string;
  let userId: string;
  if (existing) {
    organizationId = existing.organizationId;
    userId = existing.id;
    await prisma.product.deleteMany({ where: { organizationId } });
    await prisma.organization.update({ where: { id: organizationId }, data: { defaultLowStockThreshold: 5 } });
  } else {
    const user = await prisma.user.create({
      data: {
        email: DEMO_EMAIL,
        passwordHash: await bcrypt.hash(DEMO_PASSWORD, 10),
        organization: { create: { name: "Demo Store", defaultLowStockThreshold: 5 } },
      },
    });
    organizationId = user.organizationId;
    userId = user.id;
  }

  await prisma.product.createMany({
    data: products.map((p) => ({ ...p, organizationId, lastUpdatedBy: userId })),
  });

  console.log(`Seeded ${products.length} products into "Demo Store".`);
  console.log(`Log in with  ${DEMO_EMAIL}  /  ${DEMO_PASSWORD}`);
}

main()
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());