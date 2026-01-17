/**
 * Google Maps integration for Mission House
 * Handles geocoding, directions, and place lookups
 */
const MapsService = {
    isLoaded: false,
    placesService: null,
    directionsService: null,
    geocoder: null,

    /**
     * Initialize Google Maps services
     */
    async init() {
        if (this.isLoaded) return;

        // Check if Google Maps API is loaded
        if (typeof google === 'undefined' || !google.maps) {
            console.warn('Google Maps API not loaded. Some features will be unavailable.');
            return;
        }

        this.geocoder = new google.maps.Geocoder();
        this.directionsService = new google.maps.DirectionsService();

        // Create a hidden map for Places service
        const mapDiv = document.createElement('div');
        mapDiv.style.display = 'none';
        document.body.appendChild(mapDiv);

        const map = new google.maps.Map(mapDiv, {
            center: Config.MELBOURNE.center,
            zoom: 10
        });

        this.placesService = new google.maps.places.PlacesService(map);
        this.isLoaded = true;
    },

    /**
     * Geocode an address to coordinates
     * @param {string} address - Address to geocode
     * @returns {Promise<Object>} Location with lat, lng
     */
    async geocodeAddress(address) {
        if (!this.geocoder) {
            throw new Error('Maps service not initialized');
        }

        return new Promise((resolve, reject) => {
            this.geocoder.geocode(
                {
                    address: address,
                    componentRestrictions: { country: 'AU' },
                    bounds: new google.maps.LatLngBounds(
                        new google.maps.LatLng(Config.MELBOURNE.bounds.south, Config.MELBOURNE.bounds.west),
                        new google.maps.LatLng(Config.MELBOURNE.bounds.north, Config.MELBOURNE.bounds.east)
                    )
                },
                (results, status) => {
                    if (status === 'OK' && results[0]) {
                        const location = results[0].geometry.location;
                        resolve({
                            lat: location.lat(),
                            lng: location.lng(),
                            formattedAddress: results[0].formatted_address
                        });
                    } else {
                        reject(new Error(`Geocoding failed: ${status}`));
                    }
                }
            );
        });
    },

    /**
     * Get directions between two points
     * @param {Object} origin - Origin location {lat, lng} or address string
     * @param {Object} destination - Destination location {lat, lng} or address string
     * @param {string} mode - Travel mode: DRIVING, WALKING, TRANSIT
     * @param {Date} departureTime - Optional departure time for transit
     * @returns {Promise<Object>} Route information
     */
    async getDirections(origin, destination, mode = 'TRANSIT', departureTime = null) {
        if (!this.directionsService) {
            throw new Error('Maps service not initialized');
        }

        const request = {
            origin: typeof origin === 'string' ? origin : new google.maps.LatLng(origin.lat, origin.lng),
            destination: typeof destination === 'string' ? destination : new google.maps.LatLng(destination.lat, destination.lng),
            travelMode: google.maps.TravelMode[mode],
            region: 'AU'
        };

        if (mode === 'TRANSIT' && departureTime) {
            request.transitOptions = {
                departureTime: departureTime
            };
        }

        return new Promise((resolve, reject) => {
            this.directionsService.route(request, (result, status) => {
                if (status === 'OK') {
                    const route = result.routes[0];
                    const leg = route.legs[0];

                    resolve({
                        distance: {
                            text: leg.distance.text,
                            meters: leg.distance.value
                        },
                        duration: {
                            text: leg.duration.text,
                            minutes: Math.round(leg.duration.value / 60)
                        },
                        startAddress: leg.start_address,
                        endAddress: leg.end_address,
                        steps: leg.steps.map(step => ({
                            instruction: step.instructions,
                            distance: step.distance.text,
                            duration: step.duration.text,
                            travelMode: step.travel_mode
                        }))
                    });
                } else {
                    reject(new Error(`Directions request failed: ${status}`));
                }
            });
        });
    },

    /**
     * Find nearest bus stop
     * @param {Object} location - Location with lat, lng
     * @returns {Promise<Object>} Bus stop details with walking route
     */
    async findNearestBusStop(location) {
        if (!this.placesService) {
            throw new Error('Maps service not initialized');
        }

        return new Promise((resolve, reject) => {
            const request = {
                location: new google.maps.LatLng(location.lat, location.lng),
                radius: 1000, // 1km radius for bus stops
                type: 'bus_station'
            };

            this.placesService.nearbySearch(request, async (results, status) => {
                if (status === 'OK' && results.length > 0) {
                    const busStop = results[0];
                    const stopLocation = {
                        lat: busStop.geometry.location.lat(),
                        lng: busStop.geometry.location.lng()
                    };

                    try {
                        // Get walking directions to the bus stop
                        const walkingRoute = await this.getDirections(
                            location,
                            stopLocation,
                            'WALKING'
                        );

                        resolve({
                            name: busStop.name,
                            location: stopLocation,
                            walkingDistance: walkingRoute.distance,
                            walkingDuration: walkingRoute.duration,
                            placeId: busStop.place_id
                        });
                    } catch (e) {
                        resolve({
                            name: busStop.name,
                            location: stopLocation,
                            placeId: busStop.place_id
                        });
                    }
                } else {
                    reject(new Error(`No bus stops found nearby: ${status}`));
                }
            });
        });
    },

    /**
     * Find nearest train station to a location
     * @param {Object} location - Location {lat, lng}
     * @returns {Promise<Object>} Nearest station info
     */
    async findNearestTrainStation(location) {
        if (!this.placesService) {
            throw new Error('Maps service not initialized');
        }

        return new Promise((resolve, reject) => {
            const request = {
                location: new google.maps.LatLng(location.lat, location.lng),
                radius: 5000, // 5km radius
                type: 'train_station'
            };

            this.placesService.nearbySearch(request, async (results, status) => {
                if (status === 'OK' && results.length > 0) {
                    const station = results[0];
                    const stationLocation = {
                        lat: station.geometry.location.lat(),
                        lng: station.geometry.location.lng()
                    };

                    // Get all transport modes to the station
                    const routes = {};
                    const modes = [
                        { key: 'walking', mode: 'WALKING' },
                        { key: 'driving', mode: 'DRIVING' },
                        { key: 'transit', mode: 'TRANSIT' }  // This includes buses
                    ];

                    try {
                        for (const { key, mode } of modes) {
                            try {
                                routes[key] = await this.getDirections(
                                    location,
                                    stationLocation,
                                    mode
                                );
                            } catch (e) {
                                console.warn(`Failed to get ${mode} route to station:`, e);
                                routes[key] = null;
                            }
                        }

                        // Also find nearest bus stop for detailed bus route breakdown
                        let busStopInfo = null;
                        try {
                            const nearestBusStop = await this.findNearestBusStop(location);

                            // Get transit route from bus stop to train station
                            const busToStation = await this.getDirections(
                                nearestBusStop.location,
                                stationLocation,
                                'TRANSIT'
                            );

                            busStopInfo = {
                                stop: nearestBusStop,
                                walkToBusStop: nearestBusStop.walkingDuration,
                                busToStation: busToStation.duration
                            };
                        } catch (e) {
                            console.warn('Failed to get bus stop details:', e);
                        }

                        resolve({
                            name: station.name,
                            location: stationLocation,
                            // Keep backward compatibility
                            walkingDistance: routes.walking?.distance,
                            walkingDuration: routes.walking?.duration,
                            // New: all routes
                            routes: routes,
                            // Bus stop breakdown
                            busStopDetails: busStopInfo,
                            placeId: station.place_id
                        });
                    } catch (e) {
                        resolve({
                            name: station.name,
                            location: stationLocation,
                            placeId: station.place_id
                        });
                    }
                } else {
                    reject(new Error(`No train stations found nearby: ${status}`));
                }
            });
        });
    },

    /**
     * Calculate travel time to Flinders Street Station
     * @param {Object|string} origin - Origin location or address
     * @param {Date} departureTime - Departure time (defaults to next peak hour)
     * @returns {Promise<Object>} Travel information
     */
    async getTravelToFlinders(origin, departureTime = null) {
        const flinders = Config.MELBOURNE.flindersStreet;

        if (!departureTime) {
            departureTime = Utils.getNextPeakTime(Config.PEAK_HOURS.morning);
        }

        const modes = ['TRANSIT', 'DRIVING', 'WALKING'];
        const results = {};

        for (const mode of modes) {
            try {
                results[mode.toLowerCase()] = await this.getDirections(
                    origin,
                    flinders.address,
                    mode,
                    mode === 'TRANSIT' ? departureTime : null
                );
            } catch (e) {
                console.warn(`Failed to get ${mode} directions:`, e);
                results[mode.toLowerCase()] = null;
            }
        }

        return {
            destination: flinders.name,
            departureTime: departureTime.toISOString(),
            routes: results
        };
    },

    /**
     * Get commute options from property to nearest station and to Flinders St
     * @param {string} propertyAddress - Property address
     * @returns {Promise<Object>} Full commute analysis
     */
    async getCommuteAnalysis(propertyAddress) {
        try {
            // Geocode the property
            const propertyLocation = await this.geocodeAddress(propertyAddress);

            // Find nearest train station with all transport modes
            const nearestStation = await this.findNearestTrainStation(propertyLocation);

            // Get travel to Flinders from nearest station
            const stationToFlinders = await this.getTravelToFlinders(nearestStation.location);

            return {
                property: {
                    address: propertyAddress,
                    location: propertyLocation
                },
                nearestStation: nearestStation,
                viaStation: {
                    walkToStation: nearestStation.walkingDuration,
                    stationToFlinders: stationToFlinders.routes.transit,
                    totalMinutes: (nearestStation.walkingDuration?.minutes || 0) +
                                 (stationToFlinders.routes.transit?.duration?.minutes || 0)
                }
            };
        } catch (e) {
            console.error('Commute analysis failed:', e);
            throw e;
        }
    },

    /**
     * Setup address autocomplete on an input element
     * @param {HTMLInputElement} inputElement - Input to attach autocomplete to
     * @param {Function} onSelect - Callback when place is selected
     */
    setupAutocomplete(inputElement, onSelect) {
        if (typeof google === 'undefined' || !google.maps || !google.maps.places) {
            console.warn('Google Maps Places API not loaded');
            return null;
        }

        const autocomplete = new google.maps.places.Autocomplete(inputElement, {
            componentRestrictions: { country: 'AU' },
            bounds: new google.maps.LatLngBounds(
                new google.maps.LatLng(Config.MELBOURNE.bounds.south, Config.MELBOURNE.bounds.west),
                new google.maps.LatLng(Config.MELBOURNE.bounds.north, Config.MELBOURNE.bounds.east)
            ),
            strictBounds: true,
            types: ['address']
        });

        autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace();
            if (place && place.formatted_address) {
                onSelect({
                    address: place.formatted_address,
                    location: {
                        lat: place.geometry.location.lat(),
                        lng: place.geometry.location.lng()
                    },
                    placeId: place.place_id
                });
            }
        });

        return autocomplete;
    }
};

// Make MapsService globally available
window.MapsService = MapsService;
