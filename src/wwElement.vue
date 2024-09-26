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
            clusterer: null,
            markerInstances: [],
        };
    },
    computed: {
        isEditing() {
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
        },
        isError() {
            return !this.isGoogleKeyMatch || !this.content || !this.content.googleKey;
        },
        isGoogleKeyMatch() {
            return this.content.googleKey && this.content.googleKey.match(/^(AIza[0-9A-Za-z-_]{35})$/);
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
        'content.markers'() {
            this.updateMapMarkers();
        },
        mapOptions() {
            this.initMap();
        },
    },
    mounted() {
        this.$nextTick(() => {
            this.initMap();
            this.observer = new IntersectionObserver(changes => {
                if (changes.some(change => change.isIntersecting) && this.content.fixedBounds) {
                    this.setMapMarkerBounds();
                }
            }, { trackVisibility: true, delay: 100 });
            this.observer.observe(this.$refs.map);
        });
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
                if (!this.$refs.map) {
                    console.error('Map element is not available');
                    return;
                }

                this.map = new google.maps.Map(this.$refs.map, this.mapOptions);
                this.map.addListener('click', mapsMouseEvent => {
                    this.$emit('trigger-event', {
                        name: 'map:click',
                        event: { lat: mapsMouseEvent.latLng.lat(), lng: mapsMouseEvent.latLng.lng() },
                    });
                });
                this.updateMapMarkers();
            } catch (error) {
                console.error('Map initialization error:', error);
            }
        },
        async updateMapMarkers() {
            if (!this.markers.length || !this.loader) return;

            if (this.clusterer) {
                this.clusterer.clearMarkers();
                this.clusterer = null; // Reset the clusterer
            }

            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];

            const markersArray = this.markers.map(marker => {
                const icon = this.getMarkerIcon(marker);
                const advancedMarker = new google.maps.marker.AdvancedMarkerElement({
                    position: marker.position,
                    content: this.createMarkerContent(marker),
                    map: this.map,
                    icon: icon,
                });

                this.markerInstances.push(advancedMarker);
                return advancedMarker;
            });

            // Initialize MarkerClusterer with the markers
            this.clusterer = new MarkerClusterer({
                map: this.map,
                markers: markersArray,
                options: {
                    minimumClusterSize: 2,
                },
            });

            if (this.content.fixedBounds) {
                this.setMapMarkerBounds();
            }
        },
        createMarkerContent(marker) {
            const div = document.createElement('div');
            div.innerHTML = marker.content;
            div.className = 'marker-content'; // Add a class for styling if needed
            return div;
        },
        getMarkerIcon(marker) {
            const url = marker.url && marker.url.startsWith('designs/')
                ? `${wwLib.wwUtils.getCdnPrefix()}${marker.url}`
                : marker.url;

            return {
                url: url || this.content.defaultMarkerUrl,
                scaledSize: !this.content.markersAutoSize && marker.width && marker.height
                    ? new google.maps.Size(marker.width, marker.height)
                    : undefined,
            };
        },
        updateMarkerVisibility() {
            const zoomLevel = this.map.getZoom();
            const showMarkers = zoomLevel >= 15;

            for (const marker of this.markerInstances) {
                marker.setMap(showMarkers ? this.map : null);
            }
        },
        setMapMarkerBounds() {
            if (!this.map || this.markers.length < 2) return;
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(marker => {
                bounds.extend(marker.position);
            });
            this.map.fitBounds(bounds);
        },
        getMarkerTestEvent() {
            if (!this.markers.length) throw new Error('No markers found');
            return { marker: this.markers[0], domEvent: { x: 128, y: 156, target: null } };
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
                background-color: rgba(255, 0, 0, 0.1);
            }
        }
    }

    .map-placeholder {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
        text-align: center;

        &.error {
            color: red;
        }
    }
}
</style>
