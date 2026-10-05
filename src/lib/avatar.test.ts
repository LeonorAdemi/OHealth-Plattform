import { afterEach, describe, expect, it, vi } from "vitest";

import { avatarSrc, initials } from "./avatar";

describe("initials", () => {
  it("nimmt den ersten und letzten Namen", () => {
    expect(initials("Anna Maria Berg")).toBe("AB");
  });
  it("kommt mit einem Namen aus", () => {
    expect(initials("anna")).toBe("A");
  });
  it("zerlegt keine Umlaute oder Emojis", () => {
    expect(initials("Özil Ünal")).toBe("ÖÜ");
    expect(initials("😀 Ben")).toBe("😀B");
  });
  it("gibt für leere Namen ein Fragezeichen", () => {
    expect(initials("   ")).toBe("?");
  });
});

describe("avatarSrc", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("baut die öffentliche Adresse aus dem Pfad", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co/");
    expect(avatarSrc("u/1.webp")).toBe("https://x.supabase.co/storage/v1/object/public/avatars/u/1.webp");
  });
  it("ohne Bild keine Adresse", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://x.supabase.co");
    expect(avatarSrc(null)).toBeNull();
  });
});
