# Zero-Cost Static Edge Deployment Guide

This guide details the deployment architecture and step-by-step instructions for hosting `wakabyte` across global edge content delivery networks (CDNs) with **zero recurring infrastructure costs ($0.00/mo)**.

---

## 🌐 Architecture & Portability

`wakabyte` is built as a deterministic, pure client-side TypeScript application compiled into static HTML5, JavaScript, and CSS via Vite. It has **zero runtime dependencies** and **zero backend server requirements**.

### Key Portability Features
- **Relative Asset Resolution (`base: './'`):** Configured in `vite.config.ts` so the exact same build artifact (`dist/`) can be served from root domains (`https://example.com/`) or nested subpaths (e.g., GitHub Pages `https://<username>.github.io/<repo>/`) without rebuilds or environment variable changes.
- **Immutable Edge Caching:** JavaScript and CSS bundles include content hashes (e.g., `assets/index-*.js`), allowing edge networks to cache them with `Cache-Control: public, max-age=31536000, immutable`.
- **Automatic Gated CD:** GitHub Actions runs linting, type checks, and unit tests before every deployment, preventing broken builds from reaching production.

---

## 🚀 Deployment Platforms

### 1. GitHub Pages (Automated via GitHub Actions)

Deployment to GitHub Pages is fully automated through `.github/workflows/ci.yml`.

#### Step-by-Step Setup:
1. Navigate to your repository on GitHub.
2. Go to **Settings** &rarr; **Pages**.
3. Under **Build and deployment** &rarr; **Source**, select **GitHub Actions**.
4. Push a commit to the `main` branch.
5. The `CI/CD` workflow will automatically run:
   - `npm ci`
   - `npm run lint` (Biome + ESLint with SonarJS)
   - `npm run typecheck`
   - `npm run test:run` (312 unit tests)
   - `npm run build`
   - Deploy `dist/` to GitHub Pages.

#### Custom Domain on GitHub Pages:
1. In **Settings** &rarr; **Pages** &rarr; **Custom domain**, enter your domain (e.g., `wakabyte.example.com` or `example.com`).
2. Add the corresponding DNS record with your DNS provider (see [DNS Configuration](#-dns--custom-domain-configuration)).
3. Check **Enforce HTTPS** once the SSL/TLS certificate is provisioned.

---

### 2. Cloudflare Pages

Cloudflare Pages provides global edge distribution across 300+ cities with fast Anycast routing.

#### Option A: Cloudflare Git Integration (Recommended)
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages** &rarr; **Create application** &rarr; **Pages** &rarr; **Connect to Git**.
2. Select the `wakabyte` repository.
3. Configure the build settings:
   - **Framework preset:** `Vite` (or `None`)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
   - **Node.js version:** Set environment variable `NODE_VERSION = 22`
4. Click **Save and Deploy**.

#### Option B: Direct CLI Deployment (Wrangler)
To deploy directly from your local terminal or custom CI:
```bash
# Build the production bundle
npm run build

# Deploy to Cloudflare Pages via Wrangler
npx wrangler pages deploy dist --project-name=wakabyte
```

#### Custom Domain on Cloudflare Pages:
1. In the Cloudflare Pages project dashboard, go to **Custom domains** &rarr; **Set up a domain**.
2. Enter your custom domain (e.g. `wakabyte.annabobola.pl`).
3. If using Cloudflare DNS, the CNAME record is configured automatically with automatic SSL renewal and HTTP/3 support.

---

### 3. Vercel

Vercel provides zero-configuration edge hosting and includes custom header support via `vercel.json`.

#### Option A: Vercel Git Integration
1. Import the `wakabyte` repository on the [Vercel Dashboard](https://vercel.com/new).
2. Framework Preset will auto-detect **Vite**.
3. Confirm build command (`npm run build`) and output directory (`dist`).
4. Click **Deploy**.

#### Option B: Direct CLI Deployment
```bash
# Install Vercel CLI (or run with npx)
npx vercel --prod
```

#### Edge Caching Configuration (`vercel.json`):
The repository includes `vercel.json` to enforce immutable asset caching:
```json
{
  "cleanUrls": true,
  "trailingSlash": false,
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 🛠️ DNS & Custom Domain Configuration

To map a custom apex domain or subdomain to your static deployment, configure the following DNS records with your registrar/DNS provider:

| Target Platform | Record Type | Host / Name | Target / Value | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **GitHub Pages** (Subdomain) | `CNAME` | `wakabyte` | `<username>.github.io.` | For `wakabyte.yourdomain.com` |
| **GitHub Pages** (Apex) | `A` | `@` | `185.199.108.153`<br/>`185.199.109.153`<br/>`185.199.110.153`<br/>`185.199.111.153` | For `yourdomain.com` |
| **Cloudflare Pages** | `CNAME` | `wakabyte` | `<project-name>.pages.dev.` | Automatic SSL & edge proxy |
| **Vercel** (Subdomain) | `CNAME` | `wakabyte` | `cname.vercel-dns.com.` | For `wakabyte.yourdomain.com` |
| **Vercel** (Apex) | `A` | `@` | `76.76.21.21` | For `yourdomain.com` |

---

## 🔍 Local Production Verification

Before triggering production deployments, you can verify the optimized production build locally:

```bash
# 1. Run all static quality gates and unit tests
npm run lint
npm run typecheck
npm run test:run

# 2. Build the production distribution
npm run build

# 3. Preview the production build locally
npm run preview
```

The preview server will start at `http://localhost:4173/` where you can verify:
- Canvas rendering and responsive CRT scaling.
- Web Audio sound synthesizer initialization and mute toggle.
- Ghost AI scatter/chase timing and deterministic pathfinding.
