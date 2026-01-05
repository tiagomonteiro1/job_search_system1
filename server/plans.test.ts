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

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Public Routes", () => {
  it("should return subscription plans for public users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const plans = await caller.public.getPlans();

    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
    
    // Verify plan structure
    const plan = plans[0];
    expect(plan).toHaveProperty("id");
    expect(plan).toHaveProperty("name");
    expect(plan).toHaveProperty("price");
    expect(plan).toHaveProperty("maxApplications");
    expect(plan).toHaveProperty("hasAiAnalysis");
  });

  it("should return testimonials for public users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const testimonials = await caller.public.getTestimonials();

    expect(Array.isArray(testimonials)).toBe(true);
    
    if (testimonials.length > 0) {
      const testimonial = testimonials[0];
      expect(testimonial).toHaveProperty("authorName");
      expect(testimonial).toHaveProperty("content");
      expect(testimonial).toHaveProperty("rating");
    }
  });

  it("should return FAQs for public users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const faqs = await caller.public.getFaqs();

    expect(Array.isArray(faqs)).toBe(true);
    
    if (faqs.length > 0) {
      const faq = faqs[0];
      expect(faq).toHaveProperty("question");
      expect(faq).toHaveProperty("answer");
      expect(faq).toHaveProperty("order");
    }
  });
});

describe("User Routes", () => {
  it("should return user profile for authenticated users", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const profile = await caller.user.getProfile();

    expect(profile).toBeDefined();
    if (profile) {
      expect(profile).toHaveProperty("id");
      expect(profile).toHaveProperty("email");
      expect(profile).toHaveProperty("role");
    }
  });

  it("should return user resumes", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const resumes = await caller.user.getResumes();

    expect(Array.isArray(resumes)).toBe(true);
  });

  it("should return user applications", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const applications = await caller.user.getApplications();

    expect(Array.isArray(applications)).toBe(true);
  });

  it("should return user integrations", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const integrations = await caller.user.getIntegrations();

    expect(Array.isArray(integrations)).toBe(true);
  });
});

describe("Admin Routes", () => {
  it("should allow admin to get all applications", async () => {
    const ctx = createMockContext(true);
    const caller = appRouter.createCaller(ctx);

    const applications = await caller.admin.getAllApplications();

    expect(Array.isArray(applications)).toBe(true);
  });

  it("should reject non-admin users from admin routes", async () => {
    const ctx = createMockContext(false);
    const caller = appRouter.createCaller(ctx);

    await expect(caller.admin.getAllApplications()).rejects.toThrow("Unauthorized");
  });
});

describe("Authentication", () => {
  it("should return current user info", async () => {
    const ctx = createMockContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeDefined();
    expect(user?.email).toBe("test@example.com");
  });

  it("should return null for unauthenticated users", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);

    const user = await caller.auth.me();

    expect(user).toBeNull();
  });
});
