// src/components/Badge.tsx — Reusable claymorphic badge component
import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  tooltip?: string;
  variant?: 'purple' | 'coral' | 'blue' | 'amber' | 'slate';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  tooltip,
  variant = 'purple',
  className = '',
}) => {
  const variantStyles = {
    purple: 'bg-[#F2E7FE] text-[#7C4DFF] border-[#D4A5FF]/60',
    coral: 'bg-[#FFE8E2] text-[#FF8A8A] border-[#FFB59E]/60',
    blue: 'bg-blue-50 text-[#7C9CFF] border-blue-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    slate: 'bg-slate-100 text-[#6E7387] border-slate-200',
  };

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-help shadow-sm transition-all hover:scale-105 select-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
