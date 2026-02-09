# SalesOS CRM - Project Guidelines

## IMPORTANT: Current Focus

Current development focus is on the **Sales Coaching AI** solution located at:
- **Frontend**: `/opt/salesos.org/`
- **Backend**: `/opt/salesos.org/api/src/coaching/`

All new feature development should target the Sales Coaching platform.

---

## Sales Coaching AI - Active Development

### Project Location
- **Frontend**: `/opt/salesos.org/`
- **Backend API**: `/opt/salesos.org/api/`
- **Coaching Module**: `/opt/salesos.org/api/src/coaching/`

### Tech Stack (Sales Coaching)
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **Real-time**: Socket.io for live coaching sessions
- **AI**: Claude API for coaching insights

### Key Components
- `PracticePanel.tsx` - Main practice/roleplay interface
- `CoachingAgendaPanel.tsx` - Agenda management for 1:1s
- `RealtimeCoachingPanel.tsx` - Live coaching during calls
- `AccountSignals.tsx` - Account health signals
- `DynamicWidgets.tsx` - Configurable dashboard widgets

---

## SalesOS CRM - Reference Only

SalesOS is an AI-powered Sales CRM and Revenue Intelligence platform built with React (Vite) frontend and NestJS backend.

### Tech Stack

- **Frontend**: React 18, TypeScript, Vite, TanStack Query, React Router
- **Styling**: Tailwind CSS (via CDN in index.html)
- **Backend**: NestJS, Prisma ORM, PostgreSQL
- **State Management**: TanStack Query for server state
- **Icons**: Lucide React

---

## Design System

### Brand Colors

| Color | Hex | Usage |
|-------|-----|-------|
| Primary (Gold) | `#EAD07D` | Primary accent, active states, highlights |
| Secondary (Dark) | `#1A1A1A` | Buttons, headings, dark cards |
| Background | `#F2F1EA` | Page background (warm beige) |
| Surface | `#FFFFFF` | Card backgrounds |
| Surface Hover | `#F8F8F6` | Hover states, input backgrounds |
| Light Surface | `#F0EBD8` | Chart backgrounds, progress tracks |
| Muted Text | `#666666` | Body text, descriptions |
| Light Muted | `#999999` | Placeholder text, icons |
| Success | `#93C01F` | Success states, positive indicators |
| Error | `red-500` | Error states (use Tailwind red-500/red-600) |

### Text Colors

```tsx
// Headings
className="text-[#1A1A1A]"

// Body text
className="text-[#666]"

// Muted/placeholder
className="text-[#999]"

// On dark backgrounds
className="text-white"
className="text-white/60"  // muted on dark
```

### Typography

```tsx
// Page titles
className="text-3xl lg:text-4xl font-light text-[#1A1A1A]"

// Card titles
className="font-semibold text-[#1A1A1A]"

// Section headers
className="text-xl font-medium text-[#1A1A1A]"

// Large numbers/metrics
className="text-2xl font-light text-[#1A1A1A]"
className="text-4xl lg:text-5xl font-light text-[#1A1A1A]"

// Body text
className="text-sm text-[#666]"

// Small/caption
className="text-xs text-[#999]"
```

### Cards

```tsx
// Standard card
className="bg-white rounded-[32px] p-6 shadow-sm border border-black/5"

// Smaller card
className="bg-white rounded-[24px] p-5 shadow-sm border border-black/5"

// Dark card (for emphasis)
className="bg-[#1A1A1A] rounded-[32px] p-6"

// Metric/stat card
className="bg-white rounded-[24px] p-4 shadow-sm border border-black/5"

// Using Card component
<Card className="p-6">  // inherits rounded-2xl from component
```

### Buttons

```tsx
// Primary button (dark)
className="px-5 py-2.5 rounded-full bg-[#1A1A1A] text-white hover:bg-[#333] transition-colors font-medium text-sm"

// Secondary button (outline)
className="px-4 py-2.5 rounded-full border border-black/10 text-[#666] hover:bg-white transition-colors font-medium text-sm"

// Gold accent button
className="px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A]"

// Icon button
className="p-2.5 text-[#666] hover:text-[#1A1A1A] hover:bg-white rounded-full transition-colors"

// On dark background
className="w-full py-3 bg-white/10 text-white rounded-2xl font-medium text-sm hover:bg-white/20 border border-white/10"
```

