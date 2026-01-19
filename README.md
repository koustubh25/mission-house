# Mission House

Melbourne property comparison tool for evaluating houses based on school catchments, train stations, and commute times.

## Quick Start

1. **Get a Google Maps API Key** (optional, for commute features)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable: Maps JavaScript API, Places API, Directions API, Geocoding API
   - Create an API key
   - **Important**: Configure your API key in the app via Settings page (⚙️), not in code!
   - Your API key is stored securely in your browser's localStorage

2. **Install Dependencies** (required for local server)
   ```bash
   npm install
   ```

3. **Run Locally** (required for Data Entry and NAPLAN scraping)
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
  - Primary & secondary school catchments with NAPLAN scores
  - Nearest train station with walking time
  - Flinders Street Station commute times
- **Compare**: Radar chart comparison of up to 4 properties across 13 metrics including NAPLAN scores
- **Settings**: Configure your Google Maps API key

## NAPLAN Scores

NAPLAN scores are automatically fetched when you add a property:

1. When you save a property via Data Entry, the server looks up the school catchment
2. For each school found, it scrapes NAPLAN scores from [myschool.edu.au](https://myschool.edu.au)
3. Reading and Numeracy scores are stored and displayed in:
   - **Data View**: Shows scores next to each school (📊 R:XXX N:XXX)
   - **Compare Page**: Includes 4 NAPLAN dimensions in the radar chart

**Requirements for NAPLAN scraping:**
- Must run the local server (`node server.js`)
- Puppeteer is used to automate the myschool.edu.au website
- Scores are cached in `houses.json` so scraping only happens once per property

**Manual NAPLAN refresh:**
If you need to refresh NAPLAN scores for existing properties, you can re-save the property or manually edit `houses.json` to add the `naplan` object to each school:

```json
"schools": {
  "primary": {
    "name": "School Name",
    "naplan": {
      "year": "2024",
      "reading": 450,
      "numeracy": 460,
      "source": "myschool.edu.au"
    }
  }
}
```

## Project Structure

```
server.js           - Local server (handles scraping, NAPLAN, school lookups)
index.html          - Main app
src/
  css/main.css      - Styles
  js/
    config.js       - API keys & settings
    app.js          - Main application
    compare.js      - Property comparison with radar chart
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
