/**
 * utils/errors.ts
 * Hierarki error aplikasi sesuai SDD §7.1 & §7.4.
 * Semua error dilempar dari Service layer; HTTP status ditentukan errorHandler.
 */

// ─── Base ─────────────────────────────────────────────────────────────────────

export abstract class AppError extends Error {
  public abstract readonly code: string;
  public abstract readonly statusCode: number;
  /** Detail tambahan (mis. daftar field validasi) */
  public readonly details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = this.constructor.name;
    this.details = details;
    // Agar stack trace menunjuk ke titik throw, bukan ke constructor ini
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── Standard Errors (SDD §7.1) ───────────────────────────────────────────────

export class ValidationError extends AppError {
  public readonly code = 'VALIDATION_ERROR';
  public readonly statusCode = 400;
}

export class UnauthorizedError extends AppError {
  public readonly code = 'UNAUTHORIZED';
  public readonly statusCode = 401;
}

export class ForbiddenError extends AppError {
  public readonly code = 'FORBIDDEN';
  public readonly statusCode = 403;
}

export class NotFoundError extends AppError {
  public readonly code = 'NOT_FOUND';
  public readonly statusCode = 404;
}

/**
 * Base class untuk pelanggaran business rule.
 * Error spesifik (7.4) meng-extend class ini dan boleh mempersempit `code`
 * (mis. `ProductHasTransactionError` → `PRODUCT_HAS_TRANSACTION`, SDD §5.3).
 */
export class BusinessRuleError extends AppError {
  public readonly code: string = 'BUSINESS_RULE_VIOLATION';
  public readonly statusCode = 422;
}

export class InvalidFileTypeError extends AppError {
  public readonly code = 'INVALID_FILE_TYPE';
  public readonly statusCode = 415;
}

export class FileTooLargeError extends AppError {
  public readonly code = 'FILE_TOO_LARGE';
  public readonly statusCode = 413;
}

/** Gagal mengunggah/menghapus file di object storage (R2) */
export class StorageError extends AppError {
  public readonly code = 'STORAGE_ERROR';
  public readonly statusCode = 502;
}

export class InternalServerError extends AppError {
  public readonly code = 'INTERNAL_SERVER_ERROR';
  public readonly statusCode = 500;
}

// ─── Business Rule Specific Errors (SDD §7.4) ─────────────────────────────────

/** BR-05 / AC-04: Stok tidak mencukupi saat transaksi dibuat */
export class StockExceededError extends BusinessRuleError {
  constructor(
    message: string = 'Stok produk tidak mencukupi untuk transaksi ini.',
  ) {
    super(message);
  }
}

/** BR-08 / AC-05: Nama pembeli wajib untuk transaksi Utang (nomor HP opsional) */
export class MissingDebtorInfoError extends BusinessRuleError {
  constructor(
    message: string = 'Nama pembeli wajib diisi untuk transaksi Utang.',
  ) {
    super(message);
  }
}

/** BR-13 / AC-08: Permintaan void melewati batas waktu yang diizinkan */
export class VoidWindowExpiredError extends BusinessRuleError {
  constructor(
    message: string = 'Batas waktu pembatalan transaksi telah terlewati.',
  ) {
    super(message);
  }
}

/** BR-14 / AC-12: Jumlah pembayaran melebihi sisa saldo utang */
export class DebtOverpaymentError extends BusinessRuleError {
  constructor(
    message: string = 'Jumlah pembayaran melebihi sisa saldo utang.',
  ) {
    super(message);
  }
}

/**
 * BR-12 / AC-02: Produk yang sudah terlibat transaksi tidak bisa dihapus.
 *
 * Memakai `code` khusus `PRODUCT_HAS_TRANSACTION` (bukan
 * `BUSINESS_RULE_VIOLATION` generik) agar sesuai SDD §5.3 dan frontend dapat
 * membedakan kasus ini; HTTP status tetap 422 seperti business rule lainnya.
 */
export class ProductHasTransactionError extends BusinessRuleError {
  public override readonly code = 'PRODUCT_HAS_TRANSACTION';

  constructor(
    message: string = 'Produk tidak dapat dihapus karena sudah memiliki riwayat transaksi.',
  ) {
    super(message);
  }
}

// ─── Business Rule Specific Errors — Konsinyasi (BR-A…BR-J) ───────────────────

/**
 * BR-I: Operasi konsinyasi (receipt/retur) hanya untuk produk bertipe TITIPAN.
 */
export class ProductNotConsignmentError extends BusinessRuleError {
  constructor(
    message: string = 'Produk ini bukan produk titipan, sehingga tidak memiliki alur konsinyasi.',
  ) {
    super(message);
  }
}

/**
 * BR-G: Consignor NONAKTIF tidak boleh dipakai untuk membuat produk titipan
 * baru, menerima titipan, atau mengaktifkan produknya.
 */
export class ConsignorInactiveError extends BusinessRuleError {
  constructor(
    message: string = 'Penitip berstatus NONAKTIF sehingga operasi ini tidak diizinkan.',
  ) {
    super(message);
  }
}

/**
 * BR-E: Consignor hanya dapat dinonaktifkan jika seluruh produk titipannya
 * berstok 0. `details` berisi daftar produk yang masih berstok.
 */
export class ConsignorHasStockError extends BusinessRuleError {
  constructor(
    message: string = 'Penitip masih memiliki produk titipan yang berstok, sehingga tidak dapat dinonaktifkan.',
    details?: unknown,
  ) {
    super(message, details);
  }
}

/**
 * BR-H: Produk TITIPAN hanya dapat dinonaktifkan jika stok = 0, dan hanya
 * dapat diaktifkan kembali jika penitipnya AKTIF.
 */
export class ProductHasStockError extends BusinessRuleError {
  constructor(
    message: string = 'Produk titipan masih memiliki stok, sehingga tidak dapat dinonaktifkan.',
  ) {
    super(message);
  }
}

/**
 * BR-D: Setoran ke penitip tidak boleh melebihi saldo kewajiban saat ini.
 */
export class ConsignorOverpaymentError extends BusinessRuleError {
  constructor(
    message: string = 'Jumlah setoran melebihi saldo kewajiban ke penitip.',
  ) {
    super(message);
  }
}
