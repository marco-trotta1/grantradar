import { z } from "zod";

export const states = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "PR", "GU", "VI", "AS", "MP"] as const;
export const priorities = ["STEM & technology", "Literacy & libraries", "Arts & music", "Student wellbeing", "School safety", "Food & nutrition", "Facilities & outdoors", "Teacher development", "Special education"] as const;
export const schoolTypes = {
  "public-school": "Public school",
  "public-district": "Public school district",
  "public-charter": "Public charter school",
  "private-nonprofit": "Private nonprofit school",
  tribal: "Tribal school",
} as const;
export const gradeLabels = { elementary: "Elementary · K–5", middle: "Middle · 6–8", high: "High · 9–12" } as const;
export const stages = { saved: "Saved", researching: "Researching", drafting: "Drafting", submitted: "Submitted", awarded: "Awarded", declined: "Not awarded" } as const;
export const dollarsSchema = z.number().finite().nonnegative().max(1e12).brand<"Dollars">();
export const dateSchema = z.iso.date().brand<"CalendarDate">();
export const safeUrlSchema = z.url().max(2048).refine(value => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password;
}, "Use a secure website link.");

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Enter the school name.").max(120),
  city: z.string().trim().min(2, "Enter the city.").max(100),
  state: z.enum(states),
  schoolType: z.enum(Object.keys(schoolTypes) as [keyof typeof schoolTypes, ...(keyof typeof schoolTypes)[]]),
  grades: z.array(z.enum(["elementary", "middle", "high"])).min(1, "Choose at least one grade band.").max(3),
  students: z.number().int().min(1).max(1000000).brand<"StudentCount">(),
  fundingGoal: dollarsSchema.refine(value => value > 0, "Enter a funding goal above zero."),
  priorities: z.array(z.enum(priorities)).min(1, "Choose at least one funding priority.").max(9),
  locale: z.enum(["rural", "suburban", "urban"]),
  titleI: z.boolean(),
  capacity: z.enum(["limited", "small-team", "dedicated"]),
  mission: z.string().trim().max(1200),
});

export const grantSchema = z.object({
  id: z.string().min(1).max(500), title: z.string().min(1).max(500), funder: z.string().max(300),
  description: z.string().max(20000), url: safeUrlSchema,
  source: z.enum(["federal", "directory", "web"]), status: z.enum(["posted", "forecasted", "closed", "unverified"]),
  deadline: dateSchema.nullable(), amountMin: dollarsSchema.nullable(), amountMax: dollarsSchema.nullable(),
  priorities: z.array(z.enum(priorities)), applicantTypes: z.array(z.string().max(100)),
  eligibilityText: z.string().max(10000), locations: z.array(z.string().max(100)),
  grades: z.array(z.enum(["elementary", "middle", "high"])), costSharing: z.boolean().nullable(),
  retrievedAt: z.iso.datetime(),
});
export const savedSchema = z.object({
  grant: grantSchema, stage: z.enum(Object.keys(stages) as [keyof typeof stages, ...(keyof typeof stages)[]]),
  notes: z.string().max(5000), savedAt: z.iso.datetime(),
});
export const workspaceSchema = z.object({ version: z.literal(1), profile: profileSchema, saved: z.array(savedSchema).max(500) });
export const searchResponseSchema = z.object({
  grants: z.array(grantSchema), total: z.number().int().nonnegative(),
  federalAvailable: z.boolean(), webAvailable: z.boolean(), hasMore: z.boolean().default(false), warnings: z.array(z.string()), searchedAt: z.iso.datetime(),
});

export type Dollars = z.infer<typeof dollarsSchema>;
export type SchoolProfile = z.infer<typeof profileSchema>;
export type Grant = z.infer<typeof grantSchema>;
export type SavedGrant = z.infer<typeof savedSchema>;
export type Workspace = z.infer<typeof workspaceSchema>;
export type SearchResponse = z.infer<typeof searchResponseSchema>;
export type Priority = typeof priorities[number];
export type MatchScore = number & { readonly __brand: "MatchScore" };

export function money(value: Dollars | null): string {
  return value === null ? "Amount not listed" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

export function deadlineLabel(value: Grant["deadline"]): string {
  return value ? new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }) : "Confirm the deadline";
}

export function daysUntil({ deadline, now = new Date() }: { deadline: Grant["deadline"]; now?: Date }): number | null {
  if (!deadline) return null;
  const today = now.toLocaleDateString("en-CA", { timeZone: "America/Boise" });
  return Math.round((Date.parse(`${deadline}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 86400000);
}

export function inferPriorities(text: string): Priority[] {
  const patterns: Record<Priority, RegExp> = {
    "STEM & technology": /\bstem\b|science|math|technology|robotics|engineering/i,
    "Literacy & libraries": /literacy|reading|library|libraries|books/i,
    "Arts & music": /\barts\b|music|theat(?:er|re)|creative/i,
    "Student wellbeing": /mental health|wellbeing|well-being|counsel|social.emotional/i,
    "School safety": /school safety|school violence|security|violence prevention/i,
    "Food & nutrition": /nutrition|food|meal|farm.to.school|garden/i,
    "Facilities & outdoors": /facilit|outdoor|garden|playground|construction|infrastructure/i,
    "Teacher development": /professional development|teacher training|educator|teaching/i,
    "Special education": /special education|disabilit|\bidea\b|inclusive/i,
  };
  return priorities.filter(priority => patterns[priority].test(text));
}
