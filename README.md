# 🛡️ HeaderWatch

**Live Web Security Header Analyzer**

A lightweight, professional-grade AppSec tool that dynamically fetches and evaluates HTTP security headers on real websites. Built to demonstrate deep understanding of web security, CORS workarounds via serverless, and clean frontend engineering.

## 🚀 Features

- **Live Dynamic Scanning**: Inputs any URL and fetches *real* HTTP response headers.
- **Detailed Header Analysis**: Evaluates CSP, HSTS, X-Frame-Options, Permissions-Policy, X-Content-Type-Options, and Referrer-Policy.
- **Risk Assessment**: Detects weak configurations like `unsafe-inline` or wildcards in CSP.
- **Scoring Engine**: Calculates an objective grade (A-F) based strictly on security posture.
- **Remediation Guidance**: Provides explicit instructions and configuration snippets to fix vulnerabilities.
- **Modern UI**: Uses custom CSS and polished glassmorphism to look like a real SaaS AppSec dashboard.

## 🛠️ Technologies Used

- **Frontend:** HTML5, Modern CSS (Vanilla, Flexbox/Grid CSS variables), JavaScript (ES6+).
- **Backend/API:** Cloudflare Workers (Edge Functions) / Express Proxy for local dev.
- **Architecture Features:** Zero-build frontend (no React, no bundlers) directly deployable to GitHub Pages.

## 🏗️ Architecture Explanation

### The CORS Problem
If a browser directly uses `fetch("https://google.com")` from a random domain to inspect headers, the browser's Same-Origin Policy will block the request because `google.com` does not explicitly set `Access-Control-Allow-Origin` allowing your frontend.

### The Serverless Solution
To solve this frontend limitation without maintaining a conventional backend, we leverage a **Cloudflare Worker** (`worker.js`).
1. The frontend hits `https://your-worker.dev/scan?url=target.com`.
2. The Cloudflare worker makes a secure backend HTTPS request to `target.com`.
3. The worker parses the headers, strips the target's restrictive CORS headers, and returns the raw headers as clean JSON injected with `Access-Control-Allow-Origin: *`.

## ⚙️ Installation & Deployment

### 1. Frontend (GitHub Pages)
Since the frontend is pure HTML/CSS/JS, deployment takes seconds:
1. Fork or clone this repository.
2. In `app.js`, edit `API_ENDPOINT` to point to your deployed Cloudflare worker URL.
3. Enable GitHub Pages to serve from the `main` branch.

### 2. Backend (Cloudflare Workers)
1. Sign up for a free [Cloudflare Workers](https://workers.cloudflare.com/) account.
2. Create a new service (e.g., `headerwatch-proxy`).
3. Copy the contents of `worker.js` into the Quick Edit interface or deploy using `Wrangler`.
4. Deploy the worker and copy your new `workers.dev` URL.

### Running Locally
To test out of the box locally, an Express server is included mimicking Cloudflare:
```bash
npm install express
npm start
```
Go to `http://localhost:3000`

## 📚 Security Headers Explained
- **Content-Security-Policy (CSP):** Mitigates XSS by dictating exactly which dynamic resources are allowed to load.
- **Strict-Transport-Security (HSTS):** Forcibly upgrades insecure HTTP requests to HTTPS on the client side.
- **X-Frame-Options:** Prevents "Clickjacking" by stopping other domains from inserting your site into an `<iframe>`.
- **X-Content-Type-Options:** Prevents MIME-sniffing, stopping browsers from executing an image file disguised as JavaScript.
- **Referrer-Policy:** Prevents sensitive tokens in your URL from leaking via referer headers to third-party domains.
- **Permissions-Policy:** Locks down browser features like the camera, microphone, and geolocation.

## ⚠️ Disclaimer
**Educational Use Only.** This tool does not perform vulnerability testing, payload injection, or brute forcing. It performs standard safe HTTP `GET` requests strictly to evaluate public HTTP headers.
