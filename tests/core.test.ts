import { describe, expect, it } from "vitest";
import { dateSchema, grantSchema, profileSchema } from "../lib/domain";
import { scoreGrant } from "../lib/scoring";
import { normalizeFederal, normalizeSearchHit } from "../lib/providers";
import { calendarFile, csvFile } from "../lib/export";

const school = profileSchema.parse({
  name: "Boise Test School", city: "Boise", state: "ID", schoolType: "public-district",
  grades: ["elementary"], priorities: ["STEM & technology"], students: 300,
  fundingGoal: 10000, locale: "rural", titleI: true, capacity: "small-team", mission: "Science projects",
});
const grant = grantSchema.parse({
  id: "test", title: "School STEM projects", funder: "Test Foundation",
  description: "STEM science projects for elementary schools.", url: "https://example.org/grant",
  source: "federal", status: "posted", deadline: "2026-11-30", amountMin: 0, amountMax: 20000,
  priorities: ["STEM & technology"], applicantTypes: ["05"], eligibilityText: "School districts",
  locations: ["US"], grades: ["elementary"], costSharing: false,
  retrievedAt: "2026-10-10T12:00:00Z",
});
const now = new Date("2026-10-10T12:00:00Z");

describe("school matching", () => {
  it("explains every point in a match score", () => {
    const match = scoreGrant({ grant, school, now });
    expect(match.score).toBe(match.factors.reduce((sum, factor) => sum + factor.points, 0));
    expect(match.score).toBeGreaterThanOrEqual(85);
  });
  it("caps a known applicant mismatch", () => {
    expect(scoreGrant({ grant: { ...grant, applicantTypes: ["20"] }, school, now }).score).toBeLessThanOrEqual(30);
  });
  it("does not treat an individual school as a district", () => {
    const match = scoreGrant({ grant, school: { ...school, schoolType: "public-school" }, now });
    expect(match.warnings.join(" ")).toContain("district");
  });
  it("excludes expired grants from a positive recommendation", () => {
    expect(scoreGrant({ grant: { ...grant, deadline: dateSchema.parse("2026-10-09") }, school, now }).score).toBe(0);
  });
  it("caps unverified web results", () => {
    expect(scoreGrant({ grant: { ...grant, source: "web", status: "unverified" }, school, now }).score).toBeLessThanOrEqual(59);
  });
  it("caps grants with unknown applicants below a positive recommendation", () => {
    expect(scoreGrant({ grant: { ...grant, applicantTypes: [] }, school, now }).score).toBeLessThanOrEqual(59);
  });
  it("caps a state mismatch", () => {
    expect(scoreGrant({ grant: { ...grant, locations: ["CA"] }, school, now }).score).toBeLessThanOrEqual(20);
  });
  it("uses the federal nonprofit code 12 for a 501(c)(3)", () => {
    const privateSchool = { ...school, schoolType: "private-nonprofit" as const };
    expect(scoreGrant({ grant: { ...grant, applicantTypes: ["12"] }, school: privateSchool, now }).score).toBeGreaterThan(70);
  });
  it("rejects invalid profiles at the boundary", () => {
    expect(profileSchema.safeParse({ ...school, students: -1 }).success).toBe(false);
    expect(profileSchema.safeParse({ ...school, priorities: [] }).success).toBe(false);
  });
});

describe("official data boundaries", () => {
  it("reads the real Grants.gov search response field names", () => {
    const result = normalizeSearchHit({ id: "363913", number: "TEST", title: "School safety", agency: "BJA", oppStatus: "posted", closeDate: "10/30/2026" });
    expect(result.deadline).toBe("2026-10-30");
    expect(result.amountMax).toBeNull();
    expect(result.applicantTypes).toEqual([]);
  });
  it("reads amounts and eligibility from the official synopsis", () => {
    const result = normalizeFederal({ id: 363913, opportunityTitle: "School safety", ost: "POSTED", synopsis: {
      agencyName: "BJA", synopsisDesc: "<p>School safety &amp; training</p>", responseDateStr: "2026-10-30-00-00-00",
      awardCeiling: "2000000", awardFloor: "0", applicantTypes: [{ id: "05", description: "School districts" }],
      applicantEligibilityDesc: "Districts", costSharing: false,
    } });
    expect(result.amountMax).toBe(2000000);
    expect(result.applicantTypes).toEqual(["05"]);
    expect(result.description).toBe("School safety & training");
  });
  it("keeps an unknown deadline unknown", () => {
    expect(normalizeSearchHit({ id: "1", title: "School", agency: "Test", oppStatus: "posted" }).deadline).toBeNull();
  });
  it("rejects unsafe source links", () => {
    expect(grantSchema.safeParse({ ...grant, url: "javascript:alert(1)" }).success).toBe(false);
  });
});

describe("exports", () => {
  it("writes an all-day calendar entry with an exclusive end date", () => {
    const file = calendarFile(grant);
    expect(file).toContain("DTSTART;VALUE=DATE:20261130");
    expect(file).toContain("DTEND;VALUE=DATE:20261201");
    expect(file).toContain("TRIGGER:-P7D");
  });
  it("does not invent calendar dates", () => {
    expect(calendarFile({ ...grant, deadline: null })).toBeNull();
  });
  it("neutralizes spreadsheet formula injection", () => {
    const file = csvFile([{ grant: { ...grant, title: "=1+1" }, stage: "saved", notes: "@SUM(A1)", savedAt: now.toISOString() }]);
    expect(file).toContain("'=1+1");
    expect(file).toContain("'@SUM(A1)");
  });
});
