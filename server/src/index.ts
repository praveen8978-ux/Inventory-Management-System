import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import dashboardRoutes from "./routes/dashboard";
import settingsRoutes from "./routes/settings";

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    credentials: true, // allow the httpOnly auth cookie
  })
);
app.use(express.json());
app.use(cookieParser());

app.get("/api/health", async (_req, res) => {
  try {
    const orgs = await prisma.organization.count();
    res.json({ status: "ok", db: "connected", organizations: orgs });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);

app.listen(PORT, () => {
  console.log(`StockFlow API running on http://localhost:${PORT}`);
});