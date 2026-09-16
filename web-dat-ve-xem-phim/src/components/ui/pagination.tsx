'use client';

type PaginationProps = {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
  className?: string;
};

export function Pagination({
  page,
  totalPages,
  onChange,
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = Array.from(
    { length: totalPages },
    (_, i) => i + 1,
  );

  return (
    <div
      className={`mt-4 flex flex-wrap items-center justify-center gap-2 ${className}`}
    >
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onChange(page - 1)}
        className="rounded-xl border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Trước
      </button>

      {pages.map((p) => (
        <button
          key={p}
          type="button"
          onClick={() => onChange(p)}
          className={
            p === page
              ? 'rounded-xl bg-sky-500 px-3 py-1.5 text-sm font-semibold text-white'
              : 'rounded-xl border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10'
          }
        >
          {p}
        </button>
      ))}

      <button
        type="button"
        disabled={page >= totalPages}
        onClick={() => onChange(page + 1)}
        className="rounded-xl border border-white/15 px-3 py-1.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Sau
      </button>
    </div>
  );
}

export const PAGE_SIZE = 5;
