/**
 * Test script for NAPLAN scraping
 * Usage: node test-naplan.js [schoolName]
 *
 * Examples:
 *   node test-naplan.js "Mount Waverley Primary School"
 *   node test-naplan.js "Ashwood High School"
 */

const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

// Benchmark scores (same as in server.js)
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

function sumYearScores(yearScores) {
    if (!yearScores) return 0;
    return (yearScores.reading || 0) +
           (yearScores.writing || 0) +
           (yearScores.spelling || 0) +
           (yearScores.grammar || 0) +
           (yearScores.numeracy || 0);
}

function calculateNaplanQuality(naplanScores, schoolType) {
    if (!naplanScores) return null;
    const benchmark = BENCHMARK_NAPLAN[schoolType];
    if (!benchmark) return null;

    const yearLevels = schoolType === 'primary' ? ['year3', 'year5'] : ['year7', 'year9'];

    let schoolTotal = 0, schoolYearCount = 0;
    for (const year of yearLevels) {
        if (naplanScores[year]) {
            const yearSum = sumYearScores(naplanScores[year]);
            if (yearSum > 0) {
                schoolTotal += yearSum;
                schoolYearCount++;
            }
        }
    }

    let benchmarkTotal = 0, benchmarkYearCount = 0;
    for (const year of yearLevels) {
        if (benchmark[year]) {
            const yearSum = sumYearScores(benchmark[year]);
            if (yearSum > 0) {
                benchmarkTotal += yearSum;
                benchmarkYearCount++;
            }
        }
    }

    if (schoolYearCount === 0 || benchmarkYearCount === 0) return null;

    const schoolAvg = schoolTotal / schoolYearCount;
    const benchmarkAvg = benchmarkTotal / benchmarkYearCount;
    const quality = (schoolAvg / benchmarkAvg) * 100;

    return Math.round(quality * 10) / 10;
}

