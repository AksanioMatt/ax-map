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
        </div>
    </div>
</template>

<script>
import { Loader } from './googleLoader';
import { MarkerClusterer } from '@googlemaps/markerclusterer';
import { AdvancedMarkerElement } from '@googlemaps/marker'; // Import AdvancedMarkerElement
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
            }));
        },
    },
    watch: {
        'content.googleKey': 'initMap',
        'content.markers': 'updateMapMarkers', // Update markers when content changes
        'content.zoom'(value) {
            if (this.map) {
                this.map.setZoom(value || 0);
                this.updateMarkerVisibility();
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
                this.map = new google.maps.Map(this.$refs.map, { ...this.mapOptions, zoom: this.content.zoom });
                this.updateMapMarkers(); // Ensure markers are updated on map initialization
                this.updateMarkerVisibility();
            } catch (error) {
                wwLib.wwLog.error(error);
            }
        },
        async updateMapMarkers() {
            // Clear previous markers and clusterer
            this.clearOldMarkers();

            if (!this.markers.length) return;

            // Create and store new markers
            const markersArray = this.markers.map(marker => {
                const markerOptions = {
                    position: marker.position,
                    map: this.map,
                    title: marker.content,
                    // Custom icon handling
                    icon: this.getMarkerIcon(marker),
                };

                const advancedMarker = new AdvancedMarkerElement(markerOptions); // Use AdvancedMarkerElement
                this.markerInstances.push(advancedMarker);

                this.setupMarkerEvents(advancedMarker, marker);
                return advancedMarker;
            });

            // Initialize MarkerClusterer
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

        getMarkerIcon(marker) {
            const url = marker.url && marker.url.startsWith('designs/')
                ? `${wwLib.wwUtils.getCdnPrefix()}${marker.url}`
                : marker.url;

            const defaultMarkerUrl = this.content.defaultMarkerUrl && this.content.defaultMarkerUrl.startsWith('designs/')
                ? `${wwLib.wwUtils.getCdnPrefix()}${this.content.defaultMarkerUrl}`
                : this.content.defaultMarkerUrl;

            if (this.content.markersIcon) {
                return url ? {
                    url,
                    scaledSize: !this.content.markersAutoSize && marker.width && marker.height
                        ? new google.maps.Size(marker.width, marker.height)
                        : undefined,
                } : {
                    url: defaultMarkerUrl,
                    scaledSize: !this.content.markersAutoSize && this.content.defaultMarkerWidth && this.content.defaultMarkerHeight
                        ? new google.maps.Size(this.content.defaultMarkerWidth, this.content.defaultMarkerHeight)
                        : undefined,
                };
            }
            return null;
        },

        setupMarkerEvents(marker, markerData) {
            marker.addListener('mouseover', e => {
                this.$emit('trigger-event', {
                    name: 'marker:mouseover',
                    event: { marker: markerData, domEvent: e.domEvent },
                });
                if (this.content.markerTooltipTrigger === 'hover' && markerData.content) {
                    marker.open(this.map, marker);
                }
            });

            marker.addListener('mouseout', e => {
                this.$emit('trigger-event', {
                    name: 'marker:mouseout',
                    event: { marker: markerData, domEvent: e.domEvent },
                });
                if (this.content.markerTooltipTrigger === 'hover') {
                    marker.close();
                }
            });

            marker.addListener('click', e => {
                this.$emit('trigger-event', {
                    name: 'marker:click',
                    event: { marker: markerData, domEvent: e.domEvent },
                });
                if (this.content.markerTooltipTrigger === 'click' && markerData.content) {
                    marker.open(this.map, marker);
                }
            });
        },

        clearOldMarkers() {
            // Clear the existing markers from the map
            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];

            // Clear the existing clusterer if it exists
            if (this.clusterer) {
                this.clusterer.clearMarkers();
                this.clusterer = null; // Remove reference to old clusterer
            }
        },

        setMapMarkerBounds() {
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(marker => {
                bounds.extend(marker.position);
            });
            this.map.fitBounds(bounds);
        },

        updateMarkerVisibility() {
            // Implementation for marker visibility logic if needed
        },
    },
};
</script>

<style scoped>
.ww-map {
    position: relative;
}
.map-container {
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
</style>
