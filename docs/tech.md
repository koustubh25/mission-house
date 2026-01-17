### Web scraper

1. A sample realestate.com.au looks like this https://www.realestate.com.au/property-townhouse-vic-mount+waverley-149968316
2. It opens up a page like [this](./realestate-samples/sample-house.jpg). This image has certain things stripped off to focus on the stuff that's more important to us
3. The above jpg has important values marked by me mostly a coloured rectangle with description alongside it with the same colour.
4. The outerHTML for the important stuff is as follows:

i. Address

```
<h1 class="property-info-address">2A Donald Street, Mount Waverley, Vic 3149</h1>
```

ii. Number of Rooms and area

```
<ul class="styles__Wrapper-sc-xhfhyt-1 iroawY property-info__primary-features" aria-label="Townhouse with 237m² land size with 4 bedrooms  3 bathrooms 2 car spaces"><div class="Inline__InlineContainer-sc-1ppy24s-0 bETeUM"><li aria-label="4 bedrooms" class="styles__Li-sc-xhfhyt-0 bSeTVG"><svg class="CK__Icon--medium "><use href="#ck-sprite-consumerXpBedMd"></use></svg><p class="Text__Typography-sc-1103tao-0 fYMWQv">4</p></li><li aria-label="3 bathrooms" class="styles__Li-sc-xhfhyt-0 bSeTVG"><svg class="CK__Icon--medium "><use href="#ck-sprite-consumerXpBathMd"></use></svg><p class="Text__Typography-sc-1103tao-0 fYMWQv">3</p></li><li aria-label="2 car spaces" class="styles__Li-sc-xhfhyt-0 bSeTVG"><svg class="CK__Icon--medium "><use href="#ck-sprite-consumerXpCarMd"></use></svg><p class="Text__Typography-sc-1103tao-0 fYMWQv">2</p></li></div><div class="Inline__InlineContainer-sc-1ppy24s-0 bETeUM styles__InlineNoTextWrap-sc-xhfhyt-2 ijRZva"><li aria-label="237m² land size" class="styles__Li-sc-xhfhyt-0 bSeTVG"><svg class="CK__Icon--medium "><use href="#ck-sprite-consumerXpLandSizeMd"></use></svg><p class="Text__Typography-sc-1103tao-0 fYMWQv">237m²</p></li><span aria-hidden="true">•</span></div><p class="Text__Typography-sc-1103tao-0 fYMWQv">Townhouse</p></ul>
```

iii. Indicating if it's an auction and the price range

```
<div class="property-info__middle-content"><span class="property-price property-info__price">AUCTION</span><div class="Stack__StackContainer-sc-agfvon-0 kDatxC"><div class="Inline__InlineContainer-sc-1ppy24s-0 ipgXcM"><div class="styles__Container-sc-1cced9e-0 imfkiD"><p class="Text__Typography-sc-1103tao-0 eceYQJ">Indicative price: <strong class="Text__Typography-sc-1103tao-0 kKyPHf">$1,250,000 - $1,350,000</strong></p></div></div><div class="statement-of-information "><a href="https://i2.au.reastatic.net/4fe00962a3636d51511e6f3037ea0b475170959ae26cced921d5ad5ce54e3ec1/statement.pdf" target="_blank" rel="noopener noreferrer" class="LinkBase-sc-1ba0r3r-0 esRbCb View__StyledLink-sc-1wtsk7s-0 cOIjn"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" class="CK__Icon--medium View__StyledIcon-sc-1wtsk7s-1 WmxCg"><path fill="currentColor" d="M10.5 1A2.5 2.5 0 0 1 13 3.5v9a2.5 2.5 0 0 1-2.5 2.5h-5A2.5 2.5 0 0 1 3 12.5v-7a.5.5 0 0 1 .146-.354l4-4A.5.5 0 0 1 7.5 1zM8 5.5a.5.5 0 0 1-.5.5H4v6.5A1.5 1.5 0 0 0 5.5 14h5a1.5 1.5 0 0 0 1.5-1.5v-9A1.5 1.5 0 0 0 10.5 2H8zm2.5 5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zm0-2.5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1zM4.707 5H7V2.707z"></path></svg>Price guide details</a></div></div></div>
```

