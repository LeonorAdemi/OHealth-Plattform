import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getSports } from "@/modules/core/queries";
import { PlanGrid } from "@/modules/plans/components/plan-grid";
import { SportDots, sportNames, UnitRow } from "@/modules/plans/components/plan-rows";
import { countSessions, describePerWeek, formatWeekRange, planSportIds, sportLookup } from "@/modules/plans/logic";
import { getCatalog } from "@/modules/plans/queries";

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

function findPlan(slug: string) {
  const catalog = getCatalog();
  return { catalog, plan: catalog.plans.find((p) => p.slug === slug) ?? null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { plan } = findPlan((await params).slug);
  return { title: plan?.title ?? "Plan" };
}

// Ein Plan: Dauer als Großzahl, für wen er passt, Zwischenziele, eine Woche aus dem Plan, der Aufbau
// über alle Wochen mit Phasen und die Grundlage mit Quellen (docs/bereiche/plaene.md).
export default async function PlanDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { catalog, plan } = findPlan((await params).slug);
  if (!plan) notFound();
  const sports = sportLookup(await getSports());
  const ids = planSportIds(plan, catalog.units);
  const units = new Map(catalog.units.map((u) => [u.slug, u]));

  return (
    <>
      <p className="text-sm">
        <Link
          href="/entdecken/plaene"
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Pläne und Einheiten
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">{plan.title}</h1>
      <p className="text-muted-foreground mt-1 flex items-start gap-2">
        {/* Punkte auf Höhe der ersten Zeile, auch wenn der Text umbricht */}
        <span className="flex h-6 items-center">
          <SportDots ids={ids} sports={sports} />
        </span>
        <span className="min-w-0">
          {sportNames(ids, sports)} · {plan.level}
        </span>
      </p>
      {plan.draft && (
        <p className="text-muted-foreground mt-2 text-sm">Entwurf: Inhalt und Quellen sind noch nicht geprüft.</p>
      )}

      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-12">
        <div className="min-w-0 max-w-2xl">
          <p className="flex items-baseline gap-2">
            <span className="text-grosszahl num-display">{plan.weeks}</span>
            <span className="text-muted-foreground">Wochen</span>
          </p>
          <p className="mt-1">
            {describePerWeek(plan)}, {countSessions(plan)} Einheiten insgesamt
          </p>

          <section className="mt-8" aria-labelledby="passt">
            <h2 id="passt" className="text-xl font-semibold">
              Passt zu dir, wenn
            </h2>
            <p className="mt-2">{plan.prerequisite}</p>
          </section>

          {plan.milestones.length > 0 && (
            <section className="mt-8" aria-labelledby="zwischenziele">
              <h2 id="zwischenziele" className="text-xl font-semibold">
                Zwischenziele
              </h2>
              <ul className="mt-2">
                {plan.milestones.map((m) => (
                  <li
                    key={`${m.week}-${m.text}`}
                    className="grid min-h-14 grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-4 border-b py-3"
                  >
                    <span className="text-muted-foreground num text-sm">Woche {m.week}</span>
                    <span>{m.text}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-8" aria-labelledby="woche">
            <h2 id="woche" className="text-xl font-semibold">
              Eine Woche aus dem Plan
            </h2>
            <ul className="mt-2">
              {plan.week.map((slug, day) => {
                const unit = slug ? units.get(slug) : undefined;
                return unit ? <UnitRow key={day} unit={unit} sports={sports} day={WEEKDAYS[day]} /> : null;
              })}
            </ul>
            <p className="text-muted-foreground mt-3 text-sm">An den übrigen Tagen ist frei.</p>
          </section>
        </div>

        <div className="mt-10 min-w-0 max-w-2xl xl:mt-0">
          <section aria-labelledby="aufbau">
            <h2 id="aufbau" className="text-xl font-semibold">
              Aufbau
            </h2>
            <PlanGrid plan={plan} units={catalog.units} sports={sports} />
            <ul className="mt-4">
              {plan.phases.map((p) => (
                <li key={p.from} className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-4 border-b py-3">
                  <span className="text-muted-foreground num text-sm">{formatWeekRange(p.from, p.to)}</span>
                  <span>
                    <span className="block font-medium">{p.title}</span>
                    <span className="text-muted-foreground block text-sm">{p.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8" aria-labelledby="grundlage">
            <h2 id="grundlage" className="text-xl font-semibold">
              Grundlage
            </h2>
            <p className="mt-2">{plan.basis}</p>
            <ul className="text-muted-foreground mt-2 text-sm" aria-label="Quellen">
              {plan.sources.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
