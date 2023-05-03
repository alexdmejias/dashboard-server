import CallbackBase from "./base";

type Day = [number, number];
type Days = Day[];
type YearProgressData = { days: Days; date: string };

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

class CallbackYearProgress extends CallbackBase<YearProgressData> {
  constructor() {
    super({ name: "year" });
  }

  getData() {
    const date = new Date();
    const currMonth = date.getMonth();
    const currDate = date.getDate();
    const currYear = date.getFullYear();
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

    return Promise.resolve({
      date: date.toDateString(),
      days: result,
    });
  }
}

export default CallbackYearProgress;
