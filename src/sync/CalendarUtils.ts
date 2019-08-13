import addHours from 'date-fns/addHours'
import isSameDay from 'date-fns/isSameDay'
import isEqual from 'lodash/isEqual'
import {TargetEvent} from './types'
import {CellValue} from '../GoogleAppsScriptMisc'

export default class CalendarUtils {
  private static TAG_KEY_EVENT_DATA = 'event_data'

  public static getCalendarEvent(calendar: GoogleAppsScript.Calendar.Calendar, id: string): GoogleAppsScript.Calendar.CalendarEvent {
    const calendarEvent = calendar.getEventById(id)

    if (!calendarEvent) {
      throw new Error(`Error getting calendar event by id=${id}`)
    }

    return calendarEvent
  }

  public static createCalendarEvent(calendar: GoogleAppsScript.Calendar.Calendar): GoogleAppsScript.Calendar.CalendarEvent {
    const now = new Date()
    const calendarEvent = calendar.createEvent(Utilities.getUuid(), now, addHours(now, 1))
    console.info(`Created new calendar event {title=${calendarEvent.getTitle()}, id=${calendarEvent.getId()}}`)
    return calendarEvent
  }

  public static createOrUpdateCalendarEvent(calendar: GoogleAppsScript.Calendar.Calendar, targetEvent: TargetEvent): GoogleAppsScript.Calendar.CalendarEvent {
    const {eventName, start, end, allDay, location, description, id} = targetEvent

    const calendarEvent = id ? this.getCalendarEvent(calendar, id) : this.createCalendarEvent(calendar)
    const tagEventData = calendarEvent.getTag(CalendarUtils.TAG_KEY_EVENT_DATA)
    const eventData: TargetEvent = tagEventData ? JSON.parse(tagEventData) : undefined

    if (isEqual(eventData, targetEvent)) {
      console.info(`No updates required for event id=${id}. Skipping...`)
    } else {
      calendarEvent.setTitle(eventName)

      if (allDay) {
        if (!end || isSameDay(start, end)) {
          calendarEvent.setAllDayDate(start)
        } else {
          calendarEvent.setAllDayDates(start, end)
        }
      } else {
        calendarEvent.setTime(start, end)
      }

      if (location) {
        calendarEvent.setLocation(location)
      }
      if (description) {
        calendarEvent.setDescription(description)
      }

      calendarEvent.setTag(CalendarUtils.TAG_KEY_EVENT_DATA, JSON.stringify(targetEvent))

      console.info(`Created / updated calendar event id=${calendarEvent.getId()}`)
    }

    return calendarEvent
  }

  public static getCalendarByName(calendarName: string): GoogleAppsScript.Calendar.Calendar {
    const calendars: GoogleAppsScript.Calendar.Calendar[] = CalendarApp.getCalendarsByName(calendarName)

    if (calendars.length != 1) {
      throw new Error(`Error getting calendar by name=${calendarName}: expected 1 calendar but ${calendars.length} found`)
    }

    return calendars[0]
  }

  public static makeDescription(fieldsOfInterest: Map<string, CellValue>): string {
    return Array.from(fieldsOfInterest)
      .map(([fieldName, value]) => `# ${fieldName}\n${value}`)
      .join('\n\n')
  }
}
