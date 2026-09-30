'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

type Props = {
  initialQuery?: string;
};

/**
 * Ô tìm kiếm duy nhất → /phim?search=...
 * Server gộp kết quả tên + AI, không hiện 2 khối.
 */
export function AiSearchBar({ initialQuery = '' }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) {
      router.push('/phim');
      return;
    }
    router.push(`/phim?search=${encodeURIComponent(q)}`);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/10 via-fuchsia-500/5 to-transparent p-4 sm:p-5">
      <form onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder='Tên phim hoặc mô tả — VD: "Út Lan", "phim hài gia đình"'
          maxLength={500}
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-sky-400/50"
          aria-label="Tìm kiếm phim"
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-sky-500 disabled:opacity-40"
        >
          Tìm kiếm
        </button>
      </form>
    </div>
  );
}
