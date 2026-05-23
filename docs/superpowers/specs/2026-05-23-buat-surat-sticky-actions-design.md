## Buat Surat Sticky Actions Design

### Goal

Keep primary actions visible while user fills long placeholder forms on `Buat Surat` after template selection. Page should feel stable, consistent with rest of app, and easier to use on desktop and smaller widths.

### Current Problem

Current page uses local sticky header inside fixed-height layout. This keeps title and actions near top, but action area still feels weak when form becomes long:

- user scroll focus moves far away from action buttons
- field completion near bottom feels disconnected from `Generate & Download`
- fixed height based on `calc(100vh - spacing)` is brittle against real header height and app shell spacing
- current top-only sticky approach does not optimize action visibility during long form entry

### Chosen Approach

Use three-zone layout:

1. top context header
2. middle scrollable form region
3. bottom sticky action bar

This keeps context visible at top and keeps actions always reachable at bottom.

### Layout Structure

#### Top Context Header

Header stays at top of page content and shows:

- page title `Buat Surat`
- selected template name
- optional secondary action `Kembali`

Header should remain compact. It provides context, not main call-to-action.

#### Middle Scrollable Form Region

Only form content scrolls. This region contains:

- warga sections
- nomor surat override card
- custom placeholder inputs

This region must have extra bottom padding so final fields are never hidden behind sticky action bar.

#### Bottom Sticky Action Bar

Action bar remains visible at bottom of page content at all times. It contains:

- primary CTA `Generate & Download`
- secondary action `Kembali`
- optional small supporting text like selected template name or placeholder section count if spacing allows

Action bar uses solid background or lightly blurred surface, top border, and spacing consistent with shadcn admin shell.

### Interaction Design

- user scrolls form independently from action bar
- action bar never overlaps unreadable content because form region includes bottom safe padding
- `Generate & Download` remains most prominent control
- `Kembali` remains accessible without competing visually with primary CTA

### Responsive Behavior

Desktop:

- action bar laid out horizontally
- title and template info remain left-aligned in top header
- footer actions aligned right or split left/right based on available width

Smaller widths:

- action bar may stack vertically or wrap
- primary CTA should become full-width if needed
- spacing should avoid cramped side-by-side buttons

### Visual Guidelines

- use existing shadcn card/surface language
- sticky bar should visually separate from form with border-top and background
- avoid transparent overlay that makes text or fields visually noisy during scroll
- maintain consistent horizontal padding with other app pages

### Error Handling

No feature logic changes. Existing generate validation and alert behavior remain unchanged. This design only changes presentation and action placement.

### Testing

Verify these cases:

- long template with many warga/custom placeholders keeps action bar visible
- last input remains accessible and not hidden behind sticky footer
- `Kembali` works from sticky area
- `Generate & Download` still works with filled and auto-filled data
- layout behaves correctly on narrower window widths

### Scope Boundaries

Included:

- layout restructuring inside `src/pages/BuatSurat.tsx`
- spacing/padding adjustments for scrollable content
- action placement refinement

Not included:

- generate flow logic changes
- placeholder detection changes
- form grouping redesign beyond layout support
