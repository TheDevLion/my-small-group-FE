export const howManyDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export const firstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
}

export const formatMonthYear = (date: Date) => {
    return `${(date.getMonth()+1).toString().padStart(2, "0")}/${date.getFullYear()}`;
}

export const formatDayMonthYear = (date: Date) => {
    return `${(date.getDate()).toString().padStart(2, "0")}/${(date.getMonth()+1).toString().padStart(2, "0")}/${date.getFullYear()}`;
}

export const formatAbbDayMonthYear = (date: Date) => {
    return `${(date.getDate()).toString().padStart(2, "0")}/${(date.getMonth()+1).toString().padStart(2, "0")}`;
    ///${date.getFullYear().toString().replace("20", "")}
}

export const formatYearMonthDay = (date: Date) => {
    return `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, "0")}-${(date.getDate()).toString().padStart(2, "0")}`;
}

export const isItToday = (day: string, date: Date) => {
    return day === date.getDate().toString();
}

export const isValidDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value + 'T00:00:00');
    return !Number.isNaN(date.getTime()) && formatYearMonthDay(date) === value;
};

export const isStrDateWindowValid = (date1: string, date2: string) =>
    isValidDate(date1) && isValidDate(date2) && date1 <= date2;
