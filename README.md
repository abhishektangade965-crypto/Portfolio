# Rohit Malwade — Java Full Stack Developer Portfolio

A premium, fully responsive personal portfolio built with **HTML5, CSS3, Bootstrap 5 and vanilla JavaScript only** — no frameworks, no backend, no build step. Drag, drop, done.

**Live sections:** Home · About · Skills · Projects (with case studies) · Resume · Contact

---

## ✨ Features

- Fully responsive, mobile-first layout (Bootstrap 5 grid + custom CSS)
- Dark / light mode toggle (persisted with `localStorage`)
- Animated loading screen, scroll progress bar, and custom cursor
- Typing effect in the hero, animated counters, and animated skill bars
- Lightweight canvas particle background (no external particle library needed)
- Scroll-reveal animations via [AOS](https://michalsnik.github.io/aos/)
- Glassmorphism cards, gradient accents, hover micro-interactions, ripple buttons
- Project case-study modals
- Netlify-ready contact form (`data-netlify="true"`) — no backend required
- SEO: semantic HTML, meta description/keywords, Open Graph + Twitter cards, JSON-LD `Person` schema, `robots.txt`, `sitemap.xml`
- Custom 404 page
- Downloadable one-page PDF resume (`assets/resume/Rohit_Malwade_Resume.pdf`)

## 📁 Project Structure

```
portfolio/
├── index.html
├── about.html
├── projects.html
├── skills.html
├── resume.html
├── contact.html
├── 404.html
├── assets/
│   ├── css/style.css
│   ├── js/main.js
│   ├── images/         (favicon, OG cover)
│   ├── icons/
│   └── resume/Rohit_Malwade_Resume.pdf
├── favicon.ico
├── robots.txt
├── sitemap.xml
└── README.md
```

## 🚀 Deploy on Netlify

1. Unzip the project.
2. Go to [app.netlify.com/drop](https://app.netlify.com/drop).
3. Drag the `portfolio` folder onto the page.
4. Done — Netlify will detect `contact.html`'s `data-netlify="true"` form automatically and start capturing submissions under **Site → Forms** in your Netlify dashboard.

No build command, no environment variables, no server required.

## 🛠 Local Preview

Just open `index.html` in a browser, or serve the folder with any static server, e.g.:

```bash
npx serve .
```

## 🎨 Design System

- **Fonts:** Poppins (display), Inter (body), JetBrains Mono (code/labels)
- **Palette:** near-black editor background (`#0B0F14`) with a Java-coffee amber (`#F58219`) and Spring-leaf green (`#6DB33F`) accent gradient
- **Signature element:** the hero's terminal/IDE card, typed out like a real `.java` file

## ✏️ Customizing Content

- Update personal info directly in each HTML file (name, links, copy).
- Replace `assets/resume/Rohit_Malwade_Resume.pdf` with an updated resume — keep the same filename, or update the `href` in `index.html` and `resume.html`.
- Certification cards in `projects.html` are marked "In Progress" — swap in real certificate links/badges once earned.
- The contact page uses OpenStreetMap for the location embed (no API key needed).

## ♿ Accessibility & Performance

- Semantic landmarks (`nav`, `header`, `section`, `footer`)
- Visible focus states on all interactive elements
- `prefers-reduced-motion` respected — animations disable automatically
- Custom cursor and particle canvas auto-disable on touch devices
- All third-party assets loaded from CDN (Bootstrap, Font Awesome, Bootstrap Icons, AOS, Google Fonts) for fast, cached delivery

---

© Rohit Malwade. Built with HTML5, CSS3, Bootstrap 5 & JavaScript.
