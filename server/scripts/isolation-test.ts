/**
 * Tenant-isolation check. Run with the API server running:
 *   npm run test:isolation
 * Creates two throwaway organizations, tries to cross the boundary in every way
 * the API allows, then deletes everything it created.
 */
import "dotenv/config";
import { prisma } from "../src/lib/prisma";

const API = process.env.API_URL ?? "http://localhost:4000";

type Result = { status: number; body: any; cookie: string | null };

async function call(method: string, path: string, opts: { cookie?: string | null; body?: unknown } = {}): Promise<Result> {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(opts.cookie ? { Cookie: opts.cookie } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const raw = res.headers.getSetCookie?.() ?? (res.headers.get("set-cookie") ? [res.headers.get("set-cookie")!] : []);
  const token = raw.find((c) => c.startsWith("token="));
  const text = await res.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: res.status, body, cookie: token ? token.split(";")[0] : null };
}

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : detail ? `  (${detail})` : ""}`);
  if (!ok) failures++;
}

async function main() {
  const stamp = Date.now();
  const emails = [`isolation-a-${stamp}@example.com`, `isolation-b-${stamp}@example.com`];
  const orgIds: string[] = [];

  try {
    const health = await call("GET", "/api/health");
    if (health.status !== 200) throw new Error(`API not reachable at ${API}. Start it with: npm run dev:server`);

    const a = await call("POST", "/api/auth/signup", { body: { email: emails[0], password: "Isolation#123", organizationName: "Isolation Org A" } });
    const b = await call("POST", "/api/auth/signup", { body: { email: emails[1], password: "Isolation#123", organizationName: "Isolation Org B" } });
    if (a.status !== 201 || b.status !== 201 || !a.cookie || !b.cookie) {
      throw new Error(`Signup failed (A: ${a.status}, B: ${b.status})`);
    }
    orgIds.push(a.body.organization.id, b.body.organization.id);

    // 1. Logged-out requests are rejected
    check("logged out: list products is 401", (await call("GET", "/api/products")).status === 401);
    check("logged out: dashboard is 401", (await call("GET", "/api/dashboard")).status === 401);
    check("logged out: settings is 401", (await call("GET", "/api/settings")).status === 401);

    // 2. Same SKU is allowed in different orgs, not inside one
    const pA = await call("POST", "/api/products", { cookie: a.cookie, body: { name: "A's product", sku: "ISO-1", quantityOnHand: 10 } });
    const pB = await call("POST", "/api/products", { cookie: b.cookie, body: { name: "B's product", sku: "ISO-1", quantityOnHand: 4 } });
    check("same SKU allowed in two different orgs", pA.status === 201 && pB.status === 201, `${pA.status}/${pB.status}`);
    const dup = await call("POST", "/api/products", { cookie: a.cookie, body: { name: "Dup", sku: "ISO-1", quantityOnHand: 1 } });
    check("duplicate SKU inside one org is 409", dup.status === 409, String(dup.status));

    const idA: string = pA.body.id;

    // 3. B cannot touch A's product by id
    check("B cannot GET A's product (404)", (await call("GET", `/api/products/${idA}`, { cookie: b.cookie })).status === 404);
    check("B cannot PUT A's product (404)", (await call("PUT", `/api/products/${idA}`, { cookie: b.cookie, body: { name: "hacked", sku: "HACK", quantityOnHand: 999 } })).status === 404);
    check("B cannot adjust A's stock (404)", (await call("PATCH", `/api/products/${idA}/adjust`, { cookie: b.cookie, body: { delta: 100 } })).status === 404);
    check("B cannot DELETE A's product (404)", (await call("DELETE", `/api/products/${idA}`, { cookie: b.cookie })).status === 404);

    // 4. Lists and dashboard only show own data
    const listB = await call("GET", "/api/products", { cookie: b.cookie });
    check("B's list contains only B's product", Array.isArray(listB.body) && listB.body.length === 1 && listB.body[0].name === "B's product");
    const dashB = await call("GET", "/api/dashboard", { cookie: b.cookie });
    check("B's dashboard counts only B's data", dashB.body?.totalProducts === 1 && dashB.body?.totalUnits === 4, JSON.stringify(dashB.body));

    // 5. A's product is untouched after all of that
    const after = await call("GET", `/api/products/${idA}`, { cookie: a.cookie });
    check("A's product is unchanged", after.status === 200 && after.body.name === "A's product" && after.body.quantityOnHand === 10);

    // 6. A client-supplied organizationId is ignored
    const spoof = await call("POST", "/api/products", { cookie: b.cookie, body: { name: "Spoof", sku: "SPOOF-1", quantityOnHand: 1, organizationId: a.body.organization.id } });
    const listA = await call("GET", "/api/products", { cookie: a.cookie });
    check("body organizationId is ignored (product lands in B, not A)", spoof.status === 201 && listA.body.length === 1, `A has ${listA.body?.length}`);

    // 7. Settings are per organization
    await call("PUT", "/api/settings", { cookie: b.cookie, body: { defaultLowStockThreshold: 99 } });
    const setA = await call("GET", "/api/settings", { cookie: a.cookie });
    check("B changing settings does not affect A", setA.body?.defaultLowStockThreshold === 5, JSON.stringify(setA.body));
  } catch (err) {
    console.error("\nTest run aborted:", err instanceof Error ? err.message : err);
    failures++;
  } finally {
    // Clean up everything this run created
    if (orgIds.length) {
      await prisma.product.deleteMany({ where: { organizationId: { in: orgIds } } });
      await prisma.user.deleteMany({ where: { organizationId: { in: orgIds } } });
      await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
    }
    await prisma.$disconnect();
  }

  console.log(failures === 0 ? "\nAll isolation checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();