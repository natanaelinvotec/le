# Capoeira Liberdade e Expressão — Design System

Design system for the digital portal of the **Grupo de Capoeira Liberdade e Expressão**, a Brazilian
capoeira group that runs classes across ten academies, each led by a named mestre, professor or instrutor.
The software is not a consumer product — it is the group's internal management portal, written in
Portuguese (pt-BR), used by students, teachers and one master administrator.

## Sources

| Source | URL | What was taken |
|---|---|---|
| GitHub — `natanaelinvotec/le` (branch `main`) | https://github.com/natanaelinvotec/le | Every token, component and screen here. Files read: `admin.css`, `admin.html`, `inscricao.css`, `inscricao.html`, `aluno.html`, `login.html`, `painel.html`, `README-SEGURANCA.md`. Asset copied: `logo-liberdade150.png`. |

No Figma file, brand book or font binaries were provided. Everything below was derived from the CSS and
markup of that repository. Explore the repo directly for anything this system does not cover.

## The products

1. **Ficha de Inscrição** (`inscricao.html`) — the only public surface. A four-step enrollment form with
   webcam photo capture, health questionnaire, rules and terms, ending in a printable PDF ficha.
2. **Portal do Aluno** (`login.html` → `aluno.html`) — the student's own panel: graduation thermometer,
   their mestre's profile, 15 criteria scores, monthly fee + official shop, video lessons and PDF library.
3. **Painel Master** (`admin.html`) — the administrator's panel: master student list with per-academy
   forwarding, a student record modal with star-rated criteria, academy/teacher management and Chart.js analytics.

`painel.html` exists in the repo only as a deliberately discontinued page and is not represented here.

## CONTENT FUNDAMENTALS

**Language.** Brazilian Portuguese throughout, including accents and the ç. Never mix English into UI copy.
Capoeira vocabulary is used unglossed and is part of the brand: *cordão*, *ginga*, *roda*, *abadá*, *berimbau*,
*atabaque*, *pandeiro*, *floreios*, *fundamentos*, *malícia*, *graduação*, *academia* (a training location, not a gym chain).

**Voice.** Institutional-warm. The group addresses the student as *você* and speaks about itself in the
first person plural ("nosso grupo", "o Grupo de Capoeira Liberdade e Expressão"). Rules are stated plainly
and without apology ("Não é permitido treinar de boné, chinelo, relógio"), encouragement is enthusiastic
and ends in an exclamation mark ("Atinja 70% ou mais … para estar apto à nova fase!").

**Casing.** Sentence case for body copy; Title Case With Every Major Word Capitalised for headings, section
bars and buttons ("Lista Completa de Alunos", "Atualizar Prontuário", "Pagar com PIX"). ALL CAPS only for the
two consent options (AUTORIZO / NÃO AUTORIZO) and the modal title EDITAR ALUNO. Colons close every field label
("Nome completo:", "Idade:") — a paper-form habit carried into the UI.

**Buttons** are verbs, usually with an object: *Acessar Painel*, *Enviar e Gerar PDF*, *Cadastrar Academia*,
*Comprar Agora*, *Assistir Aula Completa*, *Atualizar Prontuário*. Never bare "Salvar" where a noun fits.

**Microcopy** explains consequences before the control: "Ao filtrar, os gráficos mostrarão apenas os dados da
academia selecionada." Placeholders carry examples in parentheses: "Nome da Academia (Ex: Academia Mestre Profeta)".

**Emoji.** Effectively absent — the single ⚠️ that opens the uniform warning is the only one in the codebase.
Do not add more. Warnings otherwise use a Font Awesome icon or plain red text.

**Numbers.** Brazilian format: R$ 50,00 (comma decimal), phones as (00) 00000-0000, scores as `8/10`, progress
as a whole percentage. The recurring magic number is **70%** — the graduation-readiness threshold.

## VISUAL FOUNDATIONS

**Palette.** Deep institutional navy `#002D72` and a muted teal `#389E92` carry the brand; an electric
accent green `#00E676` is used sparingly and always means *go / confirm / achieved* (submit button, focus ring
on the public form, the logo ring, the 70% glow). Surfaces are cool grey-greens — `#EAF2F1` behind the app,
`#F4F7F6` behind the public form, `#F8FBFB` for insets — never pure white behind content, always pure white
on the cards. Ink is slate `#2C3E50`, muted text `#7F8C8D`. Status colours are flat-UI classics: `#E74C3C`
danger, `#F39C12` warning, `#00B140` success. The **cordão palette** (`#4F4F4F`, `#F5DEB3`, `#DAA520`,
`#D2691E`, `#D32F2F`, `#D3D3D3`, `#F5F5F5`) is the only warm colour in the system and appears only inside belt bars.

