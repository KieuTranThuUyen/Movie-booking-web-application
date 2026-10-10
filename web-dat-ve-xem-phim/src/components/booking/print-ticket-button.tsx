'use client';
import { useEffect, useRef } from 'react';
type PrintTicketButtonProps = {
    label?: string;
    
    autoPrint?: boolean;
};
export function PrintTicketButton({ label = '🖨 In vé', autoPrint = false, }: PrintTicketButtonProps) {
    const hasPrinted = useRef(false);
    const handlePrint = () => {
        window.print();
    };
    useEffect(() => {
        if (!autoPrint || hasPrinted.current)
            return;
        hasPrinted.current = true;
        
        const timer = window.setTimeout(() => {
            window.print();
        }, 400);
        return () => window.clearTimeout(timer);
    }, [autoPrint]);
    return (<button type="button" onClick={handlePrint} className="inline-flex items-center rounded-xl bg-sky-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-400">
      {label}
    </button>);
}
