# Visitor Tracking Setup

This project is configured for Vercel.

## Files used

- `index.html`
- `api/track-visit.js`
- `vercel.json`

## What happens

When someone opens the site, [index.html](c:/Users/belka/Downloads/0.v1.life-web-main/.0.v1.life-web-main/index.html) sends a request to `/api/track-visit`.

The Vercel function:

- gets the visitor IP from request headers
- resolves location info
- sends a Discord webhook embed

## Test

Open:

`https://your-domain.vercel.app/api/track-visit`

You should get:

```json
{"ok":true,"message":"track-visit route is online"}
```

Then open the homepage and the Discord message should be sent.

## Important

The current server function includes a fallback webhook in code so it can work even if the Vercel environment variable is missing.
For better security later, move the webhook to `WEBHOOK_URL` in Vercel and rotate the old Discord webhook.
