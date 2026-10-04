type P = { className?: string }
const base = (className = 'size-5') => ({
  className, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
  strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true,
})
export const BagIcon = ({ className }: P) => (<svg {...base(className)}><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>)
export const HeartIcon = ({ className, filled }: P & { filled?: boolean }) => (<svg {...base(className)} fill={filled ? 'currentColor' : 'none'}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" /></svg>)
export const UserIcon = ({ className }: P) => (<svg {...base(className)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>)
export const MenuIcon = ({ className }: P) => (<svg {...base(className)}><path d="M4 8h16M4 16h16" /></svg>)
export const XIcon = ({ className }: P) => (<svg {...base(className)}><path d="M6 6l12 12M18 6 6 18" /></svg>)
export const PlusIcon = ({ className }: P) => (<svg {...base(className)}><path d="M12 5v14M5 12h14" /></svg>)
export const MinusIcon = ({ className }: P) => (<svg {...base(className)}><path d="M5 12h14" /></svg>)
export const ArrowIcon = ({ className }: P) => (<svg {...base(className)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>)
export const CheckIcon = ({ className }: P) => (<svg {...base(className)}><path d="m5 12 5 5 9-10" /></svg>)
export const TruckIcon = ({ className }: P) => (<svg {...base(className)}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" /></svg>)
export const ShieldIcon = ({ className }: P) => (<svg {...base(className)}><path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" /></svg>)
export const ReturnIcon = ({ className }: P) => (<svg {...base(className)}><path d="M9 14 4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" /></svg>)
export const ChevronIcon = ({ className }: P) => (<svg {...base(className)}><path d="m6 9 6 6 6-6" /></svg>)
