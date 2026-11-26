# The Midnight Board

**Work in progress:** a fictional Halloween Ouija-board game with animated ghost replies, candlelit atmosphere, and typed or optional voice questions.

**The spark:** a Ouija-board design on a Hell Pizza box inspired this project—a way to get back into web development by turning an everyday discovery into an interactive horror experience.

- **Stack:** HTML, CSS, vanilla JavaScript, Node.js, and Express. No frontend framework.
- **Ghost responses today:** 300+ scripted lines selected by question intent and session context, with no repeats within a séance. Optional OpenAI integration falls back to scripted replies. Keys stay on the server.
- **Game rules:** 20 questions per séance, up to 120 characters each. Everything is fictional.
- **Next:** polish the experience and add optional Groq integration while keeping scripted mode playable without an API key.
- **Deployment plan:** host the frontend and backend together on Render, connected to this GitHub repo. First update network/proxy settings; add durable session and usage storage for reliable recovery. Hosting is not live yet.
