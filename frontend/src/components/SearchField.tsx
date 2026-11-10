import { Search } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

interface SearchFieldProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Input pencarian 44px (02 §5) — pakai role searchbox + label terlihat. */
export function SearchField({
  label = 'Cari',
  value,
  onChange,
  placeholder,
  className,
}: SearchFieldProps) {
  const id = useId();
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[12.5px] font-medium text-primary-soft">
        {label}
      </label>
      <div className="flex h-11 items-center gap-2 rounded-input border border-line bg-surface px-3">
        <Search aria-hidden="true" className="size-4 shrink-0 text-muted" />
        <input
          id={id}
          type="search"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-full w-full bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}