### Inputs

```tsx
// Standard input
className="w-full px-4 py-2.5 rounded-xl bg-[#F8F8F6] border-transparent focus:bg-white focus:ring-1 focus:ring-[#EAD07D] outline-none text-sm"

// Search input with icon
<div className="relative">
  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#888]" size={18} />
  <input className="w-full pl-10 pr-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] focus:ring-2 focus:ring-[#EAD07D]/20 outline-none text-sm" />
</div>

// Select dropdown
className="px-4 py-2.5 rounded-full bg-white border border-black/10 focus:border-[#EAD07D] outline-none text-sm font-medium text-[#1A1A1A]"
```

### Pills & Badges

```tsx
// Primary pill (gold)
className="px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A]"

// Dark pill
className="px-4 py-2 bg-[#1A1A1A] rounded-full text-sm font-semibold text-white"

// Light pill
className="px-4 py-2 bg-[#F0EBD8] rounded-full text-sm font-medium text-[#666]"

// Status badge (success)
className="px-3 py-1 bg-[#93C01F]/20 text-[#93C01F] rounded-full text-xs font-semibold"

// Status badge (warning/gold)
className="px-3 py-1 bg-[#EAD07D]/20 text-[#EAD07D] rounded-full text-xs font-semibold"

// Neutral status
className="px-2.5 py-1 bg-[#F8F8F6] rounded-md text-xs font-medium text-[#666]"
```

### Icon Containers

```tsx
// Gold background
className="w-11 h-11 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A]"

// Dark background
className="w-11 h-11 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-white"

// Light background
className="w-10 h-10 rounded-xl bg-[#F8F8F6] flex items-center justify-center text-[#666]"

// Success
className="w-10 h-10 rounded-xl bg-[#93C01F]/20 flex items-center justify-center text-[#93C01F]"

// Circular numbered
className="w-7 h-7 rounded-full bg-[#EAD07D] flex items-center justify-center text-xs font-semibold text-[#1A1A1A]"
```

### Progress Bars & Charts

```tsx
// Progress track
className="h-3 bg-[#F0EBD8] rounded-full overflow-hidden"

// Progress fill
className="h-full bg-[#EAD07D] rounded-full transition-all duration-500"

// Bar chart bars
className="bg-[#EAD07D] rounded-xl"  // accent
className="bg-[#1A1A1A] rounded-xl"  // dark/current
className="bg-[#F0EBD8] rounded-xl"  // inactive
```

### Tables

```tsx
// Light table (on white card)
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-black/5">
      <th className="px-4 py-3 text-left font-medium text-[#666]">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-black/5 hover:bg-[#F8F8F6]">
      <td className="px-4 py-4 text-[#1A1A1A]">Content</td>
    </tr>
  </tbody>
</table>

// Dark table (on dark card)
<table className="w-full text-sm">
  <thead>
    <tr className="border-b border-white/10">
      <th className="px-4 py-3 text-left font-medium text-white/60">Column</th>
    </tr>
  </thead>
  <tbody>
    <tr className="border-b border-white/5 hover:bg-white/5">
      <td className="px-4 py-4 text-white">Content</td>
    </tr>
  </tbody>
</table>
```

### Empty States

```tsx
<div className="h-48 flex items-center justify-center text-center">
  <div>
    <IconComponent size={40} className="text-[#999] mx-auto mb-3 opacity-40" />
    <p className="text-[#666]">No data available</p>
    <p className="text-sm text-[#999]">Additional context here</p>
  </div>
</div>
```

### Modals

```tsx
<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-3xl w-full max-w-lg animate-in fade-in zoom-in duration-200">
    <div className="flex justify-between items-center p-8 pb-0">
      <h2 className="text-2xl font-medium text-[#1A1A1A]">Modal Title</h2>
      <button className="text-[#666] hover:text-[#1A1A1A]">
        <X size={24} />
      </button>
    </div>
    <div className="p-8 pt-6">
      {/* Content */}
    </div>
  </div>
</div>
```

---

## Page Layout Pattern