Note the price usually has this text `Indicative price`

You can test the whole app if you like but avoid writing any automated tests as I will test this app manually.

### Data View Page

1. Use your imagination to make this artistic as this is the main page.
2. The important thing is that the necessary information is available and displayed cleanly in a non cluttered manner.
3. A simple design that comes to mind is like a star visual (hub and spoke) where the property is at the centre and the important stuff related to it surrounds it.
4. Use graphics, icons and animations to make it lively.
5. GUI should be modern.
6. Refer [this](./img/dataview.png)

### Finding the primary and secondary school name in the catchment

1. You can use a specific website https://www.findmyschool.vic.gov.au to find the school in the catchment area. Refer [this](./findmyschool/findmyschool.jpg)
2. Here is the outer html where you can enter the address

```
<div id="sidebar" class="sidebar-active"><!----><div data-v-38627ce9="" id="AddressSearch"><div data-v-38627ce9="" class="only-screen"><label data-v-38627ce9="" for="address-search-field">Enter your address to get started:</label><div data-v-38627ce9="" class="relative"><div data-v-38627ce9="" id="autosuggest" class="autosuggest"><input type="text" role="combobox" aria-autocomplete="list" aria-owns="autosuggest__results" aria-activedescendant="" aria-haspopup="false" aria-expanded="false" id="address-search-field" aria-label="Start typing your address and then use the arrow buttons to move through the list of matches." oninputchange="function t() {
    [native code]
}" class="autosuggest__input"> <div class="autosuggest__results-container"><!----></div></div><!----></div></div><!----></div><div data-v-5bce876d="" id="BoundarySelector" class="only-screen"><label data-v-5bce876d="" id="stage-label" class="title">Select enrolment year:</label><div data-v-5bce876d="" class="guidance">School zones can change between enrolment years. Select the year you are seeking enrolment.</div><div data-v-5bce876d="" id="stages" class="school-types"><div data-v-5bce876d="" class="top-group"><input data-v-5bce876d="" type="radio" id="stage-2025" value="2025"><label data-v-5bce876d="" for="stage-2025" class="btn stage round-left">2025</label></div><div data-v-5bce876d="" class="top-group"><input data-v-5bce876d="" type="radio" id="stage-2026" value="2026"><label data-v-5bce876d="" for="stage-2026" class="btn stage round-left">2026</label></div></div><div data-v-5bce876d="" style="display: none;"><label data-v-5bce876d="" id="school-type-label" aria-label="Use arrows to choose a school type" class="title">Select school type:</label><div data-v-5bce876d="" class="guidance" style="display: none;">There are three types of government schools:<br data-v-5bce876d=""><b data-v-5bce876d="">Primary</b>schools;<br data-v-5bce876d=""><b data-v-5bce876d="">Secondary</b>schools; and<br data-v-5bce876d=""><b data-v-5bce876d="">Specialist schools</b>, which specialise in teaching children with a disability or additional needs.</div><div data-v-5bce876d="" class="school-types"><div data-v-5bce876d="" id="primary" class="top-group"><input data-v-5bce876d="" id="yeargroup-primary" type="radio" value="primary" aria-describedby="school-type-label" aria-label="Primary schools"><label data-v-5bce876d="" for="yeargroup-primary" class="btn yeargroup round-left">Primary</label></div><div data-v-5bce876d="" id="secondary" class="top-group"><input data-v-5bce876d="" id="yeargroup-secondary" type="radio" value="secondary" aria-describedby="school-type-label" aria-label="Secondary schools. More options available for this school type by using the down arrow."><label data-v-5bce876d="" for="yeargroup-secondary" class="btn yeargroup">Secondary</label></div><div data-v-5bce876d="" id="specialist" class="top-group"><input data-v-5bce876d="" id="yeargroup-specialist" type="radio" value="specialist" aria-describedby="school-type-label" aria-label="Specialist schools."><label data-v-5bce876d="" for="yeargroup-specialist" class="btn yeargroup round-right">Specialist</label></div><!----><!----></div></div></div><!----><!----><div data-v-9af6e436="" id="school-search" style=""><form data-v-9af6e436="" onsubmit="return false"><label data-v-9af6e436="" for="school-search-field">Search for school:</label><div data-v-9af6e436="" id="autosuggest" class="autosuggest"><input type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-owns="autosuggest__results" aria-activedescendant="" aria-haspopup="false" aria-expanded="false" oninputchange="function updateItems() {
    [native code]
}" id="school-search-field" aria-label="Start typing the name of the school and then use the arrow buttons to move through the list of suggested schools." name="q" class="autosuggest__input"> <div class="autosuggest__results-container"><!----></div></div><!----></form></div><div data-v-e0a2b284="" id="Results"><div data-v-6717e4fe="" data-v-e0a2b284="" id="ExportButton" class="only-screen"><button data-v-6717e4fe="">Export</button></div><div data-v-e0a2b284="" style="margin-bottom: 30px;"></div><!----><!----><div data-v-582462c4="" data-v-e0a2b284="" id="Disclaimer" style="display: none;"><p data-v-582462c4="" class="small-text">Findmyschool.vic.gov.au uses third party services to match an address to a school zone. In rare cases, an address may be imprecisely located and as a result matched to an incorrect school zone. If your property is near a school zone boundary, zoom in to verify that it has been correctly matched by referring to the location of the property outlined on the basemap. If you are unable to locate your property then please contact <a data-v-582462c4="" href="mailto:vsba@education.vic.gov.au">vsba@education.vic.gov.au</a>.</p><div data-v-582462c4="" class="small-text">See <a data-v-582462c4="" href="#"><i data-v-582462c4="">Terms of Use</i></a>.</div><!----><!----></div></div></div>
```

