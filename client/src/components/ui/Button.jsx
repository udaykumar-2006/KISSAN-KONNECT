export default function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center rounded-md font-medium transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-white text-black hover:bg-[#8fd08f] hover:-translate-y-0.5 hover:shadow-lg hover:shadow-glow',
    secondary: 'text-white hover:bg-[#d4835c] hover:-translate-y-0.5 border-2 border-[#d4835c]',
    outline: 'bg-transparent border border-border text-wheat hover:border-wheat hover:bg-wheat/10',
    ghost: 'bg-ghost border border-border text-cream hover:bg-white/10',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-5 py-2 text-sm',
    lg: 'px-8 py-3 text-base',
  };

  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} {...props}>
      {children}
    </button>
  );
}