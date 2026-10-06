import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SportDot } from "@/modules/core/components/sport-dot";
import { getSports } from "@/modules/core/queries";
import { PlanRow } from "@/modules/plans/components/plan-rows";
import { INTENSITY_LABEL, plansWithUnit, sportLookup, trackedFields } from "@/modules/plans/logic";
import { getCatalog } from "@/modules/plans/queries";

function findUnit(slug: string) {
  const catalog = getCatalog();
  return { catalog, unit: catalog.units.find((u) => u.slug === slug) ?? null };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { unit } = findUnit((await params).slug);
  return { title: unit?.title ?? "Einheit" };
}

// Eine Einheit: Dauer als Großzahl, Ablauf, warum sie so aufgebaut ist, was man bei dieser Sportart
// einträgt und in welchen Plänen sie vorkommt (docs/bereiche/plaene.md).
export default async function UnitDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { catalog, unit } = findUnit((await params).slug);
  if (!unit) notFound();
  const allSports = await getSports();
  const sports = sportLookup(allSports);
  const sport = allSports.find((s) => s.id === unit.sportId);
  const plans = plansWithUnit(catalog, unit.slug);

  return (
    <div className="max-w-2xl">
      <p className="text-sm">
        <Link
          href="/entdecken/plaene"
          className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4"
        >
          Pläne und Einheiten
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">{unit.title}</h1>
      <p className="text-muted-foreground mt-1 flex items-center gap-2">
        <SportDot category={sport?.category} />
        {sport?.name ?? unit.sportId} · {INTENSITY_LABEL[unit.intensity]}
      </p>
      {unit.draft && <p className="text-muted-foreground mt-2 text-sm">Entwurf: Inhalt ist noch nicht geprüft.</p>}

      <p className="mt-6 flex items-baseline gap-2">
        <span className="text-grosszahl num-display">{unit.minutes}</span>
        <span className="text-muted-foreground">min</span>
      </p>

      <section className="mt-8" aria-labelledby="ablauf">
        <h2 id="ablauf" className="text-xl font-semibold">
          Ablauf
        </h2>
        <ol className="mt-2">
          {unit.steps.map((s, i) => (
            <li key={i} className="grid min-h-14 grid-cols-[6rem_minmax(0,1fr)] items-center gap-4 border-b py-3">
              <span className="num font-semibold">{s.amount}</span>
              <span>{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8" aria-labelledby="warum">
        <h2 id="warum" className="text-xl font-semibold">
          Warum
        </h2>
        <p className="mt-2">{unit.why}</p>
      </section>

      {sport && (
        <section className="mt-8" aria-labelledby="eintragen">
          <h2 id="eintragen" className="text-xl font-semibold">
            Was du einträgst
          </h2>
          <ul className="mt-2">
            {trackedFields(sport).map((f) => (
              <li key={f} className="flex min-h-14 items-center border-b py-3">
                {f}
              </li>
            ))}
          </ul>
        </section>
      )}

      {plans.length > 0 && (
        <section className="mt-8" aria-labelledby="in-plaenen">
          <h2 id="in-plaenen" className="text-xl font-semibold">
            Teil dieser Pläne
          </h2>
          <ul className="mt-2">
            {plans.map((p) => (
              <PlanRow key={p.slug} plan={p} units={catalog.units} sports={sports} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
