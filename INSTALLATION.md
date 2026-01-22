# Installing Anti-Doom Scroll Browser Extension

## Multi-Browser Support ✅

This extension works on:
- ✅ **Chrome** (and Chromium-based browsers: Edge, Brave, Opera)
- ✅ **Firefox** (109+)

---

## Installation Steps

### For Chrome / Edge / Brave / Opera

#### Step 1: Build the Extension
```bash
npm install  # Install dependencies (if not done already)
npm run build:chrome  # Build for Chrome/Chromium browsers
```

This creates a **`dist-chrome/`** folder with the built extension.

#### Step 2: Load Extension

**Chrome / Edge / Brave:**
1. Open your browser and go to the extensions page:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
   - Brave: `brave://extensions/`
   - Opera: `opera://extensions/`
2. Enable **"Developer mode"** (toggle in top right corner)
3. Click **"Load unpacked"**
4. Navigate to your project folder and select the **`dist-chrome`** folder
5. The extension is now installed! 🎉

---

### For Firefox

#### Step 1: Build the Extension
```bash
npm install  # Install dependencies (if not done already)
npm run build:firefox  # Build for Firefox
```

This creates a **`dist-firefox/`** folder with the built extension.

#### Step 2: Load Extension

**Temporary Installation (for development/testing):**
1. Open Firefox and go to: `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on..."**
3. Navigate to your **`dist-firefox/`** folder and select the **`manifest.json`** file
4. The extension is now installed! 🎉

**Note**: Temporary extensions are removed when Firefox closes.

**Permanent Installation (requires signing):**
- For permanent installation, the extension needs to be signed by Mozilla
- See [Firefox extension signing](https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/)

---

## Building for All Browsers

To build for both Chrome and Firefox at once:
```bash
npm run build:all
```

This creates **two separate folders**:
- **`dist-chrome/`** - Chrome/Edge/Brave/Opera build
- **`dist-firefox/`** - Firefox build

Load the appropriate folder in your target browser.

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
