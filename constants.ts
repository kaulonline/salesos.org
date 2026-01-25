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
    description: 'Predictive forecasting that analyzes thousands of touchpoints to tell you exactly which deals will close and when.',
    icon: Zap,
    colSpan: 2,
  },
  {
    id: '2',
    title: 'Global Data Enrichment',
    description: 'Instantly enrich lead profiles with verified contact data from 150+ countries. Always up-to-date.',
    icon: Globe,
    colSpan: 1,
  },
  {
    id: '3',
    title: 'Automated Outreach',
    description: 'Multi-channel sequences that adapt to prospect behavior in real-time across email, phone, and social.',
    icon: Users,
    colSpan: 1,
  },
  {
    id: '4',
    title: 'Enterprise Security',
    description: 'SOC2 Type II certified with granular permission controls, SSO, and data residency options.',
    icon: ShieldCheck,
    colSpan: 1,
  },
  {
    id: '5',
    title: 'Revenue Analytics',
    description: 'Real-time dashboards and reports that give you complete visibility into your sales performance.',
    icon: BarChart3,
    colSpan: 1,
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
    price: '$29',
    period: '/ month',
    description: 'Perfect for small teams getting started with AI-powered sales. Essential tools to close deals faster.',
    features: [
      'Up to 3 team members',
      '1,000 AI conversations/month',
      'Lead & contact management',
      'Basic pipeline tracking',
      'Email integration',
      'Mobile app access',
    ],
    notIncluded: [
      'Advanced analytics',
      'Custom integrations',
      'Priority support',
    ],
    highlight: false,
    badge: 'Starter',
    cta: 'Start Free Trial',
  },
  {
    name: 'Professional',
    price: '$79',
    originalPrice: '$99',
    period: '/ month',
    description: 'For growing sales teams that need advanced AI insights and automation to scale revenue.',
    features: [
      'Up to 10 team members',
      '10,000 AI conversations/month',
      'Advanced pipeline analytics',
      'Meeting intelligence & recording',
      'Custom fields & workflows',
      'Salesforce & HubSpot sync',
      'API access',
      'Priority email support',
    ],
    notIncluded: [
      'Dedicated success manager',
      'Custom SLA',
    ],
    highlight: true,
    badge: 'Most Popular',
    cta: 'Start Free Trial',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/ month',
    description: 'Full-featured solution for large teams with custom requirements and enterprise-grade security.',
    features: [
      'Unlimited team members',
      'Unlimited AI conversations',
      'Advanced forecasting & analytics',
      'Custom integrations & webhooks',
      'SSO & advanced security',
      'Dedicated success manager',
      'Custom SLA & onboarding',
      '24/7 priority support',
      'Data residency options',
    ],
    notIncluded: [],
    highlight: false,
    badge: 'Enterprise',
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