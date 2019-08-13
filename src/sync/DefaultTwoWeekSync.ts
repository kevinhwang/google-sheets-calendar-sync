import TwoWeekSync from './TwoWeekSync'
import {DaySheetSchema} from './DaySheetSync'
import OverviewSheetSync, {OverviewSheetSchema} from './OverviewSheetSync'

export default class DefaultTwoWeekSync extends TwoWeekSync {
  static SHEET_NAME_CONFIG = 'SYNC_CONFIG'

  constructor() {
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet()

    const syncConfigJson: SyncConfigJson = DefaultTwoWeekSync.getSyncConfigJson(spreadsheet)

    console.info(`Using sync config=%s`, syncConfigJson)

    const {
      overview: {
        sheetName: overviewSheetName,
        schema: overviewSchema,
        fieldsOfInterest: overviewFieldsOfInterest
      },
      daySheet: {
        schema: daySchema,
        fieldsOfInterest: dayFieldsOfInterest,
        calendars,
        eventGroupToCalendarNames
      }
    } = syncConfigJson

    const overviewSheet: GoogleAppsScript.Spreadsheet.Sheet = spreadsheet.getSheetByName(overviewSheetName)

    if (!overviewSheet) {
      throw new Error(`Could not find sheet ${overviewSheetName}`)
    }

    const overviewSheetSync: OverviewSheetSync = new OverviewSheetSync(
      overviewSheet,
      {
        sheetName: overviewSheetName,
        schema: overviewSchema,
        fieldsOfInterestMap: new Map(Object.entries(overviewFieldsOfInterest))
      }
    )

    super(
      spreadsheet,
      overviewSheetSync,
      {
        sheetName: undefined,
        date: undefined,
        schema: daySchema,
        fieldsOfInterestMap: new Map(Object.entries(dayFieldsOfInterest)),
        calendars: new Set(calendars),
        eventGroupToCalendarNames: new Map(
          Object.entries(eventGroupToCalendarNames).map(
            ([eventGroup, calendarNames]) => [eventGroup, new Set(calendarNames)]
          )
        )
      }
    )
  }

  private static getSyncConfigJson(spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet): SyncConfigJson {
    console.info(`Fetching sync config from sheet ${DefaultTwoWeekSync.SHEET_NAME_CONFIG}`)
    const configSheet: GoogleAppsScript.Spreadsheet.Sheet = spreadsheet.getSheetByName(DefaultTwoWeekSync.SHEET_NAME_CONFIG)
    if (!configSheet) {
      throw new Error(`Could not find sheet ${DefaultTwoWeekSync.SHEET_NAME_CONFIG}`)
    }
    return JSON.parse(configSheet.getRange(1, 1).getValue())
  }
}

interface SyncConfigJson {
  readonly overview: {
    readonly sheetName: string,
    readonly schema: OverviewSheetSchema,
    readonly fieldsOfInterest: Record<string, number>
  },
  readonly daySheet: {
    readonly schema: DaySheetSchema,
    readonly fieldsOfInterest: Record<string, number>,
    readonly calendars: string[],
    readonly eventGroupToCalendarNames: Record<string, string[]>
  }
}
