# Installing Anti-Doom Scroll Chrome Extension

## Installation Steps

### Step 1: Build the Extension
```bash
npm install  # Install dependencies (if not done already)
npm run build  # Build the extension
```

This will create a `dist/` folder with the built extension.

### Step 2: Load Extension in Chrome

1. Open Chrome and go to: **`chrome://extensions/`**
2. Enable **"Developer mode"** (toggle in top right corner)
3. Click **"Load unpacked"**
4. Navigate to your project folder and select the **`dist`** folder
5. The extension is now installed! 🎉

### Step 3: Start Using

- Click the extension icon in your Chrome toolbar to open settings
- On first install, an onboarding page will guide you through setup
- Visit any supported social media site and try scrolling on a post - it will be blocked!

---

## Supported Platforms

- **Instagram** - reels, posts, stories
- **TikTok** - videos
- **YouTube** - shorts only
- **Facebook** - reels, stories
- **Twitter/X** - media viewer
- **Reddit** - post view

---

## Development Mode (For Active Development)

If you're actively developing and want automatic rebuilds:

```bash
npm run dev
```

This runs Vite in watch mode. After changes:
1. Go to `chrome://extensions/`
2. Click the refresh icon on the Anti-Doom Scroll extension
3. Reload the webpage you're testing

---

## Updating the Extension

After making code changes:

1. Run `npm run build`
2. Go to `chrome://extensions/`
3. Click the refresh/reload icon on the extension
4. Reload any active tabs

---

## Troubleshooting

### Icons not showing?
- Make sure `src/icons/` contains icon16.png, icon48.png, and icon128.png
- The build automatically copies them to `dist/src/icons/`

### Extension not working?
1. Open Chrome DevTools (F12) and check for console errors
2. Right-click the extension icon → "Inspect popup" to debug the popup
3. Go to `chrome://extensions/` → Click "Inspect views: service worker" to debug background script

### Build fails?
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

### Changes not reflecting?
- Make sure you clicked the refresh icon in `chrome://extensions/`
- Reload the webpage you're testing
- If still not working, remove and re-add the extension

---

## Uninstalling

1. Go to `chrome://extensions/`
2. Find "Anti-Doom Scroll"
3. Click "Remove"

---

## Project Structure

```
anti-doom-scroll/
├── src/
│   ├── background.ts       # Background service worker
│   ├── content.ts          # Content script (runs on social media pages)
│   ├── popup.ts/html       # Extension popup UI
│   ├── onboarding.ts/html  # First-time setup page
│   ├── types.ts            # TypeScript type definitions
│   ├── manifest.json       # Extension manifest
│   └── icons/              # Extension icons
└── dist/                   # Built extension (load this in Chrome)
```

---

## Tips

- The extension blocks scrolling only when viewing individual posts/videos
- You can still browse feeds normally
- Use the "Snooze 5 min" button for temporary access
- Check "Today's Usage" in the popup to see your time spent
- Set time limits and break reminders in the popup settings
