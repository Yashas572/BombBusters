import { ReactNode } from 'react';
import { clsx } from '../../lib/clsx';

interface Props {
  children: ReactNode;
  content: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  width?: 'narrow' | 'wide';
}

export function Tooltip({ children, content, position = 'top', width = 'wide' }: Props) {
  const positionClass = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  const arrowClass = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-slate-900 border-l-transparent border-r-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-slate-900 border-l-transparent border-r-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-slate-900 border-t-transparent border-b-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-slate-900 border-t-transparent border-b-transparent border-l-transparent',
  }[position];

  return (
    <span className="relative inline-flex group">
      {children}
      <span
        className={clsx(
          'absolute z-50 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150',
          positionClass
        )}
      >
        <span
          className={clsx(
            'block bg-slate-900 text-slate-100 text-xs leading-relaxed rounded-lg px-3 py-2 shadow-xl border border-slate-700',
            width === 'wide' ? 'w-64' : 'w-40'
          )}
        >
          {content}
        </span>
        <span className={clsx('absolute w-0 h-0 border-4', arrowClass)} />
      </span>
    </span>
  );
}
