import { useEffect, useState } from 'react';

/**
 * Match media query (native `window.matchMedia`). Dipakai saat dua layout
 * breakpoint berbeda struktur — render keduanya sekaligus menggandakan DOM
 * dan konten aksesibel.
 */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches
  );

  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatch(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);

  return match;
}
