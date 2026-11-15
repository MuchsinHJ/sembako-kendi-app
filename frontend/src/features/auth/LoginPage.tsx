import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogin } from './api';
import { loginSchema, type LoginInput } from './schemas';
import { LOGIN_FAIL_MESSAGE } from './api';
import { useAuth } from './useAuth';
import { ApiError } from '@/lib/http';
import { cn } from '@/lib/cn';

type FieldErrors = Partial<Record<keyof LoginInput, string | undefined>>;

/**
 * Layar Login (SDD FE §4.1, layar tanpa chrome). Antislop: satu fokus
 * visual (kartu login di latar bg), eyebrow kapital, tanpa shadow.
 */
export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthenticated } = useAuth();
  const login = useLogin();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <main className="flex min-h-dvh bg-bg">
      {/* Panel kiri brand (06 §5.10) — md+ */}
      <div className="hidden flex-1 items-center justify-center bg-primary px-10 md:flex">
        <div className="max-w-sm">
          <span className="eyebrow block text-xs font-semibold tracking-[1.2px] text-accent-soft">
            KENDI&apos;S MARKET
          </span>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-bg">
            Kelola toko sembako Anda dalam satu genggaman.
          </h1>
          <p className="mt-3 text-sm text-bg/70">
            Produk, stok, transaksi tunai &amp; utang, hingga konsinyasi — tercatat rapi dan
            terpusat.
          </p>
        </div>
      </div>

      {/* Panel kanan: form (06 §5.10) */}
      <div className="flex w-full flex-1 items-center justify-center px-6 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full max-w-sm rounded-card border border-line-soft bg-surface p-6"
          noValidate
        >
          <span className="eyebrow mb-2 block text-xs font-semibold tracking-[1.2px] text-accent md:hidden">
            KENDI&apos;S MARKET
          </span>
          <h1 className="mb-6 text-2xl font-bold">Masuk ke akun usaha Anda</h1>

        <label htmlFor="email" className="mb-1 block text-sm font-semibold text-primary-soft">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="kasir@kendismarket.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={cn(
            'mb-1 h-12 w-full rounded-input border bg-surface px-4 text-base text-primary',
            'focus:outline-none',
            errors.email ? 'border-danger' : 'border-line'
          )}
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        {errors.email && (
          <p id="email-error" className="mb-2 text-xs font-medium text-danger">
            {errors.email}
          </p>
        )}

        <label htmlFor="password" className="mb-1 mt-3 block text-sm font-semibold text-primary-soft">
          Kata sandi
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={cn(
            'mb-1 h-12 w-full rounded-input border bg-surface px-4 text-base text-primary',
            'focus:outline-none',
            errors.password ? 'border-danger' : 'border-line'
          )}
          aria-invalid={!!errors.password}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        {errors.password && (
          <p id="password-error" className="mb-2 text-xs font-medium text-danger">
            {errors.password}
          </p>
        )}

        {formError && (
          <p role="alert" className="mb-2 text-sm font-medium text-danger">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={login.isPending}
          className="press-scale mt-4 h-12 w-full rounded-full bg-primary text-bg font-semibold disabled:opacity-60"
        >
          {login.isPending ? 'Memasuki…' : 'Masuk'}
        </button>

        <p className="mt-4 text-center text-xs text-muted">
          Lupa kata sandi? Hubungi pengelola usaha Anda.
        </p>

        {/* Penanda kecil: satu akun toko (MVP). */}
        <p className="mt-4 text-center text-xs text-muted">
          Kendi&apos;s Market untuk satu toko — akun dikelola pemilik.
        </p>
        </form>
      </div>
    </main>
  );
}
