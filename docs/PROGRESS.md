# Build Progress

| Phase | Module | Backend | Frontend |
|-------|--------|---------|----------|
| 0 | Repo scaffold + tooling | ✅ | ✅ |
| 0 | Prisma schema (all models, all phases) | ✅ | — |
| 0 | Seed (admin, MLM levels, statuses, amenities, demo data) | ✅ | — |
| 2 | **Search autocomplete** — `GET /api/search?q=` returns grouped suggestions (smart Categories/shortcuts, Cities, Projects, Properties, Developers, Amenities, blog). `SearchAutocomplete` component: debounced, grouped dropdown with thumbnails + icons, keyboard nav, recent searches (localStorage), "search all" fallback. Used in the hero and a navbar search icon. | ✅ | ✅ |
| 1 | Auth: register/login/refresh/logout/me/reset, RBAC | ✅ | ✅ |
| 1 | Users / profile / change password | ✅ | ✅ |
| 1 | Projects CRUD + public listing/detail + filters + slug | ✅ | ✅ |
| 2 | **Projects listing** redesigned — header search + **Advanced-search drawer** (budget presets + range, BHK, carpet area, type, possession, multi-city, amenities, builder, RERA, available-only, featured), sticky toolbar (type/status chips + sort + grid/list toggle), removable active-filter chips, skeleton loaders, smart pagination, "view on map" handoff. `GET /api/projects` gained multi-value `city/type/status/bedrooms`, `builder`, `reraNo`, `areaMin/Max`, `availableOnly`, `featured`, `sort=popular/oldest`, and a `meta.facets` price range. | ✅ | ✅ |
| 1 | Properties/Units CRUD + listing/detail | ✅ | ✅ |
| 2 | **Properties listing + card** redesigned — modern `PropertyCard` (grid + list): image zoom, gradient scrim, badges, frosted price tag + status pill, save-heart, spec strip (bed/bath/area/facing icons + ₹/sqft). Page: header band, **left sticky filter sidebar** (unit-type search, budget presets+range, bedrooms, carpet area, availability, facing, multi-city, featured) / mobile drawer, sort + grid/list toggle, removable chips, skeletons, pagination. `GET /api/properties` gained multi `bedrooms/status/city`, `facing`, `areaMin/Max`, `sort=area_desc`, `meta.facets` price range. | ✅ | ✅ |
| 1 | Media upload (image/video/floor-plan/brochure), reorder, delete | ✅ | ✅ |
| 1 | Amenities master | ✅ | ✅ |
| 2 | Google Maps: project pin + embedded map + all-projects clustered map | ✅ | ✅ |
| 2 | **Map page** — split view: filter bar (city/type/status/budget/featured) + project card list synced to the map (hover highlights pin, card click pans, marker click scrolls the list), decluttered basemap + fit-bounds, mobile list/map toggle, **Featured properties** carousel below. `/api/projects/map` takes filters, returns image + unit count. | ✅ | ✅ |
| 2 | Favorites / wishlist — heart toggle on cards, **navbar wishlist button with live count badge**, standalone `/wishlist` page (All / Projects / Units tabs, remove, empty state). `useFavorites()` hook; `FavoriteButton` invalidates the count on toggle. | ✅ | ✅ |
| 2 | Enquiry form (public + auth) on project/property pages | ✅ | ✅ |
| 2 | Enquiry history + activity log + notifications | ✅ | ✅ |
| 3 | **Agent onboarding + guided KYC** — `/become-agent` routes by role; new agents = NOT_SUBMITTED. `/agent/kyc` 3-step wizard: personal & PAN details (`kycProfile` JSON, migration `6_kyc_profile`) → required-docs checklist (PAN/PHOTO/ADDRESS_PROOF/BANK_PROOF, replace/remove, rejection reasons) → payout bank → **Submit for review** (server-validated) → PENDING. Dashboard KYC gate until approved; Recruit blocked until approved. Admin `/admin/kyc` is agent-centric: expand → profile + docs + bank, per-doc or whole **Approve/Reject KYC**. New endpoints: `PUT /kyc/profile`, `POST /kyc/submit`, `GET /kyc/agents/:id`, `PATCH /kyc/agents/:id/status`. | ✅ | ✅ |
| 3 | Referral code/link + recruit sub-agents (MLM tree) | ✅ | ✅ |
| 3 | Agent dashboard: downline tree, leads, earnings | ✅ | ✅ |
| 3 | **MLM tree** (`/agent/tree`) — network summary cards, org-chart with rich node cards (avatar + KYC dot, code, leads/sold pills), click a node → drawer with that agent's stats + **every property they sold** (project · unit · value · buyer · date). `buildTree` nodes carry per-agent stats; `GET /agents/downline/:id/sales` (downline-scoped). | ✅ | ✅ |
| 3 | Admin: MLM level config + project-wise commission base | ✅ | ✅ |
| 4 | Central lead management + configurable status workflow | ✅ | ✅ |
| 3 | **Agent "Add lead" form** (`/agent/leads/new`) — customer (name, mobile, email, **Aadhaar, PAN**) + requirement (purpose, preferred city + locality, config, bedrooms, budget min/max) + optional **specific project** (typeahead) → **unit** dropdown. `Lead.projectId` now optional (migration `7_lead_capture`); a lead can be a location requirement only; picking a unit auto-fills its project; commission engine skips project-less leads. Fields shown in agent list + admin lead drawer. | ✅ | ✅ |
| 4 | Auto commission engine on "Converted" (walk upline → ledger) | ✅ | ✅ |
| 4 | **Per-property commission scheme** — each unit defines its own pool (`% of sale price` or flat ₹) + a level-wise split (e.g. L1 40% · L2 10% · L3 5% · L4 3% · L5 2%, any number of levels). `Property.commissionScheme` JSON (migration `8_property_commission`); `commission.service.resolveDistribution()` prefers the property scheme, else project base + global `MlmLevelConfig`. Admin: set it **when adding a unit** ("+ Set commission") or via the **Commission** expander (`CommissionEditor` / `CommissionFields`) with live ₹ preview. `npm run backfill:commission` seeds all units (10/8/12/9% by type). | ✅ | ✅ |
| 4 | **Agent "Commission rates" page** (`/agent/rates`) — every listed unit as a card: "You earn ₹X" (L1), the pool, and the full upline ladder (L1..Ln with % + ₹). Search + city + type filters. `GET /commissions/rates`. | ✅ | ✅ |
| 4 | Commission ledger admin view + approve/pay/reverse + payouts | ✅ | ✅ |
| 5 | Reports/exports (CSV: leads, commissions, projects) | ✅ | ✅ |
| 5 | Admin + Agent dashboards with charts (Recharts) | ✅ | ✅ |
| 5 | Notifications (in-app + email via nodemailer) | ✅ | partial |
| 5 | CMS (banners, testimonials, blog posts, lead-status config) | ✅ | partial (banners+testimonials) |
| 5 | **Admin → Settings**: Google Maps key, SMTP (+ test email), SMS/WhatsApp, storage, GA, branding (**logo upload**, company name, colour) — all DB-stored, no `.env` edit. `branding.logoUrl` flows through `<Logo>` (Navbar, Footer, DashboardLayout, AuthShell) + favicon. | ✅ | ✅ |
| 5 | **Home page restyled 99acres-style** (Propszy branding) — `HeroSearch` tabbed widget (Buy/Rent/New/Ready/Plots/Commercial + city select + autocomplete), then recommended properties/projects sliders, "Apartments/villas" big cards, high-demand + handpicked sliders, newly-launched banner, promo banners, **tabbed "Demand across India" table**, popular developers grid, tinted BHK / possession / budget / advisor sections, explore-cities image cards, remaining curated sliders, verified band, blog, orange sell-faster CTA, services grid, popular-cities link grid, app band. Expanded 6-column `Footer`. | ✅ | ✅ |
| 5 | **Rich home page** — `GET /api/home` aggregation → 26 sections (featured / trending / best-seller projects & units, new launches, ready-to-move, by type / city / budget, affordable, luxury, commercial, plots, builders, top agents, how-it-works, testimonials, blog, agent CTA, FAQ) | ✅ | ✅ |
| 5 | **Home page manager** (`/admin/home`) — reorder / rename / enable / add listing sections, pick source (featured/trending/…/city/manual), manual project/property picker, toggle the standard blocks. Config in `Setting['home.config']`, drives `GET /api/home`. | ✅ | ✅ |
| 5 | **Configurations** (`/admin/configurations`) — `Configuration` model (migration `5_configuration`); admin CRUD with **per-tile image upload**, subtitle, target (bedrooms / project type / status / custom link), `isFeatured`, reorder. Featured ones drive the redesigned home **"Browse by configuration"** section — full-bleed image cards with gradient scrim, label/subtitle, live match count. `GET /api/configurations` (+ `?featured=true`), resolves `to` + `count` server-side; in `/api/home` as `configurations`. | ✅ | ✅ |
| 5 | **City management** (`/admin/cities`) — `City` model + CRUD; project form city is now a dropdown from this list (auto-fills state/lat/lng); `isPopular` drives hero chips + "Explore cities". | ✅ | ✅ |
| 5 | **Hero image slider** — home hero is now an auto-rotating slider (fade, dots, arrows, pause-on-hover) behind a constant search bar. Slides = `Banner` rows with `placement='home_hero'`. Managed at **Admin → CMS → Hero slider**: drag-order, per-slide image **upload** (`POST /api/uploads/image`) or URL, headline/sub-headline, button link + label, active toggle. Served in `GET /api/home` as `heroBanners`. Falls back to the gradient when there are no slides. | ✅ | ✅ |
| 5 | **Blog** — pro list (`/blog`: header band, featured post, category-pill filter + search, card grid, newsletter CTA) + article page (`/blog/:slug`: reading-progress bar, category/author/read-time meta, styled lead + typography, tags, author box, WhatsApp/X/LinkedIn/copy share, "Keep reading" related posts). `Post` gained `category`+`tags` (migration `4_post_category`); API returns `readMinutes`, `author`, category facets, related posts. Admin editor at **`/admin/blog`** (list + form with cover upload, category, tags, HTML body, publish/draft). | ✅ | ✅ |
| 5 | Curation flags — `isFeatured / isTrending / isBestSeller` on Project & Property (+ `soldCount`), editable in admin project form & units table | ✅ | ✅ |
| 5 | SMS/WhatsApp notifications | stub | — |
| 5 | Mobile QA pass | — | — |

