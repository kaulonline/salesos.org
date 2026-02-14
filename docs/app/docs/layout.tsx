import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import type { ReactNode } from 'react';
import { Command } from 'lucide-react';
import { docsSource } from '@/lib/source';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <DocsLayout
      tree={docsSource.pageTree}
      nav={{
        title: (
          <span className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-[#1A1A1A] flex items-center justify-center text-white">
              <Command size={15} />
            </span>
            <span className="font-bold tracking-tight">SalesOS<span className="text-[#EAD07D]">.</span></span>
          </span>
        ),
      }}
      sidebar={{
        banner: (
          <div className="flex flex-col gap-1 px-2 mb-2">
            <a
              href="/user-guide"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#666] hover:bg-[#F8F8F6]"
            >
              User Guide
            </a>
            <a
              href="/docs"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#1A1A1A] bg-[#EAD07D]/20"
            >
              Guides
            </a>
            <a
              href="/api-reference"
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-[#666] hover:bg-[#F8F8F6]"
            >
              API Reference
            </a>
          </div>
        ),
      }}
    >
      {children}
    </DocsLayout>
  );
}
