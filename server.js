/**
 * Simple local backend for Mission House
 * Handles web scraping to bypass CORS restrictions
 *
 * Usage: node server.js
 * Then open http://localhost:3000
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const zlib = require('zlib');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Use stealth plugin to avoid bot detection
puppeteer.use(StealthPlugin());

// Use Google's public DNS as fallback
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const PORT = 3002;

/**
 * Custom DNS lookup using Google's public DNS
 */
function customLookup(hostname, options, callback) {
    dns.resolve4(hostname, (err, addresses) => {
        if (err) {
            callback(err);
            return;
        }
        callback(null, addresses[0], 4);
    });
}

// MIME types for static files
const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

/**
 * Fetch a URL using Puppeteer (for sites with anti-bot protection)
 * @param {string} url - URL to fetch
 * @returns {Promise<string>} HTML content
 */
async function fetchUrlWithPuppeteer(url) {
    let browser = null;
    try {
        console.log(`Launching visible browser for ${url}`);
        browser = await puppeteer.launch({
            headless: false, // Non-headless mode - browser will be visible
            defaultViewport: null, // Use default window size
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();

        console.log('Navigating to page...');

        // Set up a promise to wait for navigation after challenge
        const navigationPromise = page.waitForNavigation({
            waitUntil: 'networkidle2',
            timeout: 45000
        }).catch(() => console.log('No navigation event detected'));

        // Navigate to the page
        await page.goto(url, {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });

        console.log('Waiting for Kasada challenge to complete (may show challenge page)...');

        // Wait for navigation that happens after Kasada challenge passes
        await navigationPromise;

        console.log('Waiting for page content to fully render...');
        // Give extra time for dynamic content to load
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Get the HTML content
        const html = await page.content();

        // Verify we got the actual property page
        const hasPropertyContent = html.includes('realestate.com.au') &&
                                   (html.includes('bedroom') || html.includes('bathroom') ||
                                    html.includes('property') || html.length > 10000);

        if (!hasPropertyContent) {
            console.warn(`Page content seems incomplete (${html.length} bytes)`);
            console.log('Waiting a bit longer for content...');
            await new Promise(resolve => setTimeout(resolve, 5000));
            const html2 = await page.content();
            if (html2.length > html.length) {
                console.log(`Got more content (${html2.length} bytes)`);
                return html2;
            }
        }

        console.log(`Page loaded successfully (${html.length} bytes)`);
        return html;
    } catch (error) {
        console.error(`Puppeteer error for ${url}:`, error.message);
        throw error;
    } finally {
        if (browser) {
            console.log('Closing browser...');
            await browser.close();
        }
    }
}

/**
 * Fetch a URL and return its content
 * Uses Puppeteer for realestate.com.au (anti-bot protection)
 */
async function fetchUrl(url) {
    // Use Puppeteer for realestate.com.au due to Kasada protection
    if (url.includes('realestate.com.au')) {
        return fetchUrlWithPuppeteer(url);
    }

    // Fallback to simple HTTP for other URLs
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const client = urlObj.protocol === 'https:' ? https : http;

        const options = {
            hostname: urlObj.hostname,
            port: urlObj.port,
            path: urlObj.pathname + urlObj.search,
            method: 'GET',
            lookup: customLookup,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
                'Accept-Encoding': 'gzip, deflate, br',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1',
                'Connection': 'keep-alive'
            }
        };

        const req = client.request(options, (response) => {
            // Handle redirects
            if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                const redirectUrl = response.headers.location.startsWith('http')
                    ? response.headers.location
                    : `${urlObj.protocol}//${urlObj.hostname}${response.headers.location}`;
                fetchUrl(redirectUrl).then(resolve).catch(reject);
                return;
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode}`));
                return;
            }

            // Handle content encoding (gzip, deflate, br)
            let stream = response;
            const encoding = response.headers['content-encoding'];

            if (encoding === 'gzip') {
                stream = response.pipe(zlib.createGunzip());
            } else if (encoding === 'deflate') {
                stream = response.pipe(zlib.createInflate());
            } else if (encoding === 'br') {
                stream = response.pipe(zlib.createBrotliDecompress());
            }

            let data = '';
            stream.on('data', chunk => data += chunk);
            stream.on('end', () => resolve(data));
            stream.on('error', reject);
        });

        // Set timeout to 15 seconds
        req.setTimeout(15000, () => {
            req.destroy();
            reject(new Error('Request timeout'));
        });

        req.on('error', (err) => {
            console.error(`Request error for ${url}:`, err.message);
            reject(err);
        });
        req.end();
    });
}

/**
 * Type text with human-like delays to avoid bot detection
 * @param {Page} page - Puppeteer page
 * @param {string} selector - Input selector
 * @param {string} text - Text to type
 */
async function humanType(page, selector, text) {
    await page.click(selector);
    for (const char of text) {
        await page.type(selector, char, { delay: Math.floor(Math.random() * 100) + 50 });
    }
}

/**
 * Lookup school for a specific type (primary or secondary)
 * @param {Page} page - Puppeteer page
 * @param {string} address - Property address
 * @param {string} schoolType - 'primary' or 'secondary'
 * @returns {Promise<Object>} School data
 */
async function lookupSchoolByType(page, address, schoolType) {
    console.log(`[School Lookup] Looking up ${schoolType} school...`);

    // Select the latest year (2026)
    console.log('[School Lookup] Selecting year 2026...');
    await page.click('#stage-2026');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Select school type
    console.log(`[School Lookup] Selecting ${schoolType} school type...`);
    const schoolTypeId = schoolType === 'primary' ? '#yeargroup-primary' : '#yeargroup-secondary';
    await page.click(schoolTypeId);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Clear the address input if it has content
    const addressInput = '#address-search-field';
    await page.click(addressInput, { clickCount: 3 }); // Select all
    await page.keyboard.press('Backspace');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Type address with human-like delays
    console.log('[School Lookup] Entering address...');
    await humanType(page, addressInput, address);

    // Wait for autocomplete dropdown to appear
    console.log('[School Lookup] Waiting for autocomplete suggestions...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to click the first autocomplete suggestion
    try {
        await page.waitForSelector('.autosuggest__results-container li', { timeout: 5000 });
        console.log('[School Lookup] Clicking first autocomplete suggestion...');
        await page.click('.autosuggest__results-container li');
    } catch (e) {
        console.log('[School Lookup] No autocomplete found, trying Enter key...');
        await page.keyboard.press('Enter');
    }

    // Wait for results to appear
    console.log('[School Lookup] Waiting for school info to load...');
    await page.waitForSelector('#SchoolInfo', { timeout: 15000 });
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Extract school information
    const schoolData = await page.evaluate(() => {
        const schoolInfoDiv = document.querySelector('#SchoolInfo');
        if (!schoolInfoDiv) return null;

        // Get school name from h2
        const nameEl = schoolInfoDiv.querySelector('h2#SchoolInfo-header');
        const name = nameEl ? nameEl.textContent.trim() : null;

        // Get address from table
        const addressRows = schoolInfoDiv.querySelectorAll('tr th');
        let fullAddress = '';
        for (const th of addressRows) {
            if (th.textContent.trim() === 'Address') {
                const addressTd = th.nextElementSibling;
                const addressDivs = addressTd.querySelectorAll('.address');
                fullAddress = Array.from(addressDivs).map(div => div.textContent.trim()).join(', ');
                break;
            }
        }

        return {
            name,
            address: fullAddress || null,
            distance: null, // Distance not provided on results page
            lookupSuccess: !!(name && fullAddress)
        };
    });

    console.log(`[School Lookup] ${schoolType} school found: ${schoolData?.name || 'N/A'}`);
    return schoolData;
}

/**
 * Scrape school catchment information from findmyschool.vic.gov.au
 * @param {string} address - Property address
 * @param {number} retryCount - Current retry attempt (0-indexed)
 * @returns {Promise<Object>} School catchment data
 */
async function scrapeSchoolCatchment(address, retryCount = 0) {
    let browser = null;

    try {
        console.log(`[School Lookup] Attempt ${retryCount + 1}/3: ${address}`);

        // Launch browser with stealth mode
        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();

        // Set realistic headers
        await page.setExtraHTTPHeaders({
            'Accept-Language': 'en-AU,en-US;q=0.9,en;q=0.8',
            'DNT': '1'
        });

        console.log('[School Lookup] Navigating to findmyschool.vic.gov.au...');
        await page.goto('https://www.findmyschool.vic.gov.au/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });

        // Wait for Vue.js to mount
        console.log('[School Lookup] Waiting for page to load...');
        await page.waitForSelector('#address-search-field', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Lookup primary school
        const primary = await lookupSchoolByType(page, address, 'primary');

        // Go back to home to lookup secondary
        console.log('[School Lookup] Reloading page for secondary lookup...');
        await page.goto('https://www.findmyschool.vic.gov.au/', {
            waitUntil: 'domcontentloaded',
            timeout: 30000
        });
        await page.waitForSelector('#address-search-field', { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Lookup secondary school
        const secondary = await lookupSchoolByType(page, address, 'secondary');

        // Add timestamp
        const scrapedAt = new Date().toISOString();
        if (primary) primary.scrapedAt = scrapedAt;
        if (secondary) secondary.scrapedAt = scrapedAt;

        const schools = { primary, secondary };

        // Validate results
        if (!schools.primary?.lookupSuccess && !schools.secondary?.lookupSuccess) {
            throw new Error('No school information found for either primary or secondary');
        }

        console.log('[School Lookup] Success!');
        console.log(`  Primary: ${schools.primary?.name || 'N/A'}`);
        console.log(`  Secondary: ${schools.secondary?.name || 'N/A'}`);

        return schools;

    } catch (error) {
        console.error(`[School Lookup] Error on attempt ${retryCount + 1}:`, error.message);

        // Take screenshot for debugging
        if (browser) {
            try {
                const page = (await browser.pages())[0];
                const screenshotPath = path.join(__dirname, `school-error-${Date.now()}.png`);
                await page.screenshot({ path: screenshotPath, fullPage: true });
                console.log(`[School Lookup] Screenshot saved: ${screenshotPath}`);
            } catch (screenshotError) {
                console.error('[School Lookup] Could not save screenshot:', screenshotError.message);
            }
        }

        throw error;
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Scrape school catchment with retry logic
 * @param {string} address - Property address
 * @returns {Promise<Object>} School catchment data
 */
async function scrapeSchoolCatchmentWithRetry(address) {
    const maxRetries = 3;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await scrapeSchoolCatchment(address, attempt);
        } catch (error) {
            if (attempt === maxRetries - 1) {
                // Final attempt failed
                throw new Error(`School lookup failed after ${maxRetries} attempts: ${error.message}`);
            }

            // Wait before retry (exponential backoff)
            const waitTime = Math.pow(2, attempt) * 2000; // 2s, 4s
            console.log(`[School Lookup] Retrying in ${waitTime/1000}s...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }
    }
}

