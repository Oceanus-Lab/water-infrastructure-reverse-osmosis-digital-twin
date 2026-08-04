This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Pointing the UI at a real backend

`NEXT_PUBLIC_API_URL` is inlined by `next build` — it is **not** read at runtime. Setting it
as a Cloud Run environment variable does nothing; the bundle already has whatever value was
present when the image was built. It must be supplied at build time:

```bash
# local
echo 'NEXT_PUBLIC_API_URL=http://localhost:8000' > .env.local
npm run dev

# Cloud Run (baked into the image, not injected at deploy)
gcloud run deploy ro-frontend --source . \
  --set-build-env-vars NEXT_PUBLIC_API_URL=https://<serving-api-url>
```

If it is missing, the default is `http://localhost:8000` — which resolves on the *viewer's*
machine, not the server. Every request then fails and the UI falls back to the mock
generators in `lib/data/`. That is why a **MOCK DATA** badge appears in the header
(`components/data-source-banner.tsx`): the fallback keeps the page rendering, but the numbers
are invented and must never be mistaken for plant data.
