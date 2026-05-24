# UI Polish Sidebar Aplikasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish AISura sidebar logo colors and make Aplikasi information card more branded and visually refined.

**Architecture:** Keep polish local to two React components. Reuse existing shadcn/ui Card, Badge, and existing Tailwind theme tokens; no service, schema, routing, or data changes.

**Tech Stack:** React, TypeScript, Tailwind CSS, shadcn/ui, lucide-react.

---

## File Structure

- Modify `src/components/layout/app-sidebar.tsx`: update sidebar wordmark color treatment for expanded and collapsed states.
- Modify `src/pages/pengaturan/Aplikasi.tsx`: import Badge and lucide icons, replace plain Informasi card with branded responsive card.
- Verify with `npm run build`.

---

### Task 1: Sidebar Logo Color Match

**Files:**
- Modify: `src/components/layout/app-sidebar.tsx`

- [ ] **Step 1: Update collapsed and expanded logo colors**

Replace SidebarLogo return block so AI uses text-blue-600, Sura uses text-black dark:text-white, and collapsed AIS splits AI blue plus S black/white.

- [ ] **Step 2: Verify no TypeScript changes needed**

Run: `npm run build`

Expected: build passes or reports exact JSX/type error to fix.

---

### Task 2: Branded Aplikasi Info Card

**Files:**
- Modify: `src/pages/pengaturan/Aplikasi.tsx`

- [ ] **Step 1: Add imports**

Add Badge from `@/components/ui/badge` and Code2, Globe2, Mail, Sparkles from `lucide-react`.

- [ ] **Step 2: Replace plain Informasi card**

Replace current plain card with premium branded card using soft blue gradient, AISura wordmark, version badge, subtitle, short app description, and responsive info tiles for version, developer, email, and web.

- [ ] **Step 3: Add InfoTile helper**

Add helper below AplikasiPage that accepts icon component, label, and value, then renders small bordered tile with truncated value.

- [ ] **Step 4: Verify build**

Run: `npm run build`

Expected: build passes. If icon type causes issue, use React.ComponentType with className prop for helper prop type.

---

### Task 3: Commit and Push

**Files:**
- Modified: `src/components/layout/app-sidebar.tsx`
- Modified: `src/pages/pengaturan/Aplikasi.tsx`
- Modified: `docs/superpowers/plans/2026-05-24-ui-polish-sidebar-aplikasi.md`

- [ ] **Step 1: Inspect diff**

Run: `git status --short && git diff -- src/components/layout/app-sidebar.tsx src/pages/pengaturan/Aplikasi.tsx`

Expected: only intended UI polish changes in source files.

- [ ] **Step 2: Commit**

Run: `git add src/components/layout/app-sidebar.tsx src/pages/pengaturan/Aplikasi.tsx docs/superpowers/plans/2026-05-24-ui-polish-sidebar-aplikasi.md && git commit -m "style: polish sidebar logo and aplikasi info"`

Expected: commit created.

- [ ] **Step 3: Push**

Run: `git push`

Expected: main pushed to GitHub.
