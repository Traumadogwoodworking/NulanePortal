# Definian Signal Demo Embed

## Demo Page

Demo route:

```text
/definian-signal
```

Current Vercel production demo URL:

```text
https://vercel-portal-exact-jv6q6l28q-traumadogwoodworkings-projects.vercel.app/definian-signal
```

## Iframe Embed

```html
<iframe
  src="https://vercel-portal-exact-jv6q6l28q-traumadogwoodworkings-projects.vercel.app/definian-signal"
  title="Definian Signal Demo Portal"
  width="100%"
  height="900"
  style="border:0; width:100%; min-height:900px;"
  loading="lazy"
></iframe>
```

## Domain And Frame Policy Notes

- The demo route is a static, public page and does not require portal sign-in.
- The page uses static demo data only. It does not expose customer data, private emails, credentials, or production-only endpoint calls.
- No repository-level `X-Frame-Options` or `frame-ancestors` restriction is configured for this route.
- If Definian provides a final production embed domain, add a route-specific `Content-Security-Policy` `frame-ancestors` rule for that domain before final handoff.