async function scrapeNaplanScores(schoolName) {
    let browser = null;

    try {
        console.log(`\n[NAPLAN] Starting scrape for: ${schoolName}`);
        console.log('='.repeat(60));

        browser = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            args: ['--start-maximized', '--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();

        // Step 1: Navigate to myschool.edu.au
        console.log('\n[Step 1] Navigating to myschool.edu.au...');
        await page.goto('https://www.myschool.edu.au/', {
            waitUntil: 'networkidle2',
            timeout: 30000
        });
        console.log('  ✓ Page loaded');

        // Step 2: Accept terms of use
        console.log('\n[Step 2] Accepting terms of use...');

        await page.evaluate(() => {
        document
            .querySelector('#checkBoxTou')
            .scrollIntoView({ behavior: 'instant', block: 'center' });
        });
        await page.waitForSelector('label.tou-checkbox-inline', { visible: true });
        await page.click('label.tou-checkbox-inline');

        await page.waitForFunction(() => {
        const btn = document.querySelector('button.accept');
        return btn && !btn.disabled;
        });
        await page.click('button.accept');


        // Wait for navigation to search page
        console.log('  ✓ Navigated to search page');

        // Step 3: Search for school
        console.log(`\n[Step 3] Searching for: ${schoolName}`);
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Find search input - try multiple selectors
        const searchSelectors = [
            'input[type="text"]',
            'input.form-control',
            'input[placeholder*="school" i]',
            'input[placeholder*="Search" i]'
        ];

        let searchInput = null;
        for (const selector of searchSelectors) {
            searchInput = await page.$(selector);
            if (searchInput) {
                console.log(`  ✓ Found search input: ${selector}`);
                break;
            }
        }

        if (!searchInput) {
            const screenshot = path.join(__dirname, `naplan-test-no-search-${Date.now()}.png`);
            await page.screenshot({ path: screenshot, fullPage: true });
            throw new Error(`Could not find search input. Screenshot: ${screenshot}`);
        }

        // Type school name
        await searchInput.click({ clickCount: 3 });
        await searchInput.type(schoolName, { delay: 30 });
        console.log('  ✓ Typed school name');

        // Click search button or press Enter
        const searchButton = await page.waitForSelector(
            'button.myschool-search-button',
            { visible: true }
            );


        if (searchButton) {
            await searchButton.click();
            console.log('  ✓ Clicked search button');
        } else {
            await page.keyboard.press('Enter');
            console.log('  ✓ Pressed Enter');
        }

        // Wait for results
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('  ✓ Search results loaded');

        // Step 4: Click on school profile
        console.log('\n[Step 4] Finding school in results...');

        // Look for "View School Profile" button or school link
        let clicked = false;

        // Try finding View School Profile button
        const buttons = await page.$$('a, button');
        for (const btn of buttons) {
            const text = await btn.evaluate(el => el.textContent.trim());
            if (text.toLowerCase().includes('view school profile')) {
                await btn.click();
                clicked = true;
                console.log('  ✓ Clicked "View School Profile"');
                break;
            }
        }

        // If no button found, try clicking on school name link
        if (!clicked) {
            const schoolLinks = await page.$$('a[href*="/school/"]');
            for (const link of schoolLinks) {
                const text = await link.evaluate(el => el.textContent.trim());
                const searchTerm = schoolName.toLowerCase().split(' ')[0];
                if (text.toLowerCase().includes(searchTerm)) {
                    await link.click();
                    clicked = true;
                    console.log(`  ✓ Clicked school link: "${text}"`);
                    break;
                }
            }
        }

        if (!clicked) {
            const screenshot = path.join(__dirname, `naplan-test-no-school-${Date.now()}.png`);
            await page.screenshot({ path: screenshot, fullPage: true });
            throw new Error(`Could not find school in results. Screenshot: ${screenshot}`);
        }

        // Wait for school page
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 });
        console.log('  ✓ School profile page loaded');
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Step 5: Navigate to NAPLAN Results via URL
        console.log('\n[Step 5] Navigating to NAPLAN Results...');

        // Get current URL and append /naplan/results
        const currentUrl = page.url();
        // URL is like https://myschool.edu.au/school/44601 or https://myschool.edu.au/school/44601/
        const naplanUrl = currentUrl.replace(/\/?$/, '') + '/naplan/results';
        console.log(`  → Navigating to: ${naplanUrl}`);

        await page.goto(naplanUrl, { waitUntil: 'networkidle2', timeout: 15000 });
        console.log('  ✓ NAPLAN Results page loaded');

        // Step 6: Extract scores
        console.log('\n[Step 6] Extracting NAPLAN scores...');
        await new Promise(resolve => setTimeout(resolve, 2000));

        const scores = await page.evaluate(() => {
            const result = { year: null, source: 'myschool.edu.au' };

            // Find year
            const pageText = document.body.innerText;
            const yearMatch = pageText.match(/20(2[3-9]|[3-9]\d)/);
            if (yearMatch) result.year = '20' + yearMatch[1];

            // Find NAPLAN table
            const tables = document.querySelectorAll('table');
            for (const table of tables) {
                const headerRow = table.querySelector('tr');
                if (!headerRow) continue;

                const headerText = headerRow.textContent.toLowerCase();
                if (!headerText.includes('reading') && !headerText.includes('numeracy')) continue;

                // Get column indices
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

                // Extract rows
                const rows = table.querySelectorAll('tr');
                for (const row of rows) {
                    const cells = row.querySelectorAll('td, th');
                    if (cells.length < 2) continue;

                    const rowLabel = cells[0].textContent.toLowerCase().trim();
                    let yearKey = null;

                    if (rowLabel.includes('year 3') || rowLabel === '3') yearKey = 'year3';
                    else if (rowLabel.includes('year 5') || rowLabel === '5') yearKey = 'year5';
                    else if (rowLabel.includes('year 7') || rowLabel === '7') yearKey = 'year7';
                    else if (rowLabel.includes('year 9') || rowLabel === '9') yearKey = 'year9';

                    if (yearKey) {
                        const yearData = {};
                        for (const [metric, idx] of Object.entries(colIndex)) {
                            if (cells[idx]) {
                                const score = parseInt(cells[idx].textContent.trim());
                                if (!isNaN(score) && score > 0 && score < 1000) {
                                    yearData[metric] = score;
                                }
                            }
                        }
                        if (Object.keys(yearData).length > 0) {
                            result[yearKey] = yearData;
                        }
                    }
                }

                if (result.year3 || result.year5 || result.year7 || result.year9) break;
            }

            return result;
        });

        console.log('  ✓ Scores extracted');

        return scores;

    } catch (error) {
        console.error(`\n[ERROR] ${error.message}`);

        if (browser) {
            try {
                const pages = await browser.pages();
                if (pages.length > 0) {
                    const screenshot = path.join(__dirname, `naplan-test-error-${Date.now()}.png`);
                    await pages[0].screenshot({ path: screenshot, fullPage: true });
                    console.log(`  Screenshot saved: ${screenshot}`);
                }
            } catch (e) {}
        }

        return null;
    } finally {
        if (browser) {
            console.log('\n[Cleanup] Closing browser...');
            await browser.close();
        }
    }
}

// Main execution
async function main() {
    const schoolName = process.argv[2] || 'Mount Waverley Primary School';
    const schoolType = schoolName.toLowerCase().includes('secondary') ||
                       schoolName.toLowerCase().includes('high') ||
                       schoolName.toLowerCase().includes('college') ? 'secondary' : 'primary';

    console.log('\n' + '='.repeat(60));
    console.log('NAPLAN Scraping Test');
    console.log('='.repeat(60));
    console.log(`School: ${schoolName}`);
    console.log(`Type: ${schoolType}`);

    const scores = await scrapeNaplanScores(schoolName);

    console.log('\n' + '='.repeat(60));
    console.log('RESULTS');
    console.log('='.repeat(60));

    if (scores) {
        console.log('\nNAPLAN Scores:');
        console.log(JSON.stringify(scores, null, 2));

        // Calculate quality
        const quality = calculateNaplanQuality(scores, schoolType);
        if (quality) {
            console.log(`\nQuality Score: ${quality}%`);
            console.log(`  (100% = benchmark, >100% = better than benchmark)`);
        }
    } else {
        console.log('\nNo scores extracted.');
    }

    console.log('\n' + '='.repeat(60));
}

main().catch(console.error);
