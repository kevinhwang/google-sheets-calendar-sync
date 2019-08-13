import endOfDay from 'date-fns/endOfDay'
import format from 'date-fns/format'
import isValid from 'date-fns/isValid'
import setTime from 'date-fns/set'
import startOfDay from 'date-fns/startOfDay'

export type DateInput = Date | number | string

export default class DateUtils {
  public static dateWithTime(date: Date, time: Date): Date {
    return setTime(date, {hours: time.getHours(), minutes: time.getMinutes(), seconds: time.getSeconds()})
  }

  public static parseOptionalDate(input: DateInput | undefined): Date | null {
    if (!input) {
      return null
    }
    const date: Date = new Date(input)

    if (!isValid(date)) {
      throw new Error(`Error parsing date from input '${input}'`)
    }

    return date
  }

  public static toGoogleCalendarStartAndEnd(startDate: Date, startTime: Date | null, endDate: Date, endTime: Date | null): { start: Date, end: Date, allDay: boolean } {
    // Both absent => all-day event
    if (!startTime && !endTime) {
      return {
        start: startOfDay(startDate),
        end: endOfDay(endDate),
        allDay: true
      }
    } else if (startTime && endTime) {
      return {
        start: DateUtils.dateWithTime(startDate, startTime),
        end: DateUtils.dateWithTime(endDate, endTime),
        allDay: false
      }
    } else {
      throw new Error(`startTime=${startTime} and endTime=${endTime} must either both be null or present`)
    }
  }

  public static formatDay(date: Date): string {
    return format(date, 'yyyy/MM/dd')
  }
}
