# Contributing

Thank you for helping improve SecurBrowser Toolkit.

## Development setup

```bash
git clone https://github.com/safesploitOrg/securbrowser-toolkit.git
cd securbrowser-toolkit
npm install
npm run dev
```

## Before opening a pull request

Run:

```bash
npm run deps:production
npm run style:check
npm run lint
npm run validate:html
npm run test:unit
npx playwright install chromium firefox webkit
npm run test:e2e
```

## Project rules

- Keep the deployed application under `public/`.
- Do not introduce production npm dependencies without a strong technical and security justification.
- Prefer browser-native APIs and small auditable modules.
- Keep cryptography out of DOM/UI modules.
- Do not add inline JavaScript or inline CSS.
- Preserve keyboard and screen-reader access when changing the UI.
- Add tests for bug fixes and security-sensitive behaviour.
- Never silently change the encrypted file format. Version format changes explicitly and preserve safe backward decryption where practical.

## Security-sensitive changes

Cryptographic changes require particular care. Include test vectors or deterministic test setup where practical, tamper/failure tests, documentation, and an explanation of migration/backward compatibility.

Please report vulnerabilities privately as described in [SECURITY.md](SECURITY.md), rather than opening a public issue containing exploit details.

## Pull requests

Keep changes focused and describe:

- what changed;
- why it changed;
- how it was tested;
- security or compatibility implications;
- screenshots for substantial UI changes where useful.

By contributing, you agree that your contribution is licensed under the repository's MIT licence.
