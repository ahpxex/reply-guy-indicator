import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://*/*"],
  run_at: "document_idle"
}

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

type ReplyGuyResponse = OkResponse | ErrorResponse

const sendMessage = (message: ReplyGuyMessage): Promise<ReplyGuyResponse> =>
  new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      const error = chrome.runtime.lastError
      if (error) {
        resolve({ ok: false, error: error.message })
        return
      }
      resolve(response as ReplyGuyResponse)
    })
  })

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
}

const main = async () => {
  const initial = await sendMessage({ type: "RGI/GET_TODAY_COUNT" })
  if (initial.ok) {
    console.log(`[ReplyGuy] ${initial.date} count: ${initial.count}`)
  } else {
    console.warn("[ReplyGuy] Failed to get count:", initial.error)
  }

  // Temporary scaffold: press Alt+Shift+R to simulate "made a reply" on any page.
  window.addEventListener("keydown", async (event) => {
    if (isEditableTarget(event.target)) return
    if (!event.altKey || !event.shiftKey || event.code !== "KeyR") return

    const updated = await sendMessage({
      type: "RGI/INCREMENT_REPLY",
      at: Date.now(),
      url: location.href
    })

    if (updated.ok) {
      console.log(`[ReplyGuy] ${updated.date} count: ${updated.count}`)
    } else {
      console.warn("[ReplyGuy] Failed to increment count:", updated.error)
    }
  })
}

void main()

