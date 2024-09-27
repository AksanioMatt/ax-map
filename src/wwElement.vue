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
                city: this.content.cityField || 'city',
                country: this.content.countryField || 'country',
                ownershipType: this.content.ownershipTypeField || 'ownershipType',
                facilityType: this.content.facilityTypeField || 'facilityType',
                phone: this.content.phoneNumberField || 'phone',
                infoWindowEnabled: this.content.infoWindowEnabled || false,
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
                city: wwLib.resolveObjectPropertyPath(marker, fields.city),
                country: wwLib.resolveObjectPropertyPath(marker, fields.country),
                ownershipType: wwLib.resolveObjectPropertyPath(marker, fields.ownershipType),
                facilityType: wwLib.resolveObjectPropertyPath(marker, fields.facilityType),
                phone: wwLib.resolveObjectPropertyPath(marker, fields.phone),
                infoWindowEnabled: fields.infoWindowEnabled,
            }));
        },
    },
    watch: {
        'content.googleKey': 'reloadMap',
        'content.markers': 'reloadMap', // Reload map on markers change
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
        reloadMap() {
            this.clearOldMarkers();
            this.map = null; // Clear the existing map instance
            this.initMap(); // Reinitialize the map
        },
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
                console.log('Map initialized:', this.map);
                this.updateMapMarkers(); // Ensure markers are updated on map initialization
            } catch (error) {
                console.error('Error initializing map:', error);
            }
        },
        async updateMapMarkers() {
            this.clearOldMarkers(); // Clear everything before adding new markers
            if (!this.markers.length || !this.map) return; // Ensure map is initialized

            const markersArray = this.markers.map(marker => {
                const icon = {
                    url: marker.url || this.content.defaultMarkerUrl,
                    scaledSize: new google.maps.Size(marker.width || 32, marker.height || 32),
                };

                const _marker = new google.maps.Marker({
                    position: marker.position,
                    map: this.map,
                    icon: icon,
                    animation: google.maps.Animation.DROP,
                });

                this.markerInstances.push(_marker);
                
                // Create the InfoWindow content based on infoWindowFields
                const infoContent = this.createInfoWindowContent(marker.rawData);

                const infowindow = new google.maps.InfoWindow({
                    content: infoContent,
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
                    console.log("why is the sheeed on",this.createInfoWindowContent(marker.rawData))
                    infowindow.setContent(this.createInfoWindowContent(marker.rawData));
                    infowindow.open(this.map, _marker);
                });

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
        getFieldName(field) {
    if (typeof field === 'string' && (field.includes('[') || field.includes(']'))) {
        // Remove brackets and quotes
        field = field.replace(/[\[\]']/g, '');
        // If it's formatted with commas, extract the first element
        if (field.includes(',')) {
            return field.split(',')[0].trim(); // Get the first element as a string
        }
        return String(field); // Return as string if not an array
    }
    return null; // Return null if no brackets are found or not a string
},
        createInfoWindowContent(rawData) {
    if (!this.content.infoWindowEnabled) {
        return ''; // Return empty string if InfoWindow is not enabled
    }
  


    const fields = {
        name: this.getFieldName(this.content.nameField),
        city: this.getFieldName(this.content.cityField),
        phone: this.getFieldName(this.content.phoneField),
        country: this.getFieldName(this.content.countryField),
        ownershipType: this.getFieldName(this.content.ownershipTypeField),
        facilityType: this.getFieldName(this.content.facilityTypeField),
    };
    console.log(fields,"heyyyyyyyyyyhoolelo")
    console.log('Fields with Array Handling:', Array.isArray(this.content.cityField), "ss", String(this.content.cityField[0]), this.content.cityField);

    +
console.log(rawData[fields.name],rawData['name'], rawData[fields.phone],"heyyyyyyyyyyhoo")
    // Start constructing the InfoWindow content
    let content = `<div class="info-window-content"><h3>${rawData['name'] || 'Unknown'}</h3>`;

  
    
    if (fields.city && rawData[fields.city]) {
        content += `<p><strong>City:</strong> ${rawData[fields.city]}</p>`;
    }
    if (fields.phone && rawData[fields.phone]) {
        content += `<p><strong>Phone:</strong> ${rawData[fields.phone]}</p>`;
    }
    if (fields.country && rawData[fields.country]) {
        content += `<p><strong>Country:</strong> ${rawData[fields.country]}</p>`;
    }
    if (fields.ownershipType && rawData[fields.ownershipType]) {
        content += `<p><strong>Ownership Type:</strong> ${rawData[fields.ownershipType]}</p>`;
    }
    if (fields.facilityType && rawData[fields.facilityType]) {
        content += `<p><strong>Facility Type:</strong> ${rawData[fields.facilityType]}</p>`;
    }

    // Close the info window content div
    content += '</div>';
   console.log(content,"contentcontentcontentcontentcontentcontentcontentcontentcontentcontentcontent") 
    return content;
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
            // Remove old markers from the map
            this.markerInstances.forEach(marker => marker.setMap(null));
            this.markerInstances = [];
            // Reset the clusterer to avoid old clusters being rendered
            if (this.clusterer) {
                this.clusterer.clearMarkers();
                this.clusterer = null;
            }
        },
        setMapMarkerBounds() {
            if (!this.map) {
                console.warn('Map is not initialized yet.');
                return; // Early return if the map is not initialized
            }
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
