import { describe, expect, it } from "vitest";

import { legalReady, orPlaceholder, type Operator } from "./legal";

const complete: Operator = {
  name: "Erika Mustermann",
  street: "Musterstraße 1",
  city: "80331 München",
  country: "Deutschland",
  email: "kontakt@example.com",
  phone: "",
  supervisoryAuthority: "",
  lastUpdated: "2026-10-03",
  reviewed: true,
};

describe("Rechtstexte", () => {
  it("gelten erst mit allen Pflichtangaben und nach rechtlicher Prüfung als fertig", () => {
    expect(legalReady(complete)).toBe(true);
    expect(legalReady({ ...complete, reviewed: false })).toBe(false);
    expect(legalReady({ ...complete, street: "  " })).toBe(false);
    expect(legalReady({ ...complete, email: "" })).toBe(false);
  });

  it("verlangen Telefon und Aufsichtsbehörde nicht zwingend", () => {
    expect(legalReady({ ...complete, phone: "", supervisoryAuthority: "" })).toBe(true);
  });

  it("zeigen fehlende Angaben als sichtbaren Platzhalter", () => {
    expect(orPlaceholder("", "Name")).toBe("[Name fehlt]");
    expect(orPlaceholder("Erika", "Name")).toBe("Erika");
  });
});
