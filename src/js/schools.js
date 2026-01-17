/**
 * School catchment service for findmyschool.vic.gov.au
 * Due to CORS restrictions, this service provides multiple approaches:
 * 1. Direct API calls (if available)
 * 2. CORS proxy fallback
 * 3. Manual lookup with deep link to findmyschool
 */
const SchoolService = {
    FIND_MY_SCHOOL_URL: 'https://www.findmyschool.vic.gov.au',
    CURRENT_YEAR: '2026',

    // Cache for school lookups
    cache: new Map(),

    /**
     * Generate a deep link to findmyschool.vic.gov.au with address pre-filled
     * @param {string} address - Property address
     * @param {string} schoolType - 'primary' or 'secondary'
     * @returns {string} URL to findmyschool
     */
    generateFindMySchoolLink(address, schoolType = 'primary') {
        // The website doesn't support query params for pre-filling,
        // but we can at least link to it
        return this.FIND_MY_SCHOOL_URL;
    },

    /**
     * Lookup school catchment for an address
     * @param {string} address - Property address
     * @param {string} schoolType - 'primary' or 'secondary'
     * @returns {Promise<Object>} School information
     */
    async lookupSchool(address, schoolType = 'primary') {
        const cacheKey = `${address}:${schoolType}`;

        // Check cache first
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        // Try to fetch via CORS proxy
        try {
            const result = await this.fetchViaProxy(address, schoolType);
            if (result) {
                this.cache.set(cacheKey, result);
                return result;
            }
        } catch (e) {
            console.warn('School lookup via proxy failed:', e);
        }

        // Return a placeholder with link to manual lookup
        return {
            success: false,
            schoolType,
            message: 'Automatic lookup unavailable',
            manualLookupUrl: this.generateFindMySchoolLink(address, schoolType),
            address
        };
    },

    /**
     * Attempt to fetch school data via CORS proxy
     * Note: This may not work reliably due to the dynamic nature of findmyschool
     * @param {string} address - Property address
     * @param {string} schoolType - 'primary' or 'secondary'
     * @returns {Promise<Object|null>} School data or null
     */
    async fetchViaProxy(address, schoolType) {
        // FindMySchool uses a complex Vue.js frontend with API calls
        // Direct scraping won't work, but we can try the underlying API

        // The site appears to use ArcGIS for geocoding and zone lookups
        // API endpoint patterns observed:
        // - Geocoding: /api/geocode
        // - Zone lookup: /api/zones

        // For now, return null to trigger manual lookup flow
        // A future enhancement could implement actual API integration
        return null;
    },

    /**
     * Parse school information from HTML (if we can get it)
     * @param {string} html - HTML content
     * @param {string} schoolType - 'primary' or 'secondary'
     * @returns {Object} Parsed school data
     */
    parseSchoolHtml(html, schoolType) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const result = {
            success: false,
            schoolType,
            school: null
        };

        // Look for the school info header
        const schoolHeader = doc.querySelector('#SchoolInfo-header');
        if (schoolHeader) {
            result.school = {
                name: schoolHeader.textContent.trim()
            };
            result.success = true;

            // Try to get additional details
            const table = doc.querySelector('#SchoolInfo table');
            if (table) {
                const rows = table.querySelectorAll('tr');
                rows.forEach(row => {
                    const th = row.querySelector('th');
                    const td = row.querySelector('td');
                    if (th && td) {
                        const label = th.textContent.trim().toLowerCase();
                        const value = td.textContent.trim();

                        if (label.includes('address')) {
                            result.school.address = value;
                        } else if (label.includes('phone')) {
                            result.school.phone = value;
                        } else if (label.includes('campus years')) {
                            result.school.years = value;
                        } else if (label.includes('website')) {
                            const link = td.querySelector('a');
                            if (link) result.school.website = link.href;
                        }
                    }
                });
            }

            // Try to get distance from nearest schools section
            const nearestSchools = doc.querySelector('#NearestSchools');
            if (nearestSchools) {
                const firstSchool = nearestSchools.querySelector('.container');
                if (firstSchool) {
                    const distance = firstSchool.querySelector('.distance');
                    if (distance) {
                        result.school.distance = distance.textContent.trim();
                    }
                }
            }
        }

        return result;
    },

    /**
     * Get primary school in catchment
     * @param {string} address - Property address
     * @returns {Promise<Object>} Primary school data
     */
    async getPrimarySchool(address) {
        return this.lookupSchool(address, 'primary');
    },

    /**
     * Get secondary school in catchment
     * @param {string} address - Property address
     * @returns {Promise<Object>} Secondary school data
     */
    async getSecondarySchool(address) {
        return this.lookupSchool(address, 'secondary');
    },

    /**
     * Get both primary and secondary schools for an address
     * @param {string} address - Property address
     * @returns {Promise<Object>} Both school results
     */
    async getAllSchools(address) {
        const [primary, secondary] = await Promise.all([
            this.getPrimarySchool(address),
            this.getSecondarySchool(address)
        ]);

        return { primary, secondary };
    },

    /**
     * Create a manual school entry object
     * @param {Object} data - School data from user input
     * @param {string} schoolType - 'primary' or 'secondary'
     * @returns {Object} Formatted school object
     */
    createManualEntry(data, schoolType) {
        return {
            success: true,
            schoolType,
            school: {
                name: data.name,
                address: data.address || null,
                phone: data.phone || null,
                distance: data.distance || null,
                website: data.website || null,
                manualEntry: true
            }
        };
    },

    /**
     * Calculate walking time to school using Google Maps
     * @param {string} fromAddress - Origin address
     * @param {string} schoolAddress - School address
     * @returns {Promise<Object>} Walking directions
     */
    async getWalkingTimeToSchool(fromAddress, schoolAddress) {
        if (!MapsService.isLoaded) {
            return null;
        }

        try {
            return await MapsService.getDirections(
                fromAddress,
                schoolAddress,
                'WALKING'
            );
        } catch (e) {
            console.warn('Failed to get walking time to school:', e);
            return null;
        }
    }
};

// Make SchoolService globally available
window.SchoolService = SchoolService;
