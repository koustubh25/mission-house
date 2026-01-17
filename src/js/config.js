/**
 * Configuration for Mission House app
 */
const Config = {
    // Google Maps API Key - Replace with your actual key
    GOOGLE_MAPS_API_KEY: 'AIzaSyCdHYNvCeMW8aGuNvLynTEFr4fukVSAyjI',

    // Melbourne-specific settings
    MELBOURNE: {
        center: { lat: -37.8136, lng: 144.9631 },
        flindersStreet: {
            name: 'Flinders Street Station',
            address: 'Flinders St, Melbourne VIC 3000',
            lat: -37.8183,
            lng: 144.9671
        },
        bounds: {
            north: -37.5,
            south: -38.5,
            east: 146.0,
            west: 144.0
        }
    },

    // Find My School URL
    FIND_MY_SCHOOL_URL: 'https://www.findmyschool.vic.gov.au',

    // Database file path
    DATABASE_PATH: 'src/data/houses.json',

    // Peak hours for transit calculations
    PEAK_HOURS: {
        morning: { hour: 8, minute: 30 },  // 8:30 AM
        evening: { hour: 17, minute: 30 }  // 5:30 PM
    },

    // Realestate.com.au URL pattern
    REALESTATE_URL_PATTERN: /^https?:\/\/(www\.)?realestate\.com\.au\/property-/,

    // Check if running on localhost
    isLocalhost() {
        const hostname = window.location.hostname;
        return hostname === 'localhost' ||
               hostname === '127.0.0.1' ||
               hostname === '' ||
               hostname.startsWith('192.168.') ||
               hostname.endsWith('.local');
    }
};

// Freeze config to prevent modifications
Object.freeze(Config);
Object.freeze(Config.MELBOURNE);
Object.freeze(Config.MELBOURNE.flindersStreet);
Object.freeze(Config.MELBOURNE.bounds);
Object.freeze(Config.PEAK_HOURS);
