"use client";

import { Search, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { SportDot } from "@/modules/core/components/sport-dot";

import { CATALOG_PATH, MAX_QUERY, MIN_SUGGEST, searchWords, type SuggestionGroup } from "../logic";
import { Highlighted } from "./plan-rows";

type Option = { href: string; label: string; detail?: string } & Partial<SuggestionGroup["items"][number]>;

/**
 * Suchfeld für Pläne und Einheiten mit Vorschlägen beim Tippen (Combobox): Ziele, Sportarten, Pläne
 * und Einheiten, mit Pfeiltasten wählbar, Enter öffnet, Escape schließt. Ohne JavaScript ist es ein
 * gewöhnliches Formular (?q=), das gewählte Filter als versteckte Felder mitschickt. Am Desktop
 * springt „/“ ins Feld.
 */
export function CatalogSearch({ query, keep }: { query: string; keep: readonly [string, string][] }) {
  const router = useRouter();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(query);
  const [typed, setTyped] = useState(false);
  const [result, setResult] = useState<{ q: string; groups: SuggestionGroup[]; total: number } | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  // Vorschläge holen, kurz nach dem letzten Tastendruck; ältere Anfragen werden abgebrochen
  useEffect(() => {
    const q = value.trim();
    if (!typed || q.length < MIN_SUGGEST) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/plaene/vorschlaege?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { groups: SuggestionGroup[]; total: number };
        setResult({ q, ...data });
        setActive(-1);
      } catch {
        // Abgebrochen oder offline: das Formular funktioniert auch ohne Vorschläge
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value, typed]);

  // „/“ springt ins Suchfeld, solange man nicht gerade in einem anderen Feld schreibt
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName)) return;
      e.preventDefault();
      input.current?.focus();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const current = result && result.q === value.trim() && value.trim().length >= MIN_SUGGEST ? result : null;
  const params = (q: string) => new URLSearchParams([["q", q], ...keep]).toString();
  const groups: { label: string; items: Option[] }[] = current
    ? [
        ...current.groups,
        ...(current.total > 0
          ? [
              {
                label: "",
                items: [
                  {
                    href: `${CATALOG_PATH}?${params(current.q)}`,
                    label: `Alle ${current.total} Treffer für „${current.q}“`,
                  },
                ],
              },
            ]
          : []),
      ]
    : [];
  const options = groups.flatMap((g) => g.items);
  const expanded = open && current !== null;
  const words = current ? searchWords(current.q) : [];
  const optionId = (i: number) => `${id}-vorschlag-${i}`;

  function go(option: Option) {
    setOpen(false);
    router.push(option.href);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      if (!current || options.length === 0) return;
      e.preventDefault();
      setOpen(true);
      // Reihum durch die Vorschläge, dazwischen einmal zurück ins Feld (-1)
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => {
        const next = i + step;
        if (next >= options.length) return -1;
        return next < -1 ? options.length - 1 : next;
      });
    } else if (e.key === "Enter" && expanded && active >= 0 && active < options.length) {
      e.preventDefault();
      go(options[active]);
    } else if (e.key === "Escape" && expanded) {
      e.preventDefault();
      setOpen(false);
      setActive(-1);
    }
  }

  let index = -1;
  return (
    <form action={CATALOG_PATH} method="get" role="search" className="max-w-2xl space-y-2">
      {keep.map(([name, v]) => (
        <input key={name} type="hidden" name={name} value={v} />
      ))}
      <Label htmlFor={`${id}-q`}>Pläne und Einheiten suchen</Label>
      <div className="flex gap-3">
        <div
          className="relative min-w-0 flex-1"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
          }}
        >
          <Search
            size={20}
            strokeWidth={1.5}
            aria-hidden
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
          />
          <input
            ref={input}
            id={`${id}-q`}
            name="q"
            type="search"
            role="combobox"
            aria-expanded={expanded}
            aria-controls={`${id}-liste`}
            aria-autocomplete="list"
            aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
            autoComplete="off"
            value={value}
            maxLength={MAX_QUERY}
            placeholder="Ziel, Sportart oder Übung, z. B. 10 km"
            enterKeyHint="search"
            onChange={(e) => {
              setValue(e.target.value);
              setTyped(true);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className={cn(
              "border-input placeholder:text-muted-foreground flex h-12 w-full min-w-0 rounded-lg border bg-transparent pr-11 pl-10 text-base transition-colors duration-150 ease-out md:h-10",
              "focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2",
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
          {value && (
            <button
              type="button"
              aria-label="Eingabe leeren"
              onClick={() => {
                setValue("");
                setResult(null);
                input.current?.focus();
              }}
              className="text-muted-foreground hover:text-foreground absolute top-1/2 right-0 flex size-11 -translate-y-1/2 items-center justify-center rounded-lg md:size-10"
            >
              <X size={20} strokeWidth={1.5} aria-hidden />
            </button>
          )}

          <div
            id={`${id}-liste`}
            role="listbox"
            aria-label="Vorschläge"
            hidden={!expanded}
            // Klicks in die Liste sollen das Feld nicht verlassen
            onMouseDown={(e) => e.preventDefault()}
            className="bg-background absolute inset-x-0 top-full z-30 mt-2 max-h-[min(70dvh,32rem)] overflow-y-auto rounded-lg border px-3 pb-2 shadow-lg"
          >
            {current && options.length === 0 && (
              <p className="text-muted-foreground py-4 text-sm">Keine Vorschläge für „{current.q}“.</p>
            )}
            {groups.map((group) => (
              <div key={group.label || "alle"} role="group" aria-label={group.label || undefined}>
                {group.label && <p className="text-muted-foreground pt-3 pb-1 text-xs font-medium">{group.label}</p>}
                {group.items.map((option) => {
                  index += 1;
                  const i = index;
                  const all = !group.label;
                  return (
                    <div
                      key={option.href}
                      id={optionId(i)}
                      role="option"
                      aria-selected={i === active}
                      onClick={() => go(option)}
                      onMouseMove={() => setActive(i)}
                      className={cn(
                        "-mx-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-lg px-2 py-2",
                        i === active && "bg-accent",
                        all && "mt-1 text-sm underline underline-offset-4",
                      )}
                    >
                      {option.number && (
                        <span className="flex w-9 shrink-0 flex-col items-center leading-none" aria-hidden>
                          <span className="num-display text-xl">{option.number.value}</span>
                          <span className="text-muted-foreground mt-0.5 text-xs font-medium">{option.number.unit}</span>
                        </span>
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 break-words">
                          {option.categories && option.categories.length > 0 && (
                            <span className="inline-flex shrink-0 gap-1">
                              {option.categories.map((c, k) => (
                                <SportDot key={k} category={c} />
                              ))}
                            </span>
                          )}
                          <span>{all ? option.label : <Highlighted text={option.label} words={words} />}</span>
                        </span>
                        {option.detail && <span className="text-muted-foreground block text-sm">{option.detail}</span>}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <Button type="submit" variant="outline">
          Suchen
        </Button>
      </div>
      <p className="sr-only" aria-live="polite">
        {expanded ? (options.length > 0 ? `${options.length} Vorschläge` : "Keine Vorschläge") : ""}
      </p>
    </form>
  );
}
