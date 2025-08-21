# mstprmpt chrome extension

Transform raw prompts into refined, context-aware instructions for AI interactions.

## Features

- **Instant Enhancement**: Transform vague prompts into clear, structured instructions with one click
- **Smart Context**: Automatically includes page context for better relevance
- **AI Platform Integration**: Works seamlessly with ChatGPT, Claude, Gemini, and other AI chat interfaces
- **Prompt History**: Keep track of your enhanced prompts for reuse
- **Metrics Dashboard**: See clarity, specificity, and completeness scores
- **Keyboard Shortcuts**: Quick access with Ctrl+Shift+E (Cmd+Shift+E on Mac)
- **Local & Cloud Processing**: Works offline with local rules, syncs with cloud for advanced enhancement

## Installation

### Development Mode
1. Clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked"
5. Select the `chrome-extension` folder

### Production Build
```bash
npm run build:extension
```

## Usage

### In-Page Enhancement
1. Navigate to any AI chat interface (ChatGPT, Claude, etc.)
2. Type your prompt in the input field
3. click the enhance button that appears or press ctrl+shift+e
4. Review the enhanced prompt and click "Use This Prompt"

### Popup Interface
1. Click the extension icon in your browser toolbar
2. Enter or paste your prompt
3. Click "Enhance Prompt"
4. Copy the result or insert it directly into the active page

### Context Menu
1. Select any text on a webpage
2. Right-click and choose "Enhance with MstPrmpt"
3. The enhanced version will appear in a popup

## Configuration

### API Endpoint
Update `src/utils/config.js` to point to your backend:

```javascript
export const API_CONFIG = {
  baseURL: 'https://your-domain.com'
};
```

### Settings
Access settings through the popup interface:
- **Auto-enhance**: Automatically enhance when text is selected
- **Notifications**: Show/hide notification messages
- **History Limit**: Number of prompts to keep in history
- **Theme**: Light, Dark, or Auto

## Keyboard Shortcuts

- **Enhance Current Prompt**: Ctrl+Shift+E (Cmd+Shift+E on Mac)
- **Open Extension Popup**: Ctrl+Shift+P (Cmd+Shift+P on Mac)

## Supported Platforms

The extension automatically detects and integrates with:
- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Google Gemini (gemini.google.com)
- Google Bard (bard.google.com)
- Poe (poe.com)
- Mistral Chat (chat.mistral.ai)

## Privacy

- Prompts are processed locally when possible
- Cloud processing requires explicit user action
- History is stored locally in Chrome storage
- No automatic data collection or tracking

## Development

### Project Structure
```
chrome-extension/
├── manifest.json           # Extension configuration
├── src/
│   ├── background/        # Service worker
│   ├── content/           # Content scripts
│   ├── popup/             # Extension popup UI
│   ├── utils/             # Shared utilities
│   └── styles/            # CSS files
├── icons/                 # Extension icons
└── offscreen.html         # Offscreen document for clipboard
```

### Building Icons
Icons should be provided in the following sizes:
- 16x16 (toolbar)
- 32x32 (Windows taskbar)
- 48x48 (extensions page)
- 128x128 (Chrome Web Store)

### Testing
1. Load the extension in development mode
2. Test on various AI chat platforms
3. Verify keyboard shortcuts work
4. Check popup functionality
5. Test offline/local enhancement

## Publishing

1. Create production build
2. Generate ZIP file of the extension folder
3. Upload to Chrome Web Store Developer Dashboard
4. Fill in store listing details
5. Submit for review

## License

MIT License - See LICENSE file for details