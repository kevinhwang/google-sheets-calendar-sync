import addDays from 'date-fns/addDays'
import format from 'date-fns/format'
import startOfWeek from 'date-fns/startOfWeek'
import range from 'lodash/range'

import OverviewSheetSync from './OverviewSheetSync'
import DaySheetSync, {DaySheetSyncConfig} from './DaySheetSync'
import {SourceEvent} from './types'

export default class TwoWeekSync {
  private readonly spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  private readonly overviewSheetSync: OverviewSheetSync
  private readonly daySheetSyncConfigTemplate: DaySheetSyncConfig

  constructor(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet, overviewSheetSync: OverviewSheetSync, daySheetSyncConfigTemplate: DaySheetSyncConfig) {
    this.spreadsheet = spreadsheet
    this.overviewSheetSync = overviewSheetSync
    this.daySheetSyncConfigTemplate = daySheetSyncConfigTemplate
  }

  public appendTwoWeekOverview(): TwoWeekSync {
    this.getSheets().forEach(
      (sheet: GoogleAppsScript.Spreadsheet.Sheet, day: Date) => {
        const daySheetSync: DaySheetSync = new DaySheetSync(
          sheet,
          {
            ...this.daySheetSyncConfigTemplate,
            sheetName: sheet.getName(),
            date: day
          }
        )

        const events: Set<SourceEvent> = daySheetSync.getSourceEvents()

        this.overviewSheetSync.appendDay(day, events)
      }
    )

    return this
  }

  public clearTwoWeekOverview(): TwoWeekSync {
    this.overviewSheetSync.clearSheet()
    return this
  }

  public syncTwoWeekOverView(): TwoWeekSync {
    return this
      .clearTwoWeekOverview()
      .appendTwoWeekOverview()
  }

  private getSheets(): Map<Date, GoogleAppsScript.Spreadsheet.Sheet> {
    const now: Date = new Date()
    const firstDay: Date = startOfWeek(now)

    return new Map(
      range(0, 14)
        .map((i: number): Date => addDays(firstDay, i))
        .map((day: Date): [Date, GoogleAppsScript.Spreadsheet.Sheet] => {
          const sheetName: string = format(day, 'M/d EEE')

          const sheet: GoogleAppsScript.Spreadsheet.Sheet = this.spreadsheet.getSheetByName(sheetName)

          if (!sheet) {
            console.warn(`Sheet ${sheetName} not found`)
          }

          return [day, sheet]
        })
        .filter(([, sheet]: [Date, GoogleAppsScript.Spreadsheet.Sheet]) => sheet)
    )
  }
}
