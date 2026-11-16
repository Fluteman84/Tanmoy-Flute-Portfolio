# Tanmoy Flute Portfolio

The React portfolio for Tanmoy Pramanik, with concert videos, Instagram reels, a gallery, and booking information. The design uses the [shadcn/ui Maia Neutral preset](https://ui.shadcn.com/create?preset=bbVJxYW), adapted with burgundy and ivory colors and Cormorant Garamond headings.

## Run locally

Use Node.js 22.12 or later.

```sh
npm ci
npm run dev
```

`npm run build` creates the production site in `dist/`. Use `npm run preview` to serve that build locally. GitHub Actions builds and publishes `dist/` to GitHub Pages on pushes to `main`.

## Pages

| URL | Workspace |
| --- | --- |
| `/` | Portfolio |
| `/notes.html` | Palta Generator |
| `/notation.html` | Swaralipi Notation Editor |
| `/tabla.html` | Tabla Taal Engine |
| `/tabla-taal-engine/` | Standalone Tabla Taal Engine |
| `/zitar.html` | Zitar Tone Reference |

Each page has its own Vite entry, so direct links work on GitHub Pages. The React tool pages use the existing notation, rhythm and amplifier logic.

Edit portfolio media links and captions in `src/content.js`. The layout and interactions live in `src/portfolio.jsx`, and the portfolio theme lives in `src/site.css`.