/**
 * Benchmark NAPLAN scores for quality comparison
 * Primary: Mount Waverley Primary School
 * Secondary: Mount Waverley Secondary College
 */
const BENCHMARK_NAPLAN = {
    primary: {
        year3: { reading: 446, writing: 460, spelling: 459, grammar: 475, numeracy: 466 },
        year5: { reading: 539, writing: 539, spelling: 536, grammar: 561, numeracy: 566 }
    },
    secondary: {
        year7: { reading: 584, writing: 592, spelling: 581, grammar: 592, numeracy: 616 },
        year9: { reading: 601, writing: 632, spelling: 602, grammar: 609, numeracy: 637 }
    }
};

/**
 * Calculate the sum of all scores in a year level object
 * @param {Object} yearScores - Object with reading, writing, spelling, grammar, numeracy
 * @returns {number} Sum of all scores
 */
function sumYearScores(yearScores) {
    if (!yearScores) return 0;
    return (yearScores.reading || 0) +
           (yearScores.writing || 0) +
           (yearScores.spelling || 0) +
           (yearScores.grammar || 0) +
           (yearScores.numeracy || 0);
}

/**
 * Calculate NAPLAN quality score compared to benchmark
 * Formula: (school_avg / benchmark_avg) * 100
 * @param {Object} naplanScores - School's NAPLAN scores with year3/year5/year7/year9
 * @param {string} schoolType - 'primary' or 'secondary'
 * @returns {number|null} Quality score (100 = benchmark level, >100 = better, <100 = worse)
 */
