import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Gabungkan class Tailwind dengan aman (kelas bentrok otomatis dirampingkan). */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
