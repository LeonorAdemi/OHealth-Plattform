import { describe, expect, it } from "vitest";

import {
  canAnswerAttendance,
  meetupEndsAt,
  campaignTag,
  publicEventPath,
  describeMeetupDetails,
  describeWeekly,
  meetupFormValues,
  meetupTimeRange,
  parseElevation,
  formatPace,
  formatSpeed,
  meetupDetailRows,
  meetupErrorMessage,
  parsePace,
  parseSpeed,
  chatDayLabel,
  chatListTime,
  chatTime,
  layoutChat,
  pushContent,
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
  describeProfile,
  matchesSport,
  toSportCategory,
  normalizeSports,
  uniqueSports,
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
    expect(joinAfterAuthPath("isar-code", "sticker-zhs")).toBe("/beitreten/isar-code?beitreten=1&quelle=sticker-zhs");
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
    expect(describeNotification({ ...base, kind: "changed" })).toBe("Ben hat Zeit oder Treffpunkt von „Lauf“ geändert");
    expect(describeNotification({ ...base, kind: "attendance" })).toBe("Warst du bei „Lauf“ dabei?");
    expect(describeNotification({ ...base, kind: "reminder" })).toBe("„Lauf“ beginnt in etwa einer Stunde");
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

describe("Push", () => {
  const base = { actorName: "Ben", title: "Lauf", count: 1, meetupId: "m1", latest: null };

  it("zeigt bei Chat-Nachrichten die letzte Nachricht und öffnet den Chat", () => {
    expect(pushContent({ ...base, kind: "message", latest: "Bin um 9 da" })).toEqual({
      title: "Lauf",
      body: "Ben: Bin um 9 da",
      url: "/plan/m1/chat",
      tag: "chat-m1",
    });
    expect(pushContent({ ...base, kind: "message", latest: "Um 9", count: 3 }).body).toBe("Ben: Um 9 (3 neue)");
    expect(pushContent({ ...base, kind: "message", latest: "Um 9", chatId: "c1" }).url).toBe("/chats/c1");
    expect(pushContent({ ...base, kind: "community_message", title: "Lauftreff", latest: "Wer kommt?", chatId: "c2", meetupId: null })).toEqual({
      title: "Lauftreff",
      body: "Ben: Wer kommt?",
      url: "/chats/c2",
      tag: "chat-c2",
    });
  });

  it("Privatchat: Name im Titel, Nachricht ohne Namen", () => {
    const direct = { ...base, kind: "direct_message" as const, title: "Ben", latest: "Lust?", chatId: "c3", meetupId: null };
    expect(pushContent(direct)).toEqual({ title: "Ben", body: "Lust?", url: "/chats/c3", tag: "chat-c3" });
  });

  it("Folgen: Anfrage führt zu den Anfragen, neuer Follower zum Profil", () => {
    expect(pushContent({ ...base, kind: "follow_request", meetupId: null, actorId: "u1" })).toMatchObject({
      body: "Ben möchte dir folgen",
      url: "/verbindungen?tab=anfragen",
    });
    expect(pushContent({ ...base, kind: "new_follower", meetupId: null, actorId: "u1" }).url).toBe("/person/u1");
  });

  it("Nachrichtenanfrage: ohne Inhalt, öffnet den Chat", () => {
    expect(pushContent({ ...base, kind: "message_request", meetupId: null, chatId: "c4" })).toMatchObject({
      body: "Ben möchte dir schreiben",
      url: "/chats/c4",
    });
  });

  it("nimmt sonst den Satz der Mitteilung", () => {
    expect(pushContent({ ...base, kind: "joined" })).toMatchObject({ body: "Ben ist bei „Lauf“ dabei", url: "/plan/m1" });
    expect(pushContent({ ...base, kind: "cancelled", meetupId: null }).url).toBe("/mitteilungen");
  });
});

describe("Chat", () => {
  const now = new Date("2026-10-04T12:00:00Z");

  it("Chat-Liste: heute Uhrzeit, gestern Gestern, sonst Datum", () => {
    expect(chatListTime("2026-10-04T08:05:00Z", now)).toBe("10:05");
    expect(chatListTime("2026-10-03T20:00:00Z", now)).toBe("Gestern");
    expect(chatListTime("2026-09-28T08:00:00Z", now)).toBe("28.9.");
  });

  it("benennt Tage wie ein Messenger", () => {
    expect(chatDayLabel("2026-10-04T08:00:00Z", now)).toBe("Heute");
    expect(chatDayLabel("2026-10-03T20:00:00Z", now)).toBe("Gestern");
    expect(chatDayLabel("2026-10-01T08:00:00Z", now)).toBe("Do, 1. Okt.");
    expect(chatTime("2026-10-04T16:05:00Z")).toBe("18:05");
  });

  it("fasst Folgen derselben Person zusammen und trennt Tage", () => {
    const m = (id: string, userId: string, createdAt: string) => ({ id, userId, createdAt });
    const rows = layoutChat(
      [
        m("1", "ben", "2026-10-03T20:00:00Z"),
        m("2", "ben", "2026-10-04T08:00:00Z"),
        m("3", "ben", "2026-10-04T08:02:00Z"),
        m("4", "anna", "2026-10-04T08:03:00Z"),
        m("5", "anna", "2026-10-04T09:00:00Z"),
      ],
      now,
    );
    expect(rows.map((r) => r.dayLabel)).toEqual(["Gestern", "Heute", null, null, null]);
    expect(rows.map((r) => r.firstInGroup)).toEqual([true, true, false, true, true]);
    expect(rows.map((r) => r.lastInGroup)).toEqual([true, false, true, true, true]);
  });
});

describe("Profil", () => {
  it("Sportarten: getrimmt, ohne Doppelte und Leere, höchstens fünf", () => {
    expect(normalizeSports([" Laufen ", "laufen", "", "Yoga", "Klettern", "Rudern", "Tennis", "Golf"])).toEqual([
      "Laufen",
      "Yoga",
      "Klettern",
      "Rudern",
      "Tennis",
    ]);
  });
  it("Vorschläge: ohne Doppelte, aber ohne Obergrenze", () => {
    expect(uniqueSports(["A", "B", "C", "D", "E", "F", "a"])).toEqual(["A", "B", "C", "D", "E", "F"]);
  });
  it("Sportarten: Leerraum in der Mitte wird zusammengefasst", () => {
    expect(normalizeSports(["Stand  Up   Paddling"])).toEqual(["Stand Up Paddling"]);
  });
  it("Zeile unter dem Namen aus Stadt und Sportarten", () => {
    expect(describeProfile({ city: "München", sports: ["Laufen", "Yoga"] })).toBe("München · Laufen, Yoga");
    expect(describeProfile({ city: null, sports: ["Laufen"] })).toBe("Laufen");
    expect(describeProfile({ city: null, sports: [] })).toBe("");
  });
});

describe("Sportarten", () => {
  const fussball = { name: "Fußball", aliases: ["Soccer", "Kicken"] };

  it("findet über Namen und Suchbegriffe, ohne Umlaute und Groß- und Kleinschreibung", () => {
    expect(matchesSport(fussball, "fuss")).toBe(true);
    expect(matchesSport(fussball, "FUẞ")).toBe(true);
    expect(matchesSport(fussball, "kick")).toBe(true);
    expect(matchesSport(fussball, "tennis")).toBe(false);
  });
  it("leere Suche zeigt alles", () => {
    expect(matchesSport(fussball, "  ")).toBe(true);
  });
  it("unbekannte Bereiche landen unter Sonstiges", () => {
    expect(toSportCategory("klettern")).toBe("klettern");
    expect(toSportCategory("quidditch")).toBe("sonstiges");
  });
});

describe("Events je Sportart", () => {
  const run = {
    sportName: "Laufen",
    durationMinutes: 60,
    distanceM: 10000,
    elevationM: 80,
    paceSecondsPerKm: 360,
    speedKmh: null,
    level: "einsteiger" as const,
  };

  it("liest das Tempo in Minuten je Kilometer mit Doppelpunkt, Punkt oder Komma", () => {
    expect(parsePace("6:00")).toBe(360);
    expect(parsePace("5.30")).toBe(330);
    expect(parsePace("5,45")).toBe(345);
    expect(parsePace("7")).toBe(420);
    expect(parsePace("")).toBeNull();
    expect(parsePace("6:75")).toBeNaN();
    expect(parsePace("0:30")).toBeNaN();
    expect(parsePace("schnell")).toBeNaN();
  });

  it("liest km/h mit einer Nachkommastelle und lehnt Unsinn ab", () => {
    expect(parseSpeed("27,5")).toBe(27.5);
    expect(parseSpeed("25")).toBe(25);
    expect(parseSpeed(" ")).toBeNull();
    expect(parseSpeed("0,5")).toBeNaN();
    expect(parseSpeed("120")).toBeNaN();
  });

  it("zeigt Tempo und Geschwindigkeit in deutscher Schreibweise", () => {
    expect(formatPace(330)).toBe("5:30\u00a0min/km");
    expect(formatSpeed(27.5)).toBe("27,5\u00a0km/h");
    expect(formatSpeed(25)).toBe("25\u00a0km/h");
  });

  it("beschreibt ein Event mit Sportart und allen Angaben in einer Zeile", () => {
    expect(describeMeetupDetails(run)).toBe(
      "Laufen · 1\u00a0h 00\u00a0min · 10,0\u00a0km · 80\u00a0Hm · 6:00\u00a0min/km · Einsteiger willkommen",
    );
    expect(
      describeMeetupDetails({ ...run, sportName: "Volleyball", distanceM: null, elevationM: null, paceSecondsPerKm: null, level: "gemischt" }),
    ).toBe("Volleyball · 1\u00a0h 00\u00a0min · Gemischtes Niveau");
  });

  it("alte Events ohne Sportart und Angaben ergeben eine leere Beschreibung", () => {
    expect(
      describeMeetupDetails({
        sportName: null,
        durationMinutes: null,
        distanceM: null,
        elevationM: null,
        paceSecondsPerKm: null,
        speedKmh: null,
        level: null,
      }),
    ).toBe("");
  });

  it("zeigt auf der Detailseite nur vorhandene Angaben als Zeilen", () => {
    expect(meetupDetailRows({ ...run, elevationM: null, level: null }).map((r) => r.label)).toEqual([
      "Sportart",
      "Dauer",
      "Distanz",
      "Tempo",
    ]);
    expect(meetupDetailRows({ ...run, paceSecondsPerKm: null, speedKmh: 27.5 }).find((r) => r.label === "Tempo")?.value).toBe(
      "27,5\u00a0km/h",
    );
  });

  it("übernimmt die Meldungen der Datenbank, wenn Angaben nicht zur Sportart passen", () => {
    expect(meetupErrorMessage({ code: "23514", message: "Zu Bouldern gibt es keinen Trainingsplan" })).toBe(
      "Zu Bouldern gibt es keinen Trainingsplan.",
    );
    expect(meetupErrorMessage({ code: "23503", message: "Die Sportart quidditch gibt es nicht" })).toBe(
      "Wähl eine Sportart aus der Liste.",
    );
    expect(meetupErrorMessage({ code: "42501", message: "new row violates row-level security" })).toBeNull();
  });

  it("liest Höhenmeter nur als ganze Zahl bis 20.000", () => {
    expect(parseElevation("450")).toBe(450);
    expect(parseElevation("0")).toBe(0);
    expect(parseElevation("")).toBeNull();
    expect(parseElevation("1,5")).toBeNaN();
    expect(parseElevation("-5")).toBeNaN();
    expect(parseElevation("1e3")).toBeNaN();
    expect(parseElevation("25000")).toBeNaN();
  });

  it("nennt die Sportart nicht doppelt, wenn das Event wie sie heißt, und zeigt 0 Höhenmeter nicht", () => {
    expect(describeMeetupDetails({ ...run, title: "Laufen", elevationM: 0, paceSecondsPerKm: null, level: null })).toBe(
      "1\u00a0h 00\u00a0min · 10,0\u00a0km",
    );
    expect(describeMeetupDetails({ ...run, title: "Isarlauf", distanceM: null, elevationM: null, paceSecondsPerKm: null, level: null })).toBe(
      "Laufen · 1\u00a0h 00\u00a0min",
    );
  });

  it("zeigt Beginn und Ende eines Events in deutscher Zeit", () => {
    expect(meetupTimeRange("2026-10-06T16:30:00Z", 60)).toBe("18:30\u201319:30");
    expect(meetupTimeRange("2026-10-06T16:30:00Z", null)).toBe("18:30");
  });

  it("beschreibt den Rhythmus einer Reihe in deutscher Zeit", () => {
    expect(describeWeekly("2026-10-06T16:30:00Z")).toBe("Jeden Dienstag, 18:30\u00a0Uhr");
    // nach der Zeitumstellung: dieselbe Uhrzeit
    expect(describeWeekly("2026-10-27T17:30:00Z")).toBe("Jeden Dienstag, 18:30\u00a0Uhr");
  });

  it("belegt das Formular zum Bearbeiten so vor, wie man es eintippen würde", () => {
    expect(
      meetupFormValues({
        id: "m1",
        seriesId: "s1",
        sportId: "laufen",
        templateId: null,
        title: "Isarlauf",
        durationMinutes: 75,
        distanceM: 8200,
        elevationM: 0,
        paceSecondsPerKm: 330,
        speedKmh: null,
        level: "einsteiger",
        place: null,
        maxParticipants: 20,
        note: null,
      }),
    ).toEqual({
      id: "m1",
      seriesId: "s1",
      sportId: "laufen",
      templateId: null,
      title: "Isarlauf",
      hours: "1",
      minutes: "15",
      distance: "8,2",
      elevation: "0",
      pace: "5:30",
      speed: "",
      level: "einsteiger",
      place: "",
      max: "20",
      note: "",
    });
  });

  it("übernimmt die Meldung, dass sich bei einer Reihe der Tag nur je Termin ändern lässt", () => {
    expect(meetupErrorMessage({ code: "23514", message: "Den Tag änderst du nur für einen einzelnen Termin" })).toBe(
      "Den Tag änderst du nur für einen einzelnen Termin.",
    );
  });
});

describe("Öffentlicher Event-Link und Herkunft", () => {
  it("baut den Link zum Event, mit Zusage nach der Anmeldung und Kennung der Herkunft", () => {
    expect(publicEventPath("m1")).toBe("/e/m1");
    expect(publicEventPath("m1", { zusagen: true, campaign: "sticker-boulderwelt" })).toBe(
      "/e/m1?zusagen=1&quelle=sticker-boulderwelt",
    );
  });

  it("nimmt als Kennung nur kurze Wörter aus Kleinbuchstaben, Ziffern und Bindestrichen", () => {
    expect(campaignTag("sticker-boulderwelt")).toBe("sticker-boulderwelt");
    expect(campaignTag("Sticker")).toBeNull();
    expect(campaignTag("a b")).toBeNull();
    expect(campaignTag("x".repeat(41))).toBeNull();
    expect(campaignTag(["a", "b"])).toBeNull();
    expect(campaignTag(undefined)).toBeNull();
  });
});

describe("Warst du dabei?", () => {
  const start = "2026-10-06T16:30:00Z";

  it("rechnet das Ende aus Beginn und Dauer, ohne Dauer eine Stunde", () => {
    expect(meetupEndsAt(start, 90).toISOString()).toBe("2026-10-06T18:00:00.000Z");
    expect(meetupEndsAt(start, null).toISOString()).toBe("2026-10-06T17:30:00.000Z");
  });

  it("fragt erst nach dem Ende und höchstens 14 Tage lang", () => {
    expect(canAnswerAttendance(start, 60, new Date("2026-10-06T17:00:00Z"))).toBe(false);
    expect(canAnswerAttendance(start, 60, new Date("2026-10-06T17:30:00Z"))).toBe(true);
    expect(canAnswerAttendance(start, 60, new Date("2026-10-20T17:00:00Z"))).toBe(true);
    expect(canAnswerAttendance(start, 60, new Date("2026-10-20T18:00:00Z"))).toBe(false);
  });
});
