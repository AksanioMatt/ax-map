export default {
    options: {
        sizable: true,
    },
    editor: {
        label: {
            fr: 'Map',
            en: 'Map',
        },
        icon: 'map',
        customStylePropertiesOrder: [
            'defaultMapType',
            'mapStyle',
            ['markersIcon', 'defaultMarkerUrl', 'markersAutoSize', 'defaultMarkerWidth', 'defaultMarkerHeight'],
            ['tooltipConfig', 'infoWindowConfig'],  // Added tooltip and info window configuration
        ],
        customSettingsPropertiesOrder: [
            'googleKey',
            ['lat', 'lng', 'zoom'],
            [
                'markers',
                'hintFields',
                'nameField',
                'latField',
                'lngField',
                'urlField',
                'widthField',
                'heightField',
                'markerTooltipTrigger',
                'fixedBounds',
            ],
            [
                'zoomControl',
                'scaleControl',
                'rotateControl',
                'streetViewControl',
                'fullscreenControl',
                'mapTypeControl',
            ],
        ],
    },
    triggerEvents: [
        {
            name: 'map:click',
            label: { en: 'On map click' },
            event: {
                latLng: {
                    lat: 48.84872727506581,
                    lng: 2.351657694024656,
                },
                domEvent: {},
                pixel: {
                    x: 474,
                    y: 196,
                },
                xb: {
                    x: 129.67228991575087,
                    y: 88.07977939599527,
                },
            },
            default: true,
        },
        {
            name: 'marker:mouseover',
            label: { en: 'On marker mouse enter' },
            event: {
                marker: {
                    content: 'Paris',
                    position: {
                        lat: 48.84872727506581,
                        lng: 2.351657694024656,
                    },
                    rawData: {},
                },
                domEvent: { x: 128, y: 156, target: null },
            },
            getTestEvent: 'getMarkerTestEvent',
        },
        {
            name: 'marker:mouseout',
            label: { en: 'On marker mouse leave' },
            event: {
                marker: {
                    content: 'Paris',
                    position: {
                        lat: 48.84872727506581,
                        lng: 2.351657694024656,
                    },
                    rawData: {},
                },
                domEvent: { x: 128, y: 156, target: null },
            },
            getTestEvent: 'getMarkerTestEvent',
        },
        {
            name: 'marker:click',
            label: { en: 'On marker click' },
            event: {
                marker: {
                    content: 'Paris',
                    position: {
                        lat: 48.84872727506581,
                        lng: 2.351657694024656,
                    },
                    rawData: {},
                },
                domEvent: { x: 128, y: 156, target: null },
            },
            getTestEvent: 'getMarkerTestEvent',
        },
    ],
    properties: {
        defaultMapType: {
            label: {
                en: 'Map type',
                fr: 'Type de map',
            },
            type: 'TextSelect',
            options: {
                options: [
                    { value: 'roadmap', label: 'Standard' },
                    { value: 'satellite', label: 'Satellite' },
                    { value: 'hybrid', label: 'Hybrid' },
                    { value: 'terrain', label: 'Terrain' },
                ],
            },
            defaultValue: 'roadmap',
        },
        mapStyle: {
            hidden: content => content.defaultMapType === 'satellite',
            label: {
                en: 'Map style',
                fr: 'Style de la map',
            },
            type: 'TextSelect',
            options: {
                options: [
                    { value: null, label: 'Standard' },
                    { value: 'silver', label: 'Silver' },
                    { value: 'retro', label: 'Retro' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'night', label: 'Night' },
                    { value: 'aubergine', label: 'Aubergine' },
                    { value: 'custom', label: 'Custom Import' },
                ],
            },
            defaultValue: 'dark',
        },
        markersIcon: {
            label: 'Custom markers',
            type: 'OnOff',
            defaultValue: false,
        },
        markersAutoSize: {
            label: 'Markers auto size',
            type: 'OnOff',
            defaultValue: true,
            hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon,
        },
        defaultMarkerUrl: {
            label: { en: 'Icon' },
            type: 'Image',
            bindable: true,
            options: { nullable: true },
            hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon,
        },
        defaultMarkerWidth: {
            label: 'Width',
            type: 'Number',
            bindable: true,
            options: { min: 0, step: 1, defaultValue: 40 },
            hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon || content.markersAutoSize,
        },
        defaultMarkerHeight: {
            label: 'Height',
            type: 'Number',
            bindable: true,
            options: { min: 0, step: 1, defaultValue: 40 },
            hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon || content.markersAutoSize,
        },
        mapStyleJSON: {
            hidden: content => content.mapStyle !== 'custom' || content.defaultMapType === 'satellite',
            label: {
                en: 'JSON Import',
                fr: 'Import JSON',
            },
            type: 'Script',
        },
        googleKey: {
            section: 'settings',
            label: { en: 'Google key', fr: 'Clé Google' },
            type: 'Text',
            options: {
                placeholder: 'Google API key',
            },
            defaultValue: '',
            bindable: true,
        },
        lat: {
            section: 'settings',
            label: { en: 'Latitude origin', fr: 'Origine - Latitude' },
            type: 'Text',
            options: {
                placeholder: 'Latitude',
            },
            defaultValue: '40.712784',
            bindable: true,
        },
        lng: {
            section: 'settings',
            label: { en: 'Longitude origin', fr: 'Origine - Longitude' },
            type: 'Text',
            options: {
                placeholder: 'Longitude',
            },
            defaultValue: '-74.005941',
            bindable: true,
        },
        zoom: {
            section: 'settings',
            type: 'Number',
            label: { en: 'Zoom', fr: 'Zoom' },
            options: {
                min: 0,
                max: 20,
                step: 1,
            },
            defaultValue: 11,
            bindable: true,
        },
        markers: {
            section: 'settings',
            label: { en: 'Markers', fr: 'Markers' },
            bindable: true,
            type: 'Array',
            options: {
                item: {
                    type: 'Object',
                    defaultValue: { name: '', lat: 0, lng: 0, width: 40, height: 40 },
                    options: {
                        item: {
                            name: {
                                label: { en: 'Name' },
                                type: 'Text',
                                options: { placeholder: 'Value' },
                            },
                            lat: {
                                label: { en: 'Latitude' },
                                type: 'Text',
                                options: { placeholder: 'Latitude' },
                            },
                            lng: {
                                label: { en: 'Longitude' },
                                type: 'Text',
                                options: { placeholder: 'Longitude' },
                            },
                            url: {
                                label: { en: 'Custom marker icon' },
                                type: 'Image',
                                bindable: true,
                                options: { nullable: true },
                                hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon,
                            },
                            width: {
                                label: 'Width',
                                type: 'Number',
                                bindable: true,
                                options: { min: 0, step: 1, defaultValue: 40 },
                                hidden: (content, _sidepanelContent, boundProps) =>
                                    !content.markersIcon || content.markersAutoSize,
                            },
                            height: {
                                label: 'Height',
                                type: 'Number',
                                bindable: true,
                                options: { min: 0, step: 1, defaultValue: 40 },
                                hidden: (content, _sidepanelContent, boundProps) =>
                                    !content.markersIcon || content.markersAutoSize,
                            },
                        },
                    },
                },
            },
            defaultValue: [
                { name: 'New York', lat: 40.712784, lng: -74.005941 },
                { name: 'Brooklyn', lat: 40.650002, lng: -73.949997 },
            ],
        },
        nameField: {
            section: 'settings',
            label: { en: 'Name field', fr: 'Name field' },
            type: 'Text',
            options: {
                placeholder: 'Marker name',
            },
            defaultValue: 'name',
        },
        latField: {
            section: 'settings',
            label: { en: 'Lat field', fr: 'Lat field' },
            type: 'Text',
            options: {
                placeholder: 'Latitude',
            },
            defaultValue: 'lat',
        },
        lngField: {
            section: 'settings',
            label: { en: 'Lng field', fr: 'Lng field' },
            type: 'Text',
            options: {
                placeholder: 'Longitude',
            },
            defaultValue: 'lng',
        },
        urlField: {
            section: 'settings',
            label: { en: 'Custom icon field', fr: 'Custom icon field' },
            type: 'Text',
            options: {
                placeholder: 'Icon URL',
            },
            defaultValue: 'url',
        },
        widthField: {
            section: 'settings',
            label: { en: 'Custom marker width field', fr: 'Largeur du marker' },
            type: 'Text',
            options: {
                placeholder: 'Width field',
            },
            defaultValue: 'width',
        },
        heightField: {
            section: 'settings',
            label: { en: 'Custom marker height field', fr: 'Hauteur du marker' },
            type: 'Text',
            options: {
                placeholder: 'Height field',
            },
            defaultValue: 'height',
        },
        zoomControl: {
            section: 'settings',
            label: 'Zoom control',
            type: 'OnOff',
            defaultValue: true,
        },
        scaleControl: {
            section: 'settings',
            label: 'Scale control',
            type: 'OnOff',
            defaultValue: false,
        },
        rotateControl: {
            section: 'settings',
            label: 'Rotate control',
            type: 'OnOff',
            defaultValue: false,
        },
        streetViewControl: {
            section: 'settings',
            label: 'Street view control',
            type: 'OnOff',
            defaultValue: false,
        },
        fullscreenControl: {
            section: 'settings',
            label: 'Fullscreen control',
            type: 'OnOff',
            defaultValue: true,
        },
        mapTypeControl: {
            section: 'settings',
            label: 'Map type control',
            type: 'OnOff',
            defaultValue: true,
        },
        markerTooltipTrigger: {
            section: 'settings',
            label: { en: 'Tooltip trigger' },
            type: 'TextSelect',
            options: {
                options: [
                    { value: 'click', label: 'Click' },
                    { value: 'hover', label: 'Hover' },
                    { value: 'none', label: 'None' },
                ],
            },
            defaultValue: 'hover',
        },
        fixedBounds: {
            section: 'settings',
            label: 'Force marker bounds',
            type: 'OnOff',
            defaultValue: false,
        },
        tooltipConfig: {
            label: 'Tooltip Configuration',
            type: 'Object',
            defaultValue: {
                show: true,
                backgroundColor: 'white',
                borderRadius: 4,
                fontSize: 12,
            },
            options: {
                show: {
                    label: 'Show Tooltip',
                    type: 'OnOff',
                    defaultValue: true,
                },
                backgroundColor: {
                    label: 'Background Color',
                    type: 'Color',
                    defaultValue: 'white',
                },
                borderRadius: {
                    label: 'Border Radius',
                    type: 'Number',
                    defaultValue: 4,
                },
                fontSize: {
                    label: 'Font Size',
                    type: 'Number',
                    defaultValue: 12,
                },
            },
        },
        infoWindowConfig: {
            label: 'Info Window Configuration',
            type: 'Object',
            defaultValue: {
                show: true,
                maxWidth: 250,
                padding: 10,
            },
            options: {
                show: {
                    label: 'Show Info Window',
                    type: 'OnOff',
                    defaultValue: true,
                },
                maxWidth: {
                    label: 'Max Width',
                    type: 'Number',
                    defaultValue: 250,
                },
                padding: {
                    label: 'Padding',
                    type: 'Number',
                    defaultValue: 10,
                },
            },
        },
    },
};
