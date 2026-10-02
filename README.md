# 🥧 Pi Explorer

**Journey Through the Infinite** — an interactive web experience exploring the digits, history, and wonders of π.

🔗 Live site (GitHub Pages): https://highviewone.github.io/pi-explorer/

## Overview

Pi Explorer is a single-page, scrollytelling site that turns the story of π into something you can browse. It walks from "what makes π special" through its history across ancient civilizations and a collection of fun facts, ending with a digit-memorization challenge — all in pure HTML, CSS, and JavaScript with no build step or dependencies.

## Sections

- **Hero** — animated floating digits, the medallion logo, and share / copy-link buttons
- **The Mystery of π** — why π is infinite, irrational, transcendental, and universal
- **π Through the Ages** — an animated timeline and approximations from Ancient Egypt, Babylon, Israel, Greece, India, China, and the Islamic Golden Age
- **π Facts & Wonders** — Pi Day, the Feynman Point, and more
- **The Pi Challenge** — type π from memory, one digit at a time, with milestones and a personal best saved in the browser

## Tech stack

Vanilla HTML / CSS / JavaScript — zero dependencies, zero build step.

```
index.html    # all content and sections
style.css     # styling
script.js     # interactivity (nav, timeline animations, copy button, Pi Challenge game)
logo.svg, favicon.svg, og-image.png   # artwork and the social-share preview image
```

## Running locally

Just open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8000
# then open http://localhost:8000
```
