export type CellValue = number | boolean | Date | string

export interface EditEvent {
  readonly authMode: typeof ScriptApp.AuthMode,
  readonly oldValue?: CellValue,
  readonly range: GoogleAppsScript.Spreadsheet.Range,
  readonly source: GoogleAppsScript.Spreadsheet.Spreadsheet,
  readonly triggerUid?: string,
  readonly user?: GoogleAppsScript.Base.User,
  readonly value: CellValue
}

export interface OpenEvent {
  readonly authMode: typeof ScriptApp.AuthMode,
  readonly source: GoogleAppsScript.Spreadsheet.Spreadsheet,
  readonly triggerUid?: string,
  readonly user?: GoogleAppsScript.Base.User
}
