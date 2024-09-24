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
            markerCluster: null, // Initialize markerCluster
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
            } catch (error) {
                wwLib.wwLog.error(error);
            }
        },
        
        async updateMapMarkers() {
            if (!this.markers || !this.loader) return;

            // Clear existing marker instances
            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];

            // Initialize a new marker clusterer
            if (this.markerCluster) {
                this.markerCluster.clearMarkers(); // Clear previous markers
            } else {
                this.markerCluster = new MarkerClusterer(this.map, [], {
                    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m' // Marker Cluster images path
                });
            }

            for (const marker of this.markers) {
                try {
                    const url =
                        marker.url && marker.url.startsWith('designs/')
                            ? `${wwLib.wwUtils.getCdnPrefix()}${marker.url}`
                            : marker.url;
                    const defaultMarkerUrl =
                        this.content.defaultMarkerUrl && this.content.defaultMarkerUrl.startsWith('designs/')
                            ? `${wwLib.wwUtils.getCdnPrefix()}${this.content.defaultMarkerUrl}`
                            : this.content.defaultMarkerUrl;

                    let _marker = new google.maps.Marker({
                        position: marker.position,
                        map: this.map,
                        icon: this.content.markersIcon
                            ? url
                                ? {
                                      url,
                                      scaledSize:
                                          !this.content.markersAutoSize && marker.width && marker.height
                                              ? new google.maps.Size(marker.width, marker.height)
                                              : !this.content.markersAutoSize &&
                                                this.content.defaultMarkerWidth &&
                                                this.content.defaultMarkerHeight
                                              ? new google.maps.Size(
                                                    this.content.defaultMarkerWidth,
                                                    this.content.defaultMarkerHeight
                                                )
                                              : undefined,
                                  }
                                : {
                                      url: defaultMarkerUrl,
                                      scaledSize:
                                          !this.content.markersAutoSize &&
                                          this.content.defaultMarkerWidth &&
                                          this.content.defaultMarkerHeight
                                              ? new google.maps.Size(
                                                    this.content.defaultMarkerWidth,
                                                    this.content.defaultMarkerHeight
                                                )
                                              : undefined,
                                  }
                            : {},
                        animation: google.maps.Animation.DROP,
                    });

                    this.markerInstances.push(_marker);
                    // Add the marker to the clusterer
                    this.markerCluster.addMarker(_marker);

                    if (marker.content) {
                        const briefInfoWindow = new google.maps.InfoWindow({
                            content: `<div><strong>${marker.content}</strong></div>`, // Display brief info on hover
                            maxWidth: 200,
                        });

                        const detailedInfoWindow = new google.maps.InfoWindow({
                            content: `<div><strong>${marker.content}</strong><br/>Detailed Info: <br/> Lat: ${marker.position.lat}, Lng: ${marker.position.lng}</div>`, // More detailed info on click
                            maxWidth: 300,
                        });

                        // Show tooltip on hover
                        _marker.addListener('mouseover', e => {
                            this.$emit('trigger-event', {
                                name: 'marker:mouseover',
                                event: { marker, domEvent: e.domEvent },
                            });
                            if (this.content.markerTooltipTrigger === 'hover' && marker.content) {
                                briefInfoWindow.open(this.map, _marker);
                            }
                        });
                        _marker.addListener('mouseout', e => {
                            this.$emit('trigger-event', {
                                name: 'marker:mouseout',
                                event: { marker, domEvent: e.domEvent },
                            });
                            if (this.content.markerTooltipTrigger === 'hover') {
                                briefInfoWindow.close();
                            }
                        });

                        // Show detailed info on click
                        _marker.addListener('click', e => {
                            this.$emit('trigger-event', {
                                name: 'marker:click',
                                event: { marker, domEvent: e.domEvent },
                            });
                            if (this.content.markerTooltipTrigger === 'click' && marker.content) {
                                detailedInfoWindow.open(this.map, _marker);
                            }
                        });
                    }
                } catch (error) {
                    wwLib.wwLog.error(error);
                }
            }

            if (this.content.fixedBounds) {
                this.setMapMarkerBounds();
            }
        },
        
        setMapMarkerBounds() {
            if (!this.map) return;
            const bounds = new google.maps.LatLngBounds();
            this.markers.forEach(marker => bounds.extend(marker.position));
            this.map.fitBounds(bounds);
        },
    },
};
</script>

<style scoped>
.ww-map {
    height: 100%;
    width: 100%;
}

.map-container {
    position: relative;
    height: 100%;
    width: 100%;
}

.map {
    height: 100%;
    width: 100%;
    background-color: #f0f0f0;
}

.map-placeholder {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    text-align: center;
    z-index: 10;
    padding: 20px;
    box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.2);
}

.placeholder-content {
    max-width: 600px;
    font-size: 14px;
}

.placeholder-content button {
    margin-top: 10px;
    padding: 6px 12px;
    background-color: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}

.placeholder-content .wrongKey {
    color: red;
    margin-top: 10px;
    display: block;
}
</style>
