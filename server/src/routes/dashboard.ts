import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { getOrgDefaultThreshold } from "../lib/stock";

const router = Router();
router.use(requireAuth);

type Row = { id: string; name: string; sku: string; quantityOnHand: number; lowStockThreshold: number | null };

// GET /api/dashboard -> totals + low-stock list for the caller's organization
router.get("/", async (req, res) => {
  const { organizationId } = req.auth!;
  try {
    const [orgDefault, products] = await Promise.all([
      getOrgDefaultThreshold(organizationId),
      prisma.product.findMany({
        where: { organizationId },
        select: { id: true, name: true, sku: true, quantityOnHand: true, lowStockThreshold: true },
      }),
    ]);
    const rows = products as Row[];

    // Low stock is evaluated in JS because the threshold falls back to the org default per row.
    const lowStock = rows
      .map((p: Row) => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        quantityOnHand: p.quantityOnHand,
        effectiveThreshold: p.lowStockThreshold ?? orgDefault,
      }))
      .filter((p) => p.quantityOnHand <= p.effectiveThreshold)
      .sort((a, b) => a.quantityOnHand - b.quantityOnHand || a.name.localeCompare(b.name));

    return res.json({
      totalProducts: rows.length,
      totalUnits: rows.reduce((sum: number, p: Row) => sum + p.quantityOnHand, 0),
      lowStock,
    });
  } catch (err) {
    console.error("dashboard failed", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

export default router;