function calculateNaplanQuality(naplanScores, schoolType) {
    if (!naplanScores) return null;

    const benchmark = BENCHMARK_NAPLAN[schoolType];
    if (!benchmark) return null;

    // Determine which year levels to use based on school type
    const yearLevels = schoolType === 'primary'
        ? ['year3', 'year5']
        : ['year7', 'year9'];

    // Calculate school's total and count
    let schoolTotal = 0;
    let schoolYearCount = 0;

    for (const year of yearLevels) {
        if (naplanScores[year]) {
            const yearSum = sumYearScores(naplanScores[year]);
            if (yearSum > 0) {
                schoolTotal += yearSum;
                schoolYearCount++;
            }
        }
    }

    // Calculate benchmark's total and count
    let benchmarkTotal = 0;
    let benchmarkYearCount = 0;

    for (const year of yearLevels) {
        if (benchmark[year]) {
            const yearSum = sumYearScores(benchmark[year]);
            if (yearSum > 0) {
                benchmarkTotal += yearSum;
                benchmarkYearCount++;
            }
        }
    }

    // If no data available, return null
    if (schoolYearCount === 0 || benchmarkYearCount === 0) return null;

    // Calculate averages
    const schoolAvg = schoolTotal / schoolYearCount;
    const benchmarkAvg = benchmarkTotal / benchmarkYearCount;

    // Calculate quality score
    const quality = (schoolAvg / benchmarkAvg) * 100;

    // Round to 1 decimal place
    return Math.round(quality * 10) / 10;
}

