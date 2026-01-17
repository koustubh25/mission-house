/**
 * HTML parser for realestate.com.au property pages
 * Users paste the page HTML directly to extract property data
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
            url: '',
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

        // Parse URL from canonical link
        const canonicalLink = doc.querySelector('link[rel="canonical"]');
        if (canonicalLink) {
            property.url = canonicalLink.getAttribute('href') || '';
        }

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

        // Parse price - look for "Indicative price:" pattern
        const allText = doc.body.textContent || '';
        const indicativePriceMatch = allText.match(/Indicative price:\s*\$?([\d,]+(?:\.\d{2})?)\s*-\s*\$?([\d,]+(?:\.\d{2})?)/i);

        if (indicativePriceMatch) {
            const priceText = indicativePriceMatch[0];
            property.price.displayText = priceText;
            const parsed = Utils.parsePrice(priceText);
            property.price.min = parsed.min;
            property.price.max = parsed.max;
        } else {
            // Fallback: Look for any price element
            const priceEl = doc.querySelector('[class*="price"]');
            if (priceEl) {
                const priceText = priceEl.textContent.trim();
                property.price.displayText = priceText;
                const parsed = Utils.parsePrice(priceText);
                property.price.min = parsed.min;
                property.price.max = parsed.max;
            }
        }

        // Parse auction date - look for "Auction" pattern
        const auctionMatch = allText.match(/Auction\s+(\w+)\s+(\d+)\s+(\w+)(?:\s+at\s+(\d+:\d+\s*(?:am|pm)))?/i);
        if (auctionMatch) {
            const [, dayOfWeek, day, month, time] = auctionMatch;
            property.auctionDate = `${dayOfWeek} ${day} ${month}${time ? ' at ' + time : ''}`;

            // Try to convert to ISO date if possible
            try {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                const monthIndex = monthNames.findIndex(m => month.toLowerCase().startsWith(m.toLowerCase()));
                if (monthIndex >= 0) {
                    const year = new Date().getFullYear();
                    const isoDate = new Date(year, monthIndex, parseInt(day));
                    // If the date is in the past, assume next year
                    if (isoDate < new Date()) {
                        isoDate.setFullYear(year + 1);
                    }
                    property.auctionDate = isoDate.toISOString().split('T')[0]; // YYYY-MM-DD format
                }
            } catch (e) {
                // Keep the human-readable format if parsing fails
            }
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
