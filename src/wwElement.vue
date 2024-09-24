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
import stylesConfig from './stylesConfig.json';
import { MarkerClusterer } from '@googlemaps/markerclusterer'; // Import MarkerClusterer

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
            markerCluster: null, // Added marker cluster variable
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
        markers() {
            this.updateMapMarkers();
        },
        mapOptions() {
            this.initMap();
        },
    },
    mounted() {
        this.initMap();

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
                this.markerCluster = new MarkerClusterer(this.map, [], {
                    imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m', // Adjust this path if needed
                });

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

            // Clear previous markers
            if (this.markerCluster) {
                this.markerCluster.clearMarkers();
            }

            this.markerInstances = [];

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
                    const _marker = new google.maps.Marker({
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

                    if (marker.content) {
                        const infowindow = new google.maps.InfoWindow({
                            content: marker.content,
                            maxWidth: 200,
                        });

                        _marker.addListener('mouseover', e => {
                            this.$emit('trigger-event', {
                                name: 'marker:mouseover',
                                event: { marker, domEvent: e.domEvent },
                            });
                            if (this.content.markerTooltipTrigger === 'hover' && marker.content) {
                                infowindow.open(this.map, _marker);
                            }
                        });
                        _marker.addListener('mouseout', e => {
                            this.$emit('trigger-event', {
                                name: 'marker:mouseout',
                                event: { marker, domEvent: e.domEvent },
                            });
                            if (this.content.markerTooltipTrigger === 'hover') {
                                infowindow.close();
                            }
                        });
                        _marker.addListener('click', e => {
                            this.$emit('trigger-event', {
                                name: 'marker:click',
                                event: { marker, domEvent: e.domEvent },
                            });
                            if (this.content.markerTooltipTrigger === 'click' && marker.content) {
                                infowindow.open(this.map, _marker);
                            }
                        });
                    }
                } catch (error) {
                    console.error(error);
                }
            }

            // Add all markers to the clusterer
            if (this.markerCluster) {
                this.markerCluster.addMarkers(this.markerInstances);
            }

            if (this.content.fixedBounds) {
                this.setMapMarkerBounds();
            }
        },
        setMapMarkerBounds() {
            const bounds = new google.maps.LatLngBounds();
            this.markerInstances.forEach(marker => {
                bounds.extend(marker.getPosition());
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
    .map-container {
        width: 100%;
        height: 100%;
        .map {
            width: 100%;
            height: 100%;
        }
    }
    .map-placeholder {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        color: #666;
        font-size: 1.2em;
        &.error {
            color: red;
        }
    }
    .wrongKey {
        color: red;
        margin-top: 10px;
    }
}
</style>
