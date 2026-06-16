# Inspection-Trac Public Site

The public Inspection-Trac landing page is assembled from these seams:

- `src/components/public-landing.tsx`: hero, overview copy, and primary calls to action.
- `src/components/PublicShowcaseSections.tsx`: mobile and portal screenshot carousel sections.
- `src/lib/publicShowcase.ts`: ordered screenshot lists used by the carousel.
- `src/app/contact-us/page.tsx`: public contact page and support addresses.

Carousel behavior:

- Mobile app screenshots snap in three-wide groups.
- Portal screenshots snap one per slide so the lower review screenshots stay readable.
- Arrow keys and pointer dragging move to the nearest slide snap point.
- All mobile screenshots keep the phone border. Only the first screenshot in each three-wide group shows the dynamic island.

Before publishing, build and validate the static export:

```bash
npm run build
npm run export:validate
```

Publish the generated `out/` directory to the `gh-pages` branch after committing the source changes.
