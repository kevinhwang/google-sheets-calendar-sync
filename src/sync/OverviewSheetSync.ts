import {SourceEvent} from './types'
import isSameDay from 'date-fns/isSameDay'
import {CellValue} from '../GoogleAppsScriptMisc'
import startOfDay from 'date-fns/startOfDay'
import DateUtils from '../DateUtils'
import GoogleAppsScriptUtils from '../GoogleAppsScriptUtils'

export interface OverviewSheetSchema {
  readonly xStartDate: number,
  readonly xStartTime: number,
  readonly xEndTime: number,
  readonly xEventGroup: number,
  readonly xEventName: number,
  readonly xLocation: number,
  readonly yStart: number,
  readonly yEnd?: number
}

export interface OverviewSheetSyncConfig {
  readonly sheetName: string,
  readonly schema: OverviewSheetSchema,
  readonly fieldsOfInterestMap: Map<string, number>
}

export default class OverviewSheetSync {
  private readonly sheet: GoogleAppsScript.Spreadsheet.Sheet
  private readonly overviewSheetSyncConfig: OverviewSheetSyncConfig

  constructor(sheet: GoogleAppsScript.Spreadsheet.Sheet, overviewSheetSyncConfig: OverviewSheetSyncConfig) {
    this.sheet = sheet
    this.overviewSheetSyncConfig = overviewSheetSyncConfig
  }

  public clearSheet(): void {
    const {
      yStart,
      yEnd = this.sheet.getMaxRows() - 1
    } = this.overviewSheetSyncConfig.schema

    console.info(`[sheet=${this.sheet.getName()}] Clearing sheet`)

    if (yEnd <= yStart) {
      console.info(`[sheet=${this.sheet.getName()}] Nothing to do to clear sheet`)
      return
    }

    const rowStart: number = yStart + 1
    const numRows: number = yEnd - yStart + 1

    console.info(`[sheet=${this.sheet.getName()}] Deleting rows ${rowStart}-${rowStart + numRows - 1}`)
    this.sheet.deleteRows(rowStart, numRows)
  }

  public appendDay(date: Date, events: Set<SourceEvent>): void {
    const {
      schema: {
        xStartDate,
        xStartTime,
        xEndTime,
        xEventGroup,
        xEventName,
        xLocation,
        yStart
      },
      fieldsOfInterestMap
    } = this.overviewSheetSyncConfig

    if (events.size == 0) {
      console.warn(`[sheet=${this.sheet.getName()}] No events to sync`)
      return
    }

    console.info(`[sheet=${this.sheet.getName()}] Adding ${events.size} events for ${DateUtils.formatDay(date)}`)

    const eventsArray: Array<SourceEvent> = Array.from(events)
    eventsArray
      .filter((event: SourceEvent): boolean => !isSameDay(date, event.startDate))
      .forEach(
        event => {
          throw new Error(`[sheet=${this.sheet.getName()}] Source event ${event} has a date differing from the day requested for syncing with overview`)
        }
      )

    const oldRowLast: number = this.sheet.getMaxRows()
    const oldYLast: number = oldRowLast - 1

    if (oldYLast < yStart - 1) {
      throw new Error(`[sheet=${this.sheet.getName()}] Last row ${oldRowLast} < rowStart - 1 = ${yStart}`)
    }

    // Insert new rows for events, +1 extra as a delimiter between days
    this.sheet.insertRowsAfter(oldRowLast, events.size + 1)

    const numCols: number = this.sheet.getMaxColumns()

    // Format delimiter row
    this.sheet.setRowHeights(oldRowLast + 1, 1, 8)
    this.sheet.getRange(oldRowLast + 1, 1, 1, numCols)
      .setBackground('#ccc')
      .setDataValidation(null)

    const newRows: CellValue[][] = eventsArray.map(
      (sourceEvent: SourceEvent): CellValue[] => {
        const {startTime, endTime, eventGroup, eventName, location, fieldsOfInterest, source: {sourceSheetId, sourceRowY}} = sourceEvent

        const newRow: CellValue[] = Array(numCols).fill('')

        newRow[xStartTime] = startTime
        newRow[xEndTime] = endTime
        newRow[xEventGroup] = eventGroup
        newRow[xEventName] = `=HYPERLINK("${GoogleAppsScriptUtils.makeRowUrlRelative(sourceSheetId, sourceRowY)}", "${eventName}")`
        newRow[xLocation] = location

        fieldsOfInterestMap.forEach(
          (y, field) => {
            const value: CellValue | undefined = fieldsOfInterest.get(field)

            if (value) {
              newRow[y] = value
            }
          }
        )

        return newRow
      }
    )

    // Fill in date
    newRows[0][xStartDate] = startOfDay(date)

    const range: GoogleAppsScript.Spreadsheet.Range = this.sheet.getRange(oldRowLast + 2, 1, events.size, this.sheet.getMaxColumns())
    range.setValues(newRows)

    // Merge date cells
    this.sheet.getRange(oldRowLast + 2, xStartDate + 1, events.size, 1).merge()
  }
}
