/**
 * Utility functions for Mission House app
 */
const Utils = {
    /**
     * Format a price range for display
     * @param {number} min - Minimum price
     * @param {number} max - Maximum price
     * @returns {string} Formatted price range
     */
    formatPriceRange(min, max) {
        const formatter = new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });

        if (min && max) {
            return `${formatter.format(min)} - ${formatter.format(max)}`;
        } else if (min) {
            return `From ${formatter.format(min)}`;
        } else if (max) {
            return `Up to ${formatter.format(max)}`;
        }
        return 'Price on application';
    },

    /**
     * Format duration in minutes to human readable string
     * @param {number} minutes - Duration in minutes
     * @returns {string} Formatted duration
     */
    formatDuration(minutes) {
        if (minutes < 60) {
            return `${Math.round(minutes)} min`;
        }
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        if (mins === 0) {
            return `${hours} hr`;
        }
        return `${hours} hr ${mins} min`;
    },

    /**
     * Format distance in meters to human readable string
     * @param {number} meters - Distance in meters
     * @returns {string} Formatted distance
     */
    formatDistance(meters) {
        if (meters < 1000) {
            return `${Math.round(meters)} m`;
        }
        return `${(meters / 1000).toFixed(1)} km`;
    },

    /**
     * Parse price string to extract min and max values
     * @param {string} priceStr - Price string like "$1,250,000 - $1,350,000"
     * @returns {Object} Object with min and max properties
     */
    parsePrice(priceStr) {
        if (!priceStr) return { min: null, max: null };

        const prices = priceStr.match(/\$[\d,]+/g);
        if (!prices || prices.length === 0) {
            return { min: null, max: null };
        }

        const parsedPrices = prices.map(p =>
            parseInt(p.replace(/[$,]/g, ''), 10)
        );

        if (parsedPrices.length === 1) {
            return { min: parsedPrices[0], max: parsedPrices[0] };
        }

        return {
            min: Math.min(...parsedPrices),
            max: Math.max(...parsedPrices)
        };
    },

    /**
     * Debounce function to limit rapid calls
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in ms
     * @returns {Function} Debounced function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Create a DOM element with attributes and children
     * @param {string} tag - HTML tag name
     * @param {Object} attrs - Attributes to set
     * @param {Array|string} children - Child elements or text content
     * @returns {HTMLElement} Created element
     */
    createElement(tag, attrs = {}, children = []) {
        const element = document.createElement(tag);

        Object.entries(attrs).forEach(([key, value]) => {
            if (key === 'className') {
                element.className = value;
            } else if (key === 'style' && typeof value === 'object') {
                Object.assign(element.style, value);
            } else if (key.startsWith('on') && typeof value === 'function') {
                element.addEventListener(key.slice(2).toLowerCase(), value);
            } else if (key === 'dataset') {
                Object.entries(value).forEach(([dataKey, dataValue]) => {
                    element.dataset[dataKey] = dataValue;
                });
            } else {
                element.setAttribute(key, value);
            }
        });

        if (typeof children === 'string') {
            element.textContent = children;
        } else if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof Node) {
                    element.appendChild(child);
                }
            });
        }

        return element;
    },

    /**
     * Show a toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success', 'error', 'info'
     */
    showToast(message, type = 'info') {
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = this.createElement('div', {
            className: `toast toast-${type}`,
            style: {
                position: 'fixed',
                bottom: '2rem',
                right: '2rem',
                padding: '1rem 1.5rem',
                borderRadius: '0.5rem',
                background: type === 'error' ? '#ef4444' : type === 'success' ? '#22c55e' : '#3b82f6',
                color: 'white',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: '1000',
                animation: 'fadeIn 0.3s ease'
            }
        }, message);

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    /**
     * Get next occurrence of peak hour time
     * @param {Object} peakTime - Object with hour and minute
     * @returns {Date} Next peak time date
     */
    getNextPeakTime(peakTime) {
        const now = new Date();
        const next = new Date(now);
        next.setHours(peakTime.hour, peakTime.minute, 0, 0);

        // If time has passed today, get next weekday
        if (next <= now) {
            next.setDate(next.getDate() + 1);
        }

        // Skip weekends
        while (next.getDay() === 0 || next.getDay() === 6) {
            next.setDate(next.getDate() + 1);
        }

        return next;
    },

    /**
     * Validate a realestate.com.au URL
     * @param {string} url - URL to validate
     * @returns {boolean} Whether URL is valid
     */
    isValidRealestateUrl(url) {
        return Config.REALESTATE_URL_PATTERN.test(url);
    },

    /**
     * Generate a unique ID
     * @returns {string} Unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
};

// Make Utils globally available
window.Utils = Utils;