3. Once you enter the school name, select the year (should always choose the latest) and the click on either `Primary` or `Secondary`, you should be able to get the name of the school in the catchment area. Refer [this](./findmyschool/school_catchment.jpg). Here is the HTML for it

```
<div id="sidebar" class="sidebar-active"><!----><div data-v-38627ce9="" id="AddressSearch"><div data-v-38627ce9="" class="only-screen"><label data-v-38627ce9="" for="address-search-field">Enter your address to get started:</label><div data-v-38627ce9="" class="relative"><div data-v-38627ce9="" id="autosuggest" class="autosuggest"><input type="text" role="combobox" aria-autocomplete="list" aria-owns="autosuggest__results" aria-activedescendant="" aria-haspopup="false" aria-expanded="false" id="address-search-field" aria-label="Start typing your address and then use the arrow buttons to move through the list of matches." oninputchange="function t() {
    [native code]
}" class="autosuggest__input"> <div class="autosuggest__results-container"><!----></div></div><button data-v-38627ce9="" aria-label="Clear" class="autocomplete-icon autocomplete-icon-close"></button></div></div><div data-v-38627ce9="" class="only-print"><h3 data-v-38627ce9="">Address</h3><p data-v-38627ce9="" class="address-text">31 Erica Crescent Heathmont 3135</p></div></div><div data-v-5bce876d="" id="BoundarySelector" class="only-screen"><label data-v-5bce876d="" id="stage-label" class="title">Select enrolment year:</label><div data-v-5bce876d="" class="guidance" style="display: none;">School zones can change between enrolment years. Select the year you are seeking enrolment.</div><div data-v-5bce876d="" id="stages" class="school-types"><div data-v-5bce876d="" class="top-group"><input data-v-5bce876d="" type="radio" id="stage-2025" value="2025"><label data-v-5bce876d="" for="stage-2025" class="btn stage round-left">2025</label></div><div data-v-5bce876d="" class="top-group"><input data-v-5bce876d="" type="radio" id="stage-2026" value="2026"><label data-v-5bce876d="" for="stage-2026" class="btn stage round-left">2026</label></div></div><div data-v-5bce876d="" style=""><label data-v-5bce876d="" id="school-type-label" aria-label="Use arrows to choose a school type" class="title">Select school type:</label><div data-v-5bce876d="" class="guidance" style="display: none;">There are three types of government schools:<br data-v-5bce876d=""><b data-v-5bce876d="">Primary</b>schools;<br data-v-5bce876d=""><b data-v-5bce876d="">Secondary</b>schools; and<br data-v-5bce876d=""><b data-v-5bce876d="">Specialist schools</b>, which specialise in teaching children with a disability or additional needs.</div><div data-v-5bce876d="" class="school-types"><div data-v-5bce876d="" id="primary" class="top-group"><input data-v-5bce876d="" id="yeargroup-primary" type="radio" value="primary" aria-describedby="school-type-label" aria-label="Primary schools"><label data-v-5bce876d="" for="yeargroup-primary" class="btn yeargroup round-left">Primary</label></div><div data-v-5bce876d="" id="secondary" class="top-group"><input data-v-5bce876d="" id="yeargroup-secondary" type="radio" value="secondary" aria-describedby="school-type-label" aria-label="Secondary schools. More options available for this school type by using the down arrow."><label data-v-5bce876d="" for="yeargroup-secondary" class="btn yeargroup">Secondary</label></div><div data-v-5bce876d="" id="specialist" class="top-group"><input data-v-5bce876d="" id="yeargroup-specialist" type="radio" value="specialist" aria-describedby="school-type-label" aria-label="Specialist schools."><label data-v-5bce876d="" for="yeargroup-specialist" class="btn yeargroup round-right">Specialist</label></div><!----><!----></div></div></div><div><div class="small-text">A child has the right to attend their local (zoned) school. Families can also apply to a school that is not their local school.</div><br><div class="small-text">If the zone line intersects the block of land containing your residence, then your child has a right to attend either school.</div><br><div class="small-text">For more information, see:&nbsp;<a href="https://www.vic.gov.au/school-zones" target="_blank">School zones</a>&nbsp;and&nbsp;<a href="https://www.vic.gov.au/how-choose-school-and-enrol" target="_blank">Enrol in school</a>.</div></div><!----><div data-v-9af6e436="" id="school-search" style=""><form data-v-9af6e436="" onsubmit="return false"><label data-v-9af6e436="" for="school-search-field">Search for school:</label><div data-v-9af6e436="" id="autosuggest" class="autosuggest"><input type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-owns="autosuggest__results" aria-activedescendant="" aria-haspopup="false" aria-expanded="false" oninputchange="function updateItems() {
    [native code]
}" id="school-search-field" aria-label="Start typing the name of the school and then use the arrow buttons to move through the list of suggested schools." name="q" class="autosuggest__input"> <div class="autosuggest__results-container"><!----></div></div><!----></form></div><div data-v-e0a2b284="" id="Results"><div data-v-4fceb8b1="" data-v-e0a2b284="" id="SchoolInfo"><h4 data-v-4fceb8b1="">For 2026 enrolments, your address is in the primary school zone for:</h4><div data-v-4fceb8b1="" class="container"><h2 data-v-4fceb8b1="" id="SchoolInfo-header">Marlborough Primary School</h2><table data-v-4fceb8b1=""><!----><tr data-v-4fceb8b1=""><th data-v-4fceb8b1="">Campus years</th><td data-v-4fceb8b1="">Prep to 6<div data-v-4fceb8b1=""><a data-v-4fceb8b1="" href="#" style="display: none;">More info</a></div></td></tr><!----><!----><!----><tr data-v-4fceb8b1=""><th data-v-4fceb8b1="">Address</th><td data-v-4fceb8b1=""><div data-v-4fceb8b1="" class="address">Hardy Crescent</div><div data-v-4fceb8b1="" class="address">Heathmont 3135</div></td></tr><tr data-v-4fceb8b1=""><th data-v-4fceb8b1="">School phone</th><td data-v-4fceb8b1="">03 9870 3468</td></tr><tr data-v-4fceb8b1=""><th data-v-4fceb8b1="">Website</th><td data-v-4fceb8b1=""><a data-v-4fceb8b1="" href="http://www.marlboroughps.vic.edu.au" target="_blank" aria-label="Marlborough Primary School. Press enter to visit the school website. Campus years: Prep to 6. Address: Hardy Crescent Heathmont 3135. Phone: 03 9870 3468 . Region: North East . " class="only-screen">Visit school site</a><span data-v-4fceb8b1="" class="only-print">http://www.marlboroughps.vic.edu.au</span></td></tr><!----><tr data-v-4fceb8b1=""><th data-v-4fceb8b1="">Region</th><td data-v-4fceb8b1="">North East</td></tr><!----><!----></table><div data-v-4fceb8b1="" class="maplink only-mobile">View on map</div></div></div><div data-v-6717e4fe="" data-v-e0a2b284="" id="ExportButton" class="only-screen"><button data-v-6717e4fe="">Export</button></div><div data-v-e0a2b284="" style="margin-bottom: 30px;"></div><!----><div data-v-7385e310="" data-v-e0a2b284="" id="NearestSchools"><h4 data-v-7385e310="">The closest primary schools to this address are:</h4><!----><p data-v-7385e310="" class="fine-print">(indicative distances measured by a straight line between the address and the school)</p><div data-v-7385e310="" class="container"><div data-v-7385e310="" class="school-summary-header"><div data-v-7385e310="" class="school-name">Marlborough Primary School</div><div data-v-7385e310="" class="distance">0.82 km</div></div><div data-v-7385e310="" class="key-detail">Years: Prep to 6</div><div data-v-7385e310="" class="goto"><a data-v-7385e310="" href="#">See more</a></div></div><div data-v-7385e310="" class="container"><div data-v-7385e310="" class="school-summary-header"><div data-v-7385e310="" class="school-name">Great Ryrie Primary School</div><div data-v-7385e310="" class="distance">0.84 km</div></div><div data-v-7385e310="" class="key-detail">Years: Prep to 6</div><div data-v-7385e310="" class="goto"><a data-v-7385e310="" href="#">See more</a></div></div><div data-v-7385e310="" class="container"><div data-v-7385e310="" class="school-summary-header"><div data-v-7385e310="" class="school-name">Heathmont East Primary School</div><div data-v-7385e310="" class="distance">1.6 km</div></div><div data-v-7385e310="" class="key-detail">Years: Prep to 6</div><div data-v-7385e310="" class="goto"><a data-v-7385e310="" href="#">See more</a></div></div><div data-v-7385e310="" class="container"><div data-v-7385e310="" class="school-summary-header"><div data-v-7385e310="" class="school-name">Eastwood Primary School</div><div data-v-7385e310="" class="distance">1.95 km</div></div><div data-v-7385e310="" class="key-detail">Years: Prep to 6</div><div data-v-7385e310="" class="goto"><a data-v-7385e310="" href="#">See more</a></div></div><div data-v-7385e310="" class="container"><div data-v-7385e310="" class="school-summary-header"><div data-v-7385e310="" class="school-name">Bayswater Primary School</div><div data-v-7385e310="" class="distance">2.2 km</div></div><div data-v-7385e310="" class="key-detail">Years: Prep to 6</div><div data-v-7385e310="" class="goto"><a data-v-7385e310="" href="#">See more</a></div></div></div><div data-v-582462c4="" data-v-e0a2b284="" id="Disclaimer" style=""><p data-v-582462c4="" class="small-text">Findmyschool.vic.gov.au uses third party services to match an address to a school zone. In rare cases, an address may be imprecisely located and as a result matched to an incorrect school zone. If your property is near a school zone boundary, zoom in to verify that it has been correctly matched by referring to the location of the property outlined on the basemap. If you are unable to locate your property then please contact <a data-v-582462c4="" href="mailto:vsba@education.vic.gov.au">vsba@education.vic.gov.au</a>.</p><div data-v-582462c4="" class="small-text">See <a data-v-582462c4="" href="#"><i data-v-582462c4="">Terms of Use</i></a>.</div><!----><!----></div></div></div>
```