**Type.** Two Google families, no exceptions: **Montserrat** (600/700/800) for every heading, section bar and
the primary login button; **Nunito** (400/600/700) for everything else, set as `font-family` on `*` so it is the
true default. **Great Vibes** appears once, at 2.5rem, as the signature line on the printed ficha. Sizes run
2rem (student name in the hero) → 1.5rem → 1.4rem → 1.1rem → 1rem → 0.85rem; nothing smaller than 0.8rem.
Numbers that matter are weight 800 and teal.

**Layout.** Fixed max-widths, centred: 1600px admin, 1250px student panel, 800px public form, 400px login card.
Page gutter 30px. Content grids are `repeat(auto-fill, minmax(280–320px, 1fr))` with 15–20px gaps; the admin
adds a fixed 300px right sidebar. The top nav is `position: sticky` — the only fixed element besides the
bottom-right toast stack and the modal overlay.

**Backgrounds.** Flat colour, not imagery. Two gradients exist: `135deg` navy→teal (login page, student hero)
and `135deg` navy→black (public form header, closed by a 4px accent-green rule). No patterns, no textures,
no noise, no illustration. The login page's only decoration is two 300–400px colour circles at
`blur(60px)`, 55% opacity, drifting up 22px on a 7–9s loop.

**Photography** is documentary and warm: real students and mestres, shot in class, cropped to circles for
people and to 160px-tall rectangles for shop products. No filters, no duotone, no black-and-white.

**Corners.** Everything is round, and rounder as it gets bigger: 6px selects/small buttons, 8–10px inputs,
12px inset blocks, 15px cards, 18px product/lesson cards, 20px panels and pill buttons, 22px login card,
24px the student hero, 50% every avatar and the logo.

**Cards** are white, 1px `#E0E6E5` border, 15–20px radius, and a wide low-opacity shadow
(`0 4px 15px rgba(0,0,0,0.03)`). On hover they lift `translateY(-4px)` and the shadow deepens to
`0 10px 28px rgba(0,0,0,0.09)`. Shadows are always near-black at 2–9% opacity; the only coloured shadows are
under coloured buttons (teal/green/red at 20–30%).

**Borders.** Hairline `#E0E6E5` on cards, `#ccc` on fields, `#eee` on internal dividers. Two accent border
idioms: a 4px navy left rule on rule-boxes, and a 3px underline that appears under the active admin nav tab.

**Animation.** One easing curve — `cubic-bezier(0.16, 1, 0.3, 1)` — is used for essentially every transition.
Entrances fade and rise 8–18px over 0.35–0.45s, and lists stagger by 45ms per card (60ms for academies,
35ms for criteria pills). Modals slide up 40px; the login card rises 36px with a 0.98→1 scale. Loading uses a
1.4s shimmer sweep across grey skeletons. The cordão bar's stripes scroll forever (`2s linear infinite`) and its
width animates over 1s. Errors shake horizontally for 0.45s. Nothing bounces; nothing spins except the modal
close button, which rotates 90° on hover.

**Hover states** lift: `translateY(-1px)` for buttons, `-2px` for nav pills and the logout circle, `-4px` for
cards, `scale(1.02)` for the buy button and `scale(1.2)` for stars. Colour-wise, teal buttons go navy, red goes
darker red, and amber/green buttons keep their hue and use `filter: brightness(0.92–0.95)` instead.
**Press/disabled**: no separate press state; disabled is `opacity: 0.7` with `cursor: progress` — the app treats
disabled as "working", not "unavailable".

**Focus.** Always visible: `3px solid #389E92` outline offset 2px globally, and a soft ring on fields
(`0 0 0 3px` teal at 15% in the app, green at 18% on the public form, 4px teal at 12% on login).

**Transparency and blur** are rare and deliberate: the modal scrim (`rgba(0,0,0,0.6)` + `backdrop-filter: blur(5px)`),
the login card at 97% white, the login blobs, and a 5%-white circle bleeding off the student hero. Nothing else
is translucent — no glassmorphism, no protection gradients over photos; captions sit in solid cards instead.

