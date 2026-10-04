import { describe, expect, it } from "vitest";

import { safeNextPath } from "./safe-next-path";

describe("Ziel nach der Anmeldung", () => {
  it("lässt interne Pfade durch, auch mit Parametern", () => {
    expect(safeNextPath("/beitreten/abc123")).toBe("/beitreten/abc123");
    expect(safeNextPath("/gruppe?g=1")).toBe("/gruppe?g=1");
  });

  it("fällt bei fehlendem oder leerem Ziel auf die Startseite zurück", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
  });

  it("lehnt fremde Adressen und Tricks ab", () => {
    expect(safeNextPath("https://boese.example")).toBe("/");
    expect(safeNextPath("//boese.example")).toBe("/");
    expect(safeNextPath("/\\boese.example")).toBe("/");
    expect(safeNextPath("javascript:alert(1)")).toBe("/");
    expect(safeNextPath("/ok\nSet-Cookie: x")).toBe("/");
  });

  it("nutzt den angegebenen Rückfall", () => {
    expect(safeNextPath("boese", "/gruppe")).toBe("/gruppe");
  });
});
