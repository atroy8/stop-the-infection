# Solve the Outbreak — Web App (Vite + React + Tailwind)

An MVP investigation game for classroom use. Single-page app built with React and Tailwind.

## Quick start (local)
```bash
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Deploy options

### GitHub Pages
1) Edit `vite.config.js` and set `base` to `'/<REPO_NAME>/'` (include the leading and trailing slash).
2) Commit and push. Ensure GitHub Pages is enabled for the repo (Settings → Pages → Source: GitHub Actions).
3) The included workflow `.github/workflows/deploy.yml` will build and publish automatically on pushes to `main`.

### Netlify or Vercel (recommended)
- Framework: Vite
- Build command: `npm run build`
- Publish directory: `dist/`

## Customization
- Edit game logic/content in `src/OutbreakApp.jsx` (scenes, actions, truth table).
- Tailwind styles in `src/index.css`.
