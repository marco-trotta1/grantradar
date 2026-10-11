import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { sameOrigin } from "../lib/http";

describe("workspace request origin", () => {
  it("uses the incoming host when Next.js rewrites its internal URL", () => {
    const request = new NextRequest("http://localhost:3000/api/workspace", { headers: { host: "127.0.0.1:3000", origin: "http://127.0.0.1:3000" } });
    expect(sameOrigin(request)).toBe(true);
  });
  it("rejects another site, a missing origin, and another port", () => {
    for (const origin of ["https://other.example", "http://localhost:3001", "null", ""]) {
      const request = new NextRequest("http://localhost:3000/api/workspace", { headers: { host: "localhost:3000", origin } });
      expect(sameOrigin(request)).toBe(false);
    }
  });
});
