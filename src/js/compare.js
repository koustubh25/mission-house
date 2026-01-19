/**
 * Property Comparison Service for Mission House app
 * Handles radar chart visualization and multi-property comparison
 */
const CompareService = {
    selectedProperties: [],
    chart: null,
    maxSelection: 4,
    properties: [],

    // Chart colors for up to 4 properties
    chartColors: [
        { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)' },     // Blue
        { bg: 'rgba(239, 68, 68, 0.2)', border: 'rgb(239, 68, 68)' },       // Red
        { bg: 'rgba(34, 197, 94, 0.2)', border: 'rgb(34, 197, 94)' },       // Green
        { bg: 'rgba(251, 146, 60, 0.2)', border: 'rgb(251, 146, 60)' }      // Orange
    ],

    /**
     * Initialize the comparison page
     */
    async init() {
        console.log('Initializing CompareService...');
        await this.loadProperties();
        this.renderPropertySelector();
        this.setupEventListeners();
    },

    /**
     * Load properties from the database
     */
    async loadProperties() {
        try {
            const response = await fetch('src/data/houses.json');
            const data = await response.json();
            this.properties = data.properties || [];
            console.log(`Loaded ${this.properties.length} properties`);
        } catch (error) {
            console.error('Failed to load properties:', error);
            Utils.showToast('Failed to load properties', 'error');
            this.properties = [];
        }
    },

    /**
     * Render property selector checkboxes
     */
    renderPropertySelector() {
        const container = document.getElementById('property-selector');
        if (!container) return;

        container.innerHTML = '';

        if (this.properties.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No properties in database. Add properties using the Data Entry page.</p>
                </div>
            `;
            return;
        }

        this.properties.forEach((property, index) => {
            const checkbox = Utils.createElement('div', {
                className: 'property-checkbox'
            }, [
                Utils.createElement('input', {
                    type: 'checkbox',
                    id: `property-${index}`,
                    value: index,
                    dataset: { propertyId: property.id }
                }),
                Utils.createElement('label', {
                    for: `property-${index}`,
                    className: 'property-label'
                }, [
                    Utils.createElement('div', { className: 'property-address' }, property.address),
                    Utils.createElement('div', { className: 'property-details' },
                        `${property.rooms.bedrooms} bed, ${property.rooms.bathrooms} bath | ${Utils.formatPriceRange(property.price.min, property.price.max)}`
                    )
                ])
            ]);

            container.appendChild(checkbox);
        });
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        const container = document.getElementById('property-selector');
        if (!container) return;

        container.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handlePropertySelection(e.target);
            }
        });
    },

    /**
     * Handle property selection
     */
    handlePropertySelection(checkbox) {
        const index = parseInt(checkbox.value);

        if (checkbox.checked) {
            if (this.selectedProperties.length >= this.maxSelection) {
                checkbox.checked = false;
                Utils.showToast(`You can only select up to ${this.maxSelection} properties`, 'error');
                return;
            }
            this.selectedProperties.push(index);
        } else {
            this.selectedProperties = this.selectedProperties.filter(i => i !== index);
        }

        this.updateSelectionCount();
        this.updateComparison();
    },

    /**
     * Update selection count display
     */
    updateSelectionCount() {
        const countEl = document.getElementById('selection-count');
        if (countEl) {
            countEl.textContent = `${this.selectedProperties.length} of ${this.maxSelection} properties selected`;
        }
    },

    /**
     * Update the comparison chart and table
     */
    async updateComparison() {
        const chartSection = document.getElementById('comparison-chart-section');
        const noSelection = document.getElementById('no-properties-selected');

        if (this.selectedProperties.length < 2) {
            chartSection?.classList.add('hidden');
            noSelection?.classList.remove('hidden');
            return;
        }

        chartSection?.classList.remove('hidden');
        noSelection?.classList.add('hidden');

        await this.calculateMetrics();
        this.renderChart();
        this.renderMetricsTable();
    },

    /**
     * Calculate metrics for selected properties using real API calls
     */
    async calculateMetrics() {
        this.metrics = [];

        console.log('=== METRICS CALCULATION START ===');
        console.log('Google Maps available?', typeof google !== 'undefined' && google.maps);
        console.log('MapsService loaded?', MapsService.isLoaded);
        console.log('API Key set?', !!localStorage.getItem('googleMapsApiKey'));

        // Show loading state
        const chartSection = document.getElementById('comparison-chart-section');
        if (chartSection) {
            const existingLoader = chartSection.querySelector('.metrics-loader');
            if (!existingLoader) {
                const loader = document.createElement('div');
                loader.className = 'metrics-loader';
                loader.innerHTML = '<div class="loading">Calculating metrics using Google Maps API...</div>';
                chartSection.insertBefore(loader, chartSection.firstChild);
            }
        }

        for (const index of this.selectedProperties) {
            const property = this.properties[index];

            console.log(`Calculating metrics for: ${property.address}`);

            try {
                // Initialize metrics with basic property data
                const metrics = {
                    bedrooms: property.rooms?.bedrooms || 2,
                    bathrooms: property.rooms?.bathrooms || 1,
                    area: property.floorPlan?.landSize || 150,
                    price: property.price?.min && property.price?.max
                        ? (property.price.min + property.price.max) / 2
                        : (property.price?.min || property.price?.max || 1000000),
                    flindersCommute: null,
                    walkToStation: null,
                    driveToStation: null,
                    primarySchoolDist: null,
                    secondarySchoolDist: null,
                    // NAPLAN scores (higher is better)
                    // Primary: prefer year5, fallback to year3
                    // Secondary: prefer year9, fallback to year7
                    primaryNaplanReading: (property.schools?.primary?.naplan?.year5?.reading || property.schools?.primary?.naplan?.year3?.reading) || null,
                    primaryNaplanNumeracy: (property.schools?.primary?.naplan?.year5?.numeracy || property.schools?.primary?.naplan?.year3?.numeracy) || null,
                    secondaryNaplanReading: (property.schools?.secondary?.naplan?.year9?.reading || property.schools?.secondary?.naplan?.year7?.reading) || null,
                    secondaryNaplanNumeracy: (property.schools?.secondary?.naplan?.year9?.numeracy || property.schools?.secondary?.naplan?.year7?.numeracy) || null,
                    // NAPLAN quality scores (higher is better, 100 = benchmark)
                    primaryNaplanQuality: property.schools?.primary?.naplan?.quality || null,
                    secondaryNaplanQuality: property.schools?.secondary?.naplan?.quality || null
                };

                // Ensure MapsService is initialized
                if (!MapsService.isLoaded) {
                    await MapsService.init();
                }

                if (MapsService.isLoaded) {
                    try {
                        console.log(`🔍 Geocoding: ${property.address}`);
                        const propertyLocation = await MapsService.geocodeAddress(property.address);
                        console.log(`✓ Geocoded to:`, propertyLocation);

                        // Find nearest train station and get walking/driving times
                        console.log(`🚂 Finding nearest train station...`);
                        const stationInfo = await MapsService.findNearestTrainStation(propertyLocation);
                        console.log(`✓ Station found:`, stationInfo.name);
                        console.log(`  Walking: ${stationInfo.routes?.walking?.duration?.minutes} min`);
                        console.log(`  Driving: ${stationInfo.routes?.driving?.duration?.minutes} min`);

                        metrics.walkToStation = stationInfo.routes?.walking?.duration?.minutes || null;
                        metrics.driveToStation = stationInfo.routes?.driving?.duration?.minutes || null;

                        // Get transit time to Flinders Street
                        console.log(`🏛️ Getting route to Flinders Street...`);
                        const flindersRoute = await MapsService.getTravelToFlinders(property.address);
                        console.log(`✓ Flinders route:`, flindersRoute.routes?.transit?.duration?.minutes, 'min');
                        metrics.flindersCommute = flindersRoute.routes?.transit?.duration?.minutes || null;

                        // Calculate distances to schools
                        if (property.schools?.primary?.address) {
                            console.log(`🏫 Primary school: ${property.schools.primary.address}`);
                            const primaryRoute = await MapsService.getDirections(
                                property.address,
                                property.schools.primary.address,
                                'WALKING'
                            );
                            const distKm = primaryRoute.distance.meters / 1000;
                            console.log(`✓ Primary school distance: ${distKm.toFixed(2)} km`);
                            metrics.primarySchoolDist = distKm;
                        } else {
                            console.log(`⚠️ No primary school address available`);
                        }

                        if (property.schools?.secondary?.address) {
                            console.log(`🏫 Secondary school: ${property.schools.secondary.address}`);
                            const secondaryRoute = await MapsService.getDirections(
                                property.address,
                                property.schools.secondary.address,
                                'WALKING'
                            );
                            const distKm = secondaryRoute.distance.meters / 1000;
                            console.log(`✓ Secondary school distance: ${distKm.toFixed(2)} km`);
                            metrics.secondarySchoolDist = distKm;
                        } else {
                            console.log(`⚠️ No secondary school address available`);
                        }

                        console.log(`✅ All metrics calculated for ${property.address}:`, metrics);
                    } catch (apiError) {
                        console.error(`❌ API error for ${property.address}:`, apiError);
                        console.error('Error details:', apiError.message, apiError.stack);
                        // Use fallback values if API fails
                        metrics.flindersCommute = 40;
                        metrics.walkToStation = 15;
                        metrics.driveToStation = 5;
                        metrics.primarySchoolDist = 1.5;
                        metrics.secondarySchoolDist = 2.5;
                        console.log(`⚠️ Using fallback values for ${property.address}`);
                    }
                } else {
                    console.warn('⚠️ MapsService not available, using fallback values');
                    console.log('Is Google Maps loaded?', typeof google !== 'undefined');
                    console.log('API Key configured?', localStorage.getItem('googleMapsApiKey') ? 'Yes' : 'No');
                    // Fallback values when Maps API is not available
                    metrics.flindersCommute = 40;
                    metrics.walkToStation = 15;
                    metrics.driveToStation = 5;
                    metrics.primarySchoolDist = 1.5;
                    metrics.secondarySchoolDist = 2.5;
                }

                this.metrics.push(metrics);
            } catch (error) {
                console.error(`Error calculating metrics for ${property.address}:`, error);
                // Push default metrics on error
                this.metrics.push({
                    bedrooms: property.rooms?.bedrooms || 2,
                    bathrooms: property.rooms?.bathrooms || 1,
                    area: property.floorPlan?.landSize || 150,
                    price: property.price?.min && property.price?.max
                        ? (property.price.min + property.price.max) / 2
                        : 1000000,
                    flindersCommute: 40,
                    walkToStation: 15,
                    driveToStation: 5,
                    primarySchoolDist: 1.5,
                    secondarySchoolDist: 2.5
                });
            }
        }

        // Remove loading state
        const loader = document.querySelector('.metrics-loader');
        if (loader) {
            loader.remove();
        }

        console.log('All metrics calculated:', this.metrics);
    },

    /**
     * Normalize metrics for radar chart (0-100 scale)
     */
    normalizeMetrics() {
        if (!this.metrics || this.metrics.length === 0) return [];

        const metricKeys = ['bedrooms', 'bathrooms', 'area', 'price', 'flindersCommute',
                           'walkToStation', 'driveToStation', 'primarySchoolDist', 'secondarySchoolDist',
                           'primaryNaplanReading', 'primaryNaplanNumeracy', 'secondaryNaplanReading', 'secondaryNaplanNumeracy',
                           'primaryNaplanQuality', 'secondaryNaplanQuality'];

        const normalized = this.selectedProperties.map(() => ({}));

        metricKeys.forEach(key => {
            const values = this.metrics.map(m => {
                const val = m[key];
                // Ensure we have valid numeric values, use reasonable defaults for nulls
                if (val !== null && val !== undefined && !isNaN(val)) {
                    return val;
                }
                // Provide sensible defaults for each metric when API data is unavailable
                const defaults = {
                    bedrooms: 3, bathrooms: 2, area: 200, price: 1100000,
                    flindersCommute: 45, walkToStation: 15, driveToStation: 5,
                    primarySchoolDist: 1.5, secondarySchoolDist: 2.0,
                    primaryNaplanReading: 500, primaryNaplanNumeracy: 500,
                    secondaryNaplanReading: 550, secondaryNaplanNumeracy: 550,
                    primaryNaplanQuality: 100, secondaryNaplanQuality: 100
                };
                return defaults[key] || 0;
            });

            const min = Math.min(...values);
            const max = Math.max(...values);
            const range = max - min;

            // Metrics where HIGHER values are BETTER (bedrooms, bathrooms, area, NAPLAN scores, quality)
            // These need to be INVERTED so better (higher) values are CLOSER to center (inner)
            const higherIsBetter = ['bedrooms', 'bathrooms', 'area',
                                    'primaryNaplanReading', 'primaryNaplanNumeracy',
                                    'secondaryNaplanReading', 'secondaryNaplanNumeracy',
                                    'primaryNaplanQuality', 'secondaryNaplanQuality'].includes(key);

            values.forEach((value, i) => {
                // If all values are the same, set to middle of visible range
                if (range === 0) {
                    normalized[i][key] = 60;  // Middle of 20-100 range
                } else {
                    // Normalize to 20-100 range
                    // INVERTED LOGIC: Better values are CLOSER to center (inner = more desirable)
                    const normalizedValue = ((value - min) / range);

                    if (higherIsBetter) {
                        // INVERT: higher actual value = lower chart value = closer to center (better)
                        // Best (highest) = 20 (inner), Worst (lowest) = 100 (outer)
                        normalized[i][key] = Math.round(20 + (1 - normalizedValue) * 80);
                    } else {
                        // DIRECT: lower actual value = lower chart value = closer to center (better)
                        // For price, time, distance: Best (lowest) = 20 (inner), Worst (highest) = 100 (outer)
                        normalized[i][key] = Math.round(20 + normalizedValue * 80);
                    }
                }
            });
        });

        // Log each property's normalized values
        normalized.forEach((norm, i) => {
            console.log(`Property ${i + 1} normalized:`, norm);
        });

        console.log('Normalized metrics:', normalized);
        return normalized;
    },

    /**
     * Render the radar chart
     */
    renderChart() {
        const canvas = document.getElementById('comparison-chart');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        const normalized = this.normalizeMetrics();

        console.log('=== CHART RENDERING DEBUG ===');
        console.log('Number of selected properties:', this.selectedProperties.length);
        console.log('Selected property indices:', this.selectedProperties);
        console.log('Raw metrics:', this.metrics);
        console.log('Normalized data:', normalized);

        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }

        const datasets = this.selectedProperties.map((propIndex, i) => {
            const property = this.properties[propIndex];
            const color = this.chartColors[i];
            const metrics = normalized[i];

            // Ensure we have all 15 values in the correct order matching the labels
            // Default to 60 (middle of 20-100 range) for any missing values
            const dataArray = [
                typeof metrics.bedrooms === 'number' ? metrics.bedrooms : 60,
                typeof metrics.bathrooms === 'number' ? metrics.bathrooms : 60,
                typeof metrics.area === 'number' ? metrics.area : 60,
                typeof metrics.price === 'number' ? metrics.price : 60,
                typeof metrics.flindersCommute === 'number' ? metrics.flindersCommute : 60,
                typeof metrics.walkToStation === 'number' ? metrics.walkToStation : 60,
                typeof metrics.driveToStation === 'number' ? metrics.driveToStation : 60,
                typeof metrics.primarySchoolDist === 'number' ? metrics.primarySchoolDist : 60,
                typeof metrics.secondarySchoolDist === 'number' ? metrics.secondarySchoolDist : 60,
                typeof metrics.primaryNaplanReading === 'number' ? metrics.primaryNaplanReading : 60,
                typeof metrics.primaryNaplanNumeracy === 'number' ? metrics.primaryNaplanNumeracy : 60,
                typeof metrics.secondaryNaplanReading === 'number' ? metrics.secondaryNaplanReading : 60,
                typeof metrics.secondaryNaplanNumeracy === 'number' ? metrics.secondaryNaplanNumeracy : 60,
                typeof metrics.primaryNaplanQuality === 'number' ? metrics.primaryNaplanQuality : 60,
                typeof metrics.secondaryNaplanQuality === 'number' ? metrics.secondaryNaplanQuality : 60
            ];

            console.log(`Property ${i + 1} (${property.address}):`, {
                address: property.address,
                dataArray: dataArray,
                metricsObject: metrics
            });

            // Verify we have exactly 15 data points
            if (dataArray.length !== 15) {
                console.error(`ERROR: Property ${i + 1} has ${dataArray.length} data points instead of 15!`);
            }

            return {
                label: `Property ${i + 1}`,
                data: dataArray,
                backgroundColor: color.bg,
                borderColor: color.border,
                borderWidth: 3,
                pointBackgroundColor: color.border,
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: color.border,
                pointRadius: 6,
                pointHoverRadius: 8,
                fill: true,
                spanGaps: false  // Don't skip null values
            };
        });

        console.log('Creating chart with', datasets.length, 'datasets');

        // Validate each dataset
        datasets.forEach((ds, idx) => {
            console.log(`Dataset ${idx + 1} validation:`, {
                label: ds.label,
                dataLength: ds.data.length,
                data: ds.data,
                allNumbersValid: ds.data.every(v => typeof v === 'number' && !isNaN(v))
            });
        });

        const chartLabels = [
            'Bedrooms',
            'Bathrooms',
            'Area (m²)',
            'Price',
            'Flinders St Commute',
            'Walk to Station',
            'Drive to Station',
            'Primary School Dist',
            'Secondary School Dist',
            'Primary NAPLAN Reading',
            'Primary NAPLAN Numeracy',
            'Secondary NAPLAN Reading',
            'Secondary NAPLAN Numeracy',
            'Primary School Quality',
            'Secondary School Quality'
        ];

        console.log('Chart has', chartLabels.length, 'labels and each dataset should have', chartLabels.length, 'data points');

        this.chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: chartLabels,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        min: 0,
                        ticks: {
                            stepSize: 25,
                            callback: function(value) {
                                return value;
                            },
                            backdropColor: 'transparent',
                            color: '#94a3b8',
                            font: {
                                size: 11
                            },
                            showLabelBackdrop: false,
                            z: 1
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.15)',
                            circular: true,
                            lineWidth: 1
                        },
                        angleLines: {
                            color: 'rgba(255, 255, 255, 0.2)',
                            lineWidth: 1
                        },
                        pointLabels: {
                            color: '#e5e7eb',
                            font: {
                                size: 13,
                                weight: '600',
                                family: "'Inter', sans-serif"
                            },
                            padding: 20,
                            centerPointLabels: false
                        }
                    }
                },
                plugins: {
                    legend: false,  // Completely disable the legend plugin
                    tooltip: {
                        enabled: true,
                        backgroundColor: 'rgba(17, 24, 39, 0.95)',
                        titleColor: '#f3f4f6',
                        bodyColor: '#e5e7eb',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            title: (context) => {
                                // Show the metric name as title
                                return context[0].label;
                            },
                            label: (context) => {
                                const propIndex = this.selectedProperties[context.datasetIndex];
                                const metricIndex = context.dataIndex;
                                const actualValue = this.getActualMetricValue(propIndex, metricIndex);
                                return `${context.dataset.label}: ${actualValue}`;
                            }
                        }
                    }
                },
                layout: {
                    padding: {
                        top: 20,
                        bottom: 20,
                        left: 20,
                        right: 20
                    }
                }
            }
        });

        this.renderLegend();
    },

    /**
     * Get actual metric value (not normalized)
     */
    getActualMetricValue(propIndex, metricIndex) {
        const metrics = this.metrics[this.selectedProperties.indexOf(propIndex)];
        const metricKeys = ['bedrooms', 'bathrooms', 'area', 'price', 'flindersCommute',
                           'walkToStation', 'driveToStation', 'primarySchoolDist', 'secondarySchoolDist',
                           'primaryNaplanReading', 'primaryNaplanNumeracy', 'secondaryNaplanReading', 'secondaryNaplanNumeracy',
                           'primaryNaplanQuality', 'secondaryNaplanQuality'];
        const key = metricKeys[metricIndex];
        const value = metrics[key];

        switch (key) {
            case 'price':
                return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(value);
            case 'area':
                return `${value} m²`;
            case 'flindersCommute':
            case 'walkToStation':
            case 'driveToStation':
                return Utils.formatDuration(value);
            case 'primarySchoolDist':
            case 'secondarySchoolDist':
                return Utils.formatDistance(value * 1000); // Convert km to meters
            case 'primaryNaplanReading':
            case 'primaryNaplanNumeracy':
            case 'secondaryNaplanReading':
            case 'secondaryNaplanNumeracy':
                return value !== null ? value.toString() : 'N/A';
            case 'primaryNaplanQuality':
            case 'secondaryNaplanQuality':
                return value !== null ? `${value}%` : 'N/A';
            default:
                return value;
        }
    },

    /**
     * Render custom legend
     */
    renderLegend() {
        const legendContainer = document.getElementById('chart-legend');
        if (!legendContainer) return;

        legendContainer.innerHTML = '';

        this.selectedProperties.forEach((propIndex, i) => {
            const property = this.properties[propIndex];
            const color = this.chartColors[i];

            const legendItem = Utils.createElement('div', {
                className: 'legend-item'
            }, [
                Utils.createElement('div', {
                    className: 'legend-color',
                    style: { backgroundColor: color.border }
                }),
                Utils.createElement('div', {
                    className: 'legend-text'
                }, `Property ${i + 1}: ${property.address}`)
            ]);

            legendContainer.appendChild(legendItem);
        });
    },

    /**
     * Render detailed metrics table
     */
    renderMetricsTable() {
        const table = document.getElementById('metrics-table');
        if (!table) return;

        const metricLabels = [
            { key: 'bedrooms', label: 'Bedrooms', format: (v) => v },
            { key: 'bathrooms', label: 'Bathrooms', format: (v) => v },
            { key: 'area', label: 'Area', format: (v) => `${v} m²` },
            { key: 'price', label: 'Price (Midpoint)', format: (v) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', minimumFractionDigits: 0 }).format(v) },
            { key: 'flindersCommute', label: 'Flinders St Commute', format: (v) => Utils.formatDuration(v) },
            { key: 'walkToStation', label: 'Walk to Station', format: (v) => Utils.formatDuration(v) },
            { key: 'driveToStation', label: 'Drive to Station', format: (v) => Utils.formatDuration(v) },
            { key: 'primarySchoolDist', label: 'Primary School Distance', format: (v) => Utils.formatDistance(v * 1000) },
            { key: 'secondarySchoolDist', label: 'Secondary School Distance', format: (v) => Utils.formatDistance(v * 1000) },
            { key: 'primaryNaplanReading', label: 'Primary NAPLAN Reading', format: (v) => v !== null ? v : 'N/A' },
            { key: 'primaryNaplanNumeracy', label: 'Primary NAPLAN Numeracy', format: (v) => v !== null ? v : 'N/A' },
            { key: 'secondaryNaplanReading', label: 'Secondary NAPLAN Reading', format: (v) => v !== null ? v : 'N/A' },
            { key: 'secondaryNaplanNumeracy', label: 'Secondary NAPLAN Numeracy', format: (v) => v !== null ? v : 'N/A' },
            { key: 'primaryNaplanQuality', label: 'Primary School Quality', format: (v) => v !== null ? `${v}%` : 'N/A' },
            { key: 'secondaryNaplanQuality', label: 'Secondary School Quality', format: (v) => v !== null ? `${v}%` : 'N/A' }
        ];

        // Build table header
        let html = '<thead><tr><th>Metric</th>';
        this.selectedProperties.forEach((propIndex, i) => {
            html += `<th style="color: ${this.chartColors[i].border}">Property ${i + 1}</th>`;
        });
        html += '</tr></thead><tbody>';

        // Build table rows
        metricLabels.forEach(({ key, label, format }) => {
            html += `<tr><td class="metric-label">${label}</td>`;
            this.selectedProperties.forEach((propIndex) => {
                const metrics = this.metrics[this.selectedProperties.indexOf(propIndex)];
                html += `<td>${format(metrics[key])}</td>`;
            });
            html += '</tr>';
        });

        html += '</tbody>';
        table.innerHTML = html;
    },

    /**
     * Reset comparison
     */
    reset() {
        this.selectedProperties = [];
        this.metrics = [];

        // Uncheck all checkboxes
        document.querySelectorAll('#property-selector input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        this.updateSelectionCount();
        this.updateComparison();
    }
};

// Make CompareService globally available
window.CompareService = CompareService;
