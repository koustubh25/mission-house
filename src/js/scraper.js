/**
 * Web scraper for realestate.com.au
 * Note: Due to CORS restrictions, this scraper works via a proxy or manual HTML input
 */
const Scraper = {
    /**
     * Parse property data from realestate.com.au HTML
     * @param {string} html - HTML content of the property page
     * @returns {Object} Parsed property data
     */
    parsePropertyHtml(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const property = {
            id: Utils.generateId(),
            address: '',
            rooms: {
                bedrooms: 0,
                bathrooms: 0,
                carSpaces: 0
            },
            price: {
                min: null,
                max: null,
                displayText: ''
            },
            auctionDate: null,
            floorPlan: {
                landSize: null,
                unit: 'm²'
            },
            propertyType: '',
            scrapedAt: new Date().toISOString()
        };

        // Parse address
        const addressEl = doc.querySelector('.property-info-address, h1[class*="address"]');
        if (addressEl) {
            property.address = addressEl.textContent.trim();
        }

        // Parse rooms from aria-label or individual elements
        const featuresEl = doc.querySelector('[class*="primary-features"], ul[aria-label]');
        if (featuresEl) {
            const ariaLabel = featuresEl.getAttribute('aria-label') || '';

            // Extract bedrooms
            const bedroomsMatch = ariaLabel.match(/(\d+)\s*bedroom/i);
            if (bedroomsMatch) {
                property.rooms.bedrooms = parseInt(bedroomsMatch[1], 10);
            }

            // Extract bathrooms
            const bathroomsMatch = ariaLabel.match(/(\d+)\s*bathroom/i);
            if (bathroomsMatch) {
                property.rooms.bathrooms = parseInt(bathroomsMatch[1], 10);
            }

            // Extract car spaces
            const carMatch = ariaLabel.match(/(\d+)\s*car/i);
            if (carMatch) {
                property.rooms.carSpaces = parseInt(carMatch[1], 10);
            }

            // Extract floor plan / land size
            const areaMatch = ariaLabel.match(/(\d+)m²/i);
            if (areaMatch) {
                property.floorPlan.landSize = parseInt(areaMatch[1], 10);
            }

            // Extract property type
            const typeMatch = ariaLabel.match(/^(\w+)\s+with/i);
            if (typeMatch) {
                property.propertyType = typeMatch[1];
            }
        }

        // Alternative: parse from individual list items
        if (!property.rooms.bedrooms) {
            const bedroomEl = doc.querySelector('[aria-label*="bedroom"] p, [aria-label*="bedroom"]');
            if (bedroomEl) {
                const match = bedroomEl.textContent.match(/(\d+)/);
                if (match) property.rooms.bedrooms = parseInt(match[1], 10);
            }
        }

        if (!property.rooms.bathrooms) {
            const bathroomEl = doc.querySelector('[aria-label*="bathroom"] p, [aria-label*="bathroom"]');
            if (bathroomEl) {
                const match = bathroomEl.textContent.match(/(\d+)/);
                if (match) property.rooms.bathrooms = parseInt(match[1], 10);
            }
        }

        if (!property.rooms.carSpaces) {
            const carEl = doc.querySelector('[aria-label*="car"] p, [aria-label*="car"]');
            if (carEl) {
                const match = carEl.textContent.match(/(\d+)/);
                if (match) property.rooms.carSpaces = parseInt(match[1], 10);
            }
        }

        if (!property.floorPlan.landSize) {
            const areaEl = doc.querySelector('[aria-label*="land size"] p, [aria-label*="m²"]');
            if (areaEl) {
                const match = areaEl.textContent.match(/(\d+)/);
                if (match) property.floorPlan.landSize = parseInt(match[1], 10);
            }
        }

        // Parse price
        const priceEl = doc.querySelector('.property-price, [class*="price"]');
        if (priceEl) {
            const priceText = priceEl.textContent.trim();
            property.price.displayText = priceText;

            // Check if auction
            if (priceText.toLowerCase().includes('auction')) {
                property.auctionDate = 'TBA'; // Could parse actual date if available
            }
        }

        // Look for indicative price
        const indicativeEl = doc.querySelector('[class*="indicative"], strong[class*="price"]');
        if (indicativeEl) {
            const priceText = indicativeEl.textContent;
            const parsed = Utils.parsePrice(priceText);
            property.price.min = parsed.min;
            property.price.max = parsed.max;
            if (!property.price.displayText) {
                property.price.displayText = priceText;
            }
        }

        // If no indicative price found, try to parse from display text
        if (!property.price.min && property.price.displayText) {
            const parsed = Utils.parsePrice(property.price.displayText);
            property.price.min = parsed.min;
            property.price.max = parsed.max;
        }

        return property;
    },

    /**
     * Validate parsed property data
     * @param {Object} property - Property data to validate
     * @returns {Object} Validation result with isValid and errors
     */
    validateProperty(property) {
        const errors = [];

        if (!property.address) {
            errors.push('Address is required');
        }

        if (property.rooms.bedrooms === 0 && property.rooms.bathrooms === 0) {
            errors.push('Room information could not be extracted');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    },

    /**
     * Fetch property page via local backend API
     * @param {string} url - Realestate.com.au URL
     * @returns {Promise<string>} HTML content
     */
    async fetchPropertyPage(url) {
        // Try local backend first (runs on port 3000)
        try {
            const response = await fetch('/api/scrape', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });

            if (response.ok) {
                const data = await response.json();
                if (data.html) {
                    return data.html;
                }
            }

            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Server returned ${response.status}`);
        } catch (e) {
            // If it's a network error (backend not running), give a helpful message
            if (e.message.includes('Failed to fetch') || e.message.includes('NetworkError')) {
                throw new Error('LOCAL_SERVER_NOT_RUNNING');
            }
            throw e;
        }
    },

    /**
     * Scrape property from URL (localhost only)
     * @param {string} url - Realestate.com.au URL
     * @returns {Promise<Object>} Scraped property data
     */
    async scrapeFromUrl(url) {
        if (!Config.isLocalhost()) {
            throw new Error('Scraping is only available on localhost');
        }

        if (!Utils.isValidRealestateUrl(url)) {
            throw new Error('Invalid realestate.com.au URL');
        }

        const html = await this.fetchPropertyPage(url);
        const property = this.parsePropertyHtml(html);
        property.sourceUrl = url;

        const validation = this.validateProperty(property);
        if (!validation.isValid) {
            console.warn('Property validation warnings:', validation.errors);
        }

        return property;
    },

    /**
     * Create a manual entry form for when scraping fails
     * @returns {HTMLElement} Form element
     */
    createManualEntryForm() {
        const form = Utils.createElement('form', {
            className: 'manual-entry-form',
            onSubmit: (e) => e.preventDefault()
        });

        const fields = [
            { name: 'address', label: 'Address', type: 'text', required: true },
            { name: 'bedrooms', label: 'Bedrooms', type: 'number', min: 0 },
            { name: 'bathrooms', label: 'Bathrooms', type: 'number', min: 0 },
            { name: 'carSpaces', label: 'Car Spaces', type: 'number', min: 0 },
            { name: 'landSize', label: 'Floor Plan / Land Size (m²)', type: 'number', min: 0 },
            { name: 'priceMin', label: 'Price Min ($)', type: 'number', min: 0 },
            { name: 'priceMax', label: 'Price Max ($)', type: 'number', min: 0 },
            { name: 'auctionDate', label: 'Auction Date', type: 'date' },
            { name: 'propertyType', label: 'Property Type', type: 'text' }
        ];

        fields.forEach(field => {
            const group = Utils.createElement('div', { className: 'input-group' });
            const label = Utils.createElement('label', { for: field.name }, field.label);
            const input = Utils.createElement('input', {
                type: field.type,
                name: field.name,
                id: field.name,
                required: field.required || false,
                min: field.min
            });
            group.appendChild(label);
            group.appendChild(input);
            form.appendChild(group);
        });

        return form;
    }
};

// Make Scraper globally available
window.Scraper = Scraper;
