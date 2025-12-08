// Helper function to get YYYY-MM-DD string from a Date object
export const getYYYYMMDD = (date) => date.toISOString().split('T')[0];

// Helper function to get a date string offset by days
export const getDateOffset = (dateString, offset) => {
    const date = new Date(dateString + 'T00:00:00');
    date.setDate(date.getDate() + offset);
    return getYYYYMMDD(date);
};
