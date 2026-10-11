"use client";

import { useEffect, useRef, useState } from "react";
import { cloudWorkspaceSchema, draftKey, draftSchema, emptyCloud, recoverDraft, sameWorkspace, type CloudWorkspace, type Draft } from "./cloud";
import { workspaceSchema, type Workspace } from "./domain";

type Sync = { kind: "saved" } | { kind: "pending" } | { kind: "saving" } | { kind: "error"; message: string } | { kind: "conflict"; remote: CloudWorkspace };
type Load = { kind: "loading" } | { kind: "ready" } | { kind: "error"; message: string };
const legacyKey = "grantradar.school.v1";

export function useCloudWorkspace(userId: string) {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [load, setLoad] = useState<Load>({ kind: "loading" });
  const [sync, setSync] = useState<Sync>({ kind: "saved" });
  const [legacy, setLegacy] = useState<Workspace | null>(null);
  const state = useRef<{ cloud: CloudWorkspace; pending: Workspace | null; conflict: boolean }>({ cloud: emptyCloud, pending: null, conflict: false });
  const flight = useRef<Promise<boolean> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const removeLegacy = useRef(false);
  const mounted = useRef(true);
  const key = draftKey(userId);

  function writeDraft(draft: Draft) { localStorage.setItem(key, JSON.stringify(draft)); }
  function schedule() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void saveNow(); }, 600);
  }

  async function readCloud(): Promise<CloudWorkspace> {
    const response = await fetch("/api/workspace", { cache: "no-store", signal: AbortSignal.timeout(15000) });
    if (response.status === 401) throw new Error("Your session ends. Sign in again to open your workspace.");
    if (!response.ok) throw new Error("Your cloud workspace could not load. Check your connection and try again.");
    return cloudWorkspaceSchema.parse(await response.json());
  }

  async function loadCloud() {
    setLoad({ kind: "loading" });
    try {
      const cloud = await readCloud();
      if (!mounted.current) return;
      let draft: Draft | null = null;
      try {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = draftSchema.safeParse(JSON.parse(raw));
          if (!parsed.success) throw new Error("This device’s recovery draft cannot be read. Export it or contact support before you continue.");
          draft = parsed.data;
        }
        const old = localStorage.getItem(legacyKey);
        if (old && !cloud.workspace && !draft) {
          const parsed = workspaceSchema.safeParse(JSON.parse(old));
          if (parsed.success) setLegacy(parsed.data);
        }
      } catch (error) {
        setLoad({ kind: "error", message: error instanceof Error ? error.message : "This device’s recovery draft cannot be read." });
        return;
      }
      state.current.cloud = cloud;
      const recovery = recoverDraft({ cloud, draft });
      if (recovery.kind === "current") {
        state.current.pending = null; state.current.conflict = false;
        localStorage.removeItem(key);
        setWorkspace(cloud.workspace); setSync({ kind: "saved" });
      } else {
        state.current.pending = recovery.draft.workspace;
        setWorkspace(recovery.draft.workspace);
        state.current.conflict = recovery.kind === "conflict";
        if (recovery.kind === "conflict") setSync({ kind: "conflict", remote: cloud });
        else { setSync({ kind: "pending" }); schedule(); }
      }
      setLoad({ kind: "ready" });
    } catch (error) { if (mounted.current) setLoad({ kind: "error", message: error instanceof Error ? error.message : "Your workspace could not load." }); }
  }

  async function saveNow(): Promise<boolean> {
    if (timer.current) clearTimeout(timer.current);
    if (flight.current) {
      await flight.current;
      return state.current.pending && !state.current.conflict ? saveNow() : !state.current.pending;
    }
    if (!state.current.pending) return true;
    if (state.current.conflict) return false;
    const pending = state.current.pending;
    const base = state.current.cloud;
    setSync({ kind: "saving" });
    const task = (async () => {
      try {
        const response = await fetch("/api/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ workspace: pending, revision: base.revision }), signal: AbortSignal.timeout(15000) });
        let cloud: CloudWorkspace;
        if (response.status === 409) {
          cloud = await readCloud();
          if (!sameWorkspace(cloud.workspace, pending)) {
            state.current.conflict = true;
            if (mounted.current) setSync({ kind: "conflict", remote: cloud });
            return false;
          }
        } else {
          if (response.status === 401) throw new Error("Sign in again to save your work. Your draft stays on this device.");
          if (!response.ok) throw new Error("Cloud saving is unavailable. Your draft stays on this device. Try again.");
          cloud = cloudWorkspaceSchema.parse(await response.json());
        }
        state.current.cloud = cloud;
        if (sameWorkspace(state.current.pending, pending)) {
          state.current.pending = null;
          localStorage.removeItem(key);
          if (removeLegacy.current) { localStorage.removeItem(legacyKey); removeLegacy.current = false; }
          if (mounted.current) setSync({ kind: "saved" });
          return true;
        }
        if (state.current.pending) writeDraft({ base: cloud, workspace: state.current.pending });
        if (mounted.current) { setSync({ kind: "pending" }); schedule(); }
        return false;
      } catch (error) {
        if (mounted.current) setSync({ kind: "error", message: error instanceof Error && !(error instanceof TypeError) && error.name !== "TimeoutError" ? error.message : "Cloud saving is unavailable. Your draft stays on this device. Check your connection and try again." });
        return false;
      } finally { flight.current = null; }
    })();
    flight.current = task;
    return task;
  }

  function persist(next: Workspace): boolean {
    if (state.current.conflict) return false;
    try { writeDraft({ base: state.current.cloud, workspace: next }); }
    catch { setSync({ kind: "error", message: "This device cannot keep a recovery draft. Check its storage settings before you edit." }); return false; }
    state.current.pending = next;
    setWorkspace(next); setSync({ kind: "pending" }); schedule(); return true;
  }

  function resolveConflict(choice: "cloud" | "device") {
    if (sync.kind !== "conflict") return;
    if (choice === "cloud") {
      localStorage.removeItem(key);
      state.current = { cloud: sync.remote, pending: null, conflict: false };
      setWorkspace(sync.remote.workspace); setSync({ kind: "saved" });
    } else if (workspace) {
      writeDraft({ base: sync.remote, workspace });
      state.current = { cloud: sync.remote, pending: workspace, conflict: false };
      setSync({ kind: "pending" }); schedule();
    }
  }

  useEffect(() => {
    mounted.current = true;
    void loadCloud();
    const refresh = async () => {
      if (document.visibilityState === "hidden" || state.current.conflict) return;
      if (state.current.pending) { void saveNow(); return; }
      if (flight.current) return;
      try {
        const cloud = await readCloud();
        if (!mounted.current || state.current.pending || flight.current) return;
        state.current.cloud = cloud; setWorkspace(cloud.workspace); setSync({ kind: "saved" });
      } catch (error) { if (mounted.current) setSync({ kind: "error", message: error instanceof Error ? error.message : "Cloud refresh is unavailable." }); }
    };
    const beforeLeave = (event: BeforeUnloadEvent) => { if (state.current.pending) { event.preventDefault(); event.returnValue = ""; } };
    const interval = setInterval(() => { void refresh(); }, 30000);
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("beforeunload", beforeLeave);
    return () => {
      mounted.current = false;
      if (timer.current) clearTimeout(timer.current);
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("beforeunload", beforeLeave);
    };
    // The hook owns one account for its complete mounted lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  function importLegacy() {
    if (legacy && persist(legacy)) { removeLegacy.current = true; setLegacy(null); }
  }

  return { workspace, load, sync, persist, saveNow, loadCloud, resolveConflict, legacy, importLegacy };
}
