# Hosting

## Build the complete public directory

The source tree intentionally does not commit generated sevenzip-wasm WebAssembly assets. Before publishing, run:

```bash
npm run build:public
```

This verifies and populates:

```text
public/vendor/sevenzip-wasm/
├── sevenzip-wasm.js
├── sevenzip-wasm.wasm
├── LICENSE-sevenzip-wasm.txt
└── manifest.json
```

Publish **only `public/`**.

After this build step, the deployed `public/` directory is self-contained: the application does not contact GitHub, npm or a CDN at runtime.

## GitHub Pages

`.github/workflows/deploy-pages.yml`:

1. checks out the exact revision that passed CI;
2. uses the exact Node.js 26.8.1 Current runtime;
3. runs `npm run build:public` to prepare/verify the pinned sevenzip-wasm runtime;
4. uploads `public/` as the Pages artifact;
5. deploys it using GitHub's Pages OIDC flow.

The workflow is guarded so a successful pull-request workflow cannot trigger production deployment.

## MIME types

The hosting server must serve:

```text
.wasm  application/wasm
.js    text/javascript (or application/javascript)
.css   text/css
```

Serving WASM with the correct MIME type enables efficient WebAssembly loading where supported.

## Recommended HTTP headers

Example policy:

```text
Content-Security-Policy: default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
Permissions-Policy: camera=(), microphone=(), geolocation=()
Cross-Origin-Opener-Policy: same-origin
```

`connect-src 'self'` permits the locally hosted Emscripten loader to fetch `sevenzip-wasm.wasm`; `worker-src 'self'` permits the local archive worker. `'wasm-unsafe-eval'` enables WebAssembly compilation without enabling general JavaScript `'unsafe-eval'`.

A `Content-Security-Policy` meta tag is also present in `public/index.html`, but an HTTP response header is preferable. `frame-ancestors` must be supplied as an HTTP header rather than through a meta policy.

## Nginx example

```nginx
server {
    listen 443 ssl;
    server_name example.org;

    root /srv/securbrowser/public;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    types {
        application/wasm wasm;
    }

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" always;
}
```

## Offline/self-hosted deployment

Run `npm run build:public` once from a machine with network access, then copy the resulting `public/` directory to the target static server. No npm packages, CDN resources or application API services are required at runtime.
