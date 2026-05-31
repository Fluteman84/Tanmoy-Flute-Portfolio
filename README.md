# Tanmoy Flute Showcase

Standalone static website for **Tanmoy Flute**, built as a premium cinematic portfolio focused on:

- Instagram reel showcase
- YouTube performance showcase
- Indian flute artist branding
- emotional bansuri presentation
- gallery, testimonials, and booking contact

## Folder Structure

```text
flute-artist-showcase/
|-- index.html
|-- css/
|   |-- style.css
|   `-- responsive.css
|-- js/
|   |-- app.js
|   |-- carousel.js
|   |-- instagramPosts.js
|   `-- youtubeVideos.js
`-- assets/
    |-- images/
    `-- videos/
```

## How To Run

Open `index.html` directly in the browser, or run a simple local server:

```powershell
cd "c:\ALL\VSCODE practice\Cpp\flute-artist-showcase"
python -m http.server 5500
```

Then open:

- `http://localhost:5500`

## Real Social Links Used

- Instagram: `https://www.instagram.com/tanmoyflute/`
- YouTube: `https://www.youtube.com/@Tanmoyflute`
- Facebook: `https://www.facebook.com/tanmoy.flute.5/`

## How To Edit Content

### Reel cards

Edit:

- `js/instagramPosts.js`

### YouTube showcase cards

Edit:

- `js/youtubeVideos.js`

### Main layout and section copy

Edit:

- `index.html`

### Styling and responsiveness

Edit:

- `css/style.css`
- `css/responsive.css`

### Replace artwork with real artist media

Current visuals use lightweight local SVG artwork so the site runs immediately and loads fast.

To swap in real images from official media:

1. place the new files in `assets/images/`
2. keep the same filenames, or update references in `index.html` and the JS data files

## Note About Media Sources

The site is wired to Tanmoy Flute's real public profile links.
Directly extracting reusable images from Instagram and Facebook is often restricted by those platforms, so the project currently uses branded local visual placeholders that can be replaced with official downloaded media.
