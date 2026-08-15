'use client';

type PrintTicketButtonProps = {
  label?: string;
};

export function PrintTicketButton({
  label = '🖨 In vé',
}: PrintTicketButtonProps) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="inline-flex items-center rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400"
    >
      {label}
    </button>
  );
}