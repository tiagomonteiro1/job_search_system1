import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users, 
  subscriptionPlans, InsertSubscriptionPlan,
  resumes, InsertResume,
  jobListings, InsertJobListing,
  jobApplications, InsertJobApplication,
  integrations, InsertIntegration,
  testimonials, InsertTestimonial,
  faqs, InsertFaq
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER HELPERS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserSubscription(userId: number, planId: number, status: "active" | "inactive" | "cancelled") {
  const db = await getDb();
  if (!db) return;

  await db.update(users)
    .set({ 
      subscriptionPlanId: planId, 
      subscriptionStatus: status,
      subscriptionStartDate: new Date(),
      updatedAt: new Date()
    })
    .where(eq(users.id, userId));
}

// ============= SUBSCRIPTION PLAN HELPERS =============

export async function getAllSubscriptionPlans() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
}

export async function getSubscriptionPlanById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSubscriptionPlan(plan: InsertSubscriptionPlan) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(subscriptionPlans).values(plan);
  return result;
}

export async function updateSubscriptionPlan(id: number, plan: Partial<InsertSubscriptionPlan>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(subscriptionPlans).set({ ...plan, updatedAt: new Date() }).where(eq(subscriptionPlans.id, id));
}

// ============= RESUME HELPERS =============

export async function createResume(resume: InsertResume) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(resumes).values(resume);
  return result;
}

export async function getResumesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(resumes).where(eq(resumes.userId, userId)).orderBy(desc(resumes.createdAt));
}

export async function getResumeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(resumes).where(eq(resumes.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateResume(id: number, data: Partial<InsertResume>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(resumes).set({ ...data, updatedAt: new Date() }).where(eq(resumes.id, id));
}

export async function deleteResume(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(resumes).where(eq(resumes.id, id));
}

// ============= JOB LISTING HELPERS =============

export async function createJobListing(job: InsertJobListing) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(jobListings).values(job);
  return result;
}

export async function getAllJobListings(limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(jobListings).orderBy(desc(jobListings.createdAt)).limit(limit);
}

export async function getJobListingById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(jobListings).where(eq(jobListings.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ============= JOB APPLICATION HELPERS =============

export async function createJobApplication(application: InsertJobApplication) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(jobApplications).values(application);
  return result;
}

export async function getApplicationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(jobApplications).where(eq(jobApplications.userId, userId)).orderBy(desc(jobApplications.createdAt));
}

export async function getAllApplications() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(jobApplications).orderBy(desc(jobApplications.createdAt));
}

export async function updateJobApplication(id: number, data: Partial<InsertJobApplication>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(jobApplications).set({ ...data, updatedAt: new Date() }).where(eq(jobApplications.id, id));
}

// ============= INTEGRATION HELPERS =============

export async function createIntegration(integration: InsertIntegration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(integrations).values(integration);
  return result;
}

export async function getIntegrationsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(integrations).where(eq(integrations.userId, userId));
}

export async function updateIntegration(id: number, data: Partial<InsertIntegration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(integrations).set({ ...data, updatedAt: new Date() }).where(eq(integrations.id, id));
}

export async function deleteIntegration(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(integrations).where(eq(integrations.id, id));
}

// ============= TESTIMONIAL HELPERS =============

export async function getVisibleTestimonials() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(testimonials).where(eq(testimonials.isVisible, true)).orderBy(desc(testimonials.createdAt));
}

export async function createTestimonial(testimonial: InsertTestimonial) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(testimonials).values(testimonial);
  return result;
}

// ============= FAQ HELPERS =============

export async function getVisibleFaqs() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(faqs).where(eq(faqs.isVisible, true)).orderBy(faqs.order);
}

export async function createFaq(faq: InsertFaq) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(faqs).values(faq);
  return result;
}
