import { describe, it, expect } from "vitest";
import { searchAdzunaJobs, testAdzunaConnection } from "./adzuna";

describe("Adzuna API Integration", () => {
  it("should successfully connect to Adzuna API with valid credentials", async () => {
    const isConnected = await testAdzunaConnection();
    expect(isConnected).toBe(true);
  }, 15000); // 15 segundos de timeout para chamada de API

  it("should search for jobs with basic query", async () => {
    const result = await searchAdzunaJobs({
      what: "developer",
      resultsPerPage: 5,
    }, "br");

    expect(result).toBeDefined();
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
    expect(result.count).toBeGreaterThanOrEqual(0);
  }, 15000);

  it("should search for jobs with location filter", async () => {
    const result = await searchAdzunaJobs({
      what: "desenvolvedor",
      where: "São Paulo",
      resultsPerPage: 5,
    }, "br");

    expect(result).toBeDefined();
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
  }, 15000);

  it("should return job objects with required fields", async () => {
    const result = await searchAdzunaJobs({
      what: "developer",
      resultsPerPage: 1,
    }, "br");

    if (result.results.length > 0) {
      const job = result.results[0];
      expect(job.id).toBeDefined();
      expect(job.title).toBeDefined();
      expect(job.description).toBeDefined();
      expect(job.company).toBeDefined();
      expect(job.company.display_name).toBeDefined();
      expect(job.location).toBeDefined();
      expect(job.location.display_name).toBeDefined();
    }
  }, 15000);
});
