📄 1️⃣ README.md
# Acode‑AI‑Assist  –  AI‑powered CLI for the Acode editor

A tiny Acode plugin‑CLI that lets you **talk to more than 27 AI providers** (OpenAI, Anthropic, Gemini, Llama‑2, …) and **pick any model** from a catalog that can hold hundreds‑of‑thousands of entries.  
The plugin runs completely inside Acode’s built‑in terminal, inserts the answer at the cursor position, and (optionally) executes safe JavaScript code in a sandbox.
# Acode‑AI‑Assist  –  AI‑powered CLI for the Acode editor

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Model‑catalog driven** – a remote `catalog.json` lists every model you own; the CLI can `--list` them, filter by tags, and select any model with `--model <id>`. |
| **Multiple providers** – OpenAI, Anthropic, Google Gemini, any OpenAI‑compatible endpoint, self‑hosted Llama‑2, etc. |
| **Zero‑leak API keys** – only `ACODE_…` variables are baked into the final zip; real provider keys stay in the device keystore (`.env` or OS keychain). |
| **Rate limiting & retries** – per‑provider `rate‑limiter-flexible` guarantees you never exceed plan quotas. |
| **Content moderation** – every answer passes through OpenAI’s moderation endpoint (or any custom filter) before it reaches the editor. |
| **Sandboxed code execution** – optional `vm2` sandbox prevents malicious code from touching the file system or network. |
| **Encrypted audit log** – each request/response pair is stored locally in an AES‑256‑GCM file (`~/.acode_ai_audit.log.enc`). |
| **Live‑reload dev server** – `npm run dev` watches files and refreshes the Acode preview automatically. |
| **One‑click production build** – `npm run build` creates a ready‑to‑publish `<plugin>.zip`. |

---

## 📦 Installation

```bash
# 1️⃣ Clone the repo
git clone https://github.com/your‑name/acode‑ai‑assist.git
cd acode‑ai‑assist

# 2️⃣ Install Node dependencies
npm ci

# 3️⃣ Create a .env file (see below)
cp .env.example .env
# edit the file – add only the keys you actually own


🚀 Usage
Command	What it does
ai <your natural‑language request>	Uses the cheapest chat model from the catalog.
ai --model anthropic:claude-3-5-sonnet <prompt>	Forces that exact model.
ai --list	Prints a table of all models in the catalog (IDs, provider, tags, price).
ai --list --tag code	Shows only models that advertise the code tag.
ai --help	Shows the help banner.
ai --model llama2:7b-chat <prompt> + ACODE_ALLOW_EXEC=1	If the answer starts with a shebang (#!/usr/bin/env node) it will be run inside a vm2 sandbox and the sandbox output will be printed.
All answers are moderated before being inserted. If a response is flagged, you’ll see a toast warning and the text will not be written to the editor.

🔐 Security & Hardening
Concern	Built‑in mitigation
API key leakage	Keys are read only from process.env at runtime – they are never bundled into the final zip.
Calling a provider you don’t own	catalog.json only contains entries you have added; the CLI validates that the provider appears in ACODE_AVAILABLE_PROVIDERS.
Exceeding rate limits / unexpected bills	rate‑limiter-flexible enforces per‑provider limits (configurable in src/networkGuard.js).
Malicious LLM output	1️⃣ Moderation endpoint (src/moderation.js). 2️⃣ Optional sandboxed JS execution (src/runner.js). 3️⃣ Sanitisation of HTML (sanitize-html).
Audit tampering	Local audit log is AES‑256‑GCM encrypted with a passphrase you keep offline (src/audit.js).
Man‑in‑the‑middle on the catalog	The catalog URL should be served over HTTPS; you can also pin a SHA‑256 hash of the file and verify it on download (add a simple checksum step in catalogClient.js if you wish).
🛠️ Extending the plugin
Add a new provider

Add a provider entry to catalog.json (see the sample below).
Create a file src/providerAdapters/<type>Adapter.js that exports buildRequest({model, provider, prompt}).
The CLI will automatically discover it because the adapter name matches provider.type.
Add tags / extra metadata

Extend each model object in catalog.json with any fields you like (tags, price, description).
Use ai --list --tag <myTag> to filter on those tags.
Custom safety filter

Replace or augment src/moderation.js with a call to a self‑hosted hate‑speech filter, a locally‑run toxic‑comment model, etc.
Replace the sandbox

If you need a stricter environment (Docker, Firecracker, etc.) replace the runJS function in src/runner.js with your own executor; keep the same return shape {stdout,stderr,error}.
📦 Production build & publishing
npm run build          # → creates dist/ + <plugin‑name>.zip
# In Acode:
#   Settings → Plugins → Import → select the generated zip
#   Enable the plugin → open the Terminal → start using “ai …”
The generated zip contains only:

dist/ (minified bundle + static assets)
manifest.json (Acode‑required metadata)
No secrets, no catalog data, no node_modules – everything you need is inside the bundle.

📜 License
MIT © 2024 – your‑name. Feel free to fork, improve, or embed this plugin in any project you like.

🙏 Acknowledgements
esbuild – ultra‑fast bundler that powers the build pipeline.
Second‑Opinion – inspiration for a multi‑agent LLM router (the catalog concept).
OpenAI, Anthropic, Google Gemini, Llama‑2 – the providers that make this possible.
