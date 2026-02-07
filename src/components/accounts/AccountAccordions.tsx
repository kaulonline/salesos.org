import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronUp, MapPin, Layers, Building2 } from 'lucide-react';
import { Card } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { formatDate, getTypeLabel, getStatusLabel } from './types';
import type { Account } from '../../types';

interface AccountHierarchy {
  parent?: { id: string; name: string } | null;
  children?: { id: string; name: string }[];
}

interface AccountAccordionsProps {
  account: Account;
  hierarchy?: AccountHierarchy | null;
  openSection: string | null;
  onToggleSection: (section: string) => void;
}

export const AccountAccordions: React.FC<AccountAccordionsProps> = ({
  account,
  hierarchy,
  openSection,
  onToggleSection,
}) => {
  return (
    <div className="lg:col-span-4 space-y-4">
      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('basic')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Basic Information
          {openSection === 'basic' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'basic' && (
          <div className="mt-4 space-y-4 animate-in slide-in-from-top-2">
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Account ID</span>
              <span className="text-sm font-bold text-[#1A1A1A] font-mono text-xs">
                {account.id.slice(0, 8)}...
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Type</span>
              <span className="text-sm font-bold text-[#1A1A1A]">
                {getTypeLabel(account.type)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Status</span>
              <span className="text-sm font-bold text-[#1A1A1A]">
                {getStatusLabel(account.accountStatus)}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-gray-50">
              <span className="text-sm text-[#666]">Industry</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{account.industry || 'Not set'}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm text-[#666]">Last Activity</span>
              <span className="text-sm font-bold text-[#1A1A1A]">{formatDate(account.lastActivityDate)}</span>
            </div>
          </div>
        )}
      </Card>

      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('billing')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Billing Address
          {openSection === 'billing' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'billing' && (
          <div className="mt-4 animate-in slide-in-from-top-2">
            {account.billingStreet || account.billingCity || account.billingState || account.billingCountry ? (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#999] mt-0.5" />
                <div className="text-sm text-[#1A1A1A]">
                  {account.billingStreet && <div>{account.billingStreet}</div>}
                  <div>
                    {[account.billingCity, account.billingState, account.billingPostalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {account.billingCountry && <div>{account.billingCountry}</div>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">No billing address</p>
            )}
          </div>
        )}
      </Card>

      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('shipping')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Shipping Address
          {openSection === 'shipping' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'shipping' && (
          <div className="mt-4 animate-in slide-in-from-top-2">
            {account.shippingStreet || account.shippingCity || account.shippingState || account.shippingCountry ? (
              <div className="flex items-start gap-3">
                <MapPin size={18} className="text-[#999] mt-0.5" />
                <div className="text-sm text-[#1A1A1A]">
                  {account.shippingStreet && <div>{account.shippingStreet}</div>}
                  <div>
                    {[account.shippingCity, account.shippingState, account.shippingPostalCode]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                  {account.shippingCountry && <div>{account.shippingCountry}</div>}
                </div>
              </div>
            ) : (
              <p className="text-sm text-[#666]">No shipping address</p>
            )}
          </div>
        )}
      </Card>

      <Card padding="sm" className="px-6 py-4 border border-black/5">
        <button
          onClick={() => onToggleSection('techstack')}
          className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
        >
          Tech Stack
          {openSection === 'techstack' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        {openSection === 'techstack' && (
          <div className="mt-4 animate-in slide-in-from-top-2">
            {account.techStack && account.techStack.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {account.techStack.map((tech, i) => (
                  <Badge key={i} variant="outline" size="sm">
                    {tech}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#666]">No tech stack recorded</p>
            )}
          </div>
        )}
      </Card>

      {/* Hierarchy Section */}
      {hierarchy && (hierarchy.parent || (hierarchy.children && hierarchy.children.length > 0)) && (
        <Card padding="sm" className="px-6 py-4 border border-black/5">
          <button
            onClick={() => onToggleSection('hierarchy')}
            className="w-full flex justify-between items-center text-[#1A1A1A] font-medium"
          >
            Account Hierarchy
            {openSection === 'hierarchy' ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </button>
          {openSection === 'hierarchy' && (
            <div className="mt-4 animate-in slide-in-from-top-2 space-y-3">
              {hierarchy.parent && (
                <div>
                  <div className="text-xs font-bold text-[#999] uppercase mb-2">Parent Account</div>
                  <Link
                    to={`/dashboard/companies/${hierarchy.parent.id}`}
                    className="flex items-center gap-2 p-2 bg-[#F8F8F6] rounded-lg hover:bg-[#EAD07D]/20 transition-colors"
                  >
                    <Layers size={16} className="text-[#666]" />
                    <span className="text-sm font-medium text-[#1A1A1A]">{hierarchy.parent.name}</span>
                  </Link>
                </div>
              )}
              {hierarchy.children && hierarchy.children.length > 0 && (
                <div>
                  <div className="text-xs font-bold text-[#999] uppercase mb-2">Child Accounts</div>
                  <div className="space-y-2">
                    {hierarchy.children.map((child) => (
                      <Link
                        key={child.id}
                        to={`/dashboard/companies/${child.id}`}
                        className="flex items-center gap-2 p-2 bg-[#F8F8F6] rounded-lg hover:bg-[#EAD07D]/20 transition-colors"
                      >
                        <Building2 size={16} className="text-[#666]" />
                        <span className="text-sm font-medium text-[#1A1A1A]">{child.name}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};
