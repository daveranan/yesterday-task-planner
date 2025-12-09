// Helper function to get YYYY-MM-DD string from a Date object
export const getYYYYMMDD = (date: Date): string => date.toISOString().split('T')[0];

// Helper function to get a date string offset by days
export const getDateOffset = (dateString: string, offset: number): string => {
    const date = new Date(dateString + 'T00:00:00');
    date.setDate(date.getDate() + offset);
    return getYYYYMMDD(date);
};