```tsx
export default function PageName() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-light text-[#1A1A1A]">Page Title</h1>
            <p className="text-[#666] mt-1">Page description here</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Action buttons */}
          </div>
        </div>

        {/* Metric Cards (if applicable) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* MetricCard components */}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Content sections */}
        </div>
      </div>
    </div>
  );
}
```

---

## Status Color Mapping

Use these consistent colors for status badges throughout the app:

```tsx
const STATUS_COLORS = {
  // Order/Quote Status
  DRAFT: 'bg-[#F8F8F6] text-[#666]',
  PENDING: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  PROCESSING: 'bg-[#EAD07D]/30 text-[#1A1A1A]',
  SHIPPED: 'bg-purple-100 text-purple-700',
  DELIVERED: 'bg-[#93C01F]/20 text-[#93C01F]',
  COMPLETED: 'bg-[#93C01F]/20 text-[#93C01F]',
  CANCELLED: 'bg-red-100 text-red-700',

  // Payment Status
  PAID: 'bg-[#93C01F]/20 text-[#93C01F]',
  PARTIAL: 'bg-[#EAD07D]/20 text-[#1A1A1A]',
  REFUNDED: 'bg-orange-100 text-orange-700',
  FAILED: 'bg-red-100 text-red-700',

  // Generic
  ACTIVE: 'bg-[#93C01F]/20 text-[#93C01F]',
  INACTIVE: 'bg-[#F8F8F6] text-[#666]',
};
```

---

## File Structure

```
/opt/salesos.org/
├── pages/
│   ├── dashboard/           # Dashboard pages
│   │   ├── DashboardHome.tsx
│   │   ├── Deals.tsx
│   │   ├── Leads.tsx
│   │   ├── Quotes.tsx
│   │   ├── Orders.tsx
│   │   ├── CPQAnalytics.tsx
│   │   └── settings/        # Settings sub-pages
│   └── ...                  # Public pages
├── src/
│   ├── api/                 # API client functions
│   ├── hooks/               # React Query hooks
│   ├── types/               # TypeScript types
│   ├── context/             # React contexts
│   └── components/          # Shared components
│       ├── ui/              # Base UI components
│       └── ...
├── components/
│   └── ui/                  # Legacy UI components
└── layouts/
    └── DashboardLayout.tsx
```

---

## Backend API

- **Base URL**: `/api`
- **Auth**: JWT Bearer tokens
- **Backend Path**: `/opt/salesos.org/api/`

### Common Endpoints

```
GET    /api/quotes           # List quotes
GET    /api/quotes/:id       # Get quote
POST   /api/quotes           # Create quote
PATCH  /api/quotes/:id       # Update quote
GET    /api/quotes/stats     # Quote statistics

GET    /api/orders           # List orders
GET    /api/orders/:id       # Get order
POST   /api/orders           # Create order
GET    /api/orders/stats     # Order statistics

GET    /api/analytics/cpq/*  # CPQ Analytics endpoints
```

---

## Development Commands

```bash
# Frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Lint code

# Backend (in /opt/salesos.org/api/)
npm run build        # Build NestJS
pm2 restart iris-backend  # Restart backend

# Database
npx prisma migrate   # Run migrations
npx prisma generate  # Generate Prisma client
```

---

## Best Practices

1. **Always use brand colors** - Never use generic Tailwind colors (gray-500, blue-600) for UI elements. Use the brand palette.

2. **Consistent border radius** - Use `rounded-[32px]` for large cards, `rounded-[24px]` for smaller cards, `rounded-full` for buttons/pills, `rounded-xl` for inputs.

3. **Shadows** - Use `shadow-sm border border-black/5` for subtle elevation on light backgrounds.

4. **Loading states** - Use `<Skeleton />` component with appropriate heights and border-radius.

5. **Empty states** - Always provide helpful empty states with icons and action buttons.

6. **Dark sections** - Use `bg-[#1A1A1A]` with `text-white` and `text-white/60` for muted text.

7. **Form inputs** - Use `bg-[#F8F8F6]` background with focus state transitioning to white.

8. **Icons** - Use Lucide React icons consistently. Size 16-20 for inline, 24+ for decorative.
