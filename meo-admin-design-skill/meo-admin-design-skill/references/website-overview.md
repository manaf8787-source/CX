# Website overview

Reference: https://meo.framer.ai/ ("Meo - The multi-profile browser for Mac"), a Framer template by a third-party creator. Inspected 2026-11-18 in desktop Chrome at a 1912px viewport, plus 1000px and 390px frames for tablet and phone.

## What it is

A single-page product marketing site for a fictional macOS multi-profile browser, with two supporting pages. It is monochrome, soft, and tactile: almost every element is either a white card or a pill, lit from above.

## Routes found

| Route | Purpose | Notes |
|---|---|---|
| `/` | Landing page | Hero, logo rail, use cases, why (bento), features (tabs), reviews, pricing, FAQ, footer. Anchors: `#use-cases`, `#why`, `#features`, `#pricing`, `#faq` |
| `/style-guide` | Living style guide | Colours (named), text styles, three button variants, component samples |
| `/terms` | Long-form legal document | Sticky numbered side nav + document card. The best model for an admin side nav |

No other internal routes are linked. External links: the creator's social profiles and framer.com.

## Global chrome

- **Fixed nav** (z-index 10), 78px tall on desktop: logo left, floating pill of links centred, primary "Download" button right. The nav bar is capped at 1440px with 22px page margin.
- **Preloader** overlay on first paint.
- **Floating chat pill** bottom-right and **cookie banner** card bottom-left (both fixed, z-index 9).
- **Footer**: a dark brand card beside a white link card, above a giant faded wordmark.

## Build facts (measured)

- Framer site; components compiled to React with Framer Motion. Stylesheet exposes colour styles as CSS variables.
- Font: Plus Jakarta Sans (weights 400, 500, 600 loaded; 700 declared for bold only). Inter is loaded by Framer's runtime but not used in the design.
- Breakpoints: phone `<= 809px`, tablet `810-1199px`, desktop `>= 1200px`.
- No CSS `border` is used on any visible element. Edges are box-shadow rings.
- No CSS keyframe animations; all motion is Framer Motion (springs and tweens).

## How it was inspected

1. Read the rendered text and link graph of every route.
2. Read CSS variables, text-style presets (per breakpoint), and `@font-face` rules from the live stylesheets.
3. Surveyed computed styles of every visible element: radii, shadows, fills, gradients, backdrop filters, text colours, opacities, gaps and paddings, with usage counts.
4. Walked every named layer to record size, padding, gap, radius, fill and shadow.
5. Extracted every inline SVG (viewBox, stroke attributes, rendered size, stroke-width variable).
6. Read the compiled component scripts for transition objects, entrance states, loop definitions and hover variants.
7. Hovered and clicked live: nav links, the dropdown, dropdown rows, the phone menu.
8. Rendered the page at 1000px and 390px to record layout changes.
9. Captured screenshots (see `../assets/screenshots/`).

Limits of the inspection are listed in `../AUDIT-REPORT.md`.
