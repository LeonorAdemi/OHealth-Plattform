"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, use, useActionState, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Stepper } from "@/components/ui/stepper";
import { cn } from "@/lib/utils";
import { createMeetup } from "@/modules/core/actions";
import { SportDot } from "@/modules/core/components/sport-dot";
import { berlinDateTimeParts, berlinLocalToDate, type SportCategory } from "@/modules/core/logic";

import { saveActivity } from "../actions";
import {
  activityCalories,
  defaultPlanTime,
  durationChoices,
  formatActivityDuration,
  formatCalories,
  parseDistanceKm,
  parseDurationMinutes,
  PLAN_MINUTE_CHOICES,
  PLAN_TIME_CHOICES,
  quickEntryDays,
  shiftHour,
} from "../logic";

export type QuickSport = { id: string; name: string; category: SportCategory; hasDistance: boolean; met: number };

type Mode = "done" | "plan";

type Open = (mode: Mode, date?: string) => void;

const QuickEntryContext = createContext<Open | null>(null);

/**
 * Hauptaktion auf „Heute“: „Eintragen“ und „Planen“ (QuickEntryButtons) und „Planen“ an einem
 * freien Tag der Woche (QuickPlanLink) öffnen dieselbe Ansicht. Sportart und Dauer sind vorbelegt
 * (offenes Vorhaben, Dauer vom letzten Mal), der Tag ist heute oder der angetippte.
 */
