# SalesOS - Claude Code Guidelines

## Project Overview

SalesOS is a modern B2B SaaS landing page and web application for an AI-native Sales Operating System. It's a frontend-only React SPA designed for marketing conversion, featuring a warm minimalist aesthetic with pricing tiers, feature showcases, testimonials, and multiple content pages.

## Technology Stack

- **React 18.2** with TypeScript 5.8
- **Vite 6.2** for builds and dev server
- **React Router DOM 6.22** for client-side routing
- **Tailwind CSS** (via CDN) for styling
- **Lucide React** for icons

## Directory Structure

```
/
├── index.tsx           # App entry point (React root)
├── App.tsx             # Root component with all route definitions
├── types.ts            # TypeScript interfaces
├── constants.ts        # Static data (features, pricing, testimonials)
├── index.html          # HTML template with Tailwind config
├── components/         # Reusable UI components
│   ├── ui/             # Atomic components (Button, Tooltip)
│   └── *.tsx           # Section components (Hero, Features, Navbar, etc.)
└── pages/              # Page components (Home, Product, About, etc.)
```

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | All routes defined here (15 total), auth pages render without navbar/footer |
| `constants.ts` | Central data: NAV_ITEMS, FEATURES, PRICING_TIERS, TESTIMONIALS |
| `types.ts` | Interfaces: NavItem, Feature, PricingTier, Testimonial, Differentiator |
| `components/ui/Button.tsx` | Core button with 4 variants and 3 sizes |
| `vite.config.ts` | Dev server on port 3000, env variable mapping |

## Code Conventions

### Naming
- **Components/Interfaces:** PascalCase (`Hero`, `NavItem`)
- **Functions/variables:** camelCase (`handleClick`, `isOpen`)
- **Constants:** UPPER_SNAKE_CASE (`PRICING_TIERS`)
- **Files:** PascalCase for components (`Hero.tsx`), lowercase for config

### Component Patterns
- Functional components with `React.FC<PropsType>`
- Named exports (not default exports)
- One component per file
- Minimal state - mostly presentational components

### Styling
- Tailwind utility classes exclusively
- Custom theme colors in `index.html`:
  - Background: `#F2F1EA` (warm beige)
  - Text: `#1A1A1A` (dark charcoal)
  - Accent: `#EAD07D` (gold)
  - Surface: `#FFFFFF` (white)

## Development Commands

```bash
npm install     # Install dependencies
npm run dev     # Start dev server (port 3000)
npm run build   # Production build to dist/
npm run preview # Preview production build
```

## Architecture Notes

- **No backend/database** - all data is static in `constants.ts`
- **Compositional design** - pages compose reusable components
- **Route-based organization** - pages mirror routes in App.tsx
- **Minimal state management** - local useState only, no Redux/Context
- **Auth pages** - Login/Signup pages have their own layout (no navbar/footer)

## Auth Pages

Auth pages (`/login`, `/signup`) render without the global Navbar and Footer. They have their own self-contained layouts.

| Route | Page | Features |
|-------|------|----------|
| `/login` | Login.tsx | Email/password login, social login (Google, GitHub), remember me |
| `/signup` | Signup.tsx | Registration form, social signup, split layout with testimonial |

Auth pages are defined in the `authPages` array in `App.tsx` and conditionally skip the Navbar/Footer wrapper.

## Adding New Pages

1. Create component in `pages/` directory
2. Add route in `App.tsx`
3. Add navigation item in `constants.ts` (NAV_ITEMS) if needed

## Adding New Components

1. Create in `components/` (or `components/ui/` for atomic)
2. Define props interface in the component file or `types.ts`
3. Use named export

## External Dependencies

- Images: Unsplash (`images.unsplash.com`)
- Avatars: Picsum (`picsum.photos`)
- Fonts: Google Fonts (Inter, Plus Jakarta Sans) - loaded in HTML

## Environment Variables

- `GEMINI_API_KEY` - configured in vite.config.ts for potential AI integration
- Create `.env.local` for local development

## Important Patterns

### Button Usage
```tsx
import { Button } from '../components/ui/Button';

<Button variant="primary" size="lg">Get Started</Button>
// Variants: primary, secondary, outline, ghost
// Sizes: sm, md, lg
```

### Page Layout
```tsx
import { PageLayout } from '../components/PageLayout';

<PageLayout title="Page Title" subtitle="Description">
  {/* Page content */}
</PageLayout>
```

### Data-Driven Components
Components render data from `constants.ts`:
```tsx
import { FEATURES, PRICING_TIERS } from '../constants';
```

## Known Issues

- None currently. React and react-dom versions are aligned at ^18.2.0.
