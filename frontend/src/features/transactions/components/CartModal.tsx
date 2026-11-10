import { Modal } from '@/components/Modal';
import { CartForm } from './CartForm';
import type { CartItem } from '../types';

interface CartModalProps {
  open: boolean;
  onClose: () => void;
  cart: CartItem[];
  onQty: (product: CartItem['product'], qty: number) => void;
}

/** Keranjang POS (mobile) — layar penuh/bottom-sheet via Modal. */
export function CartModal({ open, onClose, cart, onQty }: CartModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Keranjang">
      <CartForm cart={cart} onQty={onQty} onSelesai={() => {}} onReset={onClose} />
    </Modal>
  );
}
