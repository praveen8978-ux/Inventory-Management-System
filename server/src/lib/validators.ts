import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(72, "Password must be 72 characters or fewer"), // bcrypt ignores bytes past 72
  organizationName: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters")
    .max(80, "Organization name must be 80 characters or fewer"),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
});

/** Turn a Zod error into { field: "first message" } for the client. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

// ---------- Products ----------
const wholeNumber = (label: string) =>
  z
    .number(`${label} must be a number`)
    .int(`${label} must be a whole number`)
    .min(0, `${label} can't be negative`)
    .max(1_000_000_000, `${label} is too large`);

const money = (label: string) =>
  z
    .number(`${label} must be a number`)
    .min(0, `${label} can't be negative`)
    .max(1_000_000_000, `${label} is too large`);

export const productSchema = z.object({
  name: z.string("Name is required").trim().min(1, "Name is required").max(120, "Name must be 120 characters or fewer"),
  sku: z.string("SKU is required").trim().min(1, "SKU is required").max(64, "SKU must be 64 characters or fewer"),
  description: z.string().trim().max(1000, "Description must be 1000 characters or fewer").nullish(),
  quantityOnHand: wholeNumber("Quantity").default(0),
  costPrice: money("Cost price").nullish(),
  sellingPrice: money("Selling price").nullish(),
  lowStockThreshold: wholeNumber("Low stock threshold").nullish(),
});

export type ProductInput = z.infer<typeof productSchema>;

/** Clean parsed input into exactly what gets written to the database. */
export function toProductData(input: ProductInput) {
  const cents = (n: number | null | undefined) => (n == null ? null : Math.round(n * 100) / 100);
  return {
    name: input.name,
    sku: input.sku,
    description: input.description ? input.description : null,
    quantityOnHand: input.quantityOnHand,
    costPrice: cents(input.costPrice),
    sellingPrice: cents(input.sellingPrice),
    lowStockThreshold: input.lowStockThreshold ?? null,
  };
}


// ---------- Settings ----------
export const settingsSchema = z.object({
  defaultLowStockThreshold: wholeNumber("Default low stock threshold"),
});


// ---------- Stock adjustment ----------
export const adjustSchema = z.object({
  delta: z
    .number("Enter a number of units")
    .int("Units must be a whole number")
    .min(-1_000_000_000, "That change is too large")
    .max(1_000_000_000, "That change is too large")
    .refine((n) => n !== 0, "Enter a number other than 0"),
  note: z.string().trim().max(200, "Note must be 200 characters or fewer").nullish(),
});