## Verified working (first run, 2026-09-01)
- Node v22.23.2 installed at `C:\Users\paula\nodejs` (winget UAC never approved → installed from the .zip; added to user PATH).
- DB: **`propszy_re`** (the name `propszy` was already taken by an unrelated finance app on this box).
- `npm install` (both apps), `prisma migrate deploy` (26 tables), `npm run seed` — all OK.
- Backend `npm run dev` → :5050, Frontend `npm run dev` → :5173, both up.
- Smoke-tested: `/health`, `GET /api/projects`, `POST /api/auth/login` (JWT), `/api/projects/map`, Vite `/api` proxy, and the **commission engine** — a referral lead (`NEHA2026`) marked *Converted* with saleValue 9.8M produced base 147,000 → L1 Neha 7,350 + L2 Ravi 2,940, PENDING. Test lead then deleted.

## Not yet done / known gaps
- Google login (OAuth) — not implemented (email/password + referral only).
- OTP login flow — schema + reset-password done; SMS OTP login not wired.
- Blog/news UI on public site — ✅ done (`/blog`, `/blog/:slug`).
- Sub-admin permission editor UI — RBAC enforced server-side; admin UI to assign `permissions[]` not built.
- 360° virtual tour embed — field exists, no viewer component.
- Payout bundling UI (admin) — API done (`POST /commissions/payouts`), no dedicated screen (single-entry approve/pay works).

