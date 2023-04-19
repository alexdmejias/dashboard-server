import CallbackBase from "./base";

function getDaysInMonth(month: number, year: number) {
  return new Date(year, month, 0).getDate();
}

class CallbackYearProgress extends CallbackBase {
  constructor() {
    super({ name: "year" });
  }

  async getData(): Promise<{ days: [number, number][]; date: string }> {
    const date = new Date();
    const currMonth = date.getMonth();
    const currDate = date.getDate();
    const currYear = date.getFullYear();
    const result: [number, number][] = [];

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

    return {
      date: date.toDateString(),
      days: result,
    };
  }
}

export default CallbackYearProgress;
