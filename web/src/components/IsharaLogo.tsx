import React from 'react';
import { HandMetal } from 'lucide-react';

export interface IsharaLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showWordmark?: boolean;
  subtitle?: string;
  className?: string;
  animate?: boolean;
}

export const IsharaLogo: React.FC<IsharaLogoProps> = ({
  size = 'md',
  showWordmark = false,
  subtitle,
  className = '',
  animate = false,
}) => {
  const sizeConfig = {
    sm: {
      box: 'w-7 h-7 rounded-xl',
      icon: 'w-3.5 h-3.5',
      text: 'text-lg',
      subtext: 'text-[9px]',
    },
    md: {
      box: 'w-10 h-10 rounded-2xl',
      icon: 'w-5 h-5',
      text: 'text-2xl',
      subtext: 'text-[11px]',
    },
    lg: {
      box: 'w-14 h-14 rounded-[22px]',
      icon: 'w-7 h-7',
      text: 'text-3xl',
      subtext: 'text-xs',
    },
    xl: {
      box: 'w-20 h-20 rounded-[28px]',
      icon: 'w-10 h-10',
      text: 'text-4xl',
      subtext: 'text-sm',
    },
  }[size];

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Tactile Clay Squircle with Hand Glyph */}
      <div
        className={`${sizeConfig.box} bg-gradient-to-tr from-[#6386F5] to-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised shrink-0 border border-white/40`}
        aria-hidden="true"
      >
        <HandMetal
          className={`${sizeConfig.icon} transform transition-transform ${
            animate ? 'animate-pulse' : 'group-hover:scale-110'
          }`}
        />
      </div>

      {showWordmark && (
        <div className="flex flex-col text-left">
          <span className={`${sizeConfig.text} font-black tracking-tight text-[#2B2D42] leading-none`}>
            Ishara
          </span>
          {subtitle && (
            <span className={`${sizeConfig.subtext} font-bold text-[#7C9CFF] tracking-wider uppercase mt-1`}>
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
