export default {
  // Maker icon (on/off)
  // if (prev = on) Maker auto size (on/off)
  // if Icon URL
  // if (!auto) Icon width (d=50)
  // if (!auto) Icon height (d=50)
  // if (w||h not int) auto
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
    ],
    customSettingsPropertiesOrder: [
      'googleKey',
      ['lat', 'lng', 'zoom', 'centeringObject'],
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
        'infoWindowEnabled',
        'infoWindowFields',
        'cityField',
        'countryField',
        'ownershipTypeField',
        'facilityTypeField',
        'phoneNumberField',
        'addressField',

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
    {
      name: 'bounds:change',
      label: { en: 'On map bounds change' },
      event: {
        position: {
          NorthEast: {},
          SouthWest: {},
        },
        domEvent: {},
      },
    },
    {
      name: 'mouseupbounds:change',
      label: { en: 'On mouseUp map bounds change' },
      event: {
        position: {
          NorthEast: {},
          SouthWest: {},
        },
      },
    },
    {
      name: 'zoom:change',
      label: { en: 'On zoom change' },
      event: {
        position: {
          NorthEast: {},
          SouthWest: {},
        },
        updatedzoom: {},
      },
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
      //defaultValue: 'dark', ...M... Make standard style the default
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
      bindingValidation: {
        type: 'string',
        tooltip: 'A string that represents the icon url: `"https://.../.../my_image.png"`',
      },
    },
    defaultMarkerWidth: {
      label: 'Width',
      type: 'Number',
      bindable: true,
      options: { min: 0, step: 1, defaultValue: 40 },
      hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon || content.markersAutoSize,
      bindingValidation: {
        type: 'number',
        tooltip: 'A number that defines the width of the icon: `40`',
      },
    },
    defaultMarkerHeight: {
      label: 'Height',
      type: 'Number',
      bindable: true,
      options: { min: 0, step: 1, defaultValue: 40 },
      hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon || content.markersAutoSize,
      bindingValidation: {
        type: 'number',
        tooltip: 'A number that defines the height of the icon: `40`',
      },
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
      bindingValidation: {
        type: 'string',
        tooltip: 'A string that represents the API key: `"key********************"`',
      },
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
      bindingValidation: {
        type: 'string',
        tooltip: 'A string that defines the latitude: `"40.712784"`',
      },
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
      bindingValidation: {
        type: 'string',
        tooltip: 'A string that defines the longitude: `"15.347554"`',
      },
    },
    zoom: {
      section: 'settings',
      type: 'Number',
      label: { en: 'Zoom', fr: 'Zoom' },
      options: {
        min: 0,
        max: 22,
        step: 1,
      },
      defaultValue: 11,
      bindable: true,
      bindingValidation: {
        type: 'number',
        tooltip: 'A number that defines the zoom: `11`',
      },
    },
    centeringObject: {
      section: 'settings',
      type: 'ObjectPropertyPath',
      label: { en: 'Centering Updates', fr: 'Centre Mise à jour' },
      defaultValue: null,
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
                bindingValidation: {
                  type: 'string',
                  tooltip: 'A string that represents the icon url: `"https://.../.../my_image.png"`',
                },
              },
              width: {
                label: 'Width',
                type: 'Number',
                bindable: true,
                options: { min: 0, step: 1, defaultValue: 40 },
                hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon || content.markersAutoSize,
                bindingValidation: {
                  type: 'number',
                  tooltip: 'A number that defines the width of the icon: `40`',
                },
              },
              height: {
                label: 'Height',
                type: 'Number',
                bindable: true,
                options: { min: 0, step: 1, defaultValue: 40 },
                hidden: (content, _sidepanelContent, boundProps) => !content.markersIcon || content.markersAutoSize,
                bindingValidation: {
                  type: 'number',
                  tooltip: 'A number that defines the height of the icon: `40`',
                },
              },
            },
          },
        },
      },
      defaultValue: [
        { name: 'New York', lat: 40.712784, lng: -74.005941 },
        { name: 'Brooklyn', lat: 40.650002, lng: -73.949997 },
      ],
      bindingValidation: {
        type: 'array',
        tooltip:
            'A collection of data in array format: \n\n `[{}, {}, ...] || ["string1", "string2", ...] || [1, 2, ...]`',
      },
    },
    hintFields: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.markers || content.markers,
      label: {
        en: 'Marker fields',
        fr: 'Champs du marker',
      },
      type: 'Info',
      options: {
        text: { en: 'Please provide at least one marker to configure fields' },
      },
      editorOnly: true,
      section: 'settings',
    },
    nameField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.markers || !content.markers,
      label: {
        en: 'Marker name field',
        fr: 'Marker name field',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.markers.length || typeof content.markers[0] !== 'object') {
          return null;
        }
        return { object: content.markers[0] };
      },
      defaultValue: null,
      section: 'settings',
    },
    latField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.markers || !content.markers,
      label: {
        en: 'Marker lat. field',
        fr: 'Marker lat. field',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.markers.length || typeof content.markers[0] !== 'object') {
          return null;
        }
        return { object: content.markers[0] };
      },
      defaultValue: null,
      section: 'settings',
    },
    lngField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.markers || !content.markers,
      label: {
        en: 'Marker long. field',
        fr: 'Marker long. field',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.markers.length || typeof content.markers[0] !== 'object') {
          return null;
        }
        return { object: content.markers[0] };
      },
      defaultValue: null,
      section: 'settings',
    },
    urlField: {
      hidden: (content, sidepanelContent, boundProps) =>
          !boundProps.markers || !content.markers || !content.markersIcon,
      label: 'Marker icon field',
      type: 'ObjectPropertyPath',
      options: content => {
        return !content.markers.length || typeof content.markers[0] !== 'object'
            ? null
            : { object: content.markers[0] };
      },
      defaultValue: null,
      section: 'settings',
    },

    widthField: {
      hidden: (content, sidepanelContent, boundProps) =>
          !boundProps.markers || !content.markers || !content.markersIcon || content.markersAutoSize,
      label: 'Marker width field',
      type: 'ObjectPropertyPath',
      options: content => {
        return !content.markers.length || typeof content.markers[0] !== 'object'
            ? null
            : { object: content.markers[0] };
      },
      defaultValue: null,
      section: 'settings',
    },
    heightField: {
      hidden: (content, sidepanelContent, boundProps) =>
          !boundProps.markers || !content.markers || !content.markersIcon || content.markersAutoSize,
      label: 'Marker height field',
      type: 'ObjectPropertyPath',
      options: content => {
        return !content.markers.length || typeof content.markers[0] !== 'object'
            ? null
            : { object: content.markers[0] };
      },
      defaultValue: null,
      section: 'settings',
    },
    markerTooltipTrigger: {
      label: {
        en: 'Marker tooltip trigger',
        fr: 'Déclencheur infobox',
      },
      type: 'TextSelect',
      options: {
        options: [
          { value: null, label: 'None' },
          { value: 'hover', label: 'Hover' },
          { value: 'click', label: 'Click' },
        ],
      },
      defaultValue: 'hover',
      section: 'settings',
    },
    fixedBounds: {
      label: { en: 'Fixed markers bounds', fr: 'Fixed markers bounds' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
    infoWindowEnabled: {
      label: { en: 'Enable InfoWindow', fr: 'Activer InfoWindow' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
    infoWindowFields: {
      section: 'settings',
      label: { en: 'InfoWindow Fields', fr: 'Champs InfoWindow' },
      bindable: true,
      type: 'Array',
      options: {
        item: {
          type: 'Object',
          defaultValue: { id: 1, name: '', city: '', country: '', ownershipType: '', facilityType: '', latLng: '', primaryFacility: false, duplicateFacility: false, nonFacility: false },
          options: {
            item: {
              id: {
                label: { en: 'ID', fr: 'ID' },
                type: 'Number',
                bindable: true,
                options: { defaultValue: 1 },
              },
              name: {
                label: { en: 'Name', fr: 'Nom' },
                type: 'ObjectPropertyPath', // Allows binding to a property from the collection
                options: { placeholder: 'Name Field' },
                bindable: true,
              },
              city: {
                label: { en: 'City', fr: 'Ville' },
                type: 'ObjectPropertyPath', // Allows binding to a property from the collection
                options: { placeholder: 'City Name' },
                bindable: true,
              },
              country: {
                label: { en: 'Country', fr: 'Pays' },
                type: 'ObjectPropertyPath', // Allows binding to a property from the collection
                options: { placeholder: 'Country Name' },
                bindable: true,
              },
              ownershipType: {
                label: { en: 'Ownership Type', fr: 'Type de propriété' },
                type: 'ObjectPropertyPath', // Allows binding to a property from the collection
                options: { placeholder: 'Ownership Type' },
                bindable: true,
              },
              facilityType: {
                label: { en: 'Facility Type', fr: 'Type d\'établissement' },
                type: 'ObjectPropertyPath', // Allows binding to a property from the collection
                options: { placeholder: 'Facility Type' },
                bindable: true,
              },
              latLng: {
                label: { en: 'LatLng', fr: 'LatLng' },
                type: 'ObjectPropertyPath', // Allows binding to a property from the collection
                options: { placeholder: 'Latitude, Longitude' },
                bindable: true,
              },
              primaryFacility: {
                label: { en: 'Primary Facility?', fr: 'Établissement principal?' },
                type: 'OnOff',
                defaultValue: false,
                bindable: true,
              },
              duplicateFacility: {
                label: { en: 'Duplicate Facility?', fr: 'Établissement dupliqué?' },
                type: 'OnOff',
                defaultValue: false,
                bindable: true,
              },
              nonFacility: {
                label: { en: 'Non-Facility', fr: 'Non-établissement' },
                type: 'OnOff',
                defaultValue: false,
                bindable: true,
              },
            },
          },
        },
      },
      defaultValue: [
        {
          id: 1,
          name: 'Bengo',
          city: 'Bengo',
          country: 'Angola',
          ownershipType: 'Govt.',
          facilityType: 'Hospital',
          latLng: '-8.656,13.4919',
          primaryFacility: true,
          duplicateFacility: false,
          nonFacility: false,
        },
      ],
      bindingValidation: {
        type: 'array',
        tooltip: 'A collection of InfoWindow field data in array format: \n\n [{}, {}, ...]',
      },
    },
    cityField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.infoWindowFields || !content.infoWindowFields,
      label: {
        en: 'City field',
        fr: 'Champ de la ville',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.infoWindowFields.length || typeof content.infoWindowFields[0] !== 'object') {
          return null;
        }
        return { object: content.infoWindowFields[0] };
      },
      defaultValue: null,
      section: 'settings',
    },

    countryField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.infoWindowFields || !content.infoWindowFields,
      label: {
        en: 'Country field',
        fr: 'Champ du pays',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.infoWindowFields.length || typeof content.infoWindowFields[0] !== 'object') {
          return null;
        }
        return { object: content.infoWindowFields[0] };
      },
      defaultValue: null,
      section: 'settings',
    },

    ownershipTypeField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.infoWindowFields || !content.infoWindowFields,
      label: {
        en: 'Ownership Type field',
        fr: 'Champ du type de propriété',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.infoWindowFields.length || typeof content.infoWindowFields[0] !== 'object') {
          return null;
        }
        return { object: content.infoWindowFields[0] };
      },
      defaultValue: null,
      section: 'settings',
    },

    facilityTypeField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.infoWindowFields || !content.infoWindowFields,
      label: {
        en: 'Facility Type field',
        fr: 'Champ du type d\'établissement',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.infoWindowFields.length || typeof content.infoWindowFields[0] !== 'object') {
          return null;
        }
        return { object: content.infoWindowFields[0] };
      },
      defaultValue: null,
      section: 'settings',
    },



    phoneNumberField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.infoWindowFields || !content.infoWindowFields,
      label: {
        en: 'Phone Number field',
        fr: 'Champ du numéro de téléphone',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.infoWindowFields.length || typeof content.infoWindowFields[0] !== 'object') {
          return null;
        }
        return { object: content.infoWindowFields[0] };
      },
      defaultValue: null,
      section: 'settings',
    },

    addressField: {
      hidden: (content, sidepanelContent, boundProps) => !boundProps.infoWindowFields || !content.infoWindowFields,
      label: {
        en: 'Address field',
        fr: 'Champ de l\'adresse',
      },
      type: 'ObjectPropertyPath',
      options: content => {
        if (!content.infoWindowFields.length || typeof content.infoWindowFields[0] !== 'object') {
          return null;
        }
        return { object: content.infoWindowFields[0] };
      },
      defaultValue: null,
      section: 'settings',
    },

    zoomControl: {
      label: { en: 'Zoom control', fr: 'Zoom control' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
    scaleControl: {
      label: { en: 'Scale control', fr: 'Scale control' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
    rotateControl: {
      label: { en: 'Rotate control', fr: 'Rotate control' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
    streetViewControl: {
      label: { en: 'Street View control', fr: 'Street View control' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
    fullscreenControl: {
      label: { en: 'Fullscreen control', fr: 'Fullscreen control' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
    mapTypeControl: {
      label: { en: 'Map Type control', fr: 'Map Type control' },
      type: 'OnOff',
      section: 'settings',
      defaultValue: true,
    },
  },
};
