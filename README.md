# 🥧 Pi Explorer

**Journey Through the Infinite** — an interactive web experience exploring the digits, history, and wonders of π.

🔗 Live site (GitHub Pages): https://highviewone.github.io/pi-explorer/

## Overview

Pi Explorer is a single-page, scrollytelling site that turns the story of π into something you can browse. It walks from "what makes π special" through its history across ancient civilizations to a collection of fun facts — all in pure HTML, CSS, and JavaScript with no build step or dependencies.

## Sections

- **Hero** — animated floating digits and a one-click "copy π" button
- **The Mystery of π** — why π is infinite, irrational, transcendental, and universal
- **π Through the Ages** — approximations from Ancient Egypt, Babylon, Greece, India, China, and the Islamic Golden Age
- **π Facts & Wonders** — Pi Day, the Feynman Point, and more

## Tech stack

Vanilla HTML / CSS / JavaScript — zero dependencies, zero build step.

```
index.html    # all content and sections
style.css     # styling
script.js     # interactivity (nav, animations, copy button)
```

## Running locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# then open http://localhost:8000
```
