import "server-only";

import { CATALOG } from "./catalog";
import { visibleCatalog } from "./logic";

/**
 * Der Katalog, wie ihn diese Umgebung zeigt. Er liegt im Code, nicht in der Datenbank; Entwürfe
 * erscheinen lokal und in Vercel-Previews, nicht in Produktion (docs/bereiche/plaene.md).
 */
export function getCatalog() {
  return visibleCatalog(CATALOG, process.env.VERCEL_ENV);
}
