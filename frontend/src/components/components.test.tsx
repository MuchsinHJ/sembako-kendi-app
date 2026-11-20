import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from './Button';
import { Badge } from './Badge';
import { TextField } from './TextField';
import { SearchField } from './SearchField';
import { ChipFilter } from './ChipFilter';
import { SegmentedFilter } from './SegmentedFilter';
import { Modal } from './Modal';
import { ScreenHeader } from './ScreenHeader';

describe('Button', () => {
  it('primer punya label teks + aksesibel', () => {
    render(<Button>Simpan Produk</Button>);
    expect(screen.getByRole('button', { name: 'Simpan Produk' })).toBeInTheDocument();
  });

  it('ikon wajib aria-label', () => {
    render(<Button variant="icon" aria-label="Kembali" />);
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeInTheDocument();
  });

  it('disabled tidak menghilangkan label', () => {
    render(<Button disabled>Simpan</Button>);
    expect(screen.getByRole('button', { name: 'Simpan' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Simpan' }).textContent).toBe('Simpan');
  });
});

describe('Badge', () => {
  it('lunas: dot + label', () => {
    render(<Badge variant="lunas" label="Lunas" />);
    expect(screen.getByText('Lunas')).toBeInTheDocument();
    expect(screen.getByTestId('badge-dot')).toBeInTheDocument();
    expect(screen.getByTestId('badge-dot')).toHaveClass('bg-primary-soft');
  });

  it('variant tersemat untuk mapping warna token', () => {
    render(<Badge variant="utang" label="Utang" />);
    expect(screen.getByTestId('badge-utang')).toBeInTheDocument();
  });

  it('label selalu teks, bukan warna saja', () => {
    render(<Badge variant="netral" label="Aktif" />);
    expect(screen.getByText('Aktif')).toBeInTheDocument();
  });
});

describe('TextField', () => {
  it('label terlihat + input punya label terkait', () => {
    render(<TextField label="Nama produk" />);
    expect(screen.getByLabelText('Nama produk')).toBeInTheDocument();
  });

  it('error tampil dengan teks', () => {
    render(<TextField label="Harga" error="Wajib diisi" />);
    expect(screen.getByText('Wajib diisi')).toBeInTheDocument();
    expect(screen.getByLabelText('Harga')).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('SearchField', () => {
  it('role searchbox + ikon + ketik memicu onChange', async () => {
    const onChange = vi.fn();
    render(<SearchField value="" onChange={onChange} placeholder="Cari nama produk" />);
    const input = screen.getByRole('searchbox');
    await userEvent.type(input, 'beras');
    expect(onChange).toHaveBeenCalledTimes(5);
  });
});

describe('ChipFilter', () => {
  it('aktif menandakan aria-pressed', () => {
    render(<ChipFilter active>Semua</ChipFilter>);
    expect(screen.getByRole('button', { name: 'Semua' })).toHaveAttribute('aria-pressed', 'true');
  });
});

describe('SegmentedFilter', () => {
  it('radiogroup + pilih segmen memicu onChange', async () => {
    const onChange = vi.fn();
    render(
      <SegmentedFilter
        label="Status"
        options={[
          { value: 'all', label: 'Semua' },
          { value: 'lunas', label: 'Lunas' },
        ]}
        value="all"
        onChange={onChange}
      />,
    );
    const group = screen.getByRole('radiogroup', { name: 'Status' });
    expect(group).toBeInTheDocument();
    await userEvent.click(screen.getByRole('radio', { name: 'Lunas' }));
    expect(onChange).toHaveBeenCalledWith('lunas');
  });
});

describe('Modal — checklist a11y', () => {
  it('role dialog + aria-modal + judul tertaut', () => {
    render(
      <Modal open onClose={() => {}} title="Nonaktifkan produk?">
        <p>Isi</p>
      </Modal>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Judul tertaut lewat id unik (useId) agar dialog bertumpuk tidak berbagi id.
    const heading = screen.getByRole('heading', { name: 'Nonaktifkan produk?' });
    expect(dialog).toHaveAttribute('aria-labelledby', heading.id);
    expect(screen.getByRole('dialog', { name: 'Nonaktifkan produk?' })).toBe(dialog);
  });

  it('Esc menutup', async () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} title="Judul">
        <p>Isi</p>
      </Modal>,
    );
    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('fokus pindah ke dialog saat terbuka', () => {
    render(
      <Modal open onClose={() => {}} title="Judul">
        <button type="button">Di dalam</button>
      </Modal>,
    );
    expect(screen.getByRole('dialog')).toHaveFocus();
  });
});

describe('ScreenHeader', () => {
  it('pola A: eyebrow + judul + info', () => {
    render(<ScreenHeader eyebrow="KATALOG" title="Produk" info="12 produk" />);
    expect(screen.getByText('KATALOG')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Produk' })).toBeInTheDocument();
    expect(screen.getByText('12 produk')).toBeInTheDocument();
  });

  it('pola B: tombol kembali + subjudul', () => {
    const onBack = vi.fn();
    render(<ScreenHeader onBack={onBack} title="Detail Produk" subtitle="Minyak Goreng" />);
    expect(screen.getByRole('button', { name: 'Kembali' })).toBeInTheDocument();
    expect(screen.getByText('Minyak Goreng')).toBeInTheDocument();
  });
});
