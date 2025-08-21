# mstprmpt chrome extension installation guide

## option 1: install from google drive (recommended)

### step 1: download the extension
1. download the extension zip file from: [your google drive link]
2. extract the zip file to a folder on your computer
3. remember the folder location (e.g., desktop/mstprmpt-extension)

### step 2: enable developer mode in chrome
1. open google chrome
2. go to `chrome://extensions/` (paste this in address bar)
3. toggle on "developer mode" in the top-right corner

### step 3: install the extension
1. click "load unpacked" button
2. select the extracted mstprmpt extension folder
3. the extension should now appear in your extensions list
4. pin it to your toolbar by clicking the puzzle piece icon → pin

### step 4: configure the extension
1. click the mstprmpt extension icon in your toolbar
2. the popup will open - ready to use!
3. visit any ai chat site (chatgpt, claude, etc.) to see the enhance button

## option 2: install from source code (developers)

### prerequisites
- git installed on your computer
- google chrome browser

### installation steps
1. clone the repository:
   ```bash
   git clone https://github.com/zeidalqadri/zeidgeist-prompter.git
   cd zeidgeist-prompter
   git checkout mstprmpt-chrome-ext
   ```

2. follow steps 2-4 from option 1 above, but select the `chrome-extension` folder

## supported websites
the extension automatically works on:
- chatgpt (chat.openai.com)
- claude (claude.ai)
- google gemini (gemini.google.com)
- google bard (bard.google.com)
- poe (poe.com)
- mistral chat (chat.mistral.ai)

## keyboard shortcuts
- `ctrl+shift+e` (or `cmd+shift+e` on mac): enhance current prompt
- `ctrl+shift+p` (or `cmd+shift+p` on mac): open extension popup

## troubleshooting

### extension not appearing
- make sure developer mode is enabled
- try refreshing the extensions page
- check that you selected the correct folder (should contain manifest.json)

### enhance button not showing
- refresh the ai chat webpage
- make sure the site is in the supported list above
- check that the extension is enabled in chrome://extensions/

### api not working
- extension works offline with local enhancement rules
- for advanced features, ensure https://mstprmpt.zeidgeist.com is accessible

## support
for issues or questions, contact: [your contact info]