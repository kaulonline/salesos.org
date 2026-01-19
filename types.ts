import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
}

export interface Feature {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  colSpan?: number; 
}

export interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlight: boolean;
  cta: string;
}

export interface Testimonial {
  name: string;
  role: string;
  company: string;
  avatar: string;
  content: string;
}

export interface Differentiator {
  id: string;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
}