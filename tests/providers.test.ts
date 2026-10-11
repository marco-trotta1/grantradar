import { afterEach, describe, expect, it, vi } from "vitest";
import { federalSearch, webSearch } from "../lib/providers";
import { allowSearch } from "../lib/rate-limit";

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
describe("provider requests", () => {
  it("uses public federal endpoints and the correct nonprofit filter", async () => {
    const fetch = vi.fn().mockResolvedValueOnce(response({ errorcode: 0, data: { oppHits: [{ id: "1", title: "STEM schools", agency: "Test", oppStatus: "posted" }], hitCount: 40 } }))
      .mockResolvedValueOnce(response({ errorcode: 0, data: { id: 1, opportunityTitle: "STEM schools", ost: "POSTED", synopsis: { agencyName: "Test", synopsisDesc: "School STEM", applicantTypes: [{ id: "12" }], awardCeiling: "5000" } } }));
    vi.stubGlobal("fetch", fetch);
    const result = await federalSearch({ query: "science", schoolType: "private-nonprofit", page: 2 });
    expect(fetch.mock.calls[0][0]).toBe("https://api.grants.gov/v1/api/search2");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ eligibilities: "12|99|25", keyword: "science", startRecordNum: 24 });
    expect(result.grants[0].amountMax).toBe(5000);
    expect(result.total).toBe(40);
  });
  it("preserves search records when detailed evidence is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(response({ errorcode: 0, data: { oppHits: [{ id: "1", title: "School grants", agency: "Test", oppStatus: "posted" }], hitCount: 1 } })).mockRejectedValueOnce(new Error("timeout")));
    const result = await federalSearch({ query: "school", schoolType: "public-school" });
    expect(result.incomplete).toBe(1);
    expect(result.grants[0].amountMax).toBeNull();
    expect(result.grants[0].deadline).toBeNull();
  });
  it("rejects changed federal envelopes instead of fabricating results", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ data: { hits: [] } })));
    await expect(federalSearch({ query: "school", schoolType: "public-school" })).rejects.toThrow();
  });
  it("requires a server credential for in-app web search", async () => {
    vi.stubEnv("TAVILY_API_KEY", "");
    await expect(webSearch({ query: "science", state: "ID", priority: "STEM & technology" })).rejects.toThrow("not connected");
  });
  it("keeps a web credential in the server request and treats results as leads", async () => {
    vi.stubEnv("TAVILY_API_KEY", "test-server-secret");
    const fetch = vi.fn().mockResolvedValue(response({ results: [
      { title: "School STEM grants", url: "https://foundation.example/grant", content: "Science funding" },
      { title: "Unsafe result", url: "javascript:alert(1)", content: "" },
    ] }));
    vi.stubGlobal("fetch", fetch);
    const results = await webSearch({ query: "science", state: "ID", priority: "STEM & technology" });
    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("unverified");
    expect(results[0].deadline).toBeNull();
    expect(JSON.stringify(results)).not.toContain("test-server-secret");
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer test-server-secret");
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toMatchObject({ search_depth: "basic", max_results: 8, include_answer: false });
  });
});
describe("search request limit", () => {
  it("limits each client and resets after one minute", () => {
    for (let index = 0; index < 15; index++) expect(allowSearch({ key: "test-client", now: 1000 })).toBe(true);
    expect(allowSearch({ key: "test-client", now: 1000 })).toBe(false);
    expect(allowSearch({ key: "other-client", now: 1000 })).toBe(true);
    expect(allowSearch({ key: "test-client", now: 61000 })).toBe(true);
  });
});
