# DESIGN.md — Agent Orchestration Platform Design System

> Hand-authored static design system (Stitch MCP not connected in this environment).
> Dark-mode first. Refined / minimal tone. Every visual value in the frontend MUST
> trace back to a token here. Do not invent new variable names.

---

## Color Tokens

CSS variables are defined in `frontend/app/globals.css` and consumed via Tailwind.

| Token (CSS var)      | Hex       | Usage                                  |
|----------------------|-----------|----------------------------------------|
| `--bg`               | `#0A0B0F` | App background                         |
| `--surface`          | `#13151C` | Cards, panels, drawers                 |
| `--surface-2`        | `#1B1E27` | Raised surface (canvas nodes, inputs)  |
| `--border`           | `#2A2E3A` | Hairline borders, dividers             |
| `--primary`          | `#6366F1` | Primary actions, supervisor node       |
| `--primary-fg`       | `#FFFFFF` | Text on primary                        |
| `--accent`           | `#22D3EE` | Active edges, live highlights          |
| `--text`             | `#E6E8EE` | Primary text                           |
| `--text-muted`       | `#8A90A2` | Secondary text, captions               |
| `--status-idle`      | `#8A90A2` | Agent idle ring                        |
| `--status-running`   | `#22D3EE` | Agent running ring / pulse             |
| `--status-error`     | `#F87171` | Agent error ring                       |
| `--success`          | `#34D399` | Completed run, success badges          |

---

## Typography

| Token             | Value                                            |
|-------------------|--------------------------------------------------|
| `--font-sans`     | `"Inter", ui-sans-serif, system-ui, sans-serif`  |
| `--font-mono`     | `"JetBrains Mono", ui-monospace, monospace`      |

Scale (size / line-height / weight):

| Name     | Size   | Line height | Weight |
|----------|--------|-------------|--------|
| `display`| 28px   | 34px        | 600    |
| `title`  | 20px   | 28px        | 600    |
| `body`   | 14px   | 21px        | 400    |
| `label`  | 13px   | 18px        | 500    |
| `caption`| 12px   | 16px        | 400    |

---

## Spacing Scale

`4 · 8 · 12 · 16 · 24 · 32 · 48` (px). Tailwind defaults map 1:1 (`1`=4px).
Use multiples of 4 only.

Radius: `--radius` = `10px` (cards/inputs), `--radius-sm` = `6px` (badges),
full = pills.

---

## Component Patterns

- **Card**: `bg-surface`, `border border-border`, `rounded-[--radius]`, padding `16–24px`.
- **Button (primary)**: `bg-primary text-primary-fg`, `rounded-[--radius]`, `h-9`,
  `px-4`, hover `opacity-90`, transition `150ms ease`.
- **Button (ghost)**: transparent, `text-text-muted`, hover `bg-surface-2`.
- **Input**: `bg-surface-2`, `border border-border`, `rounded-[--radius]`, `h-9`,
  focus ring `--accent`.
- **Badge (role)**: `bg-surface-2 text-text-muted`, `rounded-[--radius-sm]`,
  `text-caption`, `px-2 py-0.5`.
- **Badge (status)**: dot + label; dot color = matching `--status-*` token.

---

## Layout Rules

| Token              | Value  |
|--------------------|--------|
| `--sidebar-w`      | 240px  |
| `--header-h`       | 56px   |
| Content max width  | 1280px |
| Canvas             | fills remaining viewport (flex-1) |

---

## Motion

Refined / minimal. Default transition `150ms ease`; emphasis `200ms ease`.

- **Active edge**: `stroke-dasharray` pulse, `--accent` stroke, `1.2s linear infinite`.
- **Running node**: ring in `--status-running` with `box-shadow` glow pulse `1.5s ease-in-out infinite`.
- No bouncy/expressive animation. Subtle only.
