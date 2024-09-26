<template>
    <div class="ww-map" :class="{ inactive: isEditing && !isError }">
        <div class="map-container">
            <div v-if="isError" class="map-placeholder" :class="{ error: isError }">
                <div class="placeholder-content">
                    If you want to use a Google map, you need to have a Google API Key. If you already have one, you can
                    add it in the map settings. <br /><br />
                    Otherwise you can follow these instructions:
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
import stylesConfig from './stylesConfig.json';

const DEFAULT_MARKER_NAME_FIELD = 'name';
const DEFAULT_MARKER_LAT_FIELD = 'lat';
const DEFAULT_MARKER_LNG_FIELD = 'lng';
const DEFAULT_MARKER_URL_FIELD = 'url';
const DEFAULT_MARKER_WIDTH_FIELD = 'width';
const DEFAULT_MARKER_HEIGHT_FIELD = 'height';

export default {
    props: {
        /* wwEditor:start */
        wwEditorState: { type: Object, required: true },
        /* wwEditor:end */
        content: { type: Object, required: true },
        wwElementState: { type: Object, required: true },
    },
    emits: ['trigger-event', 'update:content:effect'],
    setup() {
        const markerInstances = [];
        return { markerInstances };
    },
    data() {
        return {
            map: null,
            loader: null,
            wrongKey: false,
            observer: null,
            clusterer: null,
        };
    },
    computed: {
        isEditing() {
            /* wwEditor:start */
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
            /* wwEditor:end */
            return false;
        },
        isError() {
            if (this.content && this.content.googleKey) {
                return !this.isGoogleKeyMatch;
            }
            return true;
        },
        isGoogleKeyMatch() {
            if (this.content.googleKey) {
                return this.content.googleKey.match(/^(AIza[0-9A-Za-z-_]{35})$/);
            }
            return false;
        },
        mapOptions() {
            return {
                center: {
                    lat: parseFloat(this.content.lat || 0),
                    lng: parseFloat(this.content.lng || 0),
                },
                zoom: this.content.zoom,
                styles:
                    this.content.mapStyle === 'custom'
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
        /* wwEditor:start */
        'content.googleKey'() {
            this.initMap();
        },
        'content.markersIcon'() {
            this.initMap();
        },
        'content.markersAutoSize'() {
            this.initMap();
        },
        'content.defaultMarkerUrl'() {
            this.initMap();
        },
        'content.defaultMarkerWidth'() {
            this.initMap();
        },
        'content.defaultMarkerHeight'() {
            this.initMap();
        },
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
        'wwEditorState.boundProps.markers'(isBind) {
            if (!isBind) this.$emit('update:content:effect', { nameField: null, latField: null, lngField: null });
        },
        /* wwEditor:end */
        markers() {
            this.updateMapMarkers();
        },
        mapOptions() {
            this.initMap();
        },
    },
    mounted() {
        this.initMap();
        google.maps.event.addListener(this.map, 'zoom_changed', () => {
            this.updateMarkerVisibility();
        });

        // Fixed bound require the map to be visible
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
                    mapsMouseEvent.latLng.lat = mapsMouseEvent.latLng.lat();
                    mapsMouseEvent.latLng.lng = mapsMouseEvent.latLng.lng();
                    this.$emit('trigger-event', {
                        name: 'map:click',
                        event: { ...mapsMouseEvent },
                    });
                });
                this.updateMapMarkers();
                this.updateMarkerVisibility();
            } catch (error) {
                wwLib.wwLog.error(error);
            }
        },
        async updateMapMarkers() {
            if (!this.markers || !this.loader) return;

            // Clear existing markers from the map
            this.markerInstances.forEach(markerInstance => {
                markerInstance.setMap(null); // Remove from the map
            });
            this.markerInstances = []; // Clear the markerInstances array

            // Reset the clusterer
            if (this.clusterer) {
                this.clusterer.clearMarkers();
            } else {
                this.clusterer = new MarkerClusterer({
                    map: this.map,
                    options: {
                        minimumClusterSize: 2,
                    },
                });
            }

            // Create new markers
            const markersArray = this.markers.map(marker => {
                try {
                    const url = marker.url && marker.url.startsWith('designs/')
                        ? `${wwLib.wwUtils.getCdnPrefix()}${marker.url}`
                        : marker.url;
                    const defaultMarkerUrl = this.content.defaultMarkerUrl && this.content.defaultMarkerUrl.startsWith('designs/')
                        ? `${wwLib.wwUtils.getCdnPrefix()}${this.content.defaultMarkerUrl}`
                        : this.content.defaultMarkerUrl;

                    const _marker = new google.maps.Marker({
                        position: marker.position,
                        map: this.map, // Set on the map initially
                        icon: this.content.markersIcon
                            ? url
                                ? {
                                    url,
                                    scaledSize: !this.content.markersAutoSize && marker.width && marker.height
                                        ? new google.maps.Size(marker.width, marker.height)
                                        : !this.content.markersAutoSize && this.content.defaultMarkerWidth && this.content.defaultMarkerHeight
                                            ? new google.maps.Size(this.content.defaultMarkerWidth, this.content.defaultMarkerHeight)
                                            : undefined,
                                }
                                : {
                                    url: defaultMarkerUrl,
                                    scaledSize: !this.content.markersAutoSize && this.content.defaultMarkerWidth && this.content.defaultMarkerHeight
                                        ? new google.maps.Size(this.content.defaultMarkerWidth, this.content.defaultMarkerHeight)
                                        : undefined,
                                }
                            : {},
                        animation: google.maps.Animation.DROP,
                    });

                    // Add the new marker to markerInstances
                    this.markerInstances.push(_marker);

                    // Set up InfoWindow and event listeners...
                    // (keep the existing InfoWindow and event listener code here)

                    return _marker;
                } catch (error) {
                    console.error('Error creating marker:', error);
                    return null; // Return null for error handling
                }
            }).filter(Boolean); // Filter out any null markers

            // Add markers to the clusterer
            this.clusterer.addMarkers(markersArray);

            // Adjust marker visibility based on zoom level
            this.updateMarkerVisibility();
        },

        updateMarkerVisibility() {
            const zoomLevel = this.map.getZoom();
            const showMarkers = zoomLevel >= 15; // Adjust the threshold as needed

            this.markerInstances.forEach(marker => {
                marker.setMap(showMarkers && !this.clusterer.getClusters().some(cluster => cluster.getMarkers().includes(marker)) ? this.map : null);
            });
        },
        setMapMarkerBounds() {
            if (!this.map || this.markers.length < 2) return;
            const mapBounds = new google.maps.LatLngBounds();
            for (const marker of this.markers) {
                mapBounds.extend(marker.position);
            }
            this.map.fitBounds(mapBounds);
        },
        /* wwEditor:start */
        getMarkerTestEvent() {
            if (!this.markers.length) throw new Error('No markers found');
            return { marker: this.markers[0], domEvent: { x: 128, y: 156, target: null } };
        },
        /* wwEditor:end */
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

        .map-iframe {
            width: 100%;
            height: 100%;
        }

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