---

## Automated School Catchment Lookup (Implemented Jan 2026)

### Overview
The application now automatically scrapes school catchment information from findmyschool.vic.gov.au during property entry, eliminating the need for manual lookups.

### Backend Implementation (server.js)

**Core Functions:**
1. **`scrapeSchoolCatchmentWithRetry(address)`** - Main entry point with 3 retry attempts and exponential backoff
2. **`scrapeSchoolCatchment(address, retryCount)`** - Puppeteer-based scraper that:
   - Launches visible browser with stealth plugin
   - Selects year 2026
   - Looks up both primary and secondary schools sequentially
   - Extracts school name and address from `#SchoolInfo` div

3. **`lookupSchoolByType(page, address, schoolType)`** - Handles individual school type lookup:
   - Clicks year selector (`#stage-2026`)
   - Clicks school type (`#yeargroup-primary` or `#yeargroup-secondary`)
   - Types address with human-like delays
   - Clicks autocomplete suggestion
   - Waits for results in `#SchoolInfo`
   - Extracts data from `h2#SchoolInfo-header` and address table rows

**Integration:**
- Integrated into `/api/save-property` endpoint
- Runs BEFORE saving property to houses.json
- If school lookup fails, entire property save fails (no partial data)

**Anti-bot Measures:**
- Puppeteer stealth plugin
- Non-headless browser (visible)
- Human-like typing with 50-150ms random delays per character
- Realistic user agent and headers

