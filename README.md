# 🛑 Anti-Doom Scroll

A powerful browser extension that helps you break free from endless social media scrolling by blocking scroll functionality when viewing individual posts, while still allowing you to browse freely.

## 🌟 Features

### Core Functionality
- **Smart Blocking**: Automatically detects when you're viewing individual posts and prevents scrolling to the next one
- **Browse Freely**: Search results and feed pages remain fully functional - only individual post views are restricted
- **Multi-Platform Support**: Works on Instagram, TikTok, YouTube Shorts, Facebook, Twitter/X, and Reddit

### Customization
- **Per-Platform Control**: Enable or disable protection for specific social media platforms
- **Time Limits**: Set maximum session durations with notifications when exceeded
- **Break Reminders**: Get periodic reminders to take breaks and rest your eyes
- **Emergency Snooze**: Temporarily disable blocking for 5 minutes when needed

### Analytics & Insights
- **Usage Tracking**: Monitor time spent on each platform daily
- **Blocked Attempts**: See how many times doom scrolling was prevented
- **Daily Stats**: All counters reset daily to give you a fresh start

### User Experience
- **Beautiful UI**: Modern, gradient-based popup interface with smooth animations
- **Non-Intrusive**: Notifications are dismissible and don't interrupt your experience
- **Optional Audio**: Enable sound feedback when scrolling is blocked (optional)
- **First-Time Setup**: Guided onboarding to help you configure the extension

## 📦 Installation

### From Source (Development)

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/anti-doom-scroll.git
   cd anti-doom-scroll
   ```

2. **Load in Chrome/Edge**
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `anti-doom-scroll` folder

3. **Load in Firefox**
   - Open `about:debugging#/runtime/this-firefox`
   - Click "Load Temporary Add-on"
   - Select the `manifest.json` file

### From Chrome Web Store (Coming Soon)
_Extension will be available on the Chrome Web Store soon_

## 🚀 Usage

### Basic Setup

1. **Click the extension icon** in your browser toolbar
2. **Enable protection** using the main toggle switch
3. **Customize platforms** - Enable/disable specific social media sites
4. **Set time limits** (optional) - Configure maximum session durations
5. **Configure break reminders** (optional) - Get periodic reminders to rest

### How It Works

When you browse social media:
- ✅ **Search pages and feeds**: Scroll freely to find content
- ✅ **Profile pages**: Browse without restrictions
- 🛑 **Individual posts**: Scrolling is blocked to prevent doom scrolling

When blocked, you'll see a friendly notification with options to:
- **Close**: Dismiss the notification and continue viewing the current post
- **Snooze 5 min**: Temporarily disable protection for 5 minutes

### Settings Overview

| Setting | Description | Default |
|---------|-------------|---------|
| Protection Enabled | Master on/off switch | On |
| Platform Toggles | Enable/disable per platform | All On |
| Session Time Limit | Max minutes per session (0 = unlimited) | 0 |
| Break Interval | Reminder frequency in minutes (0 = off) | 0 |
| Sound Feedback | Audio cue when scrolling blocked | Off |

## 🎨 Screenshots

### Extension Popup
_Beautiful gradient interface with all your stats and settings_

### Block Notification
_Friendly notification with snooze and close options_

### Time Limit Alert
_Get notified when you've reached your daily limit_

## 🛠️ Technical Details

### Architecture
- **Manifest V3**: Uses the latest Chrome extension standard
- **Content Scripts**: Injected into social media pages for blocking
- **Background Service Worker**: Manages state and analytics
- **Chrome Storage API**: Syncs settings across devices

### Supported Platforms
- Instagram (Reels, Posts, Stories)
- TikTok (Videos)
- YouTube (Shorts)
- Facebook (Reels, Stories)
- Twitter/X (Media viewer)
- Reddit (Post viewer)

### Files Structure
```
anti-doom-scroll/
├── manifest.json          # Extension configuration
├── content.js            # Main blocking logic
├── background.js         # Service worker for state management
├── popup.html            # Extension popup interface
├── popup.js              # Popup logic and settings
├── onboarding.html       # First-time setup wizard
├── onboarding.js         # Onboarding logic
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md            # This file
```

## 🔒 Privacy

This extension:
- ✅ **No data collection**: Nothing is sent to external servers
- ✅ **Local storage only**: All data stays on your device
- ✅ **No tracking**: We don't track your browsing activity
- ✅ **Open source**: Code is transparent and auditable
- ✅ **Minimal permissions**: Only requests what's necessary

### Required Permissions
- `storage`: To save your settings and statistics

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### Development Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/anti-doom-scroll.git
cd anti-doom-scroll

# Load in browser as described in Installation section
```

### Future Enhancements
- [ ] TypeScript migration for better type safety
- [ ] Build system (Webpack/Vite) for optimization
- [ ] Unit and integration tests
- [ ] More platforms (LinkedIn, Pinterest, Snapchat)
- [ ] Custom block schedules (e.g., "block after 10pm")
- [ ] Productivity mode (stricter blocking)
- [ ] Export usage statistics

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the need to break free from endless scrolling
- Built with ❤️ to help people reclaim their time
- Thanks to all contributors and users

## 📧 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/anti-doom-scroll/issues)
- **Questions**: [GitHub Discussions](https://github.com/yourusername/anti-doom-scroll/discussions)

## 🌟 Show Your Support

If this extension helped you, please consider:
- ⭐ Starring the repository
- 🐛 Reporting bugs
- 💡 Suggesting new features
- 📢 Sharing with friends

---

**Take back control of your time ⏰**
