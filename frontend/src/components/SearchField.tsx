import { Search } from 'lucide-react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

interface SearchFieldProps {
  /** Label tak terlihat untuk aksesibilitas — pen tidak menampilkan label di atas input. */
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/** Input pencarian 44px (02 §5) — role searchbox + sr-only label (pen: bare input). */
export function SearchField({
  label = 'Cari',
  value,
  onChange,
  placeholder,
  className,
}: SearchFieldProps) {
  const id = useId();
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
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
          className="h-full w-full bg-transparent text-[12.5px] text-primary placeholder:text-muted focus:outline-none"
        />
      </div>
    </div>
  );
}
