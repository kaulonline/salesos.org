import { ArrowRight, Download, CheckCircle2, FileText, HelpCircle } from 'lucide-react';

export default function PipedriveMigration() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-block px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] mb-4">
            Migration Guide
          </div>
          <h1 className="text-4xl lg:text-5xl font-light text-[#1A1A1A] mb-4">
            Migrating from Pipedrive to SalesOS
          </h1>
          <p className="text-xl text-[#666]">
            Complete your Pipedrive migration in 20-30 minutes with our step-by-step guide
          </p>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-black/5">
            <p className="text-3xl font-light text-[#EAD07D] mb-2">20-30min</p>
            <p className="text-sm text-[#666]">Average migration time</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-black/5">
            <p className="text-3xl font-light text-[#93C01F] mb-2">95%+</p>
            <p className="text-sm text-[#666]">Auto-mapping accuracy</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-black/5">
            <p className="text-3xl font-light text-[#1A1A1A] mb-2">4 Steps</p>
            <p className="text-sm text-[#666]">Simple migration process</p>
          </div>
        </div>

        {/* What You Can Migrate */}
        <div className="bg-[#F0EBD8] rounded-3xl p-8 mb-12">
          <h2 className="text-2xl font-medium text-[#1A1A1A] mb-6">What You Can Migrate</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Persons', desc: 'All contact data with full details' },
              { name: 'Organizations', desc: 'Company records and business information' },
              { name: 'Deals', desc: 'Sales pipeline and deal tracking data' },
              { name: 'Custom Fields', desc: 'All custom fields and data points' },
            ].map((item) => (
              <div key={item.name} className="flex items-start gap-3">
                <CheckCircle2 size={20} className="text-[#93C01F] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A]">{item.name}</p>
                  <p className="text-sm text-[#666]">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Export from Pipedrive */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-lg font-semibold text-[#1A1A1A]">
              1
            </div>
            <h2 className="text-3xl font-light text-[#1A1A1A]">Export Your Data from Pipedrive</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-black/5">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-4">Data Export Process</h3>
            <ol className="space-y-4 mb-8">
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">1.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Click your profile icon and go to <strong>Settings</strong>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">2.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Navigate to <strong>Data fields</strong> → <strong>Import and export</strong>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">3.</span>
                <div>
                  <p className="text-[#1A1A1A]">Click the <strong>"Export data"</strong> tab</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">4.</span>
                <div>
                  <p className="text-[#1A1A1A]">Select the data type to export:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-[#666] space-y-1">
                    <li>Persons (Contacts)</li>
                    <li>Organizations (Companies)</li>
                    <li>Deals</li>
                    <li>Activities (optional)</li>
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">5.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Choose <strong>"All fields"</strong> to include custom fields
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">6.</span>
                <div>
                  <p className="text-[#1A1A1A]">Click <strong>"Export"</strong></p>
                  <p className="text-sm text-[#666] mt-1">
                    The CSV file will download immediately to your computer
                  </p>
                </div>
              </li>
            </ol>

            <div className="bg-[#EAD07D]/20 rounded-2xl p-4 flex items-start gap-3">
              <HelpCircle size={20} className="text-[#1A1A1A] mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A] mb-1">Pro Tip</p>
                <p className="text-sm text-[#666]">
                  Pipedrive has a simple, clean data structure. Export Organizations first, then Persons, then Deals to maintain relationships. Names are stored in a single field instead of separate first/last name fields.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2: Prepare Your Files */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-lg font-semibold text-[#1A1A1A]">
              2
            </div>
            <h2 className="text-3xl font-light text-[#1A1A1A]">Prepare Your CSV Files</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-black/5">
            <p className="text-[#666] mb-6">
              Pipedrive exports clean CSV files that are typically ready to import. Here's what to expect:
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">Persons_export.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Name, Email, Phone, Organization, Job Title, Owner, etc.
                  </p>
                  <p className="text-xs text-[#999] mt-1">Note: Name is typically a single field (e.g., "John Smith" not separate First/Last)</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">Organizations_export.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Name, Address, Owner, Website, Industry, People count, etc.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">Deals_export.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Title, Stage, Value, Expected close date, Person, Organization, Owner, etc.
                  </p>
                  <p className="text-xs text-[#999] mt-1">Note: Deal currency may need to be standardized</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3: Import to SalesOS */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-lg font-semibold text-[#1A1A1A]">
              3
            </div>
            <h2 className="text-3xl font-light text-[#1A1A1A]">Import to SalesOS</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-black/5">
            <ol className="space-y-4 mb-6">
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">1.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Go to <strong>Settings</strong> → <strong>Migration</strong> in SalesOS
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">2.</span>
                <div>
                  <p className="text-[#1A1A1A]">Select <strong>"Pipedrive"</strong> as your source CRM</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">3.</span>
                <div>
                  <p className="text-[#1A1A1A]">Choose the entity type (Persons, Organizations, or Deals)</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">4.</span>
                <div>
                  <p className="text-[#1A1A1A]">Upload your CSV file</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">5.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Review the AI-suggested field mappings (typically 95%+ accurate for Pipedrive)
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">6.</span>
                <div>
                  <p className="text-[#1A1A1A]">Click <strong>"Start Import"</strong> and wait for completion</p>
                </div>
              </li>
            </ol>

            <div className="flex gap-4">
              <a
                href="/dashboard/settings/migration"
                className="px-6 py-3 bg-[#1A1A1A] text-white rounded-full font-medium text-sm hover:bg-[#333] transition-colors inline-flex items-center gap-2"
              >
                Start Migration
                <ArrowRight size={16} />
              </a>
              <button
                onClick={() => window.open('/api/import-export/crm-template-download/pipedrive/PERSON')}
                className="px-6 py-3 border border-black/10 text-[#666] rounded-full font-medium text-sm hover:bg-white transition-colors inline-flex items-center gap-2"
              >
                <Download size={16} />
                Download Template
              </button>
            </div>
          </div>
        </div>

        {/* Common Issues */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-lg font-semibold text-[#1A1A1A]">
              4
            </div>
            <h2 className="text-3xl font-light text-[#1A1A1A]">Common Issues & Solutions</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-black/5">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Names not splitting correctly"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Pipedrive stores person names in a single "Name" field (e.g., "John Smith").
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> SalesOS will automatically attempt to split full names into First Name and Last Name. Review the preview before importing.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Organization relationships missing"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Import Organizations before Persons to maintain relationships.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Recommended order:</strong> 1. Organizations → 2. Persons → 3. Deals
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Currency values not matching"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Pipedrive exports deal values with currency symbols which may vary.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> Ensure all currency values are in the same format, or set your default currency in SalesOS before importing.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Pipeline stages not recognized"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Pipedrive's custom pipeline stages need to be mapped to SalesOS stages.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> Create matching pipeline stages in SalesOS before importing, or map Pipedrive stages to existing SalesOS stages during import.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Need Help */}
        <div className="bg-[#1A1A1A] rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-medium text-white mb-3">Need Migration Assistance?</h2>
          <p className="text-white/60 mb-6">
            Our migration specialists are here to help you move your data safely and quickly.
          </p>
          <a
            href="mailto:migrations@salesos.com"
            className="px-6 py-3 bg-white text-[#1A1A1A] rounded-full font-medium text-sm hover:bg-white/90 transition-colors inline-block"
          >
            Contact Migration Support
          </a>
        </div>
      </div>
    </div>
  );
}
