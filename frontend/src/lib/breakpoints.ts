/**
 * Aturan breakpoint tunggal (selaras Tailwind default):
 * - <768        mobile  : BottomNav, alur layar penuh.
 * - 768–1279    tablet  : sidebar ringkas 96px (frame Tablet .pen 1024×768).
 * - ≥1024       lebar   : master-detail Riwayat/Utang, panel samping.
 * - ≥1280       desktop : sidebar 248px.
 */
export const MQ = {
  md: '(min-width: 768px)',
  lg: '(min-width: 1024px)',
  xl: '(min-width: 1280px)',
} as const;
