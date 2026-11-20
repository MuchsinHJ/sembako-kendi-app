import { CircleX, Search } from 'lucide-react';
import { useId, useRef } from 'react';
import { cn } from '@/lib/cn';

interface SearchFieldProps {
  /** Label tak terlihat untuk aksesibilitas — pen tidak menampilkan label di atas input. */
  label?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Input pencarian (pen Input Pencarian): h44 p[0,12] gap 8 surface r12 stroke line, teks 12.5.
 * Aktif (pen Input Pencarian Aktif): stroke + ikon accent, teks 12.5/500, tombol hapus 15 muted.
 */
export function SearchField({
  label = 'Cari',
  value,
  onChange,
  placeholder,
  className,
}: SearchFieldProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const terisi = value.length > 0;
  return (
    <div className={cn('relative', className)}>
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <div
        className={cn(
          'flex h-11 items-center gap-2 rounded-input border bg-surface ps-3 transition-colors duration-150 ease-out',
          'focus-within:border-accent',
          terisi ? 'border-accent pe-1' : 'border-line pe-3',
        )}
      >
        <Search
          aria-hidden="true"
          className={cn('size-4 shrink-0', terisi ? 'text-accent' : 'text-muted')}
        />
        <input
          ref={inputRef}
          id={id}
          type="search"
          role="searchbox"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={cn(
            'h-full w-full min-w-0 bg-transparent text-[12.5px] text-primary placeholder:text-muted focus:outline-none',
            '[&::-webkit-search-cancel-button]:appearance-none',
            terisi && 'font-medium',
          )}
        />
        {terisi && (
          <button
            type="button"
            aria-label="Hapus kata kunci"
            onClick={() => {
              onChange('');
              inputRef.current?.focus();
            }}
            className="press-scale flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-surface-muted"
          >
            <CircleX className="size-[15px]" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