export function QuickEntryProvider({
  sports,
  selectedSportId,
  lastDurations,
  weightKg,
  children,
}: {
  sports: readonly QuickSport[];
  selectedSportId: string | null;
  lastDurations: Readonly<Record<string, number>>;
  /** Eigenes Körpergewicht für die Kalorien; ohne Angabe null. */
  weightKg: number | null;
  children: React.ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [mode, setMode] = useState<Mode>("done");
  const [date, setDate] = useState<string | undefined>(undefined);
  // Bei jedem Öffnen neu aufgebaut, damit Tag und Vorbelegung stimmen
  const [openCount, setOpenCount] = useState(0);

  function open(next: Mode, day?: string) {
    setMode(next);
    setDate(day);
    setOpenCount((n) => n + 1);
    dialog.current?.showModal();
  }

  return (
    <QuickEntryContext value={open}>
      {children}

      {/* Ein Tipp neben die Ansicht (auf den Hintergrund) schließt sie, Escape ebenso. */}
      <dialog
        ref={dialog}
        aria-labelledby="schnell-titel"
        onClick={(e) => e.target === e.currentTarget && dialog.current?.close()}
        className="bg-background text-foreground backdrop:bg-foreground/40 m-0 mt-auto max-h-[92dvh] w-full max-w-none rounded-t-lg p-0 shadow-lg md:m-auto md:max-w-lg md:rounded-lg"
      >
        {openCount > 0 && (
          <QuickEntryForm
            key={openCount}
            mode={mode}
            initialDate={date}
            onModeChange={setMode}
            sports={sports}
            selectedSportId={selectedSportId}
            lastDurations={lastDurations}
            weightKg={weightKg}
            onClose={() => dialog.current?.close()}
          />
        )}
      </dialog>
    </QuickEntryContext>
  );
}

function useOpen(): Open {
  const open = use(QuickEntryContext);
  if (!open) throw new Error("QuickEntryProvider fehlt");
  return open;
}

/** „Eintragen“ und „Planen“; am Handy fest über der Tab-Leiste. */
export function QuickEntryButtons() {
  const open = useOpen();
  return (
    <div className="bg-background fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-10 grid grid-cols-2 gap-3 border-t px-5 py-3 md:static md:flex md:border-0 md:p-0">
      <Button onClick={() => open("done")} className="md:w-auto">
        Eintragen
      </Button>
      <Button variant="outline" onClick={() => open("plan")} className="md:w-auto">
        Planen
      </Button>
    </div>
  );
}

/** „Planen“ an einem freien Tag der Woche: öffnet die Ansicht mit diesem Tag. */
export function QuickPlanLink({ date, label }: { date: string; label: string }) {
  const open = useOpen();
  return (
    <Button variant="outline" onClick={() => open("plan", date)} aria-label={`Training am ${label} planen`}>
      Planen
    </Button>
  );
}

function QuickEntryForm({
  mode,
  initialDate,
  onModeChange,
  sports,
  selectedSportId,
  lastDurations,
  weightKg,
  onClose,
}: {
  mode: Mode;
  /** Angetippter Tag aus der Woche; sonst heute. */
  initialDate?: string;
  onModeChange: (mode: Mode) => void;
  sports: readonly QuickSport[];
  selectedSportId: string | null;
  lastDurations: Readonly<Record<string, number>>;
  weightKg: number | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [now] = useState(() => berlinDateTimeParts(new Date()));
  const today = now.date;
  // Die ID entsteht einmal je Öffnen: Ein erneutes Senden nach einem Abbruch legt nichts doppelt an.
  const [id] = useState(() => crypto.randomUUID());

  const [sportId, setSportId] = useState(selectedSportId ?? sports[0]?.id ?? null);
  const [date, setDate] = useState(initialDate ?? today);
  const [time, setTime] = useState(() => defaultPlanTime(initialDate ?? today, today, now.time));
  const [duration, setDuration] = useState(lastDurations[sportId ?? ""] ?? 60);
  const [customDuration, setCustomDuration] = useState(false);
  const [hours, setHours] = useState("");
  const [minutes, setMinutes] = useState("");
  const [distance, setDistance] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [planState, planAction, planning] = useActionState(createMeetup, {});

  const sport = sports.find((s) => s.id === sportId) ?? null;
  const last = sportId ? lastDurations[sportId] : undefined;
  // Das Fenster hängt am angetippten Tag, nicht an der Auswahl, damit es beim Wählen nicht springt.
  const days = quickEntryDays(today, mode, initialDate);
  const durationMinutes = customDuration ? parseDurationMinutes(hours, minutes) : duration;
  const shownError = error ?? planState.error ?? null;
  const kcal = activityCalories(sport?.met, weightKg, durationMinutes);

  function chooseSport(next: string) {
    setSportId(next);
    if (!customDuration) setDuration(lastDurations[next] ?? 60);
  }

  function chooseMode(next: Mode) {
    onModeChange(next);
    setError(null);
    // Heute passt in beide Auswahlen; beim Planen bleibt ein angetippter Tag gewählt.
    chooseDate(next === "plan" && initialDate ? initialDate : today);
  }

  function chooseDate(next: string) {
    setDate(next);
    setTime(defaultPlanTime(next, today, berlinDateTimeParts(new Date()).time));
  }

  async function saveDone(event: React.FormEvent) {
    event.preventDefault();
    if (!sport) return setError("Wähl eine Sportart.");
    if (durationMinutes === null) return setError("Gib eine Dauer zwischen 1 Minute und 24 Stunden ein.");
    const distanceM = sport.hasDistance ? parseDistanceKm(distance) : null;
    if (Number.isNaN(distanceM)) return setError("Gib die Distanz in Kilometern ein, zum Beispiel 8,5.");
    setError(null);
    setSaving(true);
    // Heute: jetzt. Frühere Tage: mittags, damit der Tag in deutscher Zeit sicher stimmt.
    const performedAt =
      date === today ? new Date().toISOString() : (berlinLocalToDate(date, "12:00") ?? new Date()).toISOString();
    // Ohne Netz wirft der Aufruf. Die Eingaben bleiben stehen, die ID vom Gerät verhindert Doppeltes.
    const result = await saveActivity({
      id,
      sportId: sport.id,
      performedAt,
      durationMinutes,
      distanceM,
      elevationM: null,
      feeling: null,
      notes: null,
    }).catch(() => null);
    setSaving(false);
    if (!result) {
      return setError("Das hat nicht geklappt. Deine Angaben sind noch da. Prüf deine Verbindung und sende erneut.");
    }
    if (!result.ok) return setError(result.error);
    onClose();
    router.refresh();
  }

  // Planen läuft über das Formular (createMeetup); hier nur prüfen, was ohne Server geht.
  function checkPlan(event: React.FormEvent) {
    const problem = !sport
      ? "Wähl eine Sportart."
      : durationMinutes === null
        ? "Gib eine Dauer zwischen 1 Minute und 24 Stunden ein."
        : null;
    setError(problem);
    if (problem) event.preventDefault();
  }

  return (
    <form
      onSubmit={mode === "done" ? saveDone : checkPlan}
      action={mode === "plan" ? planAction : undefined}
      noValidate
      className="space-y-6 px-5 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] md:px-6 md:pb-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="schnell-titel" className="text-xl font-semibold">
          {mode === "done" ? "Training eintragen" : "Training planen"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Schließen"
          className="hover:bg-accent -mr-3 inline-flex size-11 items-center justify-center rounded-lg"
        >
          <X size={20} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div role="group" aria-label="Gemacht oder planen" className="border-input grid grid-cols-2 gap-1 rounded-lg border p-1">
        {(["done", "plan"] as const).map((m) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => chooseMode(m)}
            className={cn(
              "min-h-10 rounded-md text-sm transition-colors duration-150 ease-out",
              mode === m ? "bg-muted text-foreground font-medium" : "text-muted-foreground hover:bg-accent",
            )}
          >
            {m === "done" ? "Gemacht" : "Planen"}
          </button>
        ))}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Sportart</legend>
        <div className="flex flex-wrap gap-2">
          {sports.map((s) => (
            <ChoiceChip key={s.id} selected={s.id === sportId} onClick={() => chooseSport(s.id)}>
              {s.id !== sportId && <SportDot category={s.category} />}
              {s.name}
            </ChoiceChip>
          ))}
          <Link
            href={mode === "done" ? "/aktivitaet/neu" : `/plan/neu?tag=${date}`}
            className="border-input text-muted-foreground hover:bg-accent inline-flex min-h-11 items-center rounded-lg border px-3 text-sm md:min-h-9"
          >
            Andere Sportart
          </Link>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Wann?</legend>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const selected = d.date === date;
            return (
              <button
                key={d.date}
                type="button"
                aria-pressed={selected}
                aria-label={d.isToday ? `Heute, ${d.weekday} ${d.day}.` : `${d.weekday} ${d.day}.`}
                onClick={() => chooseDate(d.date)}
                className={cn(
                  "flex min-h-13 flex-col items-center justify-center rounded-lg border text-xs font-medium transition-colors duration-150 ease-out",
                  selected ? "border-foreground text-foreground border-[1.5px]" : "border-input text-muted-foreground hover:bg-accent",
                )}
              >
                {d.weekday}
                <span className={cn("num text-foreground text-base font-normal", d.isToday && "font-semibold underline underline-offset-4")}>
                  {d.day}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* Neu aufgebaut, wenn ein anderer Tag die vorgeschlagene Uhrzeit ändert */}
      {mode === "plan" && <PlanTimeField key={date} value={time} onChange={setTime} />}

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Dauer</legend>
        <div className="flex flex-wrap gap-2">
          {durationChoices(last).map((m) => (
            <ChoiceChip
              key={m}
              selected={!customDuration && duration === m}
              onClick={() => {
                setCustomDuration(false);
                setDuration(m);
              }}
            >
              {formatActivityDuration(m)}
            </ChoiceChip>
          ))}
          <ChoiceChip selected={customDuration} onClick={() => setCustomDuration(true)}>
            Andere
          </ChoiceChip>
        </div>
        {customDuration && (
          <div className="grid max-w-60 grid-cols-2 gap-3 pt-2">
            <div className="space-y-2">
              <Label htmlFor="schnell-stunden">Stunden</Label>
              <Input
                id="schnell-stunden"
                inputMode="numeric"
                value={hours}
                onChange={(e) => setHours(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="0"
                className="num text-right"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="schnell-minuten">Minuten</Label>
              <Input
                id="schnell-minuten"
                inputMode="numeric"
                value={minutes}
                onChange={(e) => setMinutes(e.target.value.replace(/\D/g, "").slice(0, 2))}
                placeholder="45"
                className="num text-right"
              />
            </div>
          </div>
        )}
        {!customDuration && last !== undefined && duration === last && (
          <p className="text-muted-foreground text-sm">Wie beim letzten Mal.</p>
        )}
        {weightKg === null ? (
          <p className="text-muted-foreground text-sm">
            <Link href="/profil/einstellungen#gewicht" className="underline underline-offset-4">
              Gewicht angeben
            </Link>
            , um die Kalorien zu sehen.
          </p>
        ) : (
          kcal !== null && <p className="text-sm">etwa {formatCalories(kcal)}</p>
        )}
      </fieldset>

      {mode === "done" && sport?.hasDistance && (
        <div className="max-w-40 space-y-2">
          <Label htmlFor="schnell-distanz">Distanz in km (optional)</Label>
          <Input
            id="schnell-distanz"
            inputMode="decimal"
            value={distance}
            onChange={(e) => setDistance(e.target.value.replace(/[^\d,.]/g, "").slice(0, 7))}
            className="num text-right"
          />
        </div>
      )}

      {mode === "plan" && (
        <>
          {/* Für createMeetup: privat, ohne Treffpunkt und Tempo. Zurück geht es auf „Heute“. */}
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="von" value="heute" />
          <input type="hidden" name="sportId" value={sportId ?? ""} />
          <input type="hidden" name="date" value={date} />
          <input type="hidden" name="time" value={time} />
          <input type="hidden" name="hours" value={durationMinutes ? Math.floor(durationMinutes / 60) : ""} />
          <input type="hidden" name="minutes" value={durationMinutes ? durationMinutes % 60 : ""} />
        </>
      )}

      {shownError && (
        <p role="alert" className="text-destructive text-sm">
          {shownError}
        </p>
      )}

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
        <Button type="submit" className="w-full md:w-auto" disabled={saving || planning}>
          {saving || planning ? "Wird gesendet" : mode === "done" ? "Aktivität speichern" : "Training planen"}
        </Button>
        <Link
          href={mode === "done" ? "/aktivitaet/neu" : `/plan/neu?tag=${date}`}
          className="inline-flex min-h-11 items-center justify-center text-sm underline underline-offset-4"
        >
          Mehr Angaben
        </Link>
      </div>
    </form>
  );
}

/**
 * Uhrzeit beim Planen: häufige Zeiten als Chips, mit „Andere“ die Stunde über „− 18 +“ und die
 * Minute aus 00, 15, 30 und 45. Eine Zeit außerhalb der Chips öffnet gleich die Feinwahl.
 */
function PlanTimeField({ value, onChange }: { value: string; onChange: (time: string) => void }) {
  const [custom, setCustom] = useState(() => !(PLAN_TIME_CHOICES as readonly string[]).includes(value));
  const hour = Number(value.slice(0, 2));
  const minute = value.slice(3, 5);

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Uhrzeit</legend>
      <div className="flex flex-wrap gap-2">
        {PLAN_TIME_CHOICES.map((t) => (
          <ChoiceChip
            key={t}
            selected={!custom && value === t}
            onClick={() => {
              setCustom(false);
              onChange(t);
            }}
          >
            <span className="num">{t}</span>
          </ChoiceChip>
        ))}
        <ChoiceChip selected={custom} onClick={() => setCustom(true)}>
          Andere
        </ChoiceChip>
      </div>
      {custom && (
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3 pt-2">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Stunde</p>
            <Stepper
              value={hour}
              onChange={(h) => onChange(shiftHour(value, h - hour))}
              label="Stunde"
              min={0}
              max={23}
              suffix=""
            />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">Minute</p>
            <div className="flex gap-2">
              {PLAN_MINUTE_CHOICES.map((m) => (
                <ChoiceChip key={m} selected={minute === m} onClick={() => onChange(`${value.slice(0, 2)}:${m}`)}>
                  <span className="num">{m}</span>
                </ChoiceChip>
              ))}
            </div>
          </div>
          <p className="num w-full text-sm" aria-live="polite">
            {value}&nbsp;Uhr
          </p>
        </div>
      )}
    </fieldset>
  );
}
