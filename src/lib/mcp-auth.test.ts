import { describe, expect, it } from "vitest";

import { bearerToken, resourceMetadata, unauthorized } from "./mcp-auth";

describe("KI-Zugriff: Anmeldung am MCP-Endpunkt", () => {
  it("liest das Token aus dem Authorization-Header", () => {
    expect(bearerToken("Bearer abc.def-ghi_jkl")).toBe("abc.def-ghi_jkl");
    expect(bearerToken("bearer abc")).toBe("abc");
  });

  it("akzeptiert keinen anderen Anmeldetyp und kein leeres Token", () => {
    expect(bearerToken(null)).toBeNull();
    expect(bearerToken("Basic dXNlcjpwYXNz")).toBeNull();
    expect(bearerToken("Bearer ")).toBeNull();
    expect(bearerToken("Bearer a b")).toBeNull();
  });

  it("nennt Supabase Auth als Anmeldeserver und den Endpunkt als Ressource", () => {
    expect(resourceMetadata("https://ohealth.app", "https://abc.supabase.co/")).toEqual({
      resource: "https://ohealth.app/api/mcp",
      authorization_servers: ["https://abc.supabase.co/auth/v1"],
      bearer_methods_supported: ["header"],
      resource_name: "OHealth",
    });
  });

  it("verweist ohne Anmeldung auf die Metadaten", async () => {
    const response = unauthorized("https://ohealth.app", false);
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toBe(
      'Bearer resource_metadata="https://ohealth.app/.well-known/oauth-protected-resource/api/mcp"',
    );
  });

  it("meldet ein ungültiges Token als invalid_token", () => {
    const response = unauthorized("https://ohealth.app", true);
    expect(response.headers.get("WWW-Authenticate")).toContain('error="invalid_token"');
  });
});
