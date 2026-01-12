import CallbackBase from "../../base-callbacks/base";

type Day = [number, number];
type Days = Day[];
type YearProgressData = { days: Days; date: string };

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

class CallbackYearProgress extends CallbackBase<YearProgressData> {
  constructor(options = {}) {
    super({ name: "year-progress", cacheable: true, receivedConfig: options });
  }

  getData() {
    // Get current date in New York timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    
    const parts = formatter.formatToParts(new Date());
    const currYear = parseInt(parts.find(p => p.type === 'year')!.value);
    const currMonth = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
    const currDate = parseInt(parts.find(p => p.type === 'day')!.value);

    const result: Days = [];

    for (let m = 0; m < 12; m++) {
      const daysInMonth = getDaysInMonth(m + 1, currYear);
      if (m === currMonth) {
        result.push([currDate, daysInMonth - currDate]);
      } else if (m > currMonth) {
        result.push([0, daysInMonth]);
      } else {
        result.push([daysInMonth, 0]);
      }
    }

    // Format date string in EST
    const dateFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    return Promise.resolve({
      date: dateFormatter.format(new Date()),
      days: result,
    });
  }
}

export default CallbackYearProgress;
