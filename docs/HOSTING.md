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

CI builds and hashes the exact public artifact once. Browser and native interoperability jobs validate it, then the reusable Pages workflow can promote it only when all mandatory quality and security jobs pass and an owner-reviewed manual main release is requested. Configure the production environment protection and release record as described in `operations.md`.

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

    # Use the normal nginx MIME table (including application/wasm for wasm).
    include /etc/nginx/mime.types;

    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; style-src 'self'; img-src 'self' data:; connect-src 'self'; worker-src 'self'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" always;
}
```

## Offline/self-hosted deployment

Run `npm run build:public` once from a machine with network access, then copy the resulting `public/` directory to the target static server. No npm packages, CDN resources or application API services are required at runtime.
