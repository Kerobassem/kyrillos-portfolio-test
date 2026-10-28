# Kero's Portfolio Assistant: Integration Guide

## 0. URGENT: your API key was exposed
An old version of `app.py` had the Gemini key written in the code. Treat that key as compromised:
1. Go to Google AI Studio -> API keys -> **delete/revoke that key** and create a new one.
2. Never put it in code or in a GitHub repo. The new `app.py` reads it from `GEMINI_API_KEY`.

## 1. Files
| File | Where it goes |
|---|---|
| `app.py`, `knowledge_base.py`, `requirements.txt` | `Ai Chatbot/` |
| `chatbot.css`, `chatbot.js` | `Ai Chatbot/` (already linked from the portfolio) |
| Your portfolio (`index.html`, `style.css`, `script.js`, `assets/`, `card.html`, ...) | parent folder of `Ai Chatbot/` |

`requirements.txt` now needs: `flask`, `flask-cors`, `google-genai`.
The Flask app serves the portfolio from its parent folder, so no separate `public/` folder is needed.

## 2. Run locally
From the `Ai Chatbot/` folder:
```powershell
py -3.12 -m venv .venv-windows
.\.venv-windows\Scripts\Activate.ps1
pip install -r requirements.txt
$env:GEMINI_API_KEY="your-new-key"
python app.py
```
Use the standard Windows CPython distribution for this environment; the MSYS2/MINGW Python bundled with the workspace cannot install all of the Google SDK's compiled dependencies.
Open `http://localhost:5000`. The widget follows the portfolio's EN/AR switch and dark/light theme. If you preview the static page on `localhost` or `127.0.0.1` using another port, the widget calls the local API on port 5000 automatically.

## 3. Deploying (important)
Your portfolio is static (GitHub Pages), but the chatbot needs a Python server to keep the key secret.
- **Option A:** host everything (portfolio + API) on one Python host (Render, Railway, PythonAnywhere). Flask serves the portfolio's parent folder.
- **Option B:** keep the portfolio on GitHub Pages, deploy only the backend, set `window.KC_API_BASE` to its URL before loading `chatbot.js`, and set `ALLOWED_ORIGINS=https://kerobassem.github.io` on the backend.
  For example, add `<script>window.KC_API_BASE = "https://your-backend.example";</script>` before the chatbot script.
Use `gunicorn app:app` in production. Chat history is in memory, so it resets on restart (fine for a portfolio).

## 4. Updating what the bot knows
Edit `KNOWLEDGE_BASE` in `knowledge_base.py` and restart. Behaviour rules live in `SYSTEM_INSTRUCTION`.

---

## D. Missing information (answer these and I'll update the KB)
1. **"VOZ"**: your brief mentions a "VOZ project", but your portfolio and CV only have **VORTEX**. Is VOZ a different project, or the same one? If different, please send its details.
2. **DEPI start date**: CV says Dec 2024, portfolio says 12/2025. Which is right? Is it still ongoing in Oct 2026?
3. **GPA**: 3.00 (hero stat), 3.04 (education card) or 3.07 (CV)? Expected graduation year?
4. **Solo vs team**: were NABD, VORTEX, Calculator and the portfolio solo projects? Any teammates/instructors/clients to mention? (Right now the bot says "not documented".)
5. **Flutter work**: have you built/published any Flutter app (even a demo or GitHub repo)? Your pricing plans promise Firebase, auth, API, store upload, admin panel, and custom backend. Do you have examples I can reference?
6. **Availability**: are you open to freelance, internships, and/or full-time now? Remote/on-site? Preferred time zone?
7. **Pricing**: are $10/$50/$100 final? Do you take UI/UX-only or graphic design orders, and at what rates?
8. **Graphic design gallery** (`Graphics/graphics.html`): please share the works/categories so the bot can describe them.
9. **English level**: "Good" (site) vs "Conversational B1-B2" (CV). Which should the bot use?
10. **Career goals**: target role(s), industries/companies, timeline?
11. **Strongest skills**: should the bot rank them (e.g. Figma > Flutter > graphic design)? Proficiency levels aren't stated anywhere.
12. **GitHub username**: `Kerobassem` (site) vs `kyrillos-bassem` (CV).

## E. Accuracy check
**Conflicts**
- GPA: 3.00 / 3.04 / 3.07.
- DEPI: Dec 2024 (CV) vs Dec 2025 (portfolio, certifications, and experience).
- English: "Good" vs "Conversational (B1-B2)".
- GitHub handle differs between CV and site.
- Name spelling: page title says "Kyroles Bassem", the rest says "Kyrillos".
- Education: "3rd year" with a Sep 2023 start looks outdated for Oct 2026 (would be year 4 or graduating). Please confirm.

**Unsupported or risky claims**
- Pricing plans/services promise Firebase, authentication, APIs, store upload, admin panel and custom backend, but no Flutter project demonstrating any of this is documented. The bot is instructed to stay honest ("junior; no published Flutter app documented"). Consider adding a Flutter project to your portfolio.
- Skills on the portfolio but **not in the CV**: Firebase, Adobe XD, Git/GitHub, Photoshop, Illustrator, Premiere Pro, Python, C++, Microsoft Office. The CV lists only VS Code as a tool.
- "Leadership" appears as a soft skill, but no leadership role is documented.
- NABD / VORTEX are Figma prototypes. The CV says NABD was "scored for accessibility" with no score or method given; the bot won't cite results.
- Education card on the site still shows a placeholder-style name in brackets: `[Akhbar ElYom Academy]`. Remove the brackets. The Arabic version still has `[اكاديميه اخبار اليوم]` and the English `data-en` says "[Your University Name]", so switching language shows the placeholder.
- Your Arabic skills card for CSS has `data-ar="HTML"` (typo).
- The commented-out testimonials in `index.html` use invented names. Don't publish them (the bot knows reviews are "coming soon").
- `index.html` has leftover Cloudflare `email-decode.min.js` script tags (they 404 outside Cloudflare). Safe to delete.
- Hero stat "2+ Internships": the documented ones are NTI, Sprints x Microsoft, and DEPI (3 trainings), plus DSC volunteering. Consider "3 trainings" or confirm.
