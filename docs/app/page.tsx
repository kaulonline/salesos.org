import Link from 'next/link';
import {
  Shield,
  Users,
  Webhook,
  ShoppingCart,
  BrainCircuit,
  Plug,
  BookOpen,
  Command,
} from 'lucide-react';

const features = [
  {
    icon: BookOpen,
    title: 'User Guide',
    description: 'End-to-end documentation for sales reps, managers, and admins.',
    href: '/user-guide',
  },
  {
    icon: Shield,
    title: 'Authentication',
    description: 'JWT tokens, API keys, OAuth, and 2FA for secure access.',
    href: '/docs/authentication',
  },
  {
    icon: Users,
    title: 'CRM Objects',
    description: 'Leads, contacts, accounts, opportunities, and more.',
    href: '/api-reference',
  },
  {
    icon: Webhook,
    title: 'Webhooks',
    description: 'Real-time event notifications for your integrations.',
    href: '/docs/webhooks',
  },
  {
    icon: ShoppingCart,
    title: 'CPQ & Orders',
    description: 'Quotes, orders, products, and price books.',
    href: '/api-reference',
  },
  {
    icon: BrainCircuit,
    title: 'AI Coaching',
    description: 'Sales coaching insights, goals, and effectiveness tracking.',
    href: '/api-reference',
  },
  {
    icon: Plug,
    title: 'Integrations',
    description: 'Connect with Salesforce, HubSpot, Slack, Stripe, and 30+ more.',
    href: '/api-reference',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F2F1EA]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 lg:px-12 py-5 max-w-[1400px] mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white shadow-lg shadow-[#1A1A1A]/20">
            <Command size={16} />
          </div>
          <span className="font-semibold text-[#1A1A1A] text-lg">
            SalesOS<span className="text-[#EAD07D]">.</span> <span className="text-[#999] font-normal">Docs</span>
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/user-guide"
            className="text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            User Guide
          </Link>
          <Link
            href="/docs"
            className="text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            Guides
          </Link>
          <Link
            href="/api-reference"
            className="text-sm font-medium text-[#666] hover:text-[#1A1A1A] transition-colors"
          >
            API Reference
          </Link>
          <Link
            href="https://www.salesos.org"
            className="px-4 py-2 rounded-full bg-[#1A1A1A] text-white text-sm font-medium hover:bg-[#333] transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 lg:px-12 pt-16 pb-20 max-w-[1400px] mx-auto text-center">
        <div className="inline-flex px-4 py-1.5 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] mb-6">
          API v1.0
        </div>
        <h1 className="text-4xl lg:text-6xl font-light text-[#1A1A1A] mb-4 tracking-tight">
          Build with the{' '}
          <span className="font-medium">SalesOS API</span>
        </h1>
        <p className="text-lg text-[#666] max-w-2xl mx-auto mb-10">
          Everything you need to integrate with the SalesOS CRM platform.
          400+ endpoints across 40+ modules.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/user-guide"
            className="px-6 py-3 rounded-full bg-[#1A1A1A] text-white font-medium text-sm hover:bg-[#333] transition-colors"
          >
            User Guide
          </Link>
          <Link
            href="/docs"
            className="px-6 py-3 rounded-full border border-black/10 text-[#666] font-medium text-sm hover:bg-white transition-colors"
          >
            Developer Guides
          </Link>
          <Link
            href="/api-reference"
            className="px-6 py-3 rounded-full border border-black/10 text-[#666] font-medium text-sm hover:bg-white transition-colors"
          >
            API Reference
          </Link>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-6 lg:px-12 pb-20 max-w-[1400px] mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((feature) => (
            <Link
              key={feature.title}
              href={feature.href}
              className="bg-white rounded-[32px] p-7 shadow-sm border border-black/5 hover:shadow-md transition-shadow group"
            >
              <div className="w-11 h-11 rounded-xl bg-[#EAD07D]/20 flex items-center justify-center text-[#1A1A1A] mb-4">
                <feature.icon size={22} />
              </div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1.5 group-hover:text-[#1A1A1A]">
                {feature.title}
              </h3>
              <p className="text-sm text-[#666] leading-relaxed">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* Base URL Section */}
      <section className="px-6 lg:px-12 pb-20 max-w-[1400px] mx-auto">
        <div className="bg-[#1A1A1A] rounded-[32px] p-8 lg:p-12">
          <h2 className="text-2xl font-medium text-white mb-2">Base URL</h2>
          <p className="text-white/60 mb-6">
            All API requests should be made to the following base URL.
          </p>
          <div className="bg-white/10 rounded-2xl p-5 border border-white/10">
            <code className="text-[#EAD07D] text-sm lg:text-base font-mono">
              https://www.salesos.org/api
            </code>
          </div>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">
                Format
              </p>
              <p className="text-white text-sm font-medium">REST / JSON</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">
                Authentication
              </p>
              <p className="text-white text-sm font-medium">Bearer JWT / API Key</p>
            </div>
            <div>
              <p className="text-white/60 text-xs uppercase tracking-wider mb-1">
                Real-time
              </p>
              <p className="text-white text-sm font-medium">Socket.io WebSockets</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 lg:px-12 py-8 max-w-[1400px] mx-auto border-t border-black/5">
        <div className="flex items-center justify-between">
          <p className="text-sm text-[#999]">
            &copy; {new Date().getFullYear()} SalesOS. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link
              href="https://www.salesos.org"
              className="text-sm text-[#666] hover:text-[#1A1A1A] transition-colors"
            >
              salesos.org
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
