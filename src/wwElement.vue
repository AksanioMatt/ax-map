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
import stylesConfig from './stylesConfig.json';
import { MarkerClusterer } from '@googlemaps/markerclusterer'; // Import MarkerClusterer

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
            markerInstances: [],
            markerCluster: null,
        };
    },
    computed: {
        isEditing() {
            return this.wwEditorState.editMode === wwLib.wwEditorHelper.EDIT_MODES.EDITION;
        },
        isError() {
            return !this.isGoogleKeyMatch;
        },
        isGoogleKeyMatch() {
            return this.content.googleKey && /^(AIza[0-9A-Za-z-_]{35})$/.test(this.content.googleKey);
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
            const nameField = this.content.nameField || 'name';
            const latField = this.content.latField || 'lat';
            const lngField = this.content.lngField || 'lng';
            const urlField = this.content.urlField || 'url';
            const widthField = this.content.widthField || 'width';
            const heightField = this.content.heightField || 'height';

            if (!Array.isArray(this.content.markers)) return [];

            return this.content.markers.map(marker => ({
                content: wwLib.resolveObjectPropertyPath(marker, nameField),
                position: {
                    lat: parseFloat(wwLib.resolveObjectPropertyPath(marker, latField) || 0),
                    lng: parseFloat(wwLib.resolveObjectPropertyPath(marker, lngField) || 0),
                },
                url: wwLib.resolveObjectPropertyPath(marker, urlField),
                width: parseInt(wwLib.resolveObjectPropertyPath(marker, widthField) || 0),
                height: parseInt(wwLib.resolveObjectPropertyPath(marker, heightField) || 0),
            }));
        },
    },
    watch: {
        'content.googleKey': 'initMap',
        markers: 'updateMapMarkers',
        mapOptions: 'initMap',
    },
    mounted() {
        this.initMap();
        // Observer logic if needed...
    },
    methods: {
        async initMap() {
            if (!this.isGoogleKeyMatch) {
                this.wrongKey = this.content.googleKey.length > 0;
                return;
            }
            this.wrongKey = false;

            if (!this.loader) {
                this.loader = new Loader({
                    apiKey: this.content.googleKey,
                    language: wwLib.wwLang.lang,
                });
                await this.loader.load();
            }

            this.map = new google.maps.Map(this.$refs.map, this.mapOptions);
            this.markerCluster = new MarkerClusterer(this.map, this.markerInstances);
            this.updateMapMarkers();
        },
        async updateMapMarkers() {
            if (!this.markers || !this.loader) return;
            this.markerCluster.clearMarkers();
            this.markerInstances = [];

            for (const marker of this.markers) {
                // Marker creation logic...
            }

            this.markerCluster.addMarkers(this.markerInstances);
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