## ICONOGRAPHY

**Font Awesome 6.4.0 Free (solid), loaded from cdnjs** on every page — this is the group's entire icon system.
There is no custom icon set, no SVG sprite, no PNG icons in the repo, and no icon font of their own.
Icons are inline `<i class="fas fa-…">` elements sized in `rem` with the surrounding text and coloured by
inheritance (teal or navy in headings, white in buttons, red for destructive and PDF, amber for stars).

Recurring glyphs, by role: `fa-chart-line` evolution · `fa-wallet` finance · `fa-video` / `fa-play-circle` /
`fa-play` lessons · `fa-award` graduation · `fa-map-marker-alt` academy · `fa-chalkboard-teacher` teacher ·
`fa-star` scoring · `fa-thermometer-half` readiness · `fa-user` / `fa-lock` login · `fa-camera` / `fa-video` /
`fa-sync-alt` webcam capture · `fa-save` · `fa-trash` · `fa-times` close · `fa-bars` mobile menu ·
`fa-sign-out-alt` logout · `fa-search` · `fa-file-pdf` / `fa-download` library · `fa-store` / `fa-cart-plus` shop ·
`fa-shield-alt` guardian data · `fa-exclamation-circle` errors · `fa-check-circle` submit.
Unicode is used as an icon exactly twice: the ⚠️ in the uniform warning and the `|` separator in the student hero.

**Logo.** `assets/logo-liberdade150.png` — the group's circular emblem, copied from the repo. It is the only
brand mark that exists; it is always masked to a circle, and never redrawn, recoloured or set on a busy
background. Sizes in use: 45px (app nav), 60px (admin nav), 84px (login), 130px (public form header, with a
3px accent-green ring on the dark gradient). There is no wordmark file — where a wordmark is needed the group
name is set in Montserrat 800 navy.

## Substitutions and gaps (please review)

- **Fonts are linked from Google Fonts, not bundled.** No `.ttf`/`.woff2` binaries exist in the source repo,
  so `tokens/fonts.css` `@import`s Montserrat, Nunito and Great Vibes from Google exactly as the app does.
  Send font files if the group has licensed copies and they should be self-hosted.
- **Icons are the real system** (Font Awesome 6.4.0 via cdnjs) — no substitution was needed, but note it is a
  CDN dependency, not a copied asset.
- **Photography** in the UI kits reuses the same Unsplash placeholders the source app hard-codes. Real photos
  of the group's students, mestres and products would replace them one-for-one.
- **Chart.js analytics** in the admin kit are static stand-ins; the real panel renders six live charts.

## Intentional additions

- `Inset` — the pale `#F8FBFB` block is repeated inline in four screens with no class of its own; naming it
  avoids re-typing the same four declarations.
- `Alert`, `EmptyState`, `Badge` — each exists in the source as ad-hoc markup (`.error-msg`, `.empty-state`,
  the inline score chip); they were promoted to components without changing a value.

## Index

**Root** — `styles.css` (the single entry point consumers link), `readme.md`, `SKILL.md`, `github.md`, `thumbnail.html`.

**Tokens** (`tokens/`) — `fonts.css`, `colors.css`, `typography.css`, `spacing.css`, `radius.css`, `elevation.css`, `motion.css`.
**Patterns** (`patterns/`) — `base.css` (element defaults), `components.css` (the `.le-*` classes the React components render).
**Guidelines** (`guidelines/`) — 15 specimen cards for colour, type, spacing, radii, elevation, motion, logo and iconography.
**Assets** (`assets/`) — `logo-liberdade150.png`.

**Components**
- `components/core/` — Button, IconButton, Input, Select, Card, Inset, SectionHeader, Badge
- `components/navigation/` — TopNav, NavItem, StepIndicator
- `components/feedback/` — Toast, Modal, SkeletonCard, EmptyState, Alert
- `components/capoeira/` — CordaoBar, CriterionPill, StarRating, StudentCard, AcademyCard, ProductCard, LessonCard, RuleBox, ChartBox, ProfileBanner, TeacherBox (plus `cordoes.js`, the belt sequences and criteria list)

**UI kits**
- `ui_kits/inscricao/` — public four-step enrollment form
- `ui_kits/portal-aluno/` — login → student panel (evolution, finance/shop, lessons)
- `ui_kits/painel-admin/` — master student list, record modal, academy management, analytics
