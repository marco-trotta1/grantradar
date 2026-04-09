export type OrgType = "NONPROFIT" | "SCHOOL" | "COMMUNITY_ORG" | "GOVERNMENT";
export type BudgetSize =
  | "UNDER_100K"
  | "FROM_100K_TO_500K"
  | "FROM_500K_TO_1M"
  | "FROM_1M_TO_5M"
  | "OVER_5M";
export type StaffSize =
  | "VOLUNTEER_ONLY"
  | "ONE_TO_FIVE"
  | "SIX_TO_TWENTY"
  | "OVER_TWENTY";
export type EffortLevel = "LOW" | "MEDIUM" | "HIGH";

export interface Grant {
  id: string;
  externalId: string;
  title: string;
  funder: string;
  deadline: string | null;
  amountMin: number | null;
  amountMax: number | null;
  eligibility: string[];
  description: string;
  category: string[];
  sourceUrl: string;
  source: string;
  isActive: boolean;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  orgType: OrgType;
  mission: string;
  location: string;
  city?: string;
  state?: string;
  budgetSize: BudgetSize;
  focusAreas: string[];
  staffCapacity: StaffSize;
  website?: string;
  ein?: string;
}

export interface Match {
  id: string;
  orgId: string;
  grantId: string;
  score: number;
  summary: string | null;
  effortLevel: EffortLevel | null;
  reasoning: string | null;
  grant: Grant;
}

export interface SavedGrant {
  id: string;
  orgId: string;
  grantId: string;
  notes: string | null;
  reminder30: boolean;
  reminder7: boolean;
  createdAt: string;
  grant: Grant;
}
