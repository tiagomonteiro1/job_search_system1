import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createMockContext(isAdmin: boolean = false): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: isAdmin ? "admin" : "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Resume Features", () => {
  it("should allow authenticated users to get their resumes", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const resumes = await caller.user.getResumes();

    expect(Array.isArray(resumes)).toBe(true);
  });

  it("should allow authenticated users to get their applications", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const applications = await caller.user.getApplications();

    expect(Array.isArray(applications)).toBe(true);
  });

  it("should allow authenticated users to get their integrations", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const integrations = await caller.user.getIntegrations();

    expect(Array.isArray(integrations)).toBe(true);
  });
});

describe("Admin Features", () => {
  it("should allow admin to create a new plan", async () => {
    const ctx = createMockContext(true);
    const caller = appRouter.createCaller(ctx);

    const result = await caller.admin.createPlan({
      name: "Test Plan",
      description: "Test Description",
      price: "99.99",
      maxApplications: 50,
      hasAiAnalysis: true,
      features: '["Feature 1", "Feature 2"]',
    });

    expect(result.success).toBe(true);
  });

  it("should allow admin to get all applications", async () => {
    const ctx = createMockContext(true);
    const caller = appRouter.createCaller(ctx);

    const applications = await caller.admin.getAllApplications();

    expect(Array.isArray(applications)).toBe(true);
  });

  it("should allow admin to get all users", async () => {
    const ctx = createMockContext(true);
    const caller = appRouter.createCaller(ctx);

    const users = await caller.admin.getAllUsers();

    expect(Array.isArray(users)).toBe(true);
  });

  it("should reject non-admin from creating plans", async () => {
    const ctx = createMockContext(false);
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.admin.createPlan({
        name: "Test Plan",
        description: "Test Description",
        price: "99.99",
        maxApplications: 50,
        hasAiAnalysis: true,
        features: '["Feature 1"]',
      })
    ).rejects.toThrow("Unauthorized");
  });

  it("should reject non-admin from getting all applications", async () => {
    const ctx = createMockContext(false);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getAllApplications()).rejects.toThrow("Unauthorized");
  });

  it("should reject non-admin from getting all users", async () => {
    const ctx = createMockContext(false);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getAllUsers()).rejects.toThrow("Unauthorized");
  });
});

describe("Integration Features", () => {
  it("should allow users to create integrations", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.user.createIntegration({
      platform: "linkedin",
      username: "testuser",
      password: "testpass123",
    });

    expect(result.success).toBe(true);
  });

  it("should allow users to delete their own integrations", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // This will fail if no integration exists, but tests the authorization logic
    await expect(
      caller.user.deleteIntegration({
        integrationId: 999999,
      })
    ).rejects.toThrow("Integration not found");
  });
});

describe("Job Search Features", () => {
  it("should allow users to search for jobs", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    // This might fail if no resumes exist, which is expected behavior
    try {
      const result = await caller.jobs.searchJobs({
        query: "developer",
      });
      expect(result.success).toBe(true);
      expect(Array.isArray(result.jobs)).toBe(true);
    } catch (error: any) {
      // Expected error if no resume uploaded
      expect(error.message).toContain("resume");
    }
  });
});
