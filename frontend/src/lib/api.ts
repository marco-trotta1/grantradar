import {
  DEMO_ORG_ID,
  demoOrg,
  demoMatches,
  demoSaved,
} from "./mockData";
import type { Grant, Organization, Match, SavedGrant } from "../types";

// Always use demo mode on GitHub Pages (no backend available)
const IS_DEMO = true;

// Org storage
const ORG_ID_KEY = "grantradar_org_id";
export const getLocalOrgId = () => localStorage.getItem(ORG_ID_KEY) ?? DEMO_ORG_ID;
export const setLocalOrgId = (id: string) => localStorage.setItem(ORG_ID_KEY, id);

// Seed demo org id on first load
if (!localStorage.getItem(ORG_ID_KEY)) {
  localStorage.setItem(ORG_ID_KEY, DEMO_ORG_ID);
}

function delay<T>(value: T, ms = 400): Promise<T> {
  return new Promise((res) => setTimeout(() => res(value), ms));
}

// In-memory saved state for demo (so save/unsave works during the session)
let _saved: SavedGrant[] = [...demoSaved];

export const orgApi = {
  create: (data: Omit<Organization, "id">) => {
    const org = { ...data, id: DEMO_ORG_ID };
    return delay(org as Organization);
  },
  get: (_id: string) => delay(demoOrg),
  update: (_id: string, data: Partial<Organization>) =>
    delay({ ...demoOrg, ...data }),
};

export const grantApi = {
  list: (_params?: { search?: string; category?: string; limit?: number }) =>
    delay({ grants: demoMatches.map((m) => m.grant), total: demoMatches.length }),

  get: (id: string) => {
    const grant = demoMatches.find((m) => m.grantId === id)?.grant;
    return delay(grant as Grant);
  },

  sync: (_count = 50) =>
    delay({ synced: 6, errors: 0 }, 1200),

  getMatches: (_orgId: string, minScore = 0) =>
    delay({ matches: demoMatches.filter((m) => m.score >= minScore) }),

  runMatching: (_orgId: string, _limit = 50) =>
    delay({ matched: 6, errors: 0 }, 2000),
};

export const savedApi = {
  list: (_orgId: string) => delay([..._saved]),

  save: (_orgId: string, grantId: string, notes?: string) => {
    const match = demoMatches.find((m) => m.grantId === grantId);
    if (!match) throw new Error("Grant not found");
    const existing = _saved.find((s) => s.grantId === grantId);
    if (existing) return delay(existing);
    const entry: SavedGrant = {
      id: `s-${grantId}`,
      orgId: DEMO_ORG_ID,
      grantId,
      notes: notes ?? null,
      reminder30: false,
      reminder7: false,
      createdAt: new Date().toISOString(),
      grant: match.grant,
    };
    _saved = [..._saved, entry];
    return delay(entry);
  },

  remove: (_orgId: string, grantId: string) => {
    _saved = _saved.filter((s) => s.grantId !== grantId);
    return delay(undefined);
  },

  updateNotes: (_orgId: string, grantId: string, notes: string) => {
    _saved = _saved.map((s) =>
      s.grantId === grantId ? { ...s, notes } : s
    );
    return delay(_saved.find((s) => s.grantId === grantId) as SavedGrant);
  },
};
