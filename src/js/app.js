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
        this.setupComparePage();
        this.setupSettingsPage();

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
     * Save to database (saves to houses.json via backend)
     * @param {Object} property - Property to add
     */
    async saveToDatabase(property) {
        const resultEl = document.getElementById('scrape-result');

        try {
            // Try to save via backend API
            const response = await fetch('/api/save-property', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ property })
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Property saved via backend:', data);

                // Update local database
                const existingIndex = this.database.findIndex(
                    p => p.address.toLowerCase() === property.address.toLowerCase()
                );

                if (existingIndex >= 0) {
                    this.database[existingIndex] = property;
                } else {
                    this.database.push(property);
                }

                // Show success message
                if (resultEl) {
                    resultEl.innerHTML = `
                        <div class="success-message">
                            <h3>✓ Property Saved!</h3>
                            <p><strong>${property.address}</strong> has been saved to the database.</p>
                            <p>Total properties: ${data.totalProperties}</p>
                        </div>
                    `;
                    resultEl.classList.remove('hidden', 'error');
                    resultEl.classList.add('success');
                }

                this.updateDatabaseList();
                Utils.showToast('Property saved successfully!', 'success');
                return;
            }

            throw new Error('Server returned ' + response.status);
        } catch (error) {
            console.warn('Backend save failed, showing JSON for manual save:', error.message);

            // Fallback: Update local database and show JSON for manual save
            const existingIndex = this.database.findIndex(
                p => p.address.toLowerCase() === property.address.toLowerCase()
            );

            if (existingIndex >= 0) {
                this.database[existingIndex] = property;
            } else {
                this.database.push(property);
            }

            const json = JSON.stringify({ properties: this.database }, null, 2);

            if (resultEl) {
                resultEl.innerHTML = `
                    <div class="success-message">
                        <h3>Property Parsed!</h3>
                        <p><strong>Server not running.</strong> Copy the JSON below and save it to <code>src/data/houses.json</code>:</p>
                        <textarea class="json-output" readonly>${json}</textarea>
                        <button class="copy-btn" onclick="navigator.clipboard.writeText(this.previousElementSibling.value).then(() => Utils.showToast('Copied!', 'success'))">
                            Copy to Clipboard
                        </button>
                        <p class="form-hint">To auto-save, start the server with: <code>node server.js</code></p>
                    </div>
                `;
                resultEl.classList.remove('hidden', 'error');
                resultEl.classList.add('success');
            }

            this.updateDatabaseList();
            Utils.showToast('Property added (manual save required)', 'success');
        }
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

        if (!addressInput || !suggestionsEl) {
            console.warn('Data View page elements not found');
            return;
        }

        console.log('Setting up Data View page, database has', this.database.length, 'properties');

        // Setup autocomplete from database
        const showSuggestions = Utils.debounce((query) => {
            if (!query) {
                suggestionsEl.classList.remove('show');
                return;
            }

            console.log('Searching for:', query, 'in', this.database.length, 'properties');
            const matches = this.database.filter(p =>
                p.address && p.address.toLowerCase().includes(query.toLowerCase())
            );
            console.log('Found', matches.length, 'matches');

            if (matches.length > 0) {
                suggestionsEl.innerHTML = matches.map(p => `
                    <div class="suggestion-item" data-address="${p.address}">
                        <div class="address">${p.address}</div>
                        <div class="details">
                            ${p.rooms?.bedrooms || 0} bed | ${p.rooms?.bathrooms || 0} bath |
                            ${Utils.formatPriceRange(p.price?.min, p.price?.max)}
                        </div>
                    </div>
                `).join('');
                suggestionsEl.classList.add('show');
            } else {
                suggestionsEl.innerHTML = `
                    <div class="suggestion-item no-results">
                        <div class="address">No matching properties</div>
                        <div class="details">Try entering any Melbourne address</div>
                    </div>
                `;
                suggestionsEl.classList.add('show');
            }
        }, 300);

        addressInput.addEventListener('input', (e) => {
            showSuggestions(e.target.value);
        });

        addressInput.addEventListener('focus', () => {
            if (addressInput.value) {
                showSuggestions(addressInput.value);
            } else if (this.database.length > 0) {
                // Show all properties when focusing on empty input
                showSuggestions(' ');
                addressInput.value = '';
            }
        });

        // Handle suggestion click
        suggestionsEl.addEventListener('click', (e) => {
            const item = e.target.closest('.suggestion-item');
            if (item && !item.classList.contains('no-results')) {
                const address = item.dataset.address;
                console.log('Selected address:', address);
                addressInput.value = address;
                suggestionsEl.classList.remove('show');
                this.loadPropertyView(address);
            }
        });

        // Handle enter key
        addressInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                suggestionsEl.classList.remove('show');
                const address = addressInput.value.trim();
                if (address) {
                    this.loadPropertyView(address);
                }
            }
        });

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.address-selector')) {
                suggestionsEl.classList.remove('show');
            }
        });

        // Setup Google Maps autocomplete if available
        if (typeof google !== 'undefined' && google.maps && google.maps.places) {
            console.log('Setting up Google Maps autocomplete');
            MapsService.setupAutocomplete(addressInput, (place) => {
                console.log('Google Maps place selected:', place);
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

        if (!address) {
            console.warn('loadPropertyView called with empty address');
            return;
        }

        console.log('Loading property view for:', address);

        // Find in database
        const property = this.database.find(
            p => p.address && p.address.toLowerCase() === address.toLowerCase()
        );

        console.log('Property found in database:', !!property);

        this.currentProperty = property || { address };

        // Show loading state
        noSelectionEl?.classList.add('hidden');
        displayEl?.classList.remove('hidden');
        displayEl.innerHTML = '<div class="loading">Loading property data...</div>';

        try {
            // Check if Google Maps is available
            const mapsAvailable = MapsService.isLoaded;
            if (!mapsAvailable) {
                console.warn('Google Maps not loaded. Check API key in Settings.');
            }

            // Get commute analysis if Maps is available
            const commuteData = mapsAvailable
                ? await MapsService.getCommuteAnalysis(address).catch(e => {
                    console.warn('Commute analysis failed:', e);
                    return null;
                })
                : null;

            console.log('Data loaded. Commute:', !!commuteData, 'Schools:', !!property?.schools);

            // Render the hub and spoke visualization
            // School data comes from property.schools (pre-loaded from backend)
            this.renderHubSpoke(displayEl, property, commuteData);

            // Calculate walking times to schools asynchronously
            if (property?.schools && mapsAvailable) {
                this.calculateSchoolWalkingTimes(property, displayEl);
            }

        } catch (e) {
            console.error('Error loading property view:', e);
            displayEl.innerHTML = `
                <div class="error-message">
                    <h3>Error Loading Data</h3>
                    <p class="error-detail">${e.message}</p>
                    ${!MapsService.isLoaded ? '<p>Note: Google Maps API is not loaded. Configure your API key in Settings.</p>' : ''}
                </div>
            `;
        }
    },

    /**
     * Render hub and spoke visualization
     * @param {HTMLElement} container - Container element
     * @param {Object} property - Property data
     * @param {Object} commuteData - Commute analysis data
     */
    renderHubSpoke(container, property, commuteData) {
        const hasPropertyData = property && property.address;
        const primarySchool = property?.schools?.primary;
        const secondarySchool = property?.schools?.secondary;

        // Helper to render school node content
        const renderSchoolNode = (school, type, icon, label) => {
            if (school?.lookupSuccess && school?.name) {
                const mapsAvailable = MapsService.isLoaded;
                return `
                    <div class="node-icon">${icon}</div>
                    <div class="node-title">${label}</div>
                    <div class="node-value">${school.name}</div>
                    <div class="node-detail" data-school-type="${type}" data-school-address="${school.address || ''}" ${mapsAvailable ? 'data-loading="true"' : ''}>
                        ${mapsAvailable ? 'Calculating walking time...' : (school.address || 'Address not available')}
                    </div>
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
                ${property?.url ? `
                <a href="${property.url}" target="_blank" rel="noopener noreferrer" class="central-hub-link">
                    <div class="central-hub">
                        <div class="hub-icon">🏠</div>
                        <div class="hub-address">${property.address || 'Unknown Address'}</div>
                    </div>
                </a>
                ` : `
                <div class="central-hub">
                    <div class="hub-icon">🏠</div>
                    <div class="hub-address">${property?.address || 'Unknown Address'}</div>
                </div>
                `}

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
                        ${commuteData?.nearestStation?.routes ? `
                            ${commuteData.nearestStation.routes.walking ?
                                `🚶 ${commuteData.nearestStation.routes.walking.duration.text}` : ''}
                            ${commuteData.nearestStation.routes.walking && commuteData.nearestStation.routes.driving ? ' | ' : ''}
                            ${commuteData.nearestStation.routes.driving ?
                                `🚗 ${commuteData.nearestStation.routes.driving.duration.text}` : ''}
                            ${commuteData.nearestStation.busStopDetails ? '<br>' : ''}
                            ${commuteData.nearestStation.busStopDetails ?
                                `🚶 ${commuteData.nearestStation.busStopDetails.walkToBusStop.text} to bus → 🚌 ${commuteData.nearestStation.busStopDetails.busToStation.text}` :
                                (commuteData.nearestStation.routes.transit ? `<br>🚌 ${commuteData.nearestStation.routes.transit.duration.text}` : '')}
                        ` : 'Configure API key'}
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
                    this.showNodeDetails(node.classList[1], property, commuteData);
                }
            });
        });
    },

    /**
     * Calculate and display walking times to schools
     * @param {Object} property - Property data with schools
     * @param {HTMLElement} container - Container element
     */
    async calculateSchoolWalkingTimes(property, container) {
        console.log('Calculating walking times to schools...');
        const schools = ['primary', 'secondary'];

        for (const schoolType of schools) {
            const school = property.schools[schoolType];
            console.log(`${schoolType} school:`, school);

            if (!school?.lookupSuccess || !school?.address) {
                console.warn(`Skipping ${schoolType} school - no address available`);
                continue;
            }

            try {
                console.log(`Getting directions from "${property.address}" to "${school.address}"`);

                // Get walking directions from property to school
                const result = await MapsService.getDirections(
                    property.address,
                    school.address,
                    'WALKING'
                );

                console.log(`Directions result for ${schoolType}:`, result);

                if (result?.duration && result?.distance) {
                    const walkingTime = result.duration.text;
                    const distance = result.distance.text;

                    console.log(`${schoolType} school walking time: ${walkingTime}, distance: ${distance}`);

                    // Update the UI
                    const detailEl = container.querySelector(
                        `.spoke-node[data-school-type="${schoolType}"] .node-detail[data-loading="true"]`
                    );

                    if (detailEl) {
                        detailEl.innerHTML = `🚶 ${walkingTime} | ${distance}`;
                        detailEl.removeAttribute('data-loading');
                        console.log(`Updated UI for ${schoolType} school`);
                    } else {
                        console.warn(`Could not find detail element for ${schoolType} school`);
                    }
                } else {
                    console.warn(`No routes found for ${schoolType} school - result structure:`, result);

                    // Show school address instead
                    const detailEl = container.querySelector(
                        `.spoke-node[data-school-type="${schoolType}"] .node-detail[data-loading="true"]`
                    );
                    if (detailEl) {
                        detailEl.innerHTML = school.address;
                        detailEl.removeAttribute('data-loading');
                    }
                }
            } catch (error) {
                console.error(`Failed to calculate walking time to ${schoolType} school:`, error);

                // Show school address as fallback
                const detailEl = container.querySelector(
                    `.spoke-node[data-school-type="${schoolType}"] .node-detail[data-loading="true"]`
                );
                if (detailEl) {
                    detailEl.innerHTML = school.address;
                    detailEl.removeAttribute('data-loading');
                }
            }
        }

        console.log('Finished calculating walking times');
    },

    /**
     * Show detailed information for a node
     * @param {string} nodeType - Type of node clicked
     * @param {Object} property - Property data
     * @param {Object} commuteData - Commute data
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

        // Setup HTML paste form
        this.setupHtmlEntryForm();
    },

    /**
     * Setup HTML paste form
     */
    setupHtmlEntryForm() {
        const form = document.getElementById('html-form');
        const htmlInput = document.getElementById('html-input');
        const urlInput = document.getElementById('url-input');

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

                // Add the URL if provided
                if (urlInput && urlInput.value.trim()) {
                    property.url = urlInput.value.trim();
                }

                const validation = Scraper.validateProperty(property);

                if (!validation.isValid) {
                    throw new Error('Could not extract property data: ' + validation.errors.join(', '));
                }

                this.saveToDatabase(property);
                htmlInput.value = '';
                if (urlInput) urlInput.value = '';
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
     * Setup Compare page functionality
     */
    setupComparePage() {
        // Initialize CompareService when page is first shown
        if (typeof CompareService !== 'undefined') {
            CompareService.init();
        }
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
    },

    /**
     * Setup Settings page functionality
     */
    setupSettingsPage() {
        const apiKeyInput = document.getElementById('api-key-input');
        const saveBtn = document.getElementById('save-api-key-btn');
        const statusEl = document.getElementById('api-key-status');

        if (!apiKeyInput || !saveBtn) return;

        // Load existing API key
        const existingKey = localStorage.getItem('googleMapsApiKey');
        if (existingKey) {
            // Show masked version
            apiKeyInput.value = existingKey.substring(0, 8) + '...' + existingKey.substring(existingKey.length - 4);
            apiKeyInput.dataset.fullKey = existingKey;
        }

        // Handle focus to show full key
        apiKeyInput.addEventListener('focus', () => {
            if (apiKeyInput.dataset.fullKey) {
                apiKeyInput.value = apiKeyInput.dataset.fullKey;
            }
        });

        // Handle blur to mask key
        apiKeyInput.addEventListener('blur', () => {
            const key = apiKeyInput.value.trim();
            if (key && key.length > 12) {
                apiKeyInput.dataset.fullKey = key;
                apiKeyInput.value = key.substring(0, 8) + '...' + key.substring(key.length - 4);
            }
        });

        // Handle save
        saveBtn.addEventListener('click', () => {
            let apiKey = apiKeyInput.value.trim();

            // Get full key if it's masked
            if (apiKeyInput.dataset.fullKey) {
                apiKey = apiKeyInput.dataset.fullKey;
            }

            if (!apiKey || apiKey.length < 20) {
                statusEl.innerHTML = '<p class="error-message">Please enter a valid API key</p>';
                statusEl.classList.remove('hidden');
                return;
            }

            // Save to localStorage
            localStorage.setItem('googleMapsApiKey', apiKey);
            apiKeyInput.dataset.fullKey = apiKey;

            // Show success message with reload button
            statusEl.innerHTML = `
                <div class="success-message">
                    <p>✓ API key saved!</p>
                    <button id="reload-page-btn" class="submit-btn" style="margin-top: 10px;">
                        Reload Page to Activate
                    </button>
                </div>
            `;
            statusEl.classList.remove('hidden');

            // Add reload handler
            document.getElementById('reload-page-btn').addEventListener('click', () => {
                window.location.reload();
            });

            Utils.showToast('API key saved! Click the button to reload.', 'success');

            // Mask the input
            apiKeyInput.value = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// Make App globally available
window.App = App;
