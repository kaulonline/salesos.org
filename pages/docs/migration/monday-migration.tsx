import { ArrowRight, Download, CheckCircle2, FileText, HelpCircle } from 'lucide-react';

export default function MondayMigration() {
  return (
    <div className="min-h-screen p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-block px-4 py-2 bg-[#EAD07D] rounded-full text-sm font-semibold text-[#1A1A1A] mb-4">
            Migration Guide
          </div>
          <h1 className="text-4xl lg:text-5xl font-light text-[#1A1A1A] mb-4">
            Migrating from Monday.com to SalesOS
          </h1>
          <p className="text-xl text-[#666]">
            Complete your Monday.com migration in 30-45 minutes with our step-by-step guide
          </p>
        </div>

        {/* Quick Facts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
          <div className="bg-white rounded-2xl p-6 border border-black/5">
            <p className="text-3xl font-light text-[#EAD07D] mb-2">30-45min</p>
            <p className="text-sm text-[#666]">Average migration time</p>
          </div>
          <div className="bg-white rounded-2xl p-6 border border-black/5">
            <p className="text-3xl font-light text-[#93C01F] mb-2">90%+</p>
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
              { name: 'Board Items', desc: 'Convert Monday items to leads or deals' },
              { name: 'Contact Columns', desc: 'Contact information and email columns' },
              { name: 'Status & Progress', desc: 'Status columns and deal stages' },
              { name: 'Custom Columns', desc: 'All custom column types and data' },
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

        {/* Step 1: Export from Monday */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-[#EAD07D] flex items-center justify-center text-lg font-semibold text-[#1A1A1A]">
              1
            </div>
            <h2 className="text-3xl font-light text-[#1A1A1A]">Export Your Data from Monday.com</h2>
          </div>

          <div className="bg-white rounded-3xl p-8 border border-black/5">
            <h3 className="text-xl font-medium text-[#1A1A1A] mb-4">Board Export Process</h3>
            <ol className="space-y-4 mb-8">
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">1.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Open the board you want to export (e.g., Leads, Deals, or Contacts board)
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">2.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Click the <strong>board menu</strong> (three dots) in the top right corner
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">3.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Select <strong>"Export board to Excel"</strong>
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">4.</span>
                <div>
                  <p className="text-[#1A1A1A]">Choose export options:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-[#666] space-y-1">
                    <li>Select <strong>"All items"</strong> or filtered view</li>
                    <li>Ensure all columns are visible before exporting</li>
                  </ul>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">5.</span>
                <div>
                  <p className="text-[#1A1A1A]">Download the Excel file</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">6.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Open in Excel or Google Sheets and <strong>save as CSV format</strong>
                  </p>
                  <p className="text-sm text-[#666] mt-1">
                    File → Save As → Choose "CSV (Comma delimited)"
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">7.</span>
                <div>
                  <p className="text-[#1A1A1A]">
                    Repeat for each board (Leads, Deals, Contacts, Accounts)
                  </p>
                </div>
              </li>
            </ol>

            <div className="bg-[#EAD07D]/20 rounded-2xl p-4 flex items-start gap-3">
              <HelpCircle size={20} className="text-[#1A1A1A] mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A] mb-1">Pro Tip</p>
                <p className="text-sm text-[#666]">
                  Monday.com uses highly customizable boards with flexible column names. Before exporting, rename key columns to match standard CRM fields (e.g., "Person Name" → "Name", "Email Address" → "Email") to improve auto-mapping accuracy.
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
              Monday.com exports are highly variable based on your custom board structure. Here's what to expect:
            </p>

            <div className="space-y-4 mb-6">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">Leads_board.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Item Name, Status, Person (Contact), Email, Phone, Company, Priority, etc.
                  </p>
                  <p className="text-xs text-[#999] mt-1">Note: Column names vary by board - may need manual mapping</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">Deals_board.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Deal Name, Status/Stage, Budget/Value, Owner, Timeline, Contact, etc.
                  </p>
                  <p className="text-xs text-[#999] mt-1">Note: Status labels are custom - will need mapping to SalesOS stages</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-xl bg-[#F8F8F6]">
                <FileText size={20} className="text-[#666] mt-0.5" />
                <div>
                  <p className="font-medium text-[#1A1A1A] mb-1">Contacts_board.csv</p>
                  <p className="text-sm text-[#666]">
                    Contains: Name, Email, Phone, Company, Job Title, Status, Last Contact, etc.
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-2xl p-4 flex items-start gap-3">
              <HelpCircle size={20} className="text-blue-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[#1A1A1A] mb-1">Important: Clean Your Data</p>
                <p className="text-sm text-[#666] mb-2">
                  Monday.com exports may include formatting that needs cleanup:
                </p>
                <ul className="list-disc list-inside ml-2 text-sm text-[#666] space-y-1">
                  <li>Remove group/section header rows (they have no data, just labels)</li>
                  <li>Convert date columns to standard format (MM/DD/YYYY)</li>
                  <li>Extract email addresses from "Person" columns if they contain names</li>
                  <li>Standardize status/stage values</li>
                </ul>
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
                  <p className="text-[#1A1A1A]">Select <strong>"Monday.com"</strong> as your source</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">3.</span>
                <div>
                  <p className="text-[#1A1A1A]">Choose the entity type:</p>
                  <ul className="list-disc list-inside ml-4 mt-2 text-[#666] space-y-1">
                    <li>Leads (for prospect tracking boards)</li>
                    <li>Contacts (for contact management boards)</li>
                    <li>Accounts (for company/account boards)</li>
                    <li>Deals (for sales pipeline boards)</li>
                  </ul>
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
                    <strong>Carefully review field mappings</strong> - Monday's custom column names may require manual mapping
                  </p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">6.</span>
                <div>
                  <p className="text-[#1A1A1A]">Map status values to SalesOS stages/statuses</p>
                </div>
              </li>
              <li className="flex gap-3">
                <span className="text-[#EAD07D] font-semibold">7.</span>
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
                onClick={() => window.open('/api/import-export/crm-template-download/monday/LEAD')}
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
                  "Group headers appearing as rows"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Monday.com exports include group/section headers as separate rows with no data.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> Open the CSV in Excel and delete rows that only contain group names with no actual item data.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Custom column names not mapping"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Monday.com allows completely custom column names which may not match standard CRM fields.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> During import, manually map each Monday column to the corresponding SalesOS field. Common mappings: "Item Name" → "Name", "Owner" → "Assigned To", "Budget" → "Amount".
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Status labels not matching"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Monday.com status columns use custom labels (e.g., "Working on it", "Stuck", "Done").
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> Create a mapping between Monday status labels and SalesOS stages. For example: "Working on it" → "In Progress", "Done" → "Closed Won".
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Person column contains names instead of emails"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Monday's "Person" column type exports user names, not contact emails.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> If you need contact emails, create a separate "Email" column in Monday before exporting, or manually add email addresses to the CSV after export.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-[#1A1A1A] mb-2">
                  "Complex column types not exporting correctly"
                </h3>
                <p className="text-sm text-[#666] mb-2">
                  Some Monday column types (Timeline, Dependency, Connect Boards) don't export well to CSV.
                </p>
                <p className="text-sm text-[#666]">
                  <strong>Solution:</strong> Focus on exporting standard columns (Text, Numbers, Status, Date, Email, Phone). Create formula columns to extract data from complex column types before exporting.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Need Help */}
        <div className="bg-[#1A1A1A] rounded-3xl p-8 text-center">
          <h2 className="text-2xl font-medium text-white mb-3">Need Migration Assistance?</h2>
          <p className="text-white/60 mb-6">
            Monday.com migrations can be complex due to custom board structures. Our migration specialists are here to help you map your data correctly.
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
