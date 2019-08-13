import {CalendarSyncData, SourceEvent, TargetEvent} from './types'
import DateUtils, {DateInput} from '../DateUtils'
import {CellValue} from '../GoogleAppsScriptMisc'
import CalendarUtils from './CalendarUtils'
import GoogleAppsScriptUtils from '../GoogleAppsScriptUtils'

/**
 * Sync an individual day sheet with Google Calendar
 */
export default class DaySheetSync {
  private readonly sheet: GoogleAppsScript.Spreadsheet.Sheet
  private readonly daySheetSyncConfig: DaySheetSyncConfig

  constructor(sheet: GoogleAppsScript.Spreadsheet.Sheet, daySheetSyncConfig: DaySheetSyncConfig) {
    this.sheet = sheet
    this.daySheetSyncConfig = daySheetSyncConfig
  }

  public getAllSyncData(): Set<CalendarSyncData> {
    return this.withProtectedRange<Set<CalendarSyncData>>(
      range => new Set(
        range.getValues()
          .map((row: CellValue[]) => row[this.daySheetSyncConfig.schema.xCalendarSyncData])
          .filter(Boolean)
          .map((value: CellValue) => JSON.parse(value as string))
      )
    )
  }

  public getSourceEvents(): Set<SourceEvent> {
    return this.withProtectedRange(
      (range: GoogleAppsScript.Spreadsheet.Range): Set<SourceEvent> => {
        return new Set(
          range.getValues()
            .map((row: CellValue[], index: number) => this.parseSourceEvent(row, index))
            .filter(Boolean)
        )
      }
    )
  }

  public syncCalendar(): Set<CalendarSyncData> {
    const {date, schema: {xCalendarSyncData}, eventGroupToCalendarNames} = this.daySheetSyncConfig
    console.info(`[sheet=${this.sheet.getName()}] Syncing day ${DateUtils.formatDay(date)} to Google Calendar`)

    const calendarsByName: Map<string, GoogleAppsScript.Calendar.Calendar> = new Map(
      Array.from(this.daySheetSyncConfig.calendars).map(
        calendarName => [calendarName, CalendarUtils.getCalendarByName(calendarName)]
      )
    )

    return this.withProtectedRange<Set<CalendarSyncData>>(
      (range: GoogleAppsScript.Spreadsheet.Range): Set<CalendarSyncData> => {
        const sourceEvents: Array<SourceEvent> = range.getValues()
          .map((row: CellValue[], index: number) => this.parseSourceEvent(row, index))
          .filter(Boolean)
          .filter(({eventGroup, source: {sourceRowY}}: SourceEvent): boolean => {
            if (!eventGroupToCalendarNames.has(eventGroup)) {
              console.warn(`[sheet=${this.sheet.getName()}, row=${sourceRowY + 1}] Event group unrecognized. Will skip`)
              return false
            }
            return true
          })

        const sourceToTargetEvents: Map<SourceEvent, Set<TargetEvent>> = new Map(
          sourceEvents.map(
            (sourceEvent: SourceEvent): [SourceEvent, Set<TargetEvent>] => {
              const {startDate, startTime, endDate, endTime, eventGroup, eventName, location, fieldsOfInterest, source: {sourceSheetId, sourceRowY}, calendarSyncData} = sourceEvent
              return [
                sourceEvent,
                new Set(
                  eventGroupToCalendarNames[eventGroup].map(
                    (calendarName: string): TargetEvent => ({
                      eventName,
                      ...DateUtils.toGoogleCalendarStartAndEnd(startDate, startTime, endDate || startDate, endTime),
                      location,
                      description: CalendarUtils.makeDescription(new Map([...fieldsOfInterest, ['SOURCE', GoogleAppsScriptUtils.makeRowUrl(sourceSheetId, sourceRowY)]])),
                      calendar: calendarsByName.get(calendarName),
                      id: calendarSyncData?.[calendarName]
                    })
                  )
                )
              ]
            }
          )
        )

        console.info(`[sheet=${this.sheet.getName()}] Syncing ${sourceToTargetEvents.size} events to Google Calendar`)

        return new Set(Array.from(sourceToTargetEvents).map(
          ([sourceEvent, targetEvents]: [SourceEvent, Set<TargetEvent>]): CalendarSyncData => {
            const {source: {sourceRowY}, calendarSyncData} = sourceEvent
            console.info(`[sheet=${this.sheet.getName()}, row=${sourceRowY + 1}] Syncing source event %s to Google Calendar`, sourceEvent)
            const updatedCalendarSyncData: CalendarSyncData = Array.from(targetEvents).reduce(
              (calendarSyncData: CalendarSyncData, targetEvent: TargetEvent): CalendarSyncData => ({
                ...calendarSyncData,
                ...this.syncEventToCalendar(targetEvent, sourceRowY)
              }),
              calendarSyncData || {}
            )

            // Write updated sync data back to sheet
            this.sheet.getRange(sourceRowY + 1, xCalendarSyncData + 1).setValue(JSON.stringify(updatedCalendarSyncData))
            return updatedCalendarSyncData
          }
        ))
      }
    )
  }

