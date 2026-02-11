import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, ArrowLeft } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface DetailBreadcrumbProps {
  items: BreadcrumbItem[];
}

export const DetailBreadcrumb: React.FC<DetailBreadcrumbProps> = ({ items }) => {
  const backItem = items.length >= 2 ? items[items.length - 2] : null;

  return (
    <nav className="flex items-center gap-1.5 text-sm mb-4">
      {backItem?.path && (
        <Link
          to={backItem.path}
          className="text-[#666] hover:text-[#1A1A1A] transition-colors mr-1"
        >
          <ArrowLeft size={16} />
        </Link>
      )}
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight size={14} className="text-[#999]" />}
            {isLast || !item.path ? (
              <span className={isLast ? 'font-medium text-[#1A1A1A] truncate max-w-[200px]' : 'text-[#666]'}>
                {item.label}
              </span>
            ) : (
              <Link
                to={item.path}
                className="text-[#666] hover:text-[#1A1A1A] transition-colors"
              >
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
