# Testing Your Theme

## Quick Test in Browser

1. **Load the extension:**
   ```bash
   cd /Users/siddheshshirdhankar/Documents/projects/tab-wise
   # Extension is already built in dist/ folder
   ```

2. **In Chrome:**
   - Go to `chrome://extensions/`
   - Enable "Developer mode" (top right)
   - Click "Load unpacked"
   - Select the `dist` folder

3. **Open the extension:**
   - Click the Tab Wise icon in your toolbar
   - You should see:
     - ✅ White background (light mode)
     - ✅ Blue "Tab Wise" title
     - ✅ Cards with subtle shadows
     - ✅ Properly colored text
     - ✅ Border colors visible

4. **Test dark mode:**
   - Click the theme toggle (sun/moon icon)
   - Should switch to:
     - ✅ Dark blue background
     - ✅ Light text
     - ✅ Darker cards
     - ✅ Adjusted colors for dark theme

## What to Look For

### Light Mode
- Background: White
- Text: Dark gray
- Cards: White with subtle borders
- Primary color: Blue
- Hover states: Light gray

### Dark Mode
- Background: Dark blue-gray
- Text: Light gray
- Cards: Darker blue-gray
- Primary color: Lighter blue
- Hover states: Lighter gray

## If Colors Still Don't Work

Run this in browser console on the popup:
```js
// Check if variables are defined
getComputedStyle(document.documentElement).getPropertyValue('--background')
getComputedStyle(document.documentElement).getPropertyValue('--color-background')

// Check if dark class is present
document.documentElement.classList.contains('dark')
```

## Rebuild if Needed

```bash
npm run build
```

Then reload the extension in Chrome.
