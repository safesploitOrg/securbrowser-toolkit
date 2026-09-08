# Hosting

Serve only the `public/` directory as the web root.

## Local development

```bash
npm install
npm run dev
```

Then open `http://127.0.0.1:8080`.

ES modules are used, so opening `public/index.html` directly through `file://` is not a supported execution mode.

## GitHub Pages

The repository contains a Pages workflow that uploads `public/` as the deployment artifact after the `CI` workflow succeeds on `main`.

Configure the repository Pages source to use GitHub Actions.

## Nginx example

```nginx
server {
    listen 443 ssl http2;
    server_name encrypt.example.org;

    root /srv/securbrowser-toolkit/public;
    index index.html;

    add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'" always;
    add_header Cross-Origin-Opener-Policy "same-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=(), payment=(), usb=()" always;
    add_header Referrer-Policy "no-referrer" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    location / {
        try_files $uri $uri/ =404;
    }
}
```

Use normal TLS hardening appropriate to the hosting environment. The in-document CSP is a defence-in-depth fallback; a response header is preferred because it can also enforce `frame-ancestors`.
