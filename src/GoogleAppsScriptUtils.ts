class SyncLockError extends Error {
}

export default class GoogleAppsScriptUtils {
  public static tryWithScriptLock<T>(callback: () => T): T {
    const lock: GoogleAppsScript.Lock.Lock = LockService.getScriptLock()

    if (lock.tryLock(100)) {
      try {
        return callback()
      } finally {
        lock.releaseLock()
      }
    }

    throw new SyncLockError('Could not perform requested operation: another sync operation already in progress')
  }

  public static makeRowUrlRelative(sheetId: number, sourceRowY: number): string {
    const row: number = sourceRowY + 1
    return `#gid=${sheetId}&range=${row}:${row}`
  }

  public static makeRowUrl(sheetId: number, sourceRowY: number): string {
    return `${SpreadsheetApp.getActiveSpreadsheet().getUrl()}${this.makeRowUrlRelative(sheetId, sourceRowY)}`
  }
}
