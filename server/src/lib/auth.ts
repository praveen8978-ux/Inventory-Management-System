import jwt from "jsonwebtoken";
import type { CookieOptions, Response } from "express";

export const COOKIE_NAME = "token";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function secret(): string {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set. Add it to server/.env");
  return s;
}

const cookieOptions: CookieOptions = {
  httpOnly: true, // not readable from JS, protects the token from XSS
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
};

export type TokenPayload = { userId: string; organizationId: string };

export function setAuthCookie(res: Response, payload: TokenPayload) {
  const token = jwt.sign(payload, secret(), { expiresIn: "7d" });
  res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SEVEN_DAYS_MS });
}

export function clearAuthCookie(res: Response) {
  res.clearCookie(COOKIE_NAME, cookieOptions);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const decoded = jwt.verify(token, secret());
    if (
      typeof decoded === "object" &&
      typeof decoded.userId === "string" &&
      typeof decoded.organizationId === "string"
    ) {
      return { userId: decoded.userId, organizationId: decoded.organizationId };
    }
    return null;
  } catch {
    return null;
  }
}