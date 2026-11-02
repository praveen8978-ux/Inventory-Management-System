import { Router } from "express";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { fieldErrors, settingsSchema } from "../lib/validators";
import { getOrgDefaultThreshold } from "../lib/stock";

const router = Router();
router.use(requireAuth);

// GET /api/settings
router.get("/", async (req, res) => {
  try {
    const defaultLowStockThreshold = await getOrgDefaultThreshold(req.auth!.organizationId);
    return res.json({ defaultLowStockThreshold });
  } catch (err) {
    console.error("get settings failed", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// PUT /api/settings
router.put("/", async (req, res) => {
  const parsed = settingsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please fix the highlighted fields", fieldErrors: fieldErrors(parsed.error) });
  }
  try {
    const org = await prisma.organization.update({
      where: { id: req.auth!.organizationId }, // from the token, never the request
      data: { defaultLowStockThreshold: parsed.data.defaultLowStockThreshold },
      select: { defaultLowStockThreshold: true },
    });
    return res.json({ defaultLowStockThreshold: org.defaultLowStockThreshold });
  } catch (err) {
    console.error("update settings failed", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

export default router;