<div align="center">

# 🍽️ Restaurant Management

<img src="https://img.shields.io/badge/Next.js_14-06101C?style=for-the-badge&logo=nextdotjs&logoColor=FFCF5C" />
<img src="https://img.shields.io/badge/Supabase-06101C?style=for-the-badge&logo=supabase&logoColor=FFCF5C" />
<img src="https://img.shields.io/badge/Tailwind-06101C?style=for-the-badge&logo=tailwindcss&logoColor=FFCF5C" />

</div>

A restaurant front-of-house and kitchen system: guests browse the menu, build a cart and
track their order; the kitchen works the same orders through a display screen.

## Surfaces

**Guest** — menu browsing · cart · checkout · order tracking · order history

**Kitchen (KDS)** — login · live order dashboard · order detail · completed-order history

Lottie animations cover the transitional states (order placed, preparing, ready).

## Stack

| Layer | Choice |
|:--|:--|
| Framework | Next.js 14 (App Router) · TypeScript |
| Data & auth | Supabase |
| Styling | Tailwind, with `@tailwindcss/forms` and container queries |
| Motion | `lottie-react` |

The `stitch_*.html` files at the repository root are the original design mockups each
screen was built from — kept for reference against the implementation.

## Running locally

```bash
npm install
cp .env.example .env.local     # add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

---

<div align="center">
<sub>Built by <a href="https://github.com/Milan-Baldaniya">Milan Baldaniya</a> · Full-Stack AI / LLM Application Engineer</sub>
</div>
