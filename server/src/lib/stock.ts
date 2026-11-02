import type { Product } from "@prisma/client";
import { prisma } from "./prisma";

export const FALLBACK_THRESHOLD = 5;

export async function getOrgDefaultThreshold(organizationId: string): Promise<number> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { defaultLowStockThreshold: true },
  });
  return org?.defaultLowStockThreshold ?? FALLBACK_THRESHOLD;
}

/**
 * A product's own threshold wins; if it's empty, the organization default is used.
 * `??` (not `||`) so an explicit 0 is respected.
 */
export function withStockStatus(p: Product, orgDefault: number) {
  const effectiveThreshold = p.lowStockThreshold ?? orgDefault;
  return { ...p, effectiveThreshold, isLowStock: p.quantityOnHand <= effectiveThreshold };
}