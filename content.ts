import type { PlasmoCSConfig } from "plasmo"

export const config: PlasmoCSConfig = {
  matches: ["https://x.com/*", "https://twitter.com/*"],
  run_at: "document_idle"
}

const STORAGE_KEY = "rgiDailyReplyCounts"
const INDICATOR_ATTR = "data-rgi-reply-count-indicator"

type GetTodayCountMessage = {
  type: "RGI/GET_TODAY_COUNT"
}

type ReplyGuyMessage = GetTodayCountMessage

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

const getTodayKey = (now = new Date()) => {
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

const isReplySubmitButton = (element: Element | null): element is HTMLElement => {
  if (!(element instanceof HTMLElement)) return false
  const testId = element.getAttribute("data-testid")
  if (testId !== "tweetButton" && testId !== "tweetButtonInline") return false

  const text = element.innerText?.trim() ?? ""
  const ariaLabel = element.getAttribute("aria-label")?.trim() ?? ""
  return /\breply\b/i.test(text) || /\breply\b/i.test(ariaLabel)
}

const createIndicatorElement = () => {
  const el = document.createElement("div")
  el.setAttribute(INDICATOR_ATTR, "true")
  el.setAttribute("role", "status")
  el.setAttribute("aria-live", "polite")
  el.title = "Replies today"
  el.style.alignItems = "center"
  el.style.background = "rgba(124, 58, 237, 0.12)"
  el.style.border = "1px solid rgba(124, 58, 237, 0.35)"
  el.style.borderRadius = "9999px"
  el.style.boxSizing = "border-box"
  el.style.color = "rgb(124, 58, 237)"
  el.style.display = "inline-flex"
  el.style.fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
  el.style.fontSize = "12px"
  el.style.fontWeight = "700"
  el.style.height = "24px"
  el.style.justifyContent = "center"
  el.style.marginRight = "8px"
  el.style.minWidth = "24px"
  el.style.padding = "0 10px"
  el.style.userSelect = "none"
  el.style.whiteSpace = "nowrap"
  return el
}

const renderIndicator = (indicator: HTMLElement, count: number) => {
  indicator.textContent = String(count)
}

const cleanupIndicators = () => {
  document.querySelectorAll(`[${INDICATOR_ATTR}="true"]`).forEach((node) => {
    if (!(node instanceof HTMLElement)) return
    const next = node.nextElementSibling
    if (!isReplySubmitButton(next)) node.remove()
  })
}

const mountIndicators = (count: number) => {
  cleanupIndicators()

  const candidates = document.querySelectorAll(
    '[data-testid="tweetButton"], [data-testid="tweetButtonInline"]'
  )

  candidates.forEach((candidate) => {
    if (!isReplySubmitButton(candidate)) return

    const button = candidate
    const previous = button.previousElementSibling

    const indicator =
      previous instanceof HTMLElement && previous.getAttribute(INDICATOR_ATTR) === "true"
        ? previous
        : createIndicatorElement()

    if (indicator !== previous) {
      button.insertAdjacentElement("beforebegin", indicator)
    }

    renderIndicator(indicator, count)
  })
}

const main = async () => {
  let todayCount = 0

  const initial = await sendMessage({ type: "RGI/GET_TODAY_COUNT" })
  if (initial.ok) {
    todayCount = initial.count
    mountIndicators(todayCount)
  }

  let mountScheduled = false
  const scheduleMountIndicators = () => {
    if (mountScheduled) return
    mountScheduled = true
    requestAnimationFrame(() => {
      mountScheduled = false
      mountIndicators(todayCount)
    })
  }

  const observer = new MutationObserver(() => {
    scheduleMountIndicators()
  })

  observer.observe(document.documentElement, { childList: true, subtree: true })

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return
    const change = changes[STORAGE_KEY]
    if (!change?.newValue) return

    const counts = change.newValue as Record<string, number>
    const nextCount = counts[getTodayKey()] ?? 0
    if (nextCount === todayCount) return

    todayCount = nextCount
    scheduleMountIndicators()
  })
}

void main()
