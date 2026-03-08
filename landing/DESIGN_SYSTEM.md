# KeptPages Design System
## Established February 26, 2026

---

## Brand Identity

**Name:** KeptPages
**Tagline:** "Your family's pages — kept beautifully."
**Tone:** Heritage warmth — editorial meets heirloom book design. Not sterile tech, not cutesy. Sophisticated warmth like opening a beautiful family cookbook.
**Audience:** Primarily women 35-65, family-oriented, nostalgic, gift-givers

---

## Color Palette

### Core Colors
| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#FAF4E8` | Primary background (warm cream) |
| `--bg-alt` | `#F3EBDB` | Alternating section background |
| `--surface` | `#FFFDF7` | Cards, elevated surfaces |
| `--surface-warm` | `#FBF6EE` | Subtle warm surface |
| `--text` | `#2C1810` | Primary text (walnut brown) |
| `--text-secondary` | `#6B5B4D` | Secondary text |
| `--text-muted` | `#9A8B7D` | Muted/disabled text |

### Accent Colors
| Token | Hex | Usage |
|---|---|---|
| `--accent` | `#C65D3E` | Primary accent — CTAs, links, highlights (terracotta) |
| `--accent-hover` | `#B04E32` | Hover state |
| `--accent-light` | `rgba(198,93,62,0.08)` | Light tint backgrounds |
| `--accent-glow` | `rgba(198,93,62,0.2)` | Glow/shadow effects |
| `--sage` | `#5E7652` | Success states, checkmarks, "preserved" label |
| `--sage-light` | `rgba(94,118,82,0.1)` | Sage tint background |
| `--gold` | `#B8923F` | Highlights, badges, family notes |
| `--gold-light` | `rgba(184,146,63,0.12)` | Gold tint background |

### Utility Colors
| Token | Hex | Usage |
|---|---|---|
| `--border` | `#E5D9C8` | Standard borders |
| `--border-light` | `#EDE4D6` | Subtle borders |
| `--aged-paper` | `#F0E2C8` | "Before" card background |
| `--aged-paper-dark` | `#E4D3B4` | Darker aged paper |
| `--coffee-stain` | `rgba(139,90,43,0.12)` | Coffee stain effect |

---

## Typography

### Font Stack
| Font | Role | Weight | Source |
|---|---|---|---|
| **Fraunces** | Display headings | 400, 600, 800 | Google Fonts |
| **Newsreader** | Body text | 400, 400i, 500 | Google Fonts |
| **Outfit** | UI elements, labels, buttons | 400, 500, 600 | Google Fonts |
| **Caveat** | Handwriting simulation | 400, 600 | Google Fonts |

### Type Scale (Mobile)
| Element | Font | Size | Weight | Line Height |
|---|---|---|---|---|
| Hero headline | Fraunces | 34px | 800 | 1.15 |
| Section title | Fraunces | 30px | 600 | 1.2 |
| Section title (italic) | Fraunces italic | 30px | 400 | 1.2 |
| Body text | Newsreader | 17px | 400 | 1.65 |
| Section label | Outfit | 11px | 600 | — |
| Card heading | Outfit | 17px | 600 | — |
| Card body | Newsreader | 15px | 400 | 1.55 |
| Button text | Outfit | 16px | 600 | — |
| Small label | Outfit | 10-11px | 600 | — |
| Nav logo | Fraunces | 22px | 800 | — |
| Handwriting (before card) | Caveat | 18-26px | 400-600 | 1.67 |

### Type Scale (Desktop 768px+)
| Element | Size |
|---|---|
| Hero headline | 52px → 60px at 1024px |
| Section title | 38px |

### Section Labels
- Font: Outfit, 11px, weight 600
- Letter spacing: 2.5px
- Text transform: uppercase
- Color: `--accent` (terracotta)

---

## Spacing & Layout

### Container
- Max width: 440px (mobile), 680px (tablet), 800px (desktop)
- Horizontal padding: 24px

### Section Padding
- Mobile: 72px vertical
- Desktop: 100px vertical

### Border Radius
| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | 6px | Small elements, recipe cards |
| `--radius-md` | 10px | Cards, step cards |
| `--radius-lg` | 16px | Pricing card, large containers |
| Pill/button | 100px | All buttons and pills |

### Shadows
| Token | Value | Usage |
|---|---|---|
| `--shadow-sm` | `0 1px 3px rgba(44,24,16,0.06)` | Subtle elevation |
| `--shadow-md` | `0 4px 16px rgba(44,24,16,0.08)` | Cards, hover states |
| `--shadow-lg` | `0 8px 32px rgba(44,24,16,0.1)` | Featured cards |
| `--shadow-xl` | `0 16px 48px rgba(44,24,16,0.12)` | Modals, popovers |

---

## Components

### Buttons

**Primary (terracotta):**
- Background: `--accent`
- Text: white
- Padding: 16px 36px
- Border radius: 100px (pill)
- Shadow: `0 4px 16px rgba(198,93,62,0.25)`
- Hover: translateY(-2px), darker bg, stronger shadow
- Font: Outfit 16px weight 600

