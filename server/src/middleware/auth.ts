import type { NextFunction, Request, Response } from "express";
import { COOKIE_NAME, verifyToken } from "../lib/auth";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.[COOKIE_NAME];
  const payload = token ? verifyToken(token) : null;
  if (!payload) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  req.auth = payload;
  next();
}