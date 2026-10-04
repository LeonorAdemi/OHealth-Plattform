# Entwurfsquelle der Icons je Muskelgruppe (24er-Raster, runde Enden, currentColor).
# In der App gilt src/modules/workouts/components/muscle-group-icon.tsx. Änderungen dort nachziehen.
# Gleiche Figurensprache wie die Skizzen: Kopf als gefüllter Punkt, Glieder als Linien.
ICONS = {
 "brust":      ('<path d="M3 18.5h14M5 18.5V21M15 18.5V21"/><path d="M7.5 15.5h6.5l3.5-3.5 2.5 9"/><path d="M9.5 15.5V9"/><circle cx="9.5" cy="6.5" r="2.5"/>', '<circle cx="5" cy="15" r="2"/>'),
 "ruecken":    ('<path d="M4 3h16"/><path d="M7 3 6 8l3.5 2h5L18 8l-1-5"/><path d="M12 10v6.5M12 16.5 10.5 21M12 16.5l1.5 4.5"/>', '<circle cx="12" cy="7" r="2"/>'),
 "schultern":  ('<path d="M5 11h14M4 9.5v3M20 9.5v3"/><path d="M12 11v6M12 17l-2 4M12 17l2 4"/>', '<circle cx="12" cy="7.5" r="2"/>'),
 "arme":       ('<path d="M9 7.5V15M9 15l-1.5 6M9 15l1.5 6"/><path d="M9.5 8.5l.5 5.5 5.5-4"/><path d="M14.3 8.4l2.4 3.2"/>', '<circle cx="9" cy="4.5" r="2"/>'),
 "beine":      ('<path d="M3 21h18"/><path d="M13 21l3.5-6L9 13.5l4-6.5"/><circle cx="9.5" cy="8" r="2.25"/>', '<circle cx="14.5" cy="4" r="2"/>'),
 "gesaess":    ('<path d="M3 20.5h18"/><path d="M7 18.5 13 13h4l1.5 7.5"/><path d="M7 18.5 11 20"/>', '<circle cx="4.5" cy="18" r="2"/>'),
 "rumpf":      ('<path d="M2 20.5h20"/><path d="M3.5 18.5 16 14.5v5h4"/>', '<circle cx="18.5" cy="12.5" r="2"/>'),
 "ganzkoerper":('<path d="M5 3l7 6.5L19 3"/><path d="M12 8v6.5M6 21l6-6.5 6 6.5"/>', '<circle cx="12" cy="4.5" r="2"/>'),
 "ausdauer":   ('<path d="M13 7.5 11 14l4 2.5-2 4.5M11 14l-3 4H4.5"/><path d="M12.5 9.5l3.5 2 2-3M12.5 9.5 9.5 12 8 10"/>', '<circle cx="14" cy="4.5" r="2"/>'),
}
def svg(name, size=24):
    strokes, fills = ICONS[name]
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{size}" height="{size}" viewBox="0 0 24 24" fill="none" '
            f'stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
            f'{strokes}<g fill="currentColor" stroke="none">{fills}</g></svg>')