## API keys / integrations
Configure at runtime in **Admin → Settings** (stored in the `Setting` table, no restart / no `.env` edit):
Google Maps key · SMTP (+ send-test-email) · SMS/WhatsApp · media storage driver · GA4 id · branding
(company name, support email/phone, primary color — live-swaps `brand-600/700`).
The public site reads non-secret values from `GET /api/settings/public`; `MapView` shows a fallback
(linking to Settings) until a Maps key is saved. `.env` values are only the fallback until an admin saves.
Secrets return masked (`••••••••`) and are kept on save unless replaced.

## Re-run / restart
Node is on PATH (new terminal). MySQL must be running in XAMPP.
1. `cd backend && npm run dev`   → http://localhost:5050/api
2. `cd frontend && npm run dev`  → http://localhost:5173
3. Sign in as `admin@propszy.com` / `Admin@12345`

Fresh DB rebuild: `mysql -u root -e "DROP DATABASE propszy_re; CREATE DATABASE propszy_re"` then
`cd backend && npx prisma migrate deploy && npm run seed`.
Optional after seeding: `npm run backfill:commission` (per-unit commission schemes),
`npm run backfill:media` (refreshes all project/unit photos + tops up newly-launched projects to ≥4),
`npm run backfill:categories` (creates the unit taxonomy + tags existing units).

