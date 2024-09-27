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
        'content.markers': 'updateMapMarkers',
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
                this.updateMapMarkers(); // Ensure markers are updated on map initialization
            } catch (error) {
                console.error(error);
            }
        },
        async updateMapMarkers() {
            this.clearOldMarkers();
            if (!this.markers.length) return;

            const markersArray = this.markers.map(marker => {
                const icon = {
                    url: marker.url || this.content.defaultMarkerUrl,
                    scaledSize: new google.maps.Size(marker.width || 32, marker.height || 32),
                };

                const _marker = new google.maps.marker.AdvancedMarkerElement({
                    position: marker.position,
                    map: this.map,
                    icon: icon,
                    animation: google.maps.Animation.DROP,
                });

                this.markerInstances.push(_marker);
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
        setupMarkerEvents(marker, markerData) {
            marker.addListener('click', () => {
                this.$emit('trigger-event', {
                    name: 'marker:click',
                    event: { marker: markerData },
                });
            });
        },
        clearOldMarkers() {
            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];
            if (this.clusterer) {
                this.clusterer.clearMarkers();
                this.clusterer = null; // Clear reference
            }
        },
        setMapMarkerBounds() {
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
</style>
