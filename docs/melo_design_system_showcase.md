# MELO — Visual Design System & UI Specification

> **Product:** MELO — Find Your Vibe  
> **Aesthetic Theme:** Dark Velvet Glassmorphism, Vibrant African Accents, Energetic & Warm  

---

## 1. Visual UI Concept Preview

Below are the high-fidelity UI design mockups for **MELO** across Desktop Web and Mobile PWA views:

````carousel
![MELO Desktop Web UI Showcase](C:\Users\innoc\.gemini\antigravity-ide\brain\1f47c5a9-2a42-4f9a-858b-2ef3e96f7aa7\melo_ui_design_system_1791043062298.jpg)
<!-- slide -->
![MELO Mobile App UI Showcase](C:\Users\innoc\.gemini\antigravity-ide\brain\1f47c5a9-2a42-4f9a-858b-2ef3e96f7aa7\melo_mobile_design_system_1791043095909.jpg)
````

---

## 2. Core Color Palette & Token Architecture

| Swatch / Token | Color Code | Purpose / Usage |
| :--- | :--- | :--- |
| **`--bg-base`** | `#121212` | Core background color across web and mobile. |
| **`--bg-surface`** | `#1E1E1E` | Card backgrounds, drawer panels, audio player container. |
| **`--color-primary`** | `#1DB95D` | Primary brand green (play buttons, active tabs, progress bar). |
| **`--color-ember`** | `#FF5722` | Sunset Ember Orange accent (Afrobeat energy vibes, highlights). |
| **`--color-gold`** | `#FFC107` | Highlife Gold (African spotlight badges, recommendations). |
| **`--color-teal`** | `#00E5FF` | Neon Teal (AI prompt border glow, active search highlights). |
| **`--text-primary`** | `#FFFFFF` | Primary headers, track titles, active navigation labels. |
| **`--text-secondary`**| `#B3B3B3` | Artist names, secondary metadata, subtext. |

---

## 3. UI Component Specifications

### 3.1 Vibe Pills (Interactive Tag Selector)
- **Visuals**: Multi-layered pill tags with subtle 1px border and ambient background glow.
- **States**:
  - `Default`: Subtle border (`rgba(255, 255, 255, 0.1)`), translucent background.
  - `Hover / Active`: Vibrant gradient border (Ember/Teal/Green) with box-shadow glow.

```css
.vibe-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  border-radius: 9999px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-primary);
  font-weight: 600;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  backdrop-filter: blur(12px);
}

.vibe-pill:hover, .vibe-pill.active {
  background: rgba(29, 185, 93, 0.15);
  border-color: var(--color-primary);
  box-shadow: 0 0 16px rgba(29, 185, 93, 0.35);
  transform: translateY(-2px);
}
```

### 3.2 Persistent Glassmorphic Audio Player
- **Visuals**: Fixed bottom container featuring floating blurred backdrop (`backdrop-filter: blur(20px)`), smooth progress bar slider, track artwork, and a dedicated **Data Saver Status Badge**.

```css
.melo-player-bar {
  position: fixed;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 1200px;
  background: rgba(24, 24, 24, 0.85);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 12px 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
  z-index: 100;
}
```

### 3.3 AI Natural Language Search Prompt Bar
- **Visuals**: Prominent input field with animated rainbow border gradient (`#1DB95D` → `#00E5FF` → `#FF5722`), voice search micro-waveform, and quick suggested prompt chips.

---

## 4. Summary & Feedback

The design system strikes a balance between **premium modern music streaming** and **distinctive African cultural vibrancy**.

How do you feel about this visual direction? We can now apply this design system directly when building **Phase 1** of the application!