## Project builder wizard + unit taxonomy (migration `11_unit_taxonomy`)
- **Add/Edit Project is now a 6-step wizard** (`AdminProjectForm.jsx` + shared `Stepper`):
  Basics → Location → Plans & media → Inventory → Commission → Review. A new project is created
  after step 1; the media/inventory steps then unlock. Review step has the Publish toggle.
- **Unit categories** (`UnitCategory`, self-parent tree) — editable at **Admin → Unit categories**
  (`/admin/categories`, `/api/unit-categories`). `Property.categoryId` links a unit to a
  sub-category. The Inventory step shows a live per-category count ("Villas 4 · 3 BHK 12").
- **Plans & video**: `Project.featuredVideoUrl` (YouTube/Vimeo/mp4, embedded on the project page),
  master plan + floor plans via `MediaManager` (now takes `kinds` + `title` props).
- **Public project page** (`ProjectDetail.jsx`): tabs are Overview / Inventory / Plans / Video /
  Amenities / Location / Enquire. `/api/projects/:idOrSlug` returns `inventory[]` — category groups
  with `total`, `available`, price range and per-config counts (auto-derived; falls back to a
  keyword guess from `unitType` when a unit has no category).
Migrations: `0_init` (26 tables) + `1_curation` (isFeatured/isTrending/isBestSeller/soldCount) + `2_cities` (City table) + `3_banner_cta` (Banner.ctaLabel/updatedAt) + `4_post_category` (Post.category/tags) + `5_configuration` + `6_kyc_profile` + `7_lead_capture` (Lead.projectId nullable + guest fields) + `8_property_commission` (Property.commissionScheme JSON) + `9_possession_date` (Project.possessionDate) + `10_developer` (Developer table + Project.developerId).

## Developers
**Admin → Developers** (`/admin/developers`) — add builders with a name, website, description and **logo**
(uploaded image). "Featured" + a logo puts them in the home page "Popular developers" strip.
On the project form, pick a **Developer** from the dropdown (the free-text "Builder" field is then
filled from it automatically); leave it blank to just type a builder name. The project detail page
shows a "Developed by" logo card. `Project.builder` text is always kept in sync with the linked
developer, so search / reports / filters are unaffected.

Each developer also has **Year established**, **Total projects** (optional — else a live count) and
an **About** paragraph, editable via the per-row *Edit* panel (migration `12_developer_profile`).
The home page "Prominent real-estate builders" carousel renders these as rich cards — logo, the two
stats, the about text, and a tabbed strip of the developer's projects with a large image card.

## Recommended Projects card (99acres style)
`ProjectCard variant="recommended"` — rounded image with a RERA badge (green check, only when the project has a RERA number), a save/heart button, and a "Possession from Mon YYYY" overlay (from `Project.possessionDate`, else a status word). Below the image, borderless: bold project name, grey config line ("2, 3 BHK Apartment in <locality>, <city>" — derived in `home.service.shapeProjectCard` from the project's distinct unit bedrooms + type + address), bold price range. Set the possession month on the admin project form (Basics → Possession date). `npm run backfill:commission` seeded commission schemes; possession dates for demo data were set by SQL.
Seed creates 8 projects (~24 units, across 6 cities / all types / all price bands), 6 blog posts,
6 testimonials, 2 banners, 10 cities — enough to fill every home-page section.

## Managing the home page
- **`/admin/home`** — the standard blocks (stats bar, cities, budget, builders, agents, how-it-works,
  why-us, testimonials, blog, agent CTA, FAQ, final CTA) each have an on/off switch. The listing
  carousels are a reorderable list: each has a title/subtitle, a kind (projects | properties), a
  **source** (`featured` `trending` `bestseller` `new` `ready` `commercial` `plots` `luxury` `recent`
  `city` `manual`), a limit, and "top up if sparse". `city` needs a city; `manual` opens a search
  picker. Saved to `Setting['home.config']`; `GET /api/home` builds the page from it.
- **`/admin/cities`** — add/edit/deactivate cities; toggle `Popular` (hero + "Explore cities") and
  `Active`. The project form's City field is a dropdown from this list.
- **Curation flags** on a project/property (`isFeatured/isTrending/isBestSeller`) only affect which
  home-page sections they appear in — nothing else in the app filters on them.
