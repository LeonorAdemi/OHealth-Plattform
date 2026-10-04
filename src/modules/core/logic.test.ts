import { describe, expect, it } from "vitest";

import {
  badgeCount,
  describeNotification,
  formatAgo,
  berlinDateTimeParts,
  berlinWeek,
  berlinLocalToDate,
  buildMeetupIcs,
  describeMeetupCount,
  formatMeetupWhen,
  isMeetupFull,
  meetupDateBlock,
  topWithMe,
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
    expect(describeCommunity({ sport: "Laufen", city: "München", memberCount: 12 })).toBe(
      "Laufen · München · 12\u00a0Mitglieder",
    );
    expect(describeCommunity({ sport: null, city: null, memberCount: 1 })).toBe("1\u00a0Mitglied");
  });

  it("baut den Rückweg zum Beitritt nach der Registrierung", () => {
    expect(joinAfterAuthPath("isar-code")).toBe("/beitreten/isar-code?beitreten=1");
  });
});

describe("Treffen", () => {
  it("rechnet deutsche Zeit in einen Zeitpunkt um, auch an Tagen mit Zeitumstellung", () => {
    expect(berlinLocalToDate("2026-10-10", "09:00")?.toISOString()).toBe("2026-10-10T07:00:00.000Z");
    expect(berlinLocalToDate("2026-12-01", "18:00")?.toISOString()).toBe("2026-12-01T17:00:00.000Z");
    // 25. Oktober 2026: um 3 Uhr Sommerzeit wird es 2 Uhr Winterzeit
    expect(berlinLocalToDate("2026-10-25", "12:00")?.toISOString()).toBe("2026-10-25T11:00:00.000Z");
    // 29. März 2026: um 2 Uhr wird es 3 Uhr
    expect(berlinLocalToDate("2026-03-29", "10:00")?.toISOString()).toBe("2026-03-29T08:00:00.000Z");
  });

  it("lehnt ungültige Eingaben ab", () => {
    expect(berlinLocalToDate("2026-13-01", "09:00")).toBeNull();
    expect(berlinLocalToDate("10.10.2026", "09:00")).toBeNull();
    expect(berlinLocalToDate("2026-10-10", "25:00")).toBeNull();
  });

  it("liefert Tag und Uhrzeit für Formularfelder in deutscher Zeit", () => {
    expect(berlinDateTimeParts(new Date("2026-10-10T22:30:00Z"))).toEqual({ date: "2026-10-11", time: "00:30" });
  });

  it("zeigt Datum und Uhrzeit wie in der Liste", () => {
    expect(meetupDateBlock("2026-10-10T22:30:00Z")).toEqual({ day: "11", month: "Okt" });
    expect(formatMeetupWhen("2026-10-10T07:00:00Z")).toBe("Sa 9:00");
  });

  it("beschreibt die Zusagen", () => {
    expect(describeMeetupCount(8, null)).toBe("8\u00a0dabei");
    expect(describeMeetupCount(5, 12)).toBe("5 von 12");
    expect(isMeetupFull(12, 12)).toBe(true);
    expect(isMeetupFull(11, 12)).toBe(false);
    expect(isMeetupFull(100, null)).toBe(false);
  });

  it("baut einen Kalendereintrag mit zwei Stunden Dauer", () => {
    const ics = buildMeetupIcs({
      id: "m1",
      title: "Lauf, locker",
      startsAt: "2026-10-10T07:00:00Z",
      place: "Reichenbachbrücke",
      url: "https://example.com/community/x/treffen/m1",
    });
    expect(ics).toContain("DTSTART:20261010T070000Z\r\n");
    expect(ics).toContain("DTEND:20261010T090000Z\r\n");
    expect(ics).toContain("SUMMARY:Lauf\\, locker\r\n");
    expect(ics).toContain("LOCATION:Reichenbachbrücke\r\n");
    expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(buildMeetupIcs({ id: "m2", title: "Beine", startsAt: "2026-10-10T07:00:00Z", place: null, url: "x" })).not.toContain(
      "LOCATION",
    );
  });
});

describe("Rangliste kürzen", () => {
  const rows = Array.from({ length: 30 }, (_, i) => ({ id: i, isMe: i === 24 }));

  it("zeigt die ersten n und die eigene Zeile mit ihrem Platz", () => {
    const shown = topWithMe(rows, 20);
    expect(shown).toHaveLength(21);
    expect(shown[20]).toEqual({ row: rows[24], rank: 25 });
  });

  it("zeigt die eigene Zeile nicht doppelt", () => {
    expect(topWithMe(rows, 25)).toHaveLength(25);
  });
});

describe("Wochenplan", () => {
  it("liefert Montag bis Sonntag in deutscher Zeit", () => {
    // Sonntag, 4. Oktober 2026, 23:30 Uhr in Berlin
    const week = berlinWeek(new Date("2026-10-04T21:30:00Z"));
    expect(week.days.map((d) => d.date)).toEqual([
      "2026-09-28", "2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04",
    ]);
    expect(week.days[6]).toMatchObject({ label: "So 4.10.", isToday: true });
    expect(week.from.toISOString()).toBe("2026-09-27T22:00:00.000Z");
    expect(week.to.toISOString()).toBe("2026-10-04T22:00:00.000Z");
  });

  it("verschiebt um ganze Wochen, auch über die Zeitumstellung", () => {
    const week = berlinWeek(new Date("2026-10-04T10:00:00Z"), 1);
    expect(week.days[0].date).toBe("2026-10-05");
    expect(week.to.toISOString()).toBe("2026-10-11T22:00:00.000Z");
    const later = berlinWeek(new Date("2026-10-04T10:00:00Z"), 4);
    expect(later.from.toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("Mitteilungen", () => {
  it("beschreibt jede Art in einem Satz", () => {
    const base = { actorName: "Ben", title: "Lauf", count: 1 };
    expect(describeNotification({ ...base, kind: "new_training" })).toBe("Ben plant „Lauf“");
    expect(describeNotification({ ...base, kind: "joined" })).toBe("Ben ist bei „Lauf“ dabei");
    expect(describeNotification({ ...base, kind: "message" })).toBe("Ben hat zu „Lauf“ geschrieben");
    expect(describeNotification({ ...base, kind: "message", count: 3 })).toBe(
      "3 neue Nachrichten zu „Lauf“, zuletzt von Ben",
    );
    expect(describeNotification({ ...base, kind: "cancelled" })).toBe("Ben hat „Lauf“ abgesagt");
  });

  it("zeigt die Zeit relativ", () => {
    const now = new Date("2026-10-04T12:00:00Z");
    expect(formatAgo("2026-10-04T11:59:40Z", now)).toBe("gerade eben");
    expect(formatAgo("2026-10-04T11:55:00Z", now)).toBe("vor 5\u00a0Min.");
    expect(formatAgo("2026-10-04T09:00:00Z", now)).toBe("vor 3\u00a0Std.");
    expect(formatAgo("2026-10-01T09:00:00Z", now)).toBe("1. Okt.");
  });

  it("kürzt den Zähler an der Glocke", () => {
    expect(badgeCount(3)).toBe("3");
    expect(badgeCount(12)).toBe("9+");
  });
});
