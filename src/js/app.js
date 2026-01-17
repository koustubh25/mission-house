/**
 * Main application for Mission House
 */
const App = {
    database: [],
    currentProperty: null,

    /**
     * Initialize the application
     */
    async init() {
        // Check if running on localhost
        if (Config.isLocalhost()) {
            document.body.classList.add('is-localhost');
        }

        // Load database
        await this.loadDatabase();

        // Setup navigation
        this.setupNavigation();

        // Setup page-specific functionality
        this.setupDataViewPage();
        this.setupDataEntryPage();

        // Initialize Google Maps
        try {
            await MapsService.init();
        } catch (e) {
            console.warn('Maps initialization failed:', e);
        }

        console.log('Mission House initialized');
    },

    /**
     * Load the JSON database
     */
    async loadDatabase() {
        try {
            const response = await fetch(Config.DATABASE_PATH);
            if (response.ok) {
                const data = await response.json();
                this.database = data.properties || [];
            }
        } catch (e) {
            console.log('No existing database or failed to load:', e);
            this.database = [];
        }

        this.updateDatabaseList();
    },

    /**
     * Save to database (displays JSON for manual save)
     * @param {Object} property - Property to add
     */
    saveToDatabase(property) {
        // Check for duplicates by address
        const existingIndex = this.database.findIndex(
            p => p.address.toLowerCase() === property.address.toLowerCase()
        );

        if (existingIndex >= 0) {
            this.database[existingIndex] = property;
        } else {
            this.database.push(property);
        }

        // Display updated JSON for manual save
        const json = JSON.stringify({ properties: this.database }, null, 2);

        const resultEl = document.getElementById('scrape-result');
        if (resultEl) {
            resultEl.innerHTML = `
                <div class="success-message">
                    <h3>Property Added!</h3>
                    <p>Copy the JSON below and save it to <code>src/data/houses.json</code>:</p>
                    <textarea class="json-output" readonly>${json}</textarea>
                    <button class="copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.value).then(() => Utils.showToast('Copied!', 'success'))">
                        Copy to Clipboard
                    </button>
                </div>
            `;
            resultEl.classList.remove('hidden');
            resultEl.classList.add('success');
        }

        this.updateDatabaseList();
        Utils.showToast('Property added to database!', 'success');
    },

    /**
     * Setup navigation between pages
     */
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const page = link.dataset.page;
                this.showPage(page);

                // Update active state
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    },

    /**
     * Show a specific page
     * @param {string} pageName - Name of page to show
     */
    showPage(pageName) {
        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
            if (page.id === `page-${pageName}`) {
                page.classList.add('active');
            }
        });
    },

    /**
     * Setup Data View page functionality
     */
    setupDataViewPage() {
        const addressInput = document.getElementById('address-input');
        const suggestionsEl = document.getElementById('address-suggestions');

        if (!addressInput) return;

        // Setup autocomplete from database
        const showSuggestions = Utils.debounce((query) => {
            if (!query) {
                suggestionsEl.classList.remove('show');
                return;
            }

            const matches = this.database.filter(p =>
                p.address.toLowerCase().includes(query.toLowerCase())
            );

            if (matches.length > 0) {
                suggestionsEl.innerHTML = matches.map(p => `
                    <div class="suggestion-item" data-address="${p.address}">
                        <div class="address">${p.address}</div>
                        <div class="details">
                            ${p.rooms.bedrooms} bed | ${p.rooms.bathrooms} bath |
                            ${Utils.formatPriceRange(p.price.min, p.price.max)}
                        </div>
                    </div>
                `).join('');
                suggestionsEl.classList.add('show');
            } else {
                suggestionsEl.innerHTML = `
                    <div class="suggestion-item no-results">
                        <div class="address">No matching properties</div>
                        <div class="details">Try entering a Google Maps address</div>
                    </div>
                `;
                suggestionsEl.classList.add('show');
            }
        }, 200);

        addressInput.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });

        addressInput.addEventListener('focus', () => {
            if (addressInput.value) {
                showSuggestions(addressInput.value);
            }
        });

        // Handle suggestion click
        suggestionsEl.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item && !item.classList.contains('no-results')) {
                const address = item.dataset.address;
                addressInput.value = address;
                suggestionsEl.classList.remove('show');
                this.loadPropertyView(address);
            }
        });

        // Handle enter key
        addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                suggestionsEl.classList.remove('show');
                this.loadPropertyView(addressInput.value);
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.address-selector')) {
                suggestionsEl.classList.remove('show');
            }
        });

        // Setup Google Maps autocomplete if available
        if (typeof google !== 'undefined' && google.maps) {
            MapsService.setupAutocomplete(addressInput, (place) => {
                this.loadPropertyView(place.address);
            });
        }
    },

    /**
     * Load and display property view
     * @param {string} address - Property address
     */
    async loadPropertyView(address) {
        const displayEl = document.getElementById('property-display');
        const noSelectionEl = document.getElementById('no-selection');

        if (!address) return;

        // Find in database
        const property = this.database.find(
            p => p.address.toLowerCase() === address.toLowerCase()
        );

        this.currentProperty = property || { address };

        // Show loading state
        noSelectionEl?.classList.add('hidden');
        displayEl?.classList.remove('hidden');
        displayEl.innerHTML = '<div class="loading">Loading property data...</div>';

        try {
            // Fetch all data in parallel
            const [commuteData, schoolData] = await Promise.all([
                // Get commute analysis if Maps is available
                MapsService.isLoaded
                    ? MapsService.getCommuteAnalysis(address).catch(e => {
                        console.warn('Commute analysis failed:', e);
                        return null;
                    })
                    : Promise.resolve(null),
                // Get school catchment data
                SchoolService.getAllSchools(address).catch(e => {
                    console.warn('School lookup failed:', e);
                    return { primary: null, secondary: null };
                })
            ]);

            // Render the hub and spoke visualization
            this.renderHubSpoke(displayEl, property, commuteData, schoolData);

        } catch (e) {
            console.error('Error loading property view:', e);
            displayEl.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Data</h3>
                    <p class="error-detail">${e.message}</p>
                </div>
            `;
        }
    },

    /**
     * Render hub and spoke visualization
     * @param {HTMLElement} container - Container element
     * @param {Object} property - Property data
     * @param {Object} commuteData - Commute analysis data
     * @param {Object} schoolData - School catchment data
     */
    renderHubSpoke(container, property, commuteData, schoolData = {}) {
        const hasPropertyData = property && property.address;
        const primarySchool = schoolData?.primary;
        const secondarySchool = schoolData?.secondary;

        // Helper to render school node content
        const renderSchoolNode = (school, type, icon, label) => {
            if (school?.success && school?.school) {
                return `
                    <div class="node-icon">${icon}</div>
                    <div class="node-title">${label}</div>
                    <div class="node-value">${school.school.name}</div>
                    <div class="node-detail">${school.school.distance || ''}</div>
                `;
            } else {
                const lookupUrl = SchoolService.generateFindMySchoolLink(property?.address || '', type);
                return `
                    <div class="node-icon">${icon}</div>
                    <div class="node-title">${label}</div>
                    <div class="node-value">Click to lookup</div>
                    <div class="node-detail">
                        <a href="${lookupUrl}" target="_blank" class="lookup-link">Open FindMySchool</a>
                    </div>
                `;
            }
        };

        container.innerHTML = `
            <div class="hub-spoke-container">
                <!-- Central Hub - Property -->
                <div class="central-hub">
                    <div class="hub-icon">🏠</div>
                    <div class="hub-address">${property?.address || 'Unknown Address'}</div>
                </div>

                <!-- Property Info Node -->
                ${hasPropertyData && property.rooms ? `
                <div class="spoke-node property-info">
                    <div class="node-icon">📋</div>
                    <div class="node-title">Property</div>
                    <div class="node-value">${property.rooms.bedrooms} bed / ${property.rooms.bathrooms} bath</div>
                    <div class="node-detail">${property.floorPlan?.landSize ? property.floorPlan.landSize + 'm²' : ''} ${property.propertyType || ''}</div>
                    <div class="node-detail">${Utils.formatPriceRange(property.price?.min, property.price?.max)}</div>
                </div>
                ` : `
                <div class="spoke-node property-info">
                    <div class="node-icon">📋</div>
                    <div class="node-title">Property</div>
                    <div class="node-value">Not in database</div>
                    <div class="node-detail">Add via Data Entry</div>
                </div>
                `}

                <!-- Primary School Node -->
                <div class="spoke-node primary-school" data-school-type="primary">
                    ${renderSchoolNode(primarySchool, 'primary', '🎒', 'Primary School')}
                </div>

                <!-- Secondary School Node -->
                <div class="spoke-node secondary-school" data-school-type="secondary">
                    ${renderSchoolNode(secondarySchool, 'secondary', '📚', 'Secondary School')}
                </div>

                <!-- Nearest Train Station -->
                <div class="spoke-node train-station">
                    <div class="node-icon">🚂</div>
                    <div class="node-title">Nearest Station</div>
                    <div class="node-value">${commuteData?.nearestStation?.name || 'Maps API required'}</div>
                    <div class="node-detail">
                        ${commuteData?.nearestStation?.walkingDuration ?
                            `${commuteData.nearestStation.walkingDuration.text} walk` : 'Configure API key'}
                    </div>
                </div>

                <!-- Flinders via Train -->
                <div class="spoke-node flinders-train">
                    <div class="node-icon">🏢</div>
                    <div class="node-title">To Flinders (via train)</div>
                    <div class="node-value">
                        ${commuteData?.viaStation?.totalMinutes ?
                            Utils.formatDuration(commuteData.viaStation.totalMinutes) : 'N/A'}
                    </div>
                    <div class="node-detail">Peak hours (8:30 AM)</div>
                </div>

                <!-- Flinders Direct -->
                <div class="spoke-node flinders-direct">
                    <div class="node-icon">🚗</div>
                    <div class="node-title">To Flinders (direct)</div>
                    <div class="node-value">
                        ${commuteData?.directToFlinders?.routes?.transit?.duration?.text || 'N/A'}
                    </div>
                    <div class="node-detail">
                        ${commuteData?.directToFlinders?.routes?.driving?.duration ?
                            `Drive: ${commuteData.directToFlinders.routes.driving.duration.text}` : 'Transit & driving times'}
                    </div>
                </div>
            </div>
        `;

        // Add click handlers for detail views
        container.querySelectorAll('.spoke-node').forEach(node => {
            node.addEventListener('click', () => {
                const schoolType = node.dataset.schoolType;
                if (schoolType) {
                    // Open findmyschool for school nodes
                    window.open(SchoolService.generateFindMySchoolLink(property?.address || '', schoolType), '_blank');
                } else {
                    this.showNodeDetails(node.classList[1], property, commuteData, schoolData);
                }
            });
        });
    },

    /**
     * Show detailed information for a node
     * @param {string} nodeType - Type of node clicked
     * @param {Object} property - Property data
     * @param {Object} commuteData - Commute data
     * @param {Object} schoolData - School data
     */
    showNodeDetails(nodeType, property, commuteData) {
        // Could show a modal or expanded view with more details
        console.log('Node clicked:', nodeType, property, commuteData);
    },

    /**
     * Setup Data Entry page functionality
     */
    setupDataEntryPage() {
        if (!Config.isLocalhost()) return;

        // Setup tab switching
        this.setupEntryTabs();

        // Setup URL form
        this.setupUrlEntryForm();

        // Setup HTML paste form
        this.setupHtmlEntryForm();
    },

    /**
     * Setup entry tab switching
     */
    setupEntryTabs() {
        const tabs = document.querySelectorAll('.tab-btn');
        const contents = document.querySelectorAll('.tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.dataset.tab;

                // Update tab buttons
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // Update content visibility
                contents.forEach(c => {
                    c.classList.toggle('active', c.dataset.tab === targetTab);
                });

                // Clear any previous results
                const resultEl = document.getElementById('scrape-result');
                if (resultEl) {
                    resultEl.classList.add('hidden');
                    resultEl.classList.remove('success', 'error');
                }
            });
        });
    },

    /**
     * Setup URL entry form
     */
    setupUrlEntryForm() {
        const form = document.getElementById('entry-form');
        const urlInput = document.getElementById('url-input');

        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.submit-btn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');

            const url = urlInput.value.trim();

            if (!Utils.isValidRealestateUrl(url)) {
                Utils.showToast('Please enter a valid realestate.com.au URL', 'error');
                return;
            }

            // Show loading state
            submitBtn.disabled = true;
            btnText.textContent = 'Scraping...';
            btnLoader?.classList.remove('hidden');

            try {
                const property = await Scraper.scrapeFromUrl(url);
                this.saveToDatabase(property);
                urlInput.value = '';
            } catch (error) {
                console.error('Scraping failed:', error);

                const resultEl = document.getElementById('scrape-result');
                const isServerError = error.message === 'LOCAL_SERVER_NOT_RUNNING';

                if (isServerError) {
                    resultEl.innerHTML = `
                        <div class="error-message">
                            <h3>Server Not Running</h3>
                            <p>The local backend server is required for URL scraping.</p>
                            <p><strong>Start it with:</strong></p>
                            <pre class="code-block">node server.js</pre>
                            <p>Then refresh this page and try again.</p>
                            <p><em>Or use the "Paste HTML" tab as an alternative.</em></p>
                        </div>
                    `;
                } else {
                    resultEl.innerHTML = `
                        <div class="error-message">
                            <h3>Scraping Failed</h3>
                            <p>${error.message}</p>
                            <p>Try the "Paste HTML" tab as an alternative.</p>
                        </div>
                    `;
                }
                resultEl.classList.remove('hidden', 'success');
                resultEl.classList.add('error');

                Utils.showToast(isServerError ? 'Start server with: node server.js' : 'Scraping failed', 'error');
            } finally {
                submitBtn.disabled = false;
                btnText.textContent = 'Scrape & Add';
                btnLoader?.classList.add('hidden');
            }
        });
    },

    /**
     * Setup HTML paste form
     */
    setupHtmlEntryForm() {
        const form = document.getElementById('html-form');
        const htmlInput = document.getElementById('html-input');

        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = form.querySelector('.submit-btn');
            const btnText = submitBtn?.querySelector('.btn-text');
            const btnLoader = submitBtn?.querySelector('.btn-loader');

            const html = htmlInput.value.trim();

            if (!html) {
                Utils.showToast('Please paste the page HTML', 'error');
                return;
            }

            if (!html.includes('realestate.com.au') && !html.includes('property-info')) {
                Utils.showToast('This doesn\'t look like realestate.com.au HTML', 'error');
                return;
            }

            // Show loading state
            submitBtn.disabled = true;
            btnText.textContent = 'Parsing...';
            btnLoader?.classList.remove('hidden');

            try {
                const property = Scraper.parsePropertyHtml(html);
                const validation = Scraper.validateProperty(property);

                if (!validation.isValid) {
                    throw new Error('Could not extract property data: ' + validation.errors.join(', '));
                }

                this.saveToDatabase(property);
                htmlInput.value = '';
                Utils.showToast('Property added successfully!', 'success');
            } catch (error) {
                console.error('Parsing failed:', error);

                const resultEl = document.getElementById('scrape-result');
                resultEl.innerHTML = `
                    <div class="error-message">
                        <h3>Parsing Failed</h3>
                        <p>${error.message}</p>
                        <p>Make sure you copied the entire page source (View Page Source, then Ctrl+A, Ctrl+C)</p>
                    </div>
                `;
                resultEl.classList.remove('hidden', 'success');
                resultEl.classList.add('error');

                Utils.showToast('Failed to parse HTML', 'error');
            } finally {
                submitBtn.disabled = false;
                btnText.textContent = 'Parse & Add';
                btnLoader?.classList.add('hidden');
            }
        });
    },


    /**
     * Update the database list display
     */
    updateDatabaseList() {
        const listEl = document.getElementById('database-list');
        if (!listEl) return;

        if (this.database.length === 0) {
            listEl.innerHTML = '<p class="no-data">No properties in database</p>';
            return;
        }

        listEl.innerHTML = this.database.map(p => `
            <div class="database-item">
                <div class="item-address">${p.address}</div>
                <div class="item-price">${Utils.formatPriceRange(p.price?.min, p.price?.max)}</div>
            </div>
        `).join('');
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available
window.App = App;
