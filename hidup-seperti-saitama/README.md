# Hidup Seperti Saitama

> "Terbentur, Terbentur, Terbentuk."

A simple text-turn-based RPG built with vanilla HTML, CSS, and JavaScript.
Uses localStorage as a local database.

## Features
- Register / Login / Guest account
- Hero leveling system (Novice, First Job, Second Job)
- Stats: STR, AGI, INT
- Equipment with tier system (White → Gold)
- Enhancement using Iron
- Inventory (10 slots) with Dismantle & Discard
- 5 monsters: Chicken, Sheep, Cow, Dog, Lion
- Turn-based battle with Attack / Skill / Leave

## Design Principles Applied
1. **Composition** – Grid layout for profile, inventory, battle
2. **Ergonomics** – Large buttons, clear labels
3. **Semiotics** – Color-coded tiers, HP/MP bars
4. **Simplicity** – Limited palette, clear typography
5. **Focus** – Highlighted primary actions
6. **Consistency** – Uniform panels and buttons
7. **Balance** – Symmetrical battle layout
8. **Contrast** – Light text on dark background
9. **White Space** – Generous padding

## How to Deploy on GitHub Pages
1. Create a new repository on GitHub.
2. Upload all files (index.html, css/, js/, README.md).
3. Go to **Settings → Pages**.
4. Under "Source", select `main` branch and `/ (root)`.
5. Save. Your game will be live at `https://<username>.github.io/<repo>/`.

## Security Note
Passwords are hashed with a simple obfuscation function before being stored in localStorage.
This is **not** production-grade security — it is for educational/demo purposes only.
The app is fully client-side, so data is stored per-browser.

## License
MIT