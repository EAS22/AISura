# UI Polish: Sidebar Logo and Aplikasi Info

## Scope

Polish two existing UI areas without changing app behavior:

- Sidebar top logo in `src/components/layout/app-sidebar.tsx`
- Informasi card in `src/pages/pengaturan/Aplikasi.tsx`

## Sidebar Logo

Match the AISura logo colors used on the login page:

- `AI` uses blue: `text-blue-600`
- `Sura` uses black in light mode and white in dark mode: `text-black dark:text-white`
- Collapsed state shows `AIS`, with `AI` blue and `S` black/white
- Keep current `Unica One` font and existing layout spacing
- Keep version badge when sidebar is expanded

## Aplikasi Info Card

Replace the plain Informasi card with a premium branded card:

- Use a soft gradient background and subtle border
- Show `AISura` wordmark with same blue/black logo treatment
- Add subtitle: `Aplikasi Surat Otomatis Desa`
- Show version as a small badge
- Present app metadata in a responsive grid of small info tiles:
  - Versi: `v1.0.0`
  - Developer: `EAS Creative Studio`
  - Email: `dev@eas.biz.id`
  - Web: `eas.biz.id`

## Constraints

- No data model or service changes
- No new dependencies
- Preserve existing shadcn/ui style and page spacing
- Keep desktop and mobile layout usable
- Use existing icons only if already available from `lucide-react`

## Verification

- Run `npm run build`
- Visually inspect sidebar expanded/collapsed states
- Visually inspect `Pengaturan > Aplikasi` in light and dark mode
