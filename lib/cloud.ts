import { z } from "zod";
import { workspaceSchema } from "./domain";

export const revisionSchema = z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).brand<"Revision">();
export const timestampSchema = z.iso.datetime({ offset: true }).transform(value => new Date(value).toISOString());
export const cloudWorkspaceSchema = z.object({
  workspace: workspaceSchema.nullable(), revision: revisionSchema, updatedAt: timestampSchema.nullable(),
});
export const saveWorkspaceSchema = z.object({ workspace: workspaceSchema, revision: revisionSchema });
export const draftSchema = z.object({ base: cloudWorkspaceSchema, workspace: workspaceSchema });
export const historySchema = z.array(z.object({
  revision: revisionSchema, workspace: workspaceSchema, savedAt: timestampSchema,
})).max(10);
export type CloudWorkspace = z.infer<typeof cloudWorkspaceSchema>;
export type Draft = z.infer<typeof draftSchema>;
export type WorkspaceHistory = z.infer<typeof historySchema>;

export const emptyCloud: CloudWorkspace = { workspace: null, revision: revisionSchema.parse(0), updatedAt: null };

export function sameWorkspace(left: CloudWorkspace["workspace"], right: CloudWorkspace["workspace"]): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function recoverDraft({ cloud, draft }: { cloud: CloudWorkspace; draft: Draft | null }):
  { kind: "current" } | { kind: "pending"; draft: Draft } | { kind: "conflict"; draft: Draft } {
  if (!draft || sameWorkspace(cloud.workspace, draft.workspace)) return { kind: "current" };
  return cloud.revision === draft.base.revision ? { kind: "pending", draft } : { kind: "conflict", draft };
}

export function draftKey(userId: string): string { return `grantradar.draft.${userId}`; }
