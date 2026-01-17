# Mission House

Melbourne property comparison tool for evaluating houses based on school catchments, train stations, and commute times.

## Quick Start

1. **Get a Google Maps API Key** (optional, for commute features)
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable: Maps JavaScript API, Places API, Directions API
   - Add your key to `src/js/config.js`

2. **Run the Server**
   ```bash
   node server.js
   ```

3. **Open in Browser**
   - Go to http://localhost:3000
   - The Data Entry page is now available

## Adding Properties

1. Go to the **Data Entry** tab
2. Paste a realestate.com.au URL (e.g., `https://www.realestate.com.au/property-...`)
3. Click **Scrape & Add**
4. The property data will be extracted and added to the database

**Alternative:** Use the "Paste HTML" tab if URL scraping doesn't work.

## Features

- **Data Entry** (localhost only): Add properties from realestate.com.au
- **Data View**: Hub-and-spoke visualization showing:
  - Property details (beds, baths, price, area)
  - Primary & secondary school catchments
  - Nearest train station with walking time
  - Flinders Street Station commute times

## Project Structure

```
server.js           - Local backend for scraping
index.html          - Main app
src/
  css/main.css      - Styles
  js/
    config.js       - API keys & settings
    app.js          - Main application
    maps.js         - Google Maps integration
    schools.js      - School catchment lookups
    scraper.js      - Property data scraper
    utils.js        - Utility functions
  data/
    houses.json     - Property database
```

## Deployment

For production (GitHub Pages), only the Data View page is shown. The Data Entry functionality requires the local server and is hidden on non-localhost domains.
