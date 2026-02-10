import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { ArrowRight } from 'lucide-react';
import { SEOHead, SEO_CONFIGS } from '../src/components/SEOHead';

const POSTS = [
    { title: "The Death of the Cold Call", cat: "Strategy", date: "Mar 10" },
    { title: "How to Structure a Modern RevOps Team", cat: "Operations", date: "Mar 05" },
    { title: "Why AI Won't Replace Sales Reps (Yet)", cat: "AI", date: "Feb 28" },
    { title: "5 Email Templates That Actually Get Replies", cat: "Tactical", date: "Feb 20" },
    { title: "Q1 2024 SaaS Benchmarks Report", cat: "Data", date: "Feb 15" },
    { title: "Mastering the Discovery Call", cat: "Tactical", date: "Feb 01" },
];

export const Blog: React.FC = () => {
  return (
    <>
      <SEOHead {...SEO_CONFIGS.blog} />
      <PageLayout
        title="The Revenue Blog"
        subtitle="Insights, tactics, and data for modern sales leaders."
      >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {POSTS.map((post, i) => (
            <article key={i} className="bg-white rounded-[1.5rem] p-6 md:p-8 border border-black/5 hover:border-[#EAD07D] transition-all group shadow-soft hover:shadow-card cursor-pointer h-full flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-xs font-bold uppercase tracking-wider text-[#EAD07D] bg-[#1A1A1A] px-2 py-1 rounded">{post.cat}</span>
                    <span className="text-sm text-[#888]">{post.date}</span>
                </div>
                <h3 className="text-xl font-bold text-[#1A1A1A] mb-4 group-hover:text-[#EAD07D] transition-colors line-clamp-2">{post.title}</h3>
                <p className="text-[#666] text-sm mb-8 line-clamp-3 flex-1">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </p>
                <div className="flex items-center text-sm font-bold text-[#1A1A1A]">
                    Read Article <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                </div>
            </article>
        ))}
      </div>
    </PageLayout>
    </>
  );
};