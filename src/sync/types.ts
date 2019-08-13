import {CellValue} from '../GoogleAppsScriptMisc'

export type CalendarSyncData = Record<string, string>

export interface SourceEvent {
  readonly startDate: Date,
  readonly startTime?: Date,
  readonly endDate?: Date,
  readonly endTime?: Date,
  readonly eventGroup: string,
  readonly eventName?: string,
  readonly location?: string,
  readonly fieldsOfInterest: Map<string, CellValue>,
  readonly source: {
    readonly sourceSheetId: number,
    readonly sourceRowY: number
  },
  readonly calendarSyncData?: CalendarSyncData
}

export interface TargetEvent {
  readonly eventName: string,
  readonly start: Date,
  readonly end: Date,
  readonly allDay: boolean,
  readonly location?: string,
  readonly description?: string,
  readonly calendar: GoogleAppsScript.Calendar.Calendar,
  readonly id?: string
}
