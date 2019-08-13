import 'core-js'
import DefaultTwoWeekSync from './sync/DefaultTwoWeekSync'
import {OpenEvent} from './GoogleAppsScriptMisc'
import GoogleAppsScriptUtils from './GoogleAppsScriptUtils'

export function appendOverview(): void {
  GoogleAppsScriptUtils.tryWithScriptLock(() => new DefaultTwoWeekSync().appendTwoWeekOverview())
}

export function clearOverview(): void {
  GoogleAppsScriptUtils.tryWithScriptLock(() => new DefaultTwoWeekSync().clearTwoWeekOverview())
}

export function syncOverview(): void {
  GoogleAppsScriptUtils.tryWithScriptLock(() => new DefaultTwoWeekSync().syncTwoWeekOverView())
}

export function _onOpen(e: OpenEvent): void {
  console.info('Running trigger onOpen with payload=%s', e)

  const tabSyncMenu: GoogleAppsScript.Base.Menu = SpreadsheetApp.getUi()
    .createMenu('Tab Sync')
    .addItem('Append Overview', 'appendOverview')
    .addItem('Clear Overview', 'clearOverview')
    .addItem('Sync Overview', 'syncOverview')

  SpreadsheetApp.getUi()
    .createMenu('WaaG Sync')
    .addSubMenu(tabSyncMenu)
    .addToUi()
}
