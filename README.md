# Mission House

Melbourne property comparison tool for evaluating houses based on school catchments, train stations, and commute times.

## Quick Start

1. **Get a Google Maps API Key**
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable: Maps JavaScript API, Places API, Directions API
   - Create an API key and add it to `src/js/config.js`:
   ```js
   GOOGLE_MAPS_API_KEY: 'your-api-key-here',
   ```

2. **Run Locally**
   ```bash
   # Using Python
   python -m http.server 8000

   # Using Node.js
   npx serve .

   # Using PHP
   php -S localhost:8000
   ```

3. **Open in Browser**
   - Go to `http://localhost:8000`
   - Data Entry page is only visible on localhost

## Features

- **Data Entry** (localhost only): Add properties by pasting realestate.com.au URLs
- **Data View**: Hub-and-spoke visualization showing:
  - Property details (beds, baths, price, area)
  - Primary & secondary school catchments
  - Nearest train station with walking time
  - Flinders Street Station commute times

## Project Structure

```
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

Push to GitHub and enable GitHub Pages. The Data Entry page auto-hides on non-localhost domains.
