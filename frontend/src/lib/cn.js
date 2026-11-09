import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/** Gabungkan class Tailwind dengan aman (kelas bentrok otomatis dirampingkan). */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
