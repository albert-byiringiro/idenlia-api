export const toISODate = (dateStr) => {
    const date = new Date(dateStr);

    if (isNaN(date.getTime())) {
        throw new Error('Invalid Date')
    }

    return date.toISOString().split('T')[0];
}

export const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 ? 7 : day;
}