/**
 * Scrape NAPLAN scores from myschool.edu.au for a specific school
 * Flow: Accept terms -> Search school -> Click "View School Profile" ->
 *       Click NAPLAN dropdown -> Select "Results" -> Extract scores from table
 * @param {string} schoolName - Name of the school to search for
 * @returns {Promise<Object>} NAPLAN scores
 */
async function scrapeNaplanScores(schoolName) {
    let browser = null;

    try {
        console.log(`[NAPLAN] Fetching scores for: ${schoolName}`);

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: [
                '--start-maximized',
                '--no-sandbox',
                '--disable-setuid-sandbox'
            ]
        });

        const page = await browser.newPage();

        // Navigate to myschool.edu.au
        console.log('[NAPLAN] Navigating to myschool.edu.au...');
        await page.goto('https://www.myschool.edu.au/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        // Step 1: Accept terms of use
        console.log('[NAPLAN] Accepting terms of use...');

        // Scroll checkbox into view and click the label (more reliable than clicking checkbox directly)
        await page.evaluate(() => {
            document.querySelector('#checkBoxTou').scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await page.waitForSelector('label.tou-checkbox-inline', { visible: true });
        await page.click('label.tou-checkbox-inline');

        // Wait for Accept button to be enabled and click it
        await page.waitForFunction(() => {
            const btn = document.querySelector('button.accept');
            return btn && !btn.disabled;
        });
        await page.click('button.accept');

        // Wait for page to load after accepting terms (no explicit navigation event)
        await new Promise(resolve => setTimeout(resolve, 2000));
        console.log('[NAPLAN] Terms accepted, on search page');

        // Step 2: Search for school
        // The search input is in a form with placeholder text - look for it more broadly
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Try multiple selectors for the search input
        let searchInput = null;
        const searchSelectors = [
            'input[type="text"]',
            'input.form-control',
            'input[placeholder*="school" i]',
            'input[placeholder*="Search" i]',
            '#SchoolSearchTerm',
            '.school-search input'
        ];

        for (const selector of searchSelectors) {
            searchInput = await page.$(selector);
            if (searchInput) {
                console.log(`[NAPLAN] Found search input with selector: ${selector}`);
                break;
            }
        }

        if (!searchInput) {
            // Take screenshot to debug
            const screenshotPath = path.join(__dirname, `naplan-no-search-${Date.now()}.png`);
            await page.screenshot({ path: screenshotPath, fullPage: true });
            console.log(`[NAPLAN] Screenshot saved: ${screenshotPath}`);
            throw new Error('Could not find search input on myschool.edu.au');
        }

        // Type school name
        console.log(`[NAPLAN] Searching for: ${schoolName}`);
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(schoolName, { delay: 30 });
        await new Promise(resolve => setTimeout(resolve, 500));

        // Click the search button
        const searchButton = await page.waitForSelector('button.myschool-search-button', { visible: true, timeout: 5000 }).catch(() => null);

        if (searchButton) {
            console.log('[NAPLAN] Clicking search button...');
            await searchButton.click();
        } else {
            console.log('[NAPLAN] Pressing Enter to search...');
            await page.keyboard.press('Enter');
        }

        // Wait for search results
        console.log('[NAPLAN] Waiting for search results...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Step 3: Click "View School Profile" button for the matching school
        // Look for the button in the results
        let viewProfileClicked = false;

        // Try to find "View School Profile" button (use broad selector like test script)
        const viewProfileButtons = await page.$$('a, button');
        for (const btn of viewProfileButtons) {
            const text = await btn.evaluate(el => el.textContent.trim());
            if (text.toLowerCase().includes('view school profile')) {
                console.log('[NAPLAN] Clicking "View School Profile" button...');
                await btn.click();
                viewProfileClicked = true;
                break;
            }
        }

        // If no "View School Profile" button, try clicking on the school name link
        if (!viewProfileClicked) {
            const schoolLinks = await page.$$('a[href*="/school/"]');
            for (const link of schoolLinks) {
                const text = await link.evaluate(el => el.textContent.trim());
                // Match if the link text contains part of the school name
                const searchTerm = schoolName.toLowerCase().split(' ')[0];
                if (text.toLowerCase().includes(searchTerm)) {
                    console.log(`[NAPLAN] Clicking school link: ${text}`);
                    await link.click();
                    viewProfileClicked = true;
                    break;
                }
            }
        }

        if (!viewProfileClicked) {
            console.log('[NAPLAN] Could not find school in results');
            return null;
        }

        // Wait for school profile page to load
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        console.log('[NAPLAN] School profile page loaded');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 4: Navigate to NAPLAN Results via URL
        // URL pattern: https://myschool.edu.au/school/{id}/naplan/results
        const currentUrl = page.url();
        const naplanUrl = currentUrl.replace(/\/?$/, '') + '/naplan/results';
        console.log(`[NAPLAN] Navigating to: ${naplanUrl}`);
        await page.goto(naplanUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        console.log('[NAPLAN] NAPLAN Results page loaded');

        // Step 5: Extract NAPLAN scores from the results table
        console.log('[NAPLAN] Extracting scores from table...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const scores = await page.evaluate(() => {
            const result = {
                year: null,
                source: 'myschool.edu.au'
            };

            // Find the most recent year tab that's selected or available
            const yearTabs = document.querySelectorAll('a[class*="year"], button[class*="year"], .year-tab');
            for (const tab of yearTabs) {
                const text = tab.textContent.trim();
                const yearMatch = text.match(/20\d{2}/);
                if (yearMatch) {
                    result.year = yearMatch[0];
                    break;
                }
            }

            // Also check page content for year
            if (!result.year) {
                const pageText = document.body.innerText;
                const yearMatch = pageText.match(/20(2[3-9]|[3-9]\d)/); // Match 2023 onwards
                if (yearMatch) result.year = '20' + yearMatch[1];
            }

            // Find the NAPLAN results table
            // Structure: rows are Year 3, Year 5, Year 7, Year 9. Columns are Reading, Writing, Spelling, Grammar, Numeracy
            const tables = document.querySelectorAll('table');

            for (const table of tables) {
                // Check if this looks like a NAPLAN results table
                const headerRow = table.querySelector('tr');
                if (!headerRow) continue;

                const headerText = headerRow.textContent.toLowerCase();
                if (!headerText.includes('reading') && !headerText.includes('numeracy')) continue;

                // Found the NAPLAN table - extract column indices
                const headers = Array.from(headerRow.querySelectorAll('th, td'));
                const colIndex = {};
                headers.forEach((h, i) => {
                    const text = h.textContent.toLowerCase().trim();
                    if (text.includes('reading')) colIndex.reading = i;
                    else if (text.includes('writing')) colIndex.writing = i;
                    else if (text.includes('spelling')) colIndex.spelling = i;
                    else if (text.includes('grammar')) colIndex.grammar = i;
                    else if (text.includes('numeracy')) colIndex.numeracy = i;
                });

                // Extract scores from data rows
                const rows = table.querySelectorAll('tr');
                for (const row of rows) {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    const rowLabel = cells[0].textContent.toLowerCase().trim();

                    // Determine which year level this row is for
                    let yearKey = null;
                    if (rowLabel.includes('year 3') || rowLabel === '3' || rowLabel.includes('yr 3')) {
                        yearKey = 'year3';
                    } else if (rowLabel.includes('year 5') || rowLabel === '5' || rowLabel.includes('yr 5')) {
                        yearKey = 'year5';
                    } else if (rowLabel.includes('year 7') || rowLabel === '7' || rowLabel.includes('yr 7')) {
                        yearKey = 'year7';
                    } else if (rowLabel.includes('year 9') || rowLabel === '9' || rowLabel.includes('yr 9')) {
                        yearKey = 'year9';
                    }

                    if (yearKey) {
                        const yearData = {};

                        // Extract each score from the appropriate column
                        for (const [metric, idx] of Object.entries(colIndex)) {
                            if (cells[idx]) {
                                const scoreText = cells[idx].textContent.trim();
                                const score = parseInt(scoreText);
                                if (!isNaN(score) && score > 0 && score < 1000) {
                                    yearData[metric] = score;
                                }
                            }
                        }

                        // Only add if we got some scores
                        if (Object.keys(yearData).length > 0) {
                            result[yearKey] = yearData;
                        }
                    }
                }

                // If we found data, break
                if (result.year3 || result.year5 || result.year7 || result.year9) break;
            }

            return result;
        });

        console.log('[NAPLAN] Scores extracted:', scores);

        // Add the NAPLAN results URL to the scores object
        scores.url = naplanUrl;

        return scores;

    } catch (error) {
        console.error('[NAPLAN] Error:', error.message);

        // Take screenshot for debugging
        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    const screenshotPath = path.join(__dirname, `naplan-error-${Date.now()}.png`);
                    await pages[0].screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`[NAPLAN] Screenshot saved: ${screenshotPath}`);
                }
            } catch (e) {
                console.error('[NAPLAN] Could not save screenshot');
            }
        }

        return null; // Return null instead of throwing - NAPLAN is optional
    } finally {
        if (browser) {
            await browser.close();
        }
    }
}

