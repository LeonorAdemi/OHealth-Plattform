import { connectDb, E2E_EMAIL_PATTERN } from "./support";

// Vor und nach jedem Lauf: Testkonten mit allem, was an ihnen hängt, wieder entfernen. Sonst bleiben
// sie in der lokalen Datenbank, und die Datenbanktests (die eine leere Datenbank erwarten) schlagen fehl.
// Communities zuerst, weil sie beim Löschen eines Kontos nur ihre Verwaltung verlieren. Konten einzeln,
// wie beim Konto-Löschen. Eigene Verbindung, weil Setup und Teardown im selben Prozess laufen.
export default async function cleanup() {
  const sql = connectDb();
  try {
    await sql`
      delete from public.groups g using auth.users u
      where g.created_by = u.id and u.email like ${E2E_EMAIL_PATTERN}`;
    const users = await sql<{ id: string }[]>`select id from auth.users where email like ${E2E_EMAIL_PATTERN}`;
    for (const { id } of users) await sql`delete from auth.users where id = ${id}`;
  } finally {
    await sql.end();
  }
}
