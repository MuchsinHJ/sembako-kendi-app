import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pagination } from './Pagination';
import { pageWindow } from '@/lib/usePagedQuery';

describe('pageWindow', () => {
  it('semua nomor bila ≤7 halaman', () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });
  it('celah di kedua sisi untuk halaman tengah', () => {
    expect(pageWindow(6, 12)).toEqual([1, 'gap', 5, 6, 7, 'gap', 12]);
  });
  it('awal dan akhir tanpa celah berlebih', () => {
    expect(pageWindow(1, 12)).toEqual([1, 2, 3, 4, 'gap', 12]);
    expect(pageWindow(12, 12)).toEqual([1, 'gap', 9, 10, 11, 12]);
  });
});

describe('Pagination', () => {
  it('ringkasan rentang + navigasi halaman', async () => {
    const onPage = vi.fn();
    render(
      <Pagination page={2} totalPages={4} total={40} pageSize={12} onPage={onPage} itemLabel="produk" />,
    );
    expect(screen.getByText('13–24')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Halaman 2' })).toHaveAttribute('aria-current', 'page');
    await userEvent.click(screen.getByRole('button', { name: 'Halaman berikutnya' }));
    expect(onPage).toHaveBeenCalledWith(3);
    await userEvent.click(screen.getByRole('button', { name: 'Halaman 4' }));
    expect(onPage).toHaveBeenCalledWith(4);
  });
  it('tidak tampil bila hanya satu halaman', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} total={3} pageSize={12} onPage={() => {}} itemLabel="produk" />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
