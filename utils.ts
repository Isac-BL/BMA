
/**
 * Formats a number as Brazilian Real (BRL) currency.
 * @param value The amount to format
 * @returns Formatted currency string (e.g., "R$ 50,00")
 */
export const formatCurrency = (value: number | string): string => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(num)) return 'R$ 0,00';
    return num.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
};
