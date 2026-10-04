import { describe, expect, it } from "vitest";

import { enabledProviders, passkeysEnabled, withNext } from "./logic";

describe("Aktive Anmelde-Anbieter", () => {
  it("zeigt ohne Konfiguration keinen Anbieter", () => {
    expect(enabledProviders(undefined)).toEqual([]);
    expect(enabledProviders("")).toEqual([]);
  });

  it("liest die Liste unabhängig von Leerzeichen und Großschreibung", () => {
    expect(enabledProviders(" Google , APPLE ")).toEqual(["apple", "google"]);
  });

  it("hält die feste Reihenfolge Apple, Google, Facebook ein", () => {
    expect(enabledProviders("facebook,google,apple")).toEqual(["apple", "google", "facebook"]);
  });

  it("ignoriert unbekannte Anbieter", () => {
    expect(enabledProviders("google,myspace")).toEqual(["google"]);
  });
});

describe("Passkeys", () => {
  it("sind nur mit ausdrücklichem true aktiv", () => {
    expect(passkeysEnabled("true")).toBe(true);
    expect(passkeysEnabled(" TRUE ")).toBe(true);
    expect(passkeysEnabled(undefined)).toBe(false);
    expect(passkeysEnabled("1")).toBe(false);
  });
});

describe("Ziel an Anmelde-Links anhängen", () => {
  it("lässt die Startseite als Ziel weg", () => {
    expect(withNext("/login", "/")).toBe("/login");
  });

  it("kodiert das Ziel in der Adresse", () => {
    expect(withNext("/registrieren", "/beitreten/abc?x=1")).toBe(
      "/registrieren?next=%2Fbeitreten%2Fabc%3Fx%3D1",
    );
  });
});
