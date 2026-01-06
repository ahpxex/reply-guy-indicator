const STORAGE_KEY = "rgiDailyReplyCounts"

type DailyReplyCounts = Record<string, number>

type GetTodayCountMessage = {
  type: "RGI/GET_TODAY_COUNT"
}

type IncrementReplyMessage = {
  type: "RGI/INCREMENT_REPLY"
  at?: number
  url?: string
}

type ReplyGuyMessage = GetTodayCountMessage | IncrementReplyMessage

type OkResponse = {
  ok: true
  date: string
  count: number
}

type ErrorResponse = {
  ok: false
  error: string
}

const getTodayKey = (now = new Date()) => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const storageGet = <T>(key: string): Promise<T | undefined> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (result) => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(error)
        return
      }
      resolve(result?.[key] as T | undefined)
    })
  })

const storageSet = (items: Record<string, unknown>): Promise<void> =>
  new Promise((resolve, reject) => {
    chrome.storage.local.set(items, () => {
      const error = chrome.runtime.lastError
      if (error) {
        reject(error)
        return
      }
      resolve()
    })
  })

const getCounts = async (): Promise<DailyReplyCounts> =>
  (await storageGet<DailyReplyCounts>(STORAGE_KEY)) ?? {}

const setCounts = async (counts: DailyReplyCounts) =>
  storageSet({ [STORAGE_KEY]: counts })

const setBadge = (count: number) => {
  chrome.action.setBadgeBackgroundColor({ color: "#7c3aed" })
  chrome.action.setBadgeText({ text: count > 0 ? String(count) : "" })
}

const refreshBadgeFromStorage = async () => {
  const counts = await getCounts()
  const today = getTodayKey()
  setBadge(counts[today] ?? 0)
}

chrome.runtime.onInstalled.addListener(() => {
  void refreshBadgeFromStorage()
})

chrome.runtime.onStartup.addListener(() => {
  void refreshBadgeFromStorage()
})

chrome.runtime.onMessage.addListener((rawMessage: unknown, sender, sendResponse) => {
  const message = rawMessage as Partial<ReplyGuyMessage> | null

  void (async () => {
    try {
      if (!message?.type) return

      if (message.type === "RGI/GET_TODAY_COUNT") {
        const counts = await getCounts()
        const today = getTodayKey()
        setBadge(counts[today] ?? 0)
        const response: OkResponse = {
          ok: true,
          date: today,
          count: counts[today] ?? 0
        }
        sendResponse(response)
        return
      }

      if (message.type === "RGI/INCREMENT_REPLY") {
        const counts = await getCounts()
        const today = getTodayKey()
        const next = (counts[today] ?? 0) + 1
        counts[today] = next

        await setCounts(counts)
        setBadge(next)

        const response: OkResponse = { ok: true, date: today, count: next }
        sendResponse(response)
        return
      }
    } catch (error) {
      const response: ErrorResponse = {
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      }
      sendResponse(response)
    }
  })()

  // Keep the message channel open for async responses.
  return true
})

export {}
