import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { prisma } from "./lib/prisma";
import authRoutes from "./routes/auth";
import productRoutes from "./routes/products";
import dashboardRoutes from "./routes/dashboard";
import settingsRoutes from "./routes/settings";

const isProd = process.env.NODE_ENV === "production";
if (isProd) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret === "change-me-in-production" || secret.length < 32) {
    throw new Error("Set JWT_SECRET to a random string of at least 32 characters in production");
  }
}

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.set("trust proxy", 1); // hosting platforms put a proxy in front of the app

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

// Unknown API paths return JSON, not the web app
app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));

// If the React app has been built (client/dist), serve it from this same server.
// Same origin means no CORS setup and the login cookie just works.
// Resolves to <repo>/client/dist from both server/src (dev) and server/dist (production).
const clientDist = path.resolve(__dirname, "../../client/dist");
if (fs.existsSync(path.join(clientDist, "index.html"))) {
  app.use(express.static(clientDist));
  // Any other path belongs to the React router (e.g. /products/123)
  app.get("*", (_req, res) => res.sendFile(path.join(clientDist, "index.html")));
}

app.listen(PORT, () => {
  console.log(`StockFlow running on http://localhost:${PORT}${isProd ? " (production)" : ""}`);
});