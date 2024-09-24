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
            markerCluster: null,
            markerInstances: [],
            infoWindows: [], // Store info windows for markers
        };
    },
    computed: {
        markers() {
            // Retrieve and return marker data as before
            return this.content.markers.map(marker => ({
                ...marker,
                // Add any additional fields you want for the info window
                additionalInfo: marker.additionalInfo || 'Default info',
            }));
        },
    },
    mounted() {
        this.initMap();
    },
    methods: {
        async initMap() {
            // Map initialization as before
        },
        
        async updateMapMarkers() {
            if (!this.markers || !this.loader) return;

            // Clear existing markers and info windows
            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];
            this.infoWindows.forEach(infoWindow => infoWindow.close());
            this.infoWindows = [];

            // Create marker clusterer
            this.markerCluster = new MarkerClusterer(this.map, [], {
                imagePath: 'https://developers.google.com/maps/documentation/javascript/examples/markerclusterer/m',
            });

            for (const marker of this.markers) {
                try {
                    const _marker = new google.maps.Marker({
                        position: marker.position,
                        map: this.map,
                        icon: {
                            url: marker.iconUrl || this.content.defaultMarkerUrl,
                        },
                        animation: google.maps.Animation.DROP,
                    });

                    this.markerInstances.push(_marker);
                    this.markerCluster.addMarker(_marker);

                    const infoWindow = new google.maps.InfoWindow({
                        content: marker.additionalInfo,
                        maxWidth: 200,
                    });

                    _marker.addListener('click', () => {
                        // Close all other info windows before opening a new one
                        this.infoWindows.forEach(win => win.close());
                        infoWindow.open(this.map, _marker);
                        this.infoWindows.push(infoWindow);
                    });

                } catch (error) {
                    console.error(error);
                }
            }
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