/**
 * Fetch NAPLAN scores for both schools with retry
 * @param {Object} schools - Schools object with primary and secondary
 * @returns {Promise<Object>} Schools object with NAPLAN scores added
 */
async function fetchNaplanScoresForSchools(schools) {
    console.log('[NAPLAN] Fetching scores for schools...');

    // Fetch NAPLAN for primary school
    if (schools.primary?.name) {
        try {
            const primaryNaplan = await scrapeNaplanScores(schools.primary.name);
            if (primaryNaplan) {
                // Calculate quality score compared to benchmark
                primaryNaplan.quality = calculateNaplanQuality(primaryNaplan, 'primary');
                console.log(`[NAPLAN] Primary school quality: ${primaryNaplan.quality}`);
                schools.primary.naplan = primaryNaplan;
            }
        } catch (e) {
            console.error('[NAPLAN] Failed to get primary school scores:', e.message);
        }
    }

    // Fetch NAPLAN for secondary school
    if (schools.secondary?.name) {
        try {
            const secondaryNaplan = await scrapeNaplanScores(schools.secondary.name);
            if (secondaryNaplan) {
                // Calculate quality score compared to benchmark
                secondaryNaplan.quality = calculateNaplanQuality(secondaryNaplan, 'secondary');
                console.log(`[NAPLAN] Secondary school quality: ${secondaryNaplan.quality}`);
                schools.secondary.naplan = secondaryNaplan;
            }
        } catch (e) {
            console.error('[NAPLAN] Failed to get secondary school scores:', e.message);
        }
    }

    return schools;
}

