<template>
    <div class="ww-map" :class="{ inactive: isEditing && !isError }">
        <div class="map-container">
            <div v-if="isError" class="map-placeholder" :class="{ error: isError }">
                <div class="placeholder-content">
                    If you want to use a Google map, you need to have a Google API Key. If you already have one, you can
                    add it in the map settings. <br /><br />
                    Otherwise, you can follow these instructions:
                    <a href="https://developers.google.com/maps/documentation/javascript/get-api-key" target="_blank">
                        <button>API Key documentation</button>
                    </a>
                    <span v-if="wrongKey" class="wrongKey">Your API key has the wrong format</span>
                </div>
            </div>
            <div ref="map" class="map" :class="{ error: isError }"></div>
            <div v-if="tooltipVisible" class="tooltip" :style="{ left: tooltipX + 'px', top: tooltipY + 'px' }">
                {{ tooltipContent }}
            </div>
        </div>
    </div>
</template>

<script>
import { Loader } from './googleLoader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import stylesConfig from './stylesConfig.json';

const DEFAULT_MARKER_FIELDS = {
    name: 'name',
    lat: 'lat',
    lng: 'lng',
    url: 'url',
    width: 'width',
    height: 'height',
};

export default {
    props: {
        wwEditorState: { type: Object, required: true },
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
    },
    emits: ['trigger-event', 'update:content:effect'],
    data() {
        return {
            map: null,
            loader: null,
            wrongKey: false,
            observer: null,
            clusterer: null,
            markerInstances: [],
            currentInfoWindow: null, // Track the currently open InfoWindow
            tooltipVisible: false,
            tooltipContent: '',
            tooltipX: 0,
            tooltipY: 0,
        };
    },
    computed: {
        isEditing() {
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
        },
        isError() {
            return this.content && this.content.googleKey ? !this.isGoogleKeyMatch : true;
        },
        isGoogleKeyMatch() {
            return this.content.googleKey ? this.content.googleKey.match(/^(AIza[0-9A-Za-z-_]{35})$/) : false;
        },
        mapOptions() {
            return {
                center: {
                    lat: parseFloat(this.content.lat || 0),
                    lng: parseFloat(this.content.lng || 0),
                },
                zoom: this.content.zoom,
                styles: this.content.mapStyle === 'custom'
                    ? JSON.parse(this.content.mapStyleJSON.code)
                    : stylesConfig[this.content.mapStyle],
                mapTypeId: this.content.defaultMapType,
                zoomControl: this.content.zoomControl,
                scaleControl: this.content.scaleControl,
                rotateControl: this.content.rotateControl,
                streetViewControl: this.content.streetViewControl,
                fullscreenControl: this.content.fullscreenControl,
                mapTypeControl: this.content.mapTypeControl,
            };
        },
        markers() {
            const fields = {
                name: this.content.nameField || DEFAULT_MARKER_FIELDS.name,
                lat: this.content.latField || DEFAULT_MARKER_FIELDS.lat,
                lng: this.content.lngField || DEFAULT_MARKER_FIELDS.lng,
                url: this.content.urlField || DEFAULT_MARKER_FIELDS.url,
                width: this.content.widthField || DEFAULT_MARKER_FIELDS.width,
                height: this.content.heightField || DEFAULT_MARKER_FIELDS.height,
                city: this.content.cityField || 'city',
                country: this.content.countryField || 'country',
                ownershipType: this.content.ownershipTypeField || 'ownershipType',
                facilityType: this.content.facilityTypeField || 'facilityType',
                phone: this.content.phoneNumberField || 'phone',
                address: this.content.addressField || 'address',
                infoWindowEnabled: this.content.infoWindowEnabled || false,
            };
            if (!Array.isArray(this.content.markers)) return [];
            return this.content.markers.map(marker => ({
                content: wwLib.resolveObjectPropertyPath(marker, fields.name),
                position: {
                    lat: parseFloat(wwLib.resolveObjectPropertyPath(marker, fields.lat) || 0),
                    lng: parseFloat(wwLib.resolveObjectPropertyPath(marker, fields.lng) || 0),
                },
                rawData: marker,
                url: wwLib.resolveObjectPropertyPath(marker, fields.url),
                width: parseInt(wwLib.resolveObjectPropertyPath(marker, fields.width) || 0),
                height: parseInt(wwLib.resolveObjectPropertyPath(marker, fields.height) || 0),
                city: wwLib.resolveObjectPropertyPath(marker, fields.city),
                country: wwLib.resolveObjectPropertyPath(marker, fields.country),
                ownershipType: wwLib.resolveObjectPropertyPath(marker, fields.ownershipType),
                facilityType: wwLib.resolveObjectPropertyPath(marker, fields.facilityType),
                phone: wwLib.resolveObjectPropertyPath(marker, fields.phone),
                address: wwLib.resolveObjectPropertyPath(marker, fields.address),
                infoWindowEnabled: fields.infoWindowEnabled,
            }));
        },
    },
    watch: {
        'content.googleKey': 'reloadMap',
        'content.markers': 'reloadMap',
        'content.zoom'(value) {
            if (this.map) {
                this.map.setZoom(value || 0);
            }
        },
        'content.defaultMapType'(value) {
            if (value === 'satellite') this.$emit('update:content:effect', { mapStyle: null });
        },
        'content.fixedBounds'(value) {
            value ? this.setMapMarkerBounds() : this.initMap();
        },
    },
    mounted() {
        this.initMap();
        this.observer = new IntersectionObserver(changes => {
            if (changes.some(change => change.isIntersecting) && this.content.fixedBounds) {
                this.setMapMarkerBounds();
            }
        }, { trackVisibility: true, delay: 100 });
        this.observer.observe(this.$refs.map);
    },
    beforeUnmount() {
        this.observer.disconnect();
    },
    methods: {
        reloadMap() {
            this.clearOldMarkers();
            this.map = null;
            this.initMap();
        },
        async initMap() {
            const { googleKey } = this.content;
            if (!this.isGoogleKeyMatch) {
                this.wrongKey = googleKey && googleKey.length ? true : false;
                setTimeout(() => { this.wrongKey = false; }, 8000);
                return;
            }
            this.wrongKey = false;
            if (!googleKey.length) return;
            if (!this.loader) {
                this.loader = new Loader({ apiKey: googleKey, language: wwLib.wwLang.lang });
                await this.loader.load();
            }
            try {
                this.map = new google.maps.Map(this.$refs.map, { ...this.mapOptions });
                console.log('Map initialized:', this.map);
                this.updateMapMarkers();
                this.boundaryChanging(); //...M... call new method
            } catch (error) {
                console.error('Error initializing map:', error);
            }
        },
        async updateMapMarkers() {
            this.clearOldMarkers();
            if (!this.markers.length || !this.map) return;

            const markersArray = this.markers.map(marker => {
                const icon = {
                    url: marker.url || this.content.defaultMarkerUrl,
                    scaledSize: new google.maps.Size(marker.width || 32, marker.height || 32),
                };

                const _marker = new google.maps.Marker({
                    position: marker.position,
                    map: this.map,
                    icon: icon,
                    title: marker.content,
                    animation: google.maps.Animation.DROP,
                });

                this.markerInstances.push(_marker);

                const infoContent = this.createInfoWindowContent(marker.rawData);

                const infowindow = new google.maps.InfoWindow({
                    content: infoContent,
                    maxWidth: 200,
                });

                _marker.addListener('click', e => {
                    if (!this.content.infoWindowEnabled) {
                        return;
                    }
                    this.$emit('trigger-event', {
                        name: 'marker:click',
                        event: { marker, domEvent: e.domEvent },
                    });

                    // Close any open InfoWindow before opening a new one
                    if (this.currentInfoWindow) {
                        this.currentInfoWindow.close();
                    }

                    infowindow.setContent(this.createInfoWindowContent(marker.rawData));
                    infowindow.open(this.map, _marker);
                    this.currentInfoWindow = infowindow; // Track the open InfoWindow
                });

                // Tooltip mouseover and mouseout events
                _marker.addListener('mouseover', (e) => {
                    this.tooltipContent = marker.rawData['Name']; // Use marker's name ...M... - uppercase
                    const projection = this.map.getProjection();
                    const position = projection.fromLatLngToPoint(marker.position);
                    this.tooltipX = position.x + 10; // Adjust for better positioning
                    this.tooltipY = position.y - 20; // Adjust for better positioning
                    this.tooltipVisible = false;  //  ...M... - toFalse to remove dot error
                });

                _marker.addListener('mouseout', () => {
                    this.tooltipVisible = false;
                });

                this.setupMarkerEvents(_marker, marker);
                return _marker;
            });

            if (this.clusterer) {
                this.clusterer.clearMarkers();
            }
            this.clusterer = new MarkerClusterer({
                map: this.map,
                markers: markersArray,
                options: { minimumClusterSize: 2 },
            });

            if (this.content.fixedBounds) {
                this.setMapMarkerBounds();
            }
        },
        getFieldName(field) {
            if (typeof field === 'string' && (field.includes('[') || field.includes(']'))) {
                field = field.replace(/[\[\]']/g, '');
                if (field.includes(',')) {
                    return field.split(',')[0].trim();
                }
                return String(field);
            }
            return null;
        },
        createInfoWindowContent(rawData) {
            if (!this.content.infoWindowEnabled) {
                return `<div class="info-window-content"><h3>${rawData['Name']}</h3></div>`;//...M...updated to uppercase
            }

            const fields = {
                city: this.getFieldName(this.content.cityField),
                phone: this.getFieldName(this.content.phoneField),
                country: this.getFieldName(this.content.countryField),
                ownershipType: this.getFieldName(this.content.ownershipTypeField),
                facilityType: this.getFieldName(this.content.facilityTypeField),
                address: this.getFieldName(this.content.addressField),
            };

            let content = `<div class="info-window-content"><h3>${rawData['Name'] || 'Unknown'}</h3>`;//...M...updated to uppercase
            if (fields.phone && rawData[fields.phone]) {
                content += `<p><strong>Phone:</strong> ${rawData[fields.phone]}</p>`;
            }
            if (fields.address && rawData[fields.address]) {
                content += `<p><strong>Address:</strong> ${rawData[fields.address]}</p>`;
            }
            if (fields.city && rawData[fields.city]) {
                content += `<p><strong>City:</strong> ${rawData[fields.city]}</p>`;
            }
            if (fields.country && rawData[fields.country]) {
                content += `<p><strong>Country:</strong> ${rawData[fields.country]}</p>`;
            }
            if (fields.ownershipType && rawData[fields.ownershipType]) {
                content += `<p><strong>Ownership Type:</strong> ${rawData[fields.ownershipType]}</p>`;
            }
            if (fields.facilityType && rawData[fields.facilityType]) {
                content += `<p><strong>Facility Type:</strong> ${rawData[fields.facilityType]}</p>`;
            }

            content += '</div>';
            return content;
        },

        setupMarkerEvents(marker, markerData) {
            marker.addListener('click', () => {
                this.$emit('trigger-event', {
                    name: 'marker:click',
                    event: { marker: markerData },
                });
            });
        },

        //...M...Added this to get access outside of component to change in map view
        boundaryChanging() {
            this.map.addListener("bounds_changed", () => {
            const boundsData = this.map.getBounds();
            boundsData = {"NorthEast":boundsData.getNorthEast(),"SouthWest":boundsData.getSouthWest()};
            // emit values from bounds changing
            this.$emit('trigger-event', {
                    name: 'bounds:change',
                    event: { position: boundsData },
            });
            };
        },
        
        clearOldMarkers() {
            // Close the current InfoWindow if it exists
            if (this.currentInfoWindow) {
                this.currentInfoWindow.close();
                this.currentInfoWindow = null; // Reset it
            }

            // Remove old markers from the map
            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];
            // Reset the clusterer to avoid old clusters being rendered
            if (this.clusterer) {
                this.clusterer.clearMarkers();
                this.clusterer = null;
            }
        },
        setMapMarkerBounds() {
            if (!this.map) {
                console.warn('Map is not initialized yet.');
                return; // Early return if the map is not initialized
            }
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(marker => {
                bounds.extend(marker.position);
            });
            this.map.fitBounds(bounds);
        },
    },
};
</script>

<style scoped>
.ww-map {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
}

.map-container {
    position: absolute;
    width: 100%;
    height: 100%;
}

.map {
    width: 100%;
    height: 100%;
}

.map-placeholder {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
}

.error {
    color: red;
}

.wrongKey {
    color: orange;
}

.tooltip {
    position: absolute;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 5px;
    border-radius: 4px;
    pointer-events: none; /* Prevent mouse events */
}
</style>
