import { 
  Zap, 
  BarChart3, 
  Globe, 
  ShieldCheck, 
  Users, 
} from 'lucide-react';
import { NavItem, Feature, PricingTier, Testimonial, Differentiator } from './types';

export const NAV_ITEMS: NavItem[] = [
  { label: 'Product', href: '/product' },
  { label: 'Features', href: '/features' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'Company', href: '/about' },
];

export const FEATURES: Feature[] = [
  {
    id: '1',
    title: 'AI Pipeline Intelligence',
    description: 'Predictive forecasting that analyzes thousands of touchpoints to tell you exactly which deals will close.',
    icon: Zap,
    colSpan: 2,
  },
  {
    id: '2',
    title: 'Global Data Enrichment',
    description: 'Instantly enrich lead profiles with verified contact data from 150+ countries.',
    icon: Globe,
    colSpan: 1,
  },
  {
    id: '3',
    title: 'Automated Outreach',
    description: 'Multi-channel sequences that adapt to prospect behavior in real-time.',
    icon: Users,
    colSpan: 1,
  },
  {
    id: '4',
    title: 'Enterprise Security',
    description: 'SOC2 Type II certified with granular permission controls.',
    icon: ShieldCheck,
    colSpan: 2,
  },
];

export const DIFFERENTIATORS: Differentiator[] = [
  {
    id: '1',
    title: 'Context, not just contacts',
    description: 'Traditional CRMs give you lists. SalesOS builds dynamic graphs of relationships, intent, and timing so you know exactly when to strike.',
    metric: '3x',
    metricLabel: 'Higher Conversion',
  },
  {
    id: '2',
    title: 'Automated to the bone',
    description: 'Stop data entry. SalesOS syncs emails, calls, meetings, and LinkedIn touches automatically, giving you 10+ hours back every week.',
    metric: '10h+',
    metricLabel: 'Saved Weekly',
  },
  {
    id: '3',
    title: 'Day one ROI',
    description: 'No 6-month implementation cycles. Connect your email, import your leads, and start closing deals in under 15 minutes.',
    metric: '15m',
    metricLabel: 'Setup Time',
  },
];

export const PRICING_TIERS: PricingTier[] = [
  {
    name: 'Starter',
    price: '$49',
    description: 'Perfect for small teams getting started.',
    features: ['Up to 1,000 leads/mo', 'Basic Email Automation', 'CRM Integration', 'Community Support'],
    highlight: false,
    cta: 'Start Free',
  },
  {
    name: 'Growth',
    price: '$129',
    description: 'For scaling teams that need power.',
    features: ['Unlimited leads', 'Multi-channel sequencing', 'AI Writing Assistant', 'Advanced Analytics', 'Priority Support'],
    highlight: true,
    cta: 'Get Started',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'Custom solutions for global organizations.',
    features: ['Dedicated Success Manager', 'Custom API Access', 'SSO & Advanced Security', 'Custom AI Models'],
    highlight: false,
    cta: 'Contact Sales',
  },
];

export const TESTIMONIALS: Testimonial[] = [
  {
    name: "Elena Rigby",
    role: "VP of Sales",
    company: "TechFlow",
    avatar: "https://picsum.photos/100/100?random=1",
    content: "SalesOS transformed our chaotic pipeline into a predictable revenue machine. The AI insights are scary good."
  },
  {
    name: "Marcus Chen",
    role: "Founder",
    company: "Novus",
    avatar: "https://picsum.photos/100/100?random=2",
    content: "We reduced our ramp time by 40% and doubled our close rates within two months of implementing SalesOS."
  }
];