/**
 * Serve static files
 */
function serveStatic(filePath, res) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404);
                res.end('Not found');
            } else {
                res.writeHead(500);
                res.end('Server error');
            }
            return;
        }

        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
    });
}

/**
 * Handle API requests
 */
async function handleApi(req, res, pathname) {
    // Enable CORS for local development
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    if (pathname === '/api/scrape' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { url } = JSON.parse(body);

                if (!url || !url.includes('realestate.com.au')) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid realestate.com.au URL' }));
                    return;
                }

                console.log(`Scraping: ${url}`);
                const html = await fetchUrl(url);

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ html }));
            } catch (error) {
                console.error('Scrape error:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    if (pathname === '/api/save-property' && req.method === 'POST') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', async () => {
            try {
                const { property } = JSON.parse(body);

                if (!property || !property.address) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid property data' }));
                    return;
                }

                console.log(`Saving property: ${property.address}`);

                // Look up school catchments BEFORE saving
                console.log('Looking up school catchments...');
                try {
                    const schools = await scrapeSchoolCatchmentWithRetry(property.address);
                    property.schools = schools;
                    console.log('School lookup completed successfully');

                    // Fetch NAPLAN scores for the schools (optional - won't fail if unavailable)
                    console.log('Fetching NAPLAN scores...');
                    try {
                        await fetchNaplanScoresForSchools(property.schools);
                        console.log('NAPLAN scores fetched successfully');
                    } catch (naplanError) {
                        console.warn('NAPLAN fetch failed (continuing without scores):', naplanError.message);
                        // Continue without NAPLAN scores - they're optional
                    }
                } catch (schoolError) {
                    console.error('School lookup failed:', schoolError.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        error: 'School lookup failed',
                        details: schoolError.message,
                        message: 'Property not saved because school lookup failed. Please try again.'
                    }));
                    return; // Don't save property if school lookup fails
                }

                // Read existing database
                const dbPath = path.join(__dirname, 'src/data/houses.json');
                let database = { properties: [] };

                try {
                    const data = fs.readFileSync(dbPath, 'utf8');
                    database = JSON.parse(data);
                } catch (e) {
                    console.log('Creating new database file');
                }

                // Check for duplicates by address
                const existingIndex = database.properties.findIndex(
                    p => p.address.toLowerCase() === property.address.toLowerCase()
                );

                if (existingIndex >= 0) {
                    console.log('Updating existing property');
                    database.properties[existingIndex] = property;
                } else {
                    console.log('Adding new property');
                    database.properties.push(property);
                }

                // Write back to file
                fs.writeFileSync(dbPath, JSON.stringify(database, null, 2), 'utf8');
                console.log('Database saved successfully');

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    success: true,
                    message: 'Property and school data saved to database',
                    totalProperties: database.properties.length,
                    schools: property.schools
                }));
            } catch (error) {
                console.error('Save error:', error.message);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
}

/**
 * Main request handler
 */
const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const pathname = url.pathname;

    // API routes
    if (pathname.startsWith('/api/')) {
        await handleApi(req, res, pathname);
        return;
    }

    // Static files
    let filePath = pathname === '/' ? '/index.html' : pathname;
    filePath = path.join(__dirname, filePath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(__dirname)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    serveStatic(filePath, res);
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║         Mission House Server               ║
╠════════════════════════════════════════════╣
║  Local:  http://localhost:${PORT}             ║
║                                            ║
║  Data Entry page is now available!         ║
║  Press Ctrl+C to stop                      ║
╚════════════════════════════════════════════╝
`);
});
