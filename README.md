# Reply Guy Indicator

A MV3 Chrome extension that shows how many replies you’ve posted today on X (`x.com`).

## Usage

- Open a reply composer on X/Twitter: a small counter pill appears next to the submit **Reply** button.
- The extension toolbar badge also reflects today’s count.

## Install (manual)

1. Open `chrome://extensions`
2. Enable Developer Mode (screenshot below)
3. Click “Load unpacked” → select `build/chrome-mv3-prod` (after `pnpm build`)

![Developer Mode instruction](https://s2.loli.net/2026/01/06/BfEoWbrlQTUK4hG.png)


## How it counts

- The background service worker detects successful “reply” posts via X/Twitter `CreateTweet` requests.
- Counts are stored per-day in `chrome.storage.local`, so they persist after reloads.

## Development

```bash
pnpm install
pnpm dev
```

Then load the unpacked extension from `build/chrome-mv3-dev`.