  private syncEventToCalendar(targetEvent: TargetEvent, sourceRowY: number): CalendarSyncData {
    const {calendar, id} = targetEvent

    console.info(`[sheet=${this.sheet.getName()}, row=${sourceRowY + 1}] Syncing target event %s`, targetEvent)

    if (id) {
      console.info(`[sheet=${this.sheet.getName()}, row=${sourceRowY + 1}] Existing event indicated: will update event id=${id}`)
    }

    const calendarEvent: GoogleAppsScript.Calendar.CalendarEvent = CalendarUtils.createOrUpdateCalendarEvent(calendar, targetEvent)

    return {[calendar.getName()]: calendarEvent.getId()}
  }

  private getRange(yStart: number, yEnd: number): GoogleAppsScript.Spreadsheet.Range {
    // Sheet indices, ranges are 1-indexed
    const numRows = yEnd - yStart + 1
    const numCols = this.sheet.getMaxColumns()
    return this.sheet.getRange(yStart + 1, 1, numRows, numCols)
  }

  private getProtectedRange(): [GoogleAppsScript.Spreadsheet.Range, GoogleAppsScript.Spreadsheet.Protection] {
    const {
      schema: {
        yStart,
        yEnd = this.sheet.getLastRow() - 1
      }
    } = this.daySheetSyncConfig

    // Sheet indices, ranges are 1-indexed
    const protectedRange: GoogleAppsScript.Spreadsheet.Range = this.sheet.getRange(1, 1, yEnd + 1)
    const protectionPermissive: GoogleAppsScript.Spreadsheet.Protection = protectedRange.protect()
    const protectionFinal: GoogleAppsScript.Spreadsheet.Protection = protectionPermissive
      .addEditor(Session.getEffectiveUser())
      .removeEditors(protectionPermissive.getEditors())
      .setDomainEdit(false)
    const range = this.getRange(yStart, yEnd)
    return [range, protectionFinal]
  }

  private withProtectedRange<T>(callback: (range: GoogleAppsScript.Spreadsheet.Range) => T): T {
    const [range, protection] = this.getProtectedRange()
    console.info(`[sheet=${this.sheet.getName()}] Using range=${range.getA1Notation()}`)

    try {
      return callback(range)
    } finally {
      protection.remove()
    }
  }

  private parseSourceEvent(row: CellValue[], index: number): SourceEvent | null {
    const {
      date,
      schema: {
        xStartTime,
        xEndTime,
        xEventGroup,
        xEventName,
        xLocation,
        xShouldSync,
        xCalendarSyncData,
        yStart,
      },
      fieldsOfInterestMap
    } = this.daySheetSyncConfig

    const sourceRowY: number = yStart + index

    const shouldSync: boolean = this.sheet.getRange(sourceRowY + 1, xShouldSync + 1).isChecked()

    if (!shouldSync) {
      console.warn(`[sheet=${this.sheet.getName()}, row=${sourceRowY + 1}] Sync is not enabled for event: event will be skipped`)
      return null
    }

    const eventGroup: string | undefined = row[xEventGroup] as string
    if (!eventGroup) {
      console.warn(`[sheet=${this.sheet.getName()}, row=${sourceRowY + 1}] Event group missing: event will be skipped`)
      return null
    }

    const eventName: string | undefined = row[xEventName] as string
    if (!eventName) {
      console.warn(`[sheet=${this.sheet.getName()}, row=${sourceRowY + 1}] Event name missing: event will be skipped`)
      return null
    }

    const fieldsOfInterestIndexMapEntries: Array<[string, number]> = fieldsOfInterestMap ? Array.from(fieldsOfInterestMap) : []

    const fieldsOfInterest: Map<string, CellValue> = new Map(
      fieldsOfInterestIndexMapEntries
        .map(([fieldName, x]: [string, number]): [string, CellValue] => [fieldName, row[x]])
        .filter(([, value]: [string, CellValue]) => value)
    )

    const calendarSyncData: CellValue | undefined = row[xCalendarSyncData]

    return {
      startDate: date,
      startTime: DateUtils.parseOptionalDate(row[xStartTime] as DateInput),
      endTime: DateUtils.parseOptionalDate(row[xEndTime] as DateInput),
      eventGroup,
      eventName,
      location: row[xLocation] as string,
      fieldsOfInterest,
      source: {
        sourceSheetId: this.sheet.getSheetId(),
        sourceRowY
      },
      calendarSyncData: calendarSyncData ? JSON.parse(calendarSyncData as string) : undefined
    }
  }
}

export interface DaySheetSchema {
  readonly xStartTime: number,
  readonly xEndTime: number,
  readonly xEventGroup: number,
  readonly xEventName: number,
  readonly xLocation: number,
  readonly xShouldSync: number,
  readonly xCalendarSyncData: number,
  readonly yStart: number,
  readonly yEnd?: number
}

export interface DaySheetSyncConfig {
  readonly sheetName: string,
  readonly date: Date,
  readonly schema: DaySheetSchema,
  readonly fieldsOfInterestMap: Map<string, number>,
  readonly calendars: Set<string>,
  readonly eventGroupToCalendarNames: Map<string, Set<string>>
}
