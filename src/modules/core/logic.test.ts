import { describe, expect, it } from "vitest";

import {
  communityKind,
  describeCommunity,
  enabledProviders,
  groupTypeFor,
  joinAfterAuthPath,
  passkeysEnabled,
  withNext,
} from "./logic";

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

describe("Community", () => {
  it("übersetzt Gruppentypen der Datenbank in die Art der App und zurück", () => {
    expect(communityKind("community")).toBe("public");
    expect(communityKind("friends")).toBe("private");
    expect(communityKind("coaching")).toBe("coaching");
    expect(communityKind("unbekannt")).toBe("private");
    expect(groupTypeFor("public")).toBe("community");
    expect(groupTypeFor("private")).toBe("friends");
    expect(groupTypeFor("coaching")).toBe("coaching");
  });

  it("beschreibt eine Community kurz, ohne leere Angaben", () => {
    expect(describeCommunity({ sport: "Laufen", location: "München", memberCount: 12 })).toBe(
      "Laufen · München · 12 Mitglieder",
    );
    expect(describeCommunity({ sport: null, location: null, memberCount: 1 })).toBe("1 Mitglied");
  });

  it("baut den Rückweg zum Beitritt nach der Registrierung", () => {
    expect(joinAfterAuthPath("isar-code")).toBe("/beitreten/isar-code?beitreten=1");
  });
});
