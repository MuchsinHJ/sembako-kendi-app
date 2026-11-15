import ReactDOM from 'react-dom/client';
import RootProviders from './RootProviders';
import './theme/tokens.css';

// SDD FE §4.1: mount pakai ReactDOM.createRoot.
// StrictMode sengaja dimatikan: double-mount-nya memicu dua kali boot refresh
// di AuthProvider (efek mount) dan request paralel lain. Dengan refresh token
// berbasis rotasi di BE, request kedua membawa cookie lama yang sudah dihapus
// → Prisma P2025 → FE salah logout. Tanpa StrictMode alur boot bersih.
ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <RootProviders />
);