**Data Stored:**
```json
{
  "schools": {
    "primary": {
      "name": "Mount Waverley Primary School",
      "address": "41-53 Galvin St, Mount Waverley 3149",
      "distance": null,
      "lookupSuccess": true,
      "scrapedAt": "2026-01-17T10:01:22.176Z"
    },
    "secondary": { /* same structure */ }
  }
}
```

### Frontend Implementation (src/js/app.js)

**Changes:**
1. **`loadPropertyView()`** - Removed live school lookup, uses pre-scraped data from `property.schools`
2. **`renderHubSpoke()`** - Displays school names and addresses from stored data
3. **`calculateSchoolWalkingTimes()`** - NEW function that:
   - Calls `MapsService.getDirections()` for each school
   - Uses user's Google Maps API key
   - Updates UI asynchronously with walking time and distance
   - Fallback to showing school address if calculation fails

### UI Enhancements - Perfect Pentagon Layout

**Problem Solved:** Original L-shaped grid layout was not visually balanced

**Solution:** Implemented perfect pentagon (5-point star) bicycle hub-and-spoke design using margin-based positioning

**Desktop Layout (260px radius):**
- Primary School: Top (0°) - `margin: 0px, -260px`
- Secondary School: Upper-right (72°) - `margin: 247px, -80px`
- Train Station: Lower-right (144°) - `margin: 153px, 210px`
- Flinders Train: Lower-left (216°) - `margin: -153px, 210px`
- Property Info: Upper-left (288°) - `margin: -247px, -80px`

**Mobile Layout (180px radius):**
- Scaled down proportionally for screens < 768px
- Same pentagon geometry maintained
- Smaller nodes (110px vs 180px)
- Reduced font sizes for readability

**Key Technical Decision:**
- Used `margin-left` and `margin-top` instead of nested `transform: translate()`
- Reason: Node heights vary based on content, causing inconsistent -50% offsets
- Using margins ensures perfect symmetry regardless of content size

**Responsive Design:**
- Container: Fixed height (700px desktop, 550px mobile) for precise centering
- Central hub: Perfectly centered with `transform: translate(-50%, -50%)` and `margin: 0`
- Connection lines: Subtle radial lines from each node to hub (CSS `::after` pseudo-elements)
- Staggered entrance animations (0.1s-0.5s delays)

### Files Modified
- `server.js` - Added school scraping functions (~250 lines)
- `src/js/app.js` - Updated to use pre-scraped school data, added walking time calculations
- `src/css/main.css` - Redesigned hub-spoke layout with perfect pentagon geometry
- `src/data/houses.json` - Schema enhanced with `schools` field
