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
import { MarkerClusterer } from '@googlemaps/markerclusterer'; // Import MarkerClusterer
import stylesConfig from './stylesConfig.json';

const DEFAULT_MARKER_NAME_FIELD = 'name';
const DEFAULT_MARKER_LAT_FIELD = 'lat';
const DEFAULT_MARKER_LNG_FIELD = 'lng';
const DEFAULT_MARKER_URL_FIELD = 'url';
const DEFAULT_MARKER_WIDTH_FIELD = 'width';
const DEFAULT_MARKER_HEIGHT_FIELD = 'height';

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
            markerCluster: null, // Initialize markerCluster
            markerInstances: [], // Store marker instances for clustering
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
            const nameField = this.content.nameField || DEFAULT_MARKER_NAME_FIELD;
            const latField = this.content.latField || DEFAULT_MARKER_LAT_FIELD;
            const lngField = this.content.lngField || DEFAULT_MARKER_LNG_FIELD;
            const urlField = this.content.urlField || DEFAULT_MARKER_URL_FIELD;
            const widthField = this.content.widthField || DEFAULT_MARKER_WIDTH_FIELD;
            const heightField = this.content.heightField || DEFAULT_MARKER_HEIGHT_FIELD;

            if (!Array.isArray(this.content.markers)) return [];

            return this.content.markers.map(marker => ({
                content: wwLib.resolveObjectPropertyPath(marker, nameField),
                position: {
                    lat: parseFloat(wwLib.resolveObjectPropertyPath(marker, latField) || 0),
                    lng: parseFloat(wwLib.resolveObjectPropertyPath(marker, lngField) || 0),
                },
                rawData: marker,
                url: wwLib.resolveObjectPropertyPath(marker, urlField),
                width: parseInt(wwLib.resolveObjectPropertyPath(marker, widthField) || 0),
                height: parseInt(wwLib.resolveObjectPropertyPath(marker, heightField) || 0),
            }));
        },
    },
    watch: {
        'content.googleKey'() {
            this.initMap();
        },
        'content.markers'() { // Watch for changes to markers
            this.updateMapMarkers();
        },
        'content.markersIcon'() {
            this.updateMapMarkers();
        },
        'content.markersAutoSize'() {
            this.updateMapMarkers();
        },
        'content.defaultMarkerUrl'() {
            this.updateMapMarkers();
        },
        'content.defaultMarkerWidth'() {
            this.updateMapMarkers();
        },
        'content.defaultMarkerHeight'() {
            this.updateMapMarkers();
        },
        'content.zoom'(value) {
            if (this.map) this.map.setZoom(value || 0);
        },
        'content.defaultMapType'(value) {
            if (value === 'satellite') this.$emit('update:content:effect', { mapStyle: null });
        },
        'content.fixedBounds'(value) {
            value ? this.setMapMarkerBounds() : this.initMap();
        },
        'wwEditorState.boundProps.markers'(isBind) {
            if (!isBind) this.$emit('update:content:effect', { nameField: null, latField: null, lngField: null });
        },
        markers() {
            this.updateMapMarkers();
        },
        mapOptions() {
            this.initMap();
        },
    },
    mounted() {
        this.initMap();

        // Fixed bounds require the map to be visible
        this.observer = new IntersectionObserver(
            changes => {
                if (changes.some(change => change.isIntersecting) && this.content.fixedBounds) {
                    this.setMapMarkerBounds();
                }
            },
            { trackVisibility: true, delay: 100 }
        );
        this.observer.observe(this.$refs.map);
    },
    beforeUnmount() {
        this.observer.disconnect();
    },
    methods: {
        async initMap() {
            const { googleKey } = this.content;
            if (!this.isGoogleKeyMatch) {
                if (googleKey && googleKey.length) this.wrongKey = true;
                setTimeout(() => {
                    this.wrongKey = false;
                }, 8000);
                return;
            }

            this.wrongKey = false;
            if (!googleKey.length) return;

            if (!this.loader) {
                this.loader = new Loader({
                    apiKey: googleKey,
                    language: wwLib.wwLang.lang,
                });
                await this.loader.load();
            }

            try {
                this.map = new google.maps.Map(this.$refs.map, { ...this.mapOptions, zoom: this.content.zoom });
                this.map.addListener('click', mapsMouseEvent => {
                    this.$emit('trigger-event', {
                        name: 'map:click',
                        event: { lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng() },
                    });
                });
                this.updateMapMarkers(); // Call to update markers after map initialization
            } catch (error) {
                wwLib.wwLog.error(error);
            }
        },

        async updateMapMarkers() {
            if (!this.markers || !this.loader) return;

            // Clear existing marker instances
            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];

            // Initialize MarkerClusterer if not already initialized
            if (!this.markerCluster) {
                this.markerCluster = new MarkerClusterer(this.map, [], {
                    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m' // Marker Cluster images path
                });
            }

            // Create and add markers
            this.markerInstances = this.markers.map(marker => {
                const url =
                    marker.url && marker.url.startsWith('designs/')
                        ? `${wwLib.wwUtils.getCdnPrefix()}${marker.url}`
                        : marker.url;
                const defaultMarkerUrl =
                    this.content.defaultMarkerUrl && this.content.defaultMarkerUrl.startsWith('designs/')
                        ? `${wwLib.wwUtils.getCdnPrefix()}${this.content.defaultMarkerUrl}`
                        : this.content.defaultMarkerUrl;

                const _marker = new google.maps.Marker({
                    position: marker.position,
                    map: this.map,
                    icon: this.content.markersIcon
                        ? url
                            ? {
                                url,
                                scaledSize: !this.content.markersAutoSize && marker.width && marker.height
                                    ? new google.maps.Size(marker.width, marker.height)
                                    : undefined,
                              }
                            : {
                                url: defaultMarkerUrl,
                                scaledSize: !this.content.markersAutoSize && this.content.defaultMarkerWidth && this.content.defaultMarkerHeight
                                    ? new google.maps.Size(this.content.defaultMarkerWidth, this.content.defaultMarkerHeight)
                                    : undefined,
                              }
                        : undefined,
                });

                // Create an info window for the marker
                const infoWindow = new google.maps.InfoWindow({
                    content: marker.content,
                });

                // Add click event for the marker
                _marker.addListener('click', () => {
                    infoWindow.open(this.map, _marker);
                });

                return _marker; // Return the marker instance
            });

            // Add markers to the clusterer
            this.markerCluster.addMarkers(this.markerInstances);
        },

        async setMapMarkerBounds() {
            const bounds = new google.maps.LatLngBounds();

            this.markers.forEach(marker => {
                if (marker.position) {
                    bounds.extend(marker.position);
                }
            });

            this.map.fitBounds(bounds);
        },
    },
};
</script>


<style lang="scss" scoped>
.ww-map {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    padding: 20%;
    pointer-events: initial;

    &.inactive {
        pointer-events: none;
    }

    .map-container {
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0;
        left: 0;

        .map {
            z-index: 1;
            height: 100%;
            width: 100%;

            &.error {
                filter: blur(8px);
            }
        }
        .map-placeholder {
            z-index: 2;
            position: absolute;
            top: 0px;
            left: 0px;

            height: 100%;
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;

            &.error {
                background-color: rgba(0, 0, 0, 0.4);
            }

            .placeholder-content {
                text-align: center;
                width: 90%;
                background: white;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 0.8em 1.2em;
                border-radius: 12px;

                .wrongKey {
                    color: #f44336;
                    padding: 10px;
                }

                button {
                    margin-top: 20px;
                    padding: 0.8em 1.2em;
                    border: none;
                    border-radius: 12px;
                    background-color: #099af2;
                    color: white;
                    font-weight: 500;
                    font-size: 1.1em;
                    transition: 0.3s;

                    &:hover {
                        cursor: pointer;
                        background-color: #077ac0;
                        transition: 0.3s;
                    }
                }
            }
        }
    }
}
</style>
