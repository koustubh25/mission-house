# Mission House

Melbourne property comparison tool for evaluating houses based on school catchments, train stations, and commute times.

## Quick Start

1. **Get a Google Maps API Key** (optional, for commute features)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable: Maps JavaScript API, Places API, Directions API, Geocoding API
   - Create an API key
   - **Important**: Configure your API key in the app via Settings page (⚙️), not in code!
   - Your API key is stored securely in your browser's localStorage

2. **Run Locally** (optional - for avoiding CORS issues)
   ```bash
   node server.js
   ```
   Then open http://localhost:3000

   **Or** just open `index.html` directly in your browser (Data Entry will only work when running locally)

## Adding Properties

1. Go to the **Data Entry** tab (only visible when running on localhost)
2. Open the property on realestate.com.au in your browser
3. Right-click and select "View Page Source"
4. Select All (Ctrl+A / Cmd+A) and Copy (Ctrl+C / Cmd+C)
5. Paste the HTML into the text area
6. Click **Parse & Add**
7. Copy the generated JSON and save it to `src/data/houses.json`

The HTML paste method bypasses anti-bot protection and works reliably every time.

## Features

- **Data Entry** (localhost only): Add properties from realestate.com.au
- **Data View**: Hub-and-spoke visualization showing:
  - Property details (beds, baths, price, area)
  - Primary & secondary school catchments
  - Nearest train station with walking time
  - Flinders Street Station commute times

## Project Structure

```
server.js           - Optional local server (avoids CORS issues)
index.html          - Main app
src/
  css/main.css      - Styles
  js/
    config.js       - API keys & settings
    app.js          - Main application
    maps.js         - Google Maps integration
    schools.js      - School catchment lookups
    scraper.js      - HTML parser for property data
    utils.js        - Utility functions
  data/
    houses.json     - Property database
```

## Deployment

For production (GitHub Pages), only the Data View page is shown. The Data Entry functionality requires running locally and is automatically hidden on non-localhost domains.

Properties can be added to the database by:
1. Running the app locally
2. Using the Data Entry page to parse property HTML
3. Committing the updated `houses.json` file to the repository
