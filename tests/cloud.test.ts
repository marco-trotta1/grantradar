import { describe, expect, it } from "vitest";
import { cloudWorkspaceSchema, draftKey, emptyCloud, recoverDraft } from "../lib/cloud";
import { workspaceSchema } from "../lib/domain";

const workspace = workspaceSchema.parse({ version: 1, profile: {
  name: "Test School", city: "Boise", state: "ID", schoolType: "public-school", grades: ["elementary"],
  students: 300, fundingGoal: 10000, priorities: ["STEM & technology"], locale: "rural", titleI: false, capacity: "limited", mission: "",
}, saved: [] });

describe("cloud draft recovery", () => {
  it("keeps a local draft when the cloud revision stays the same", () => {
    const draft = { base: emptyCloud, workspace };
    expect(recoverDraft({ cloud: emptyCloud, draft })).toEqual({ kind: "pending", draft });
  });
  it("requires review when another device changes the cloud", () => {
    const cloud = cloudWorkspaceSchema.parse({ workspace, revision: 2, updatedAt: "2026-10-11T01:00:00Z" });
    const draft = { base: emptyCloud, workspace: { ...workspace, saved: [], profile: { ...workspace.profile, name: "Unsaved School" } } };
    expect(recoverDraft({ cloud, draft })).toEqual({ kind: "conflict", draft });
  });
  it("recognizes a completed save after its response is lost", () => {
    const cloud = cloudWorkspaceSchema.parse({ workspace, revision: 1, updatedAt: "2026-10-11T01:00:00Z" });
    expect(recoverDraft({ cloud, draft: { base: emptyCloud, workspace } })).toEqual({ kind: "current" });
  });
  it("isolates recovery drafts by account", () => {
    expect(draftKey("school-one")).not.toBe(draftKey("school-two"));
  });
  it("rejects a cloud response with an invalid workspace or revision", () => {
    expect(cloudWorkspaceSchema.safeParse({ workspace: {}, revision: 1, updatedAt: null }).success).toBe(false);
    expect(cloudWorkspaceSchema.safeParse({ workspace: null, revision: -1, updatedAt: null }).success).toBe(false);
  });
});
