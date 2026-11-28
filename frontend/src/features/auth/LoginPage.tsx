import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChartColumn, CircleAlert, Eye, EyeOff, Package, ReceiptText, Store } from 'lucide-react';
import { useLogin } from './api';
import { loginSchema, type LoginInput } from './schemas';
import { LOGIN_FAIL_MESSAGE } from './api';
import { useAuth } from './useAuth';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/cn';

type FieldErrors = Partial<Record<keyof LoginInput, string | undefined>>;

/**
 * Layar Login (pen m5RMuh / Y1Gj12). Mobile: tanpa kartu, logo 56px + teks brand,
 * form gap 16, error di kotak warning. md+: panel brand kiri + kartu form (06 §5.10).
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthenticated } = useAuth();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname ?? '/';

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors;
      setErrors({ email: flat.email?.[0], password: flat.password?.[0] });
      return;
    }
    setErrors({});
    login.mutate(parsed.data, {
      onSuccess: (data) => {
        setAuthenticated(data.accessToken);
        navigate(from, { replace: true });
      },
      onError: (err) => {
        if (err instanceof ApiError && err.status === 401) setFormError(LOGIN_FAIL_MESSAGE);
        else setFormError('Gagal masuk. Periksa koneksi lalu coba lagi.');
      },
    });
  }

  const inputBox = (invalid: boolean) =>
    cn(
      'flex h-12 w-full items-center gap-2 rounded-input border bg-surface px-3.5',
      'transition-[border-color,box-shadow] duration-150 ease-out focus-within:ring-2 focus-within:ring-accent/40',
      invalid ? 'border-danger' : 'border-line',
    );

  return (
    <main className="flex min-h-dvh bg-bg">
      {/* Panel brand md+ (canvas MxAEU / X7CLen, dirapikan): panel primary inset r28, poin fitur. */}
      <div className="hidden p-4 md:flex md:w-[44%] lg:w-1/2">
        <div className="flex w-full flex-col justify-between rounded-[28px] bg-primary p-8 lg:p-12">
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-[16px] bg-primary-soft">
              <Store className="size-[22px] text-bg" aria-hidden="true" />
            </span>
            <span className="text-[13px] font-semibold tracking-[1.4px] text-accent-soft">KENDI&apos;S MARKET</span>
          </div>
          <div className="flex max-w-md flex-col gap-4">
            <h2 className="text-[30px] font-bold leading-tight text-bg lg:text-[36px]">
              Kelola toko sembako dalam satu tempat.
            </h2>
            <p className="text-[14px] leading-relaxed text-accent-soft">
              Catat penjualan tunai dan utang, pantau stok, dan rekap titipan penitip tanpa buku catatan.
            </p>
          </div>
          <ul className="flex flex-col gap-3">
            {(
              [
                [ReceiptText, 'Transaksi lunas & utang', 'Status dihitung otomatis dari uang diterima'],
                [Package, 'Stok & barang titipan', 'Peringatan saat stok menipis'],
                [ChartColumn, 'Laporan per periode', 'Omzet, profit, dan ekspor Excel/PDF'],
              ] as const
            ).map(([Icon, judul, ket]) => (
              <li key={judul} className="flex items-center gap-3 rounded-[16px] bg-primary-soft/60 p-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-[12px] bg-primary">
                  <Icon className="size-[18px] text-accent-soft" aria-hidden="true" />
                </span>
                <span className="flex min-w-0 flex-col gap-px">
                  <span className="text-[13.5px] font-semibold text-bg">{judul}</span>
                  <span className="truncate text-[12.5px] text-accent-soft">{ket}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
      {/* Form: mobile pen Content pad [0,28,32,28] gap 28 justify center */}
      <div className="flex w-full flex-1 flex-col justify-center px-7 pb-8 pt-10 md:items-center md:px-6 md:py-10">
        <div className="flex w-full flex-col gap-7 md:max-w-[420px] md:rounded-[24px] md:border md:border-line-soft md:bg-surface md:p-8">
          {/* Blok Brand (pen gap 14) */}
          <div className="flex flex-col gap-3.5">
            <div className="flex size-14 items-center justify-center rounded-[16px] bg-primary md:hidden">
              <Store className="size-[26px] text-bg" aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11.5px] font-semibold tracking-[1.4px] text-accent">
                KENDI&apos;S MARKET
              </span>
              <h1 className="text-[26px] font-bold leading-tight text-primary">
                Masuk ke akun usaha Anda
              </h1>
              <p className="text-[13px] text-muted">
                Kelola penjualan, stok, dan utang usaha dalam satu tempat.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[12.5px] font-medium text-primary-soft">
                Email
              </label>
              <div className={inputBox(!!errors.email)}>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  placeholder="kasir@kendismarket.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-full w-full min-w-0 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs font-medium text-danger">
                  {errors.email}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[12.5px] font-medium text-primary-soft">
                Kata sandi
              </label>
              <div className={cn(inputBox(!!errors.password), 'pe-1')}>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-full w-full min-w-0 bg-transparent text-sm text-primary placeholder:text-muted focus:outline-none"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                  aria-pressed={showPassword}
                  className="press-scale flex size-10 shrink-0 items-center justify-center rounded-full text-muted transition-colors duration-150 ease-out hover:bg-surface-muted"
                >
                  {showPassword ? (
                    <EyeOff className="size-[18px]" aria-hidden="true" />
                  ) : (
                    <Eye className="size-[18px]" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs font-medium text-danger">
                  {errors.password}
                </p>
              )}
            </div>

            {/* Pesan Error Login (pen): warning-soft r12 p[10,12] gap 8 + stroke warning */}
            {formError && (
              <div
                role="alert"
                className="flex items-center gap-2 rounded-[12px] border border-warning bg-warning-soft px-3 py-2.5"
              >
                <CircleAlert className="size-4 shrink-0 text-warning" aria-hidden="true" />
                <p className="text-xs text-warning">{formError}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={login.isPending}
              className="press-scale h-[50px] w-full rounded-full bg-primary text-[15px] font-semibold text-bg transition-[background-color,transform] duration-150 ease-out hover:bg-primary-soft disabled:opacity-60"
            >
              {login.isPending ? 'Memasuki…' : 'Masuk'}
            </button>
          </form>

          <p className="text-xs text-muted">Lupa kata sandi? Hubungi pengelola usaha Anda.</p>
        </div>
      </div>
    </main>
  );
}