**Light (cream on dark bg):**
- Background: `--bg`
- Text: `--text`
- Same sizing as primary
- Shadow: `0 4px 20px rgba(0,0,0,0.15)`

**Small (sticky bar):**
- Padding: 10px 22px
- Font: Outfit 14px weight 600

**Nav CTA:**
- Background: `--text` (dark)
- Text: `--bg` (cream)
- Padding: 8px 18px
- Font: Outfit 13px weight 600

### Cards

**Standard card:**
- Background: `--surface`
- Border: 1px solid `--border-light`
- Border radius: `--radius-md`
- Shadow: `--shadow-sm`
- Hover: translateY(-2px), `--shadow-md`

**"Before" card (aged document):**
- Background: `--aged-paper` with ruled lines (repeating-linear-gradient)
- Transform: rotate(-1.2deg)
- Coffee stain: radial-gradient pseudo-element
- Edge darkening: linear-gradient pseudo-element
- Tape strip: semi-transparent yellow rectangle at top
- Float animation: gentle 6s ease-in-out up/down
- Font: Caveat (handwriting)

**"After" card (preserved):**
- Background: `--surface`
- Top border: 3px gradient (accent → gold)
- Shadow: `--shadow-lg`
- Structured layout with section labels, ingredient dots, numbered instructions
- Family note callout: gold-light bg with gold left border

### Section Ornaments
- Thin horizontal lines with dot/diamond center
- Color: `--border`

### Section Dividers
- 1px horizontal gradient: transparent → `--border` → transparent

---

## Decorative Elements

### Top Color Bar
- Fixed, 3px height, z-index 1001
- Gradient: accent → gold → accent

### Paper Grain Overlay
- Fixed, full-screen, z-index 9998
- SVG feTurbulence noise, opacity 0.018
- pointer-events: none

### 3D Book Mockup
- Perspective: 800px
- Cover: gradient terracotta to dark brown
- rotateY(-18deg), hover to -10deg
- Spine shadow: left-side linear gradient
- Decorative inner border: 1px white at 15% opacity
- Page edges: repeating-linear-gradient (cream/border stripes)
- Cover text: Fraunces serif, white

---

## Animations

### Scroll Reveal
- Initial: opacity 0, translateY(24px)
- Visible: opacity 1, translateY(0)
- Transition: 0.7s ease
- Stagger delays: 0.1s, 0.2s, 0.3s, 0.4s
- Trigger: IntersectionObserver, threshold 0.15, rootMargin -40px bottom

### Hero Word Reveal
- Each word: inline-block, fadeInUp animation
- Stagger: 0.3s to 0.74s (6 words)
- Duration: 0.5s ease each

### Card Float (before card)
- Keyframes: translateY(0) rotate(-1.5deg) → translateY(-6px) rotate(-1deg)
- Duration: 6s ease-in-out infinite

### Button Hover
- translateY(-2px), enhanced shadow
- Arrow icon: translateX(3px)
- Transition: 0.25s ease

### Nav Scroll
- Transparent → solid cream background at 40px scroll
- Backdrop blur 12px
- Padding reduction on scroll

### Sticky Mobile CTA
- Slides up from bottom (translateY: 100% → 0)
- Appears after scrolling past hero
- backdrop-filter blur

---

## Navigation

### Mobile Nav
- Fixed, top: 3px (below color bar)
- Left: "KeptPages" logo (Fraunces 800, "Pages" in accent color)
- Right: "Join Waitlist" pill button (dark bg)
- Transparent initially, solid cream on scroll

### Sticky Bottom CTA (mobile only)
- Fixed bottom bar, cream bg with blur
- Left: "KeptPages" + "Free to start" subtext
- Right: terracotta "Join Waitlist" button
- Hidden at ≥768px

---

## Page Structure

1. **Nav** — fixed, transparent → solid
2. **Hero** — headline word reveal, subtitle, CTA, "no credit card" note
3. **Trust Bar** — 3 items: accuracy, security, free (sage green icons)
4. **Transformation** — section label, title, before/after cards with arrow
5. **How It Works** — 3 step cards with large faded numbers
6. **Use Cases** — 2×2 grid: recipes, letters, journals, artwork
7. **Book Preview** — 3D book mockup, description, price tag
8. **Pricing** — free tier features, keeper plan upgrade, CTA
9. **Final CTA** — dark bg, emotional headline, email waitlist form
10. **Footer** — logo, privacy/terms/contact links, copyright
11. **Sticky Mobile CTA** — appears on scroll past hero

---

## Key Design Principles

1. **Warm, not cold** — everything uses warm browns, creams, terracotta. No blues, no grays.
2. **Paper-like texture** — grain overlay, aged effects, warm shadows create tactile feel
3. **Editorial typography** — serif-forward, Fraunces italics for elegance, strong type hierarchy
4. **Heritage luxury** — feels like a beautiful cookbook, not a SaaS dashboard
5. **Emotional over functional** — design sells the feeling of preserving family memories
6. **The transformation is the hero** — before/after cards are the centerpiece
7. **Terracotta accent** — single strong accent color used sparingly for maximum impact
8. **Mobile-first** — designed for phone use (snapping photos), desktop is enhanced
