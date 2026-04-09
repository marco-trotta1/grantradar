import axios from "axios";
import type { Grant, Organization, Match, SavedGrant } from "../types";

const api = axios.create({
  baseURL: "/api",
  headers: { "Content-Type": "application/json" },
});

// Org storage key (pre-auth — swapped for Clerk userId later)
const ORG_ID_KEY = "grantradar_org_id";
export const getLocalOrgId = () => localStorage.getItem(ORG_ID_KEY);
export const setLocalOrgId = (id: string) =>
  localStorage.setItem(ORG_ID_KEY, id);

// Organizations
export const orgApi = {
  create: (data: Omit<Organization, "id">) =>
    api.post<Organization>("/organizations", data).then((r) => r.data),

  get: (id: string) =>
    api.get<Organization>(`/organizations/${id}`).then((r) => r.data),

  update: (id: string, data: Partial<Organization>) =>
    api.put<Organization>(`/organizations/${id}`, data).then((r) => r.data),
};

// Grants
export const grantApi = {
  list: (params?: { search?: string; category?: string; limit?: number }) =>
    api
      .get<{ grants: Grant[]; total: number }>("/grants", { params })
      .then((r) => r.data),

  get: (id: string) => api.get<Grant>(`/grants/${id}`).then((r) => r.data),

  sync: (count = 50) =>
    api
      .post<{ synced: number; errors: number }>("/grants/sync", { count })
      .then((r) => r.data),

  getMatches: (orgId: string, minScore = 0) =>
    api
      .get<{ matches: Match[] }>(`/grants/matches/${orgId}`, {
        params: { minScore },
      })
      .then((r) => r.data),

  runMatching: (orgId: string, limit = 50) =>
    api
      .post<{ matched: number; errors: number }>(`/grants/match/${orgId}`, {
        limit,
      })
      .then((r) => r.data),
};

// Saved grants
export const savedApi = {
  list: (orgId: string) =>
    api
      .get<{ saved: SavedGrant[] }>(`/saved/${orgId}`)
      .then((r) => r.data.saved),

  save: (orgId: string, grantId: string, notes?: string) =>
    api
      .post<SavedGrant>("/saved", { orgId, grantId, notes })
      .then((r) => r.data),

  remove: (orgId: string, grantId: string) =>
    api.delete(`/saved/${orgId}/${grantId}`),

  updateNotes: (orgId: string, grantId: string, notes: string) =>
    api
      .patch<SavedGrant>(`/saved/${orgId}/${grantId}/notes`, { notes })
      .then((r) => r.data),
};
