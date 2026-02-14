import { ArrowRight, Download, CheckCircle2, FileText, HelpCircle } from 'lucide-react';

export default function HubSpotMigration() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-block px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] mb-4">
            Migration Guide
          </div>
          <h1 className="text-4xl lg:text-5xl font-light text-[#1A1A1A] mb-4">
            Migrating from HubSpot to SalesOS
          </h1>
          <p className="text-xl text-[#666]">
            Complete your HubSpot migration in 30-45 minutes with our step-by-step guide
          </p>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-black/5">
            <p className="text-3xl font-light text-[#EAD07D] mb-2">30-45min</p>
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
              { name: 'Contacts', desc: 'All contact data including custom properties' },
              { name: 'Companies', desc: 'Company records with domain and industry data' },
              { name: 'Deals', desc: 'Sales pipeline and deal information' },
              { name: 'Custom Properties', desc: 'Custom fields and data points' },
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

        {/* Step 1: Export from HubSpot */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-lg font-semibold text-[#1A1A1A]">
              1
            </div>
            <h2 className="text-3xl font-light text-[#1A1A1A]">Export Your Data from HubSpot</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-black/5">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-4">Contacts & Companies Export</h3>
            <ol className="space-y-4 mb-8">
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">1.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Go to <strong>Contacts</strong> in the main navigation
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">2.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Click <strong>"Export"</strong> in the top right corner
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">3.</span>
                <div>
                  <p className="text-[#1A1A1A]">Select what to export:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-[#666] space-y-1">
                    <li><strong>"All contacts"</strong> or use a saved view to filter</li>
                    <li>Choose <strong>"All properties"</strong> to include custom fields</li>
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">4.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Select format: <strong>"One file per property type (.xls)"</strong>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">5.</span>
                <div>
                  <p className="text-[#1A1A1A]">Click <strong>"Export"</strong></p>
                  <p className="text-sm text-[#666] mt-1">
                    HubSpot will prepare your file and email you a download link
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">6.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Repeat for <strong>Companies</strong> and <strong>Deals</strong> by navigating to each section
                  </p>
                </div>
              </li>
            </ol>

            <div className="bg-[#EAD07D]/20 rounded-2xl p-4 flex items-start gap-3">
              <HelpCircle size={20} className="text-[#1A1A1A] mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A] mb-1">Pro Tip</p>
                <p className="text-sm text-[#666]">
                  HubSpot uses "properties" instead of "fields". Make sure to export all properties to include your custom data. Save the Excel files as CSV format before importing.
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
              HubSpot exports as Excel files (.xls). Convert them to CSV format and here's what to expect:
            </p>

            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">contacts.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: First Name, Last Name, Email, Phone Number, Company name, Job Title, etc.
                  </p>
                  <p className="text-xs text-[#999] mt-1">Note: Property names use spaces and lowercase (e.g., "First Name" not "FirstName")</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">companies.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Name, Domain, Industry, City, State, Annual Revenue, Number of Employees, etc.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">deals.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Deal Name, Deal Stage, Amount, Close Date, Pipeline, Deal Owner, etc.
                  </p>
                  <p className="text-xs text-[#999] mt-1">Note: Stages are exported with full names (e.g., "Qualified to Buy" not "qualified")</p>
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
                  <p className="text-[#1A1A1A]">Select <strong>"HubSpot"</strong> as your source CRM</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">3.</span>
                <div>
                  <p className="text-[#1A1A1A]">Choose the entity type (Contacts, Companies, or Deals)</p>
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
                    Review the AI-suggested field mappings (typically 95%+ accurate for HubSpot)
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
                onClick={() => window.open('/api/import-export/crm-template-download/hubspot/CONTACT')}
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
                  "Excel file won't import"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  HubSpot exports .xls files, but SalesOS requires CSV format.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> Open the .xls file in Excel or Google Sheets, then save as CSV format before importing.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Company associations aren't preserved"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Import Companies first, then Contacts and Deals.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Recommended order:</strong> 1. Companies → 2. Contacts → 3. Deals
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Custom properties not mapping correctly"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  HubSpot's property names may have spaces and special characters.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> In the field mapping step, manually assign your custom HubSpot properties to SalesOS fields or create new custom fields.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Deal stages not recognized"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  HubSpot exports full stage names which may differ from SalesOS defaults.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> Create matching deal stages in SalesOS before importing, or map HubSpot stages to existing SalesOS stages during import.
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
