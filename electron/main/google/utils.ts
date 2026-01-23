// File: electron/main/google/utils.ts
export function getTodaySheetName(): string {
  // Use Romanian weekday names matching your sheet tabs
  const days = [
    "Duminica", // Sunday (0)
    "Luni",
    "Marti",
    "Miercuri",
    "Joi",
    "Vineri",
    "Sambata",
  ];

  const today = new Date();
  return days[today.getDay()];
}
