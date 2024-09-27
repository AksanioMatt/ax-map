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
                this.map.addListener('click', mapsMouseEvent => {
                    mapsMouseEvent.latLng.lat = mapsMouseEvent.latLng.lat();
                    mapsMouseEvent.latLng.lng = mapsMouseEvent.latLng.lng();
                    this.$emit('trigger-event', {
                        name: 'map:click',
                        event: { ...mapsMouseEvent },
                    });
                });
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

    // Create a new markers array
    const markersArray = this.markers.map(marker => {
        const url = marker.url && marker.url.startsWith('designs/')
            ? `${wwLib.wwUtils.getCdnPrefix()}${marker.url}`
            : marker.url;

        const defaultMarkerUrl = this.content.defaultMarkerUrl && this.content.defaultMarkerUrl.startsWith('designs/')
            ? `${wwLib.wwUtils.getCdnPrefix()}${this.content.defaultMarkerUrl}`
            : this.content.defaultMarkerUrl;

        let icon = null;
        if (this.content.markersIcon) {
            icon = url ? {
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

        const _marker = new google.maps.Marker({
            position: marker.position,
            map: this.map,
            icon: icon || undefined,
            animation: google.maps.Animation.DROP,
        });

        this.markerInstances.push(_marker);
        const infowindow = new google.maps.InfoWindow({
            content: marker.content,
            maxWidth: 200,
        });

        // Event listeners for marker interactions
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

        return _marker;
    });

    // Clear existing clusterer if it exists
    if (this.clusterer) {
        this.clusterer.clearMarkers();  // Clear markers from clusterer
        this.clusterer = null;           // Remove reference to old clusterer
    }

    this.clusterer = new MarkerClusterer(this.map, markersArray, {
        minimumClusterSize: 2,
    });

    // Force the map to refresh
    google.maps.event.trigger(this.map, 'resize');

    if (this.content.fixedBounds) {
        this.setMapMarkerBounds();
    }
},

clearOldMarkers() {
    for (const marker of this.markerInstances) {
        marker.setMap(null);
    }
    this.markerInstances = [];

    // Clear the existing clusterer if it exists
    if (this.clusterer) {
        this.clusterer.clearMarkers();
        this.clusterer = null; // Remove reference to old clusterer
    }
},

        updateMarkerVisibility() {
            const zoomLevel = this.map.getZoom();
            const showMarkers = zoomLevel >= 15; // Adjust visibility threshold as needed
            this.markerInstances.forEach(marker => {
                marker.setMap(showMarkers ? this.map : null);
            });
        },
        setMapMarkerBounds() {
            if (!this.map || this.markers.length < 2) return;
            const mapBounds = new google.maps.LatLngBounds();
            this.markers.forEach(marker => mapBounds.extend(marker.position));
            this.map.fitBounds(mapBounds);
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
                filter: blur(8px);
            }
        }

        .map-placeholder {
            z-index: 2;
            position: absolute;
            top: 0;
            left: 0;
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
                    }
                }
            }
        }
    }
}
</style>
