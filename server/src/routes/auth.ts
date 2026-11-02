import { Router } from "express";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { fieldErrors, loginSchema, signupSchema } from "../lib/validators";
import { clearAuthCookie, setAuthCookie } from "../lib/auth";
import { requireAuth } from "../middleware/auth";

const router = Router();

// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", 10);

const orgSelect = { id: true, name: true, defaultLowStockThreshold: true } as const;

// POST /api/auth/signup  -> creates Organization + User in one atomic write
router.post("/signup", async (req, res) => {
  const parsed = signupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please fix the highlighted fields", fieldErrors: fieldErrors(parsed.error) });
  }
  const { email, password, organizationName } = parsed.data;

  try {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        organization: { create: { name: organizationName } }, // nested create = single transaction
      },
      include: { organization: { select: orgSelect } },
    });

    setAuthCookie(res, { userId: user.id, organizationId: user.organizationId });
    return res.status(201).json({ id: user.id, email: user.email, organization: user.organization });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return res.status(409).json({
        error: "An account with this email already exists",
        fieldErrors: { email: "An account with this email already exists" },
      });
    }
    console.error("signup failed", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Please fix the highlighted fields", fieldErrors: fieldErrors(parsed.error) });
  }
  const { email, password } = parsed.data;

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: { select: orgSelect } },
    });

    const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
    if (!user || !ok) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    setAuthCookie(res, { userId: user.id, organizationId: user.organizationId });
    return res.json({ id: user.id, email: user.email, organization: user.organization });
  } catch (err) {
    console.error("login failed", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

// POST /api/auth/logout
router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

// GET /api/auth/me  -> current user + organization (re-checked against the DB)
router.get("/me", requireAuth, async (req, res) => {
  const { userId, organizationId } = req.auth!;
  try {
    const user = await prisma.user.findFirst({
      where: { id: userId, organizationId },
      include: { organization: { select: orgSelect } },
    });
    if (!user) {
      clearAuthCookie(res); // token is valid but the user no longer exists
      return res.status(401).json({ error: "Not authenticated" });
    }
    return res.json({ id: user.id, email: user.email, organization: user.organization });
  } catch (err) {
    console.error("me failed", err);
    return res.status(500).json({ error: "Something went wrong. Try again." });
  }
});

export default router;