import { titleCase } from './utils';

export interface ReceiptScanResult {
    rawText: string;
    amount: number | null;
    date: string | null;
    merchant: string | null;
}

const AMOUNT_KEYWORDS = /total|amount\s*due|balance\s*due|amount\s*paid/i;
const CURRENCY_NUMBER = /\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})|\d+\.\d{2})/;
const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

function toIsoDate(year: number, monthIndex: number, day: number): string | null {
    if (monthIndex < 0 || monthIndex > 11 || day < 1 || day > 31) return null;
    const mm = String(monthIndex + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return `${year}-${mm}-${dd}`;
}

function parseAmount(text: string): number | null {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    // Totals are usually near the bottom of a receipt - check keyword lines from the end first.
    for (let i = lines.length - 1; i >= 0; i--) {
        if (AMOUNT_KEYWORDS.test(lines[i])) {
            const match = lines[i].match(CURRENCY_NUMBER);
            if (match) return parseFloat(match[1].replace(/,/g, ''));
        }
    }

    // No labeled total found - fall back to the largest currency-looking number on the receipt.
    const allMatches = [...text.matchAll(new RegExp(CURRENCY_NUMBER, 'g'))]
        .map(m => parseFloat(m[1].replace(/,/g, '')))
        .filter(n => !Number.isNaN(n));
    if (allMatches.length === 0) return null;
    return Math.max(...allMatches);
}

function parseDate(text: string): string | null {
    let m = text.match(/\b(20\d{2})[\/\-](\d{1,2})[\/\-](\d{1,2})\b/);
    if (m) return toIsoDate(Number(m[1]), Number(m[2]) - 1, Number(m[3]));

    m = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
    if (m) {
        let year = Number(m[3]);
        if (year < 100) year += 2000;
        return toIsoDate(year, Number(m[1]) - 1, Number(m[2]));
    }

    m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i);
    if (m) return toIsoDate(Number(m[3]), MONTHS[m[1].toLowerCase()], Number(m[2]));

    m = text.match(/\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?,?\s+(20\d{2})\b/i);
    if (m) return toIsoDate(Number(m[3]), MONTHS[m[2].toLowerCase()], Number(m[1]));

    return null;
}

function parseMerchant(text: string): string | null {
    const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    // Store name is almost always one of the first few lines on a receipt.
    for (const line of lines.slice(0, 6)) {
        const letters = line.replace(/[^a-zA-Z]/g, '');
        if (letters.length >= 3 && !/^\d+$/.test(line)) {
            return titleCase(line.toLowerCase());
        }
    }
    return null;
}

// Runs OCR fully in-browser (WASM worker) - the image is only held in memory for this call
// and is never uploaded or persisted anywhere.
export async function scanReceipt(file: File, onProgress?: (percent: number) => void): Promise<ReceiptScanResult> {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng', 1, {
        logger: (m) => {
            if (m.status === 'recognizing text' && onProgress) {
                onProgress(Math.round(m.progress * 100));
            }
        }
    });

    try {
        const { data } = await worker.recognize(file);
        const rawText = data.text || '';
        return {
            rawText,
            amount: parseAmount(rawText),
            date: parseDate(rawText),
            merchant: parseMerchant(rawText)
        };
    } finally {
        await worker.terminate();
    }
}
