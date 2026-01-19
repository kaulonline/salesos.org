import React from 'react';
import { PageLayout } from '../components/PageLayout';
import { Button } from '../components/ui/Button';

const JOBS = [
    { title: "Senior Account Executive", dept: "Sales", loc: "New York / Remote" },
    { title: "Product Designer", dept: "Product", loc: "Remote" },
    { title: "Backend Engineer (Node.js)", dept: "Engineering", loc: "San Francisco" },
    { title: "Customer Success Manager", dept: "CS", loc: "London" },
];

export const Careers: React.FC = () => {
  return (
    <PageLayout 
      title="Join the Team" 
      subtitle="Help us redefine how the world does business. We're hiring across all roles."
      narrow
    >
      <div className="bg-[#1A1A1A] text-white rounded-[2rem] p-10 mb-16 text-center">
          <h3 className="text-2xl font-bold mb-4">Work with the best</h3>
          <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              We offer competitive equity, comprehensive health benefits, and a remote-first culture that values output over hours.
          </p>
          <Button variant="secondary">View Culture Deck</Button>
      </div>

      <div className="space-y-4">
          <h3 className="text-xl font-bold text-[#1A1A1A] mb-6">Open Positions</h3>
          {JOBS.map((job, i) => (
              <div key={i} className="bg-white p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between border border-black/5 hover:border-[#EAD07D] transition-colors group">
                  <div className="text-center sm:text-left mb-4 sm:mb-0">
                      <h4 className="font-bold text-[#1A1A1A] text-lg">{job.title}</h4>
                      <p className="text-sm text-[#666]">{job.dept} • {job.loc}</p>
                  </div>
                  <Button variant="outline" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">Apply Now</Button>
              </div>
          ))}
      </div>
    </PageLayout>
  );
};