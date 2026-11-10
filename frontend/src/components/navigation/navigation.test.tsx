import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { SidebarNav } from './SidebarNav';

function renderNav(ui: React.ReactElement, initial = '/') {
  return render(<MemoryRouter initialEntries={[initial]}>{ui}</MemoryRouter>);
}

function getAside() {
  return screen.getByRole('complementary');
}

describe('BottomNav (mobile)', () => {
  it('tepat 5 item termasuk FAB Transaksi', () => {
    renderNav(<BottomNav />);
    // 4 item biasa
    for (const label of ['Beranda', 'Produk', 'Utang', 'Riwayat']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    // FAB Transaksi = link dengan aria-label
    expect(screen.getByRole('link', { name: 'Transaksi' })).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(5);
  });

  it('item aktif menandai aria-current', () => {
    renderNav(<BottomNav />, '/produk');
    expect(screen.getByRole('link', { name: 'Produk' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: 'Beranda' })).not.toHaveAttribute('aria-current');
  });

  it('sembunyi di ≥768px (md:hidden)', () => {
    renderNav(<BottomNav />);
    expect(screen.getByRole('navigation', { name: 'Navigasi utama' })).toHaveClass('md:hidden');
  });
});

describe('SidebarNav', () => {
  it('desktop: 7 item termasuk Laporan & Penitip', () => {
    renderNav(<SidebarNav variant="desktop" />);
    for (const label of ['Beranda', 'Produk', 'Transaksi', 'Utang', 'Riwayat', 'Laporan', 'Penitip']) {
      expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
    }
    expect(screen.getAllByRole('link')).toHaveLength(7);
  });

  it('tablet: 7 item + lebar 96px', () => {
    renderNav(<SidebarNav variant="tablet" />);
    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(getAside()).toHaveClass('w-24');
    expect(getAside()).toHaveClass('md:flex');
    expect(getAside()).toHaveClass('lg:hidden');
  });

  it('desktop: lebar 248px + hanya tampil ≥1280px', () => {
    renderNav(<SidebarNav variant="desktop" />);
    expect(getAside()).toHaveClass('w-[248px]');
    expect(getAside()).toHaveClass('lg:flex');
  });

  it('Laporan aktif di sub-route laporan', () => {
    renderNav(<SidebarNav variant="desktop" />, '/laporan/penjualan');
    expect(screen.getByRole('link', { name: 'Laporan' })).toHaveAttribute('aria-current', 'page');
  });

  it('Penitip aktif di detail penitip', () => {
    renderNav(<SidebarNav variant="desktop" />, '/penitip/abc');
    expect(screen.getByRole('link', { name: 'Penitip' })).toHaveAttribute('aria-current', 'page');
  });
});
