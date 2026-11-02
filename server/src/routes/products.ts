import { Router, type Response } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { requireAuth } from "../middleware/auth";
import { fieldErrors, productSchema, toProductData } from "../lib/validators";
import { getOrgDefaultThreshold, withStockStatus } from "../lib/stock";

const router = Router();

// Every route below requires login. organizationId always comes from the token (req.auth),
// never from the request body or URL.
router.use(requireAuth);

function handleError(res: Response, err: unknown, label: string) {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    return res.status(409).json({
      error: "A product with this SKU already exists",
      fieldErrors: { sku: "A product with this SKU already exists" },
    });
  }
  console.error(`${label} failed`, err);
  return res.status(500).json({ error: "Something went wrong. Try again." });
}

const notFound = (res: Response) => res.status(404).json({ error: "Product not found" });

// GET /api/products?search=
router.get("/", async (req, res) => {
  const { organizationId } = req.auth!;
  const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
  try {
    const [orgDefault, products] = await Promise.all([
      getOrgDefaultThreshold(organizationId),
      prisma.product.findMany({
        where: {
          organizationId,
          ...(search
            ? {
                OR: [
                    { name: { contains: search, mode: "insensitive" as const } },
                    { sku: { contains: search, mode: "insensitive" as const } },
                ],
              }
            : {}),
        },
        orderBy: { name: "asc" },
      }),
    ]);
    return res.json(products.map((p) => withStockStatus(p, orgDefault)));
  } catch (err) {
    return handleError(res, err, "list products");
  }
});

// POST /api/products
router.post("/", async (req, res) => {
  const { organizationId, userId } = req.auth!;
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please fix the highlighted fields", fieldErrors: fieldErrors(parsed.error) });
  }
  try {
    const created = await prisma.product.create({
      data: { ...toProductData(parsed.data), organizationId, lastUpdatedBy: userId },
    });
    const orgDefault = await getOrgDefaultThreshold(organizationId);
    return res.status(201).json(withStockStatus(created, orgDefault));
  } catch (err) {
    return handleError(res, err, "create product");
  }
});

// GET /api/products/:id
router.get("/:id", async (req, res) => {
  const { organizationId } = req.auth!;
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.id, organizationId } });
    if (!product) return notFound(res);
    const orgDefault = await getOrgDefaultThreshold(organizationId);
    return res.json(withStockStatus(product, orgDefault));
  } catch (err) {
    return handleError(res, err, "get product");
  }
});

// PUT /api/products/:id
router.put("/:id", async (req, res) => {
  const { organizationId, userId } = req.auth!;
  const parsed = productSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please fix the highlighted fields", fieldErrors: fieldErrors(parsed.error) });
  }
  try {
    // updateMany lets the organization check live inside the same query as the write
    const result = await prisma.product.updateMany({
      where: { id: req.params.id, organizationId },
      data: { ...toProductData(parsed.data), lastUpdatedBy: userId },
    });
    if (result.count === 0) return notFound(res);

    const updated = await prisma.product.findFirst({ where: { id: req.params.id, organizationId } });
    if (!updated) return notFound(res);
    const orgDefault = await getOrgDefaultThreshold(organizationId);
    return res.json(withStockStatus(updated, orgDefault));
  } catch (err) {
    return handleError(res, err, "update product");
  }
});

// DELETE /api/products/:id  (hard delete)
router.delete("/:id", async (req, res) => {
  const { organizationId } = req.auth!;
  try {
    const result = await prisma.product.deleteMany({ where: { id: req.params.id, organizationId } });
    if (result.count === 0) return notFound(res);
    return res.status(204).end();
  } catch (err) {
    return handleError(res, err, "delete product");
  }
});

export default router;