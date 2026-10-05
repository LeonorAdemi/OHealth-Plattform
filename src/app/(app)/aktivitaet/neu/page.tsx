import type { Metadata } from "next";
import Link from "next/link";

import { getSports } from "@/modules/core/queries";
import { ActivityForm } from "@/modules/workouts/components/activity-form";
import { getMyRecentSportIds } from "@/modules/workouts/queries";

export const metadata: Metadata = { title: "Aktivität eintragen" };

export default async function NewActivityPage() {
  const [sports, recentSportIds] = await Promise.all([getSports(), getMyRecentSportIds()]);

  return (
    <>
      <p className="text-sm">
        <Link href="/" className="text-muted-foreground inline-flex min-h-11 items-center underline underline-offset-4">
          Heute
        </Link>
      </p>
      <h1 className="text-titel mt-2 font-semibold">Aktivität eintragen</h1>
      <div className="mt-6">
        <ActivityForm sports={sports} recentSportIds={recentSportIds} />
      </div>
    </>
  );
}
