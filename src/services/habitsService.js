import { getDayOfWeek } from "../utils/dateUtils.js"

export const getHabitsForDate = (habits, dateStr) => {
    const dayNumber = getDayOfWeek(dateStr);

    return habits.filter(habit => habit.isActive && habit.frequency.includes(dayNumber))
}