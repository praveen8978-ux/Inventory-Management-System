declare global {
  namespace Express {
    interface Request {
      // Set by requireAuth. organizationId ALWAYS comes from here, never from the request body.
      auth?: { userId: string; organizationId: string };
    }
  }
}
export {};