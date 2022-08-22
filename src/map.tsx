import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  Autocomplete,
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useJsApiLoader,
} from '@react-google-maps/api';
import { SelectedPlace } from './interfaces';

const containerStyle = {
  width: '100%',
  height: '100%',
};

const defaultPos: google.maps.LatLngLiteral = {
  lat: -3.745,
  lng: -38.523,
};

export const MyMap = memo(() => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY!,
    libraries: ['places'],
  });

  const [geolocation, setGeolocation] = useState<{
    initialized: boolean;
    pos: { lat: number; lng: number };
  }>({
    initialized: false,
    pos:
      JSON.parse(localStorage.getItem('cached-geolocation') ?? 'null') ??
      defaultPos,
  });

  useEffect(() => {
    localStorage.setItem('cached-geolocation', JSON.stringify(geolocation.pos));
  }, [geolocation.pos]);

  const [map, setMap] = useState<google.maps.Map | null>(null);

  const [mapBounds, _setMapBounds] = useState<google.maps.LatLngBounds | null>(
    null
  );

  const setMapBounds = useCallback((map: google.maps.Map | null) => {
    const bounds = map?.getBounds();
    if (bounds) {
      _setMapBounds(bounds);
    }
  }, []);

  const onLoad = React.useCallback(
    function callback(map: google.maps.Map) {
      // const bounds = new window.google.maps.LatLngBounds(pos);
      // map.fitBounds(bounds);
      setMap(map);
      setMapBounds(map);
    },
    [setMapBounds]
  );

  const onUnmount = useCallback(function callback(_: google.maps.Map) {
    setMap(null);
  }, []);

  const [selectedPlace, _setSelectedPlace] = useState<SelectedPlace | null>(
    null
  );
  const setSelectedPlace = useCallback(
    ({ place, centerMap }: { place: SelectedPlace; centerMap: boolean }) => {
      _setSelectedPlace(place);
      if (centerMap) {
        map?.setCenter(place.pos);
      }
    },
    [map]
  );

  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const handlePlaceChanged = useCallback(() => {
    if (autocomplete) {
      const place = autocomplete.getPlace();
      if (!place.geometry?.location) {
        return;
      }
      setSelectedPlace({
        centerMap: true,
        place: {
          placeId: place.place_id,
          pos: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
        },
      });
    }
  }, [autocomplete, setSelectedPlace]);

  const [searchbox, setSearchbox] =
    useState<google.maps.places.SearchBox | null>(null);
  const handlePlacesChanged = useCallback(() => {
    if (searchbox) {
      const places = searchbox.getPlaces();
      if (!places) {
        return;
      }
      const [place] = places;
      if (!place.geometry?.location) {
        return;
      }
      setSelectedPlace({
        centerMap: true,
        place: {
          placeId: place.place_id,
          pos: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
        },
      });
    }
  }, [searchbox, setSelectedPlace]);

  const handleMapOnClick = useCallback(
    (event: google.maps.MapMouseEvent) => {
      if (event.latLng) {
        event.stop(); // no info window
        setSelectedPlace({
          centerMap: false,
          place: {
            placeId: (event as any).placeId,
            pos: {
              lat: event.latLng.lat(),
              lng: event.latLng.lng(),
            },
          },
        });
      }
    },
    [setSelectedPlace]
  );

  // https://developers.google.com/maps/documentation/javascript/examples/map-geolocation
  useEffect(() => {
    if (!geolocation.initialized) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position: GeolocationPosition) => {
            const pos = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
            console.log(pos);
            setGeolocation({
              initialized: true,
              pos,
            });
          },
          (error) => {
            setGeolocation((v) => ({
              ...v,
              initialized: true,
            }));
            console.log(error);
          }
        );
      } else {
        // Browser doesn't support Geolocation
        console.log("Browser doesn't support Geolocation");
      }
    }
  }, [geolocation.initialized, map]);

  return isLoaded ? (
    <div>
      <div style={{ height: 500 }}>
        <GoogleMap
          mapContainerStyle={containerStyle}
          center={geolocation.pos}
          // zoom levels: https://developers.google.com/maps/documentation/javascript/overview#zoom-levels
          zoom={18}
          onLoad={onLoad}
          onUnmount={onUnmount}
          onBoundsChanged={() => {
            setMapBounds(map);
          }}
          onClick={handleMapOnClick}
        >
          {selectedPlace && (
            <Marker
              position={selectedPlace.pos}
              draggable={true}
              onDragEnd={handleMapOnClick}
            />
          )}

          <Autocomplete
            onLoad={setAutocomplete}
            onPlaceChanged={handlePlaceChanged}
            bounds={mapBounds ?? undefined}
          >
            <input
              type='text'
              placeholder='Customized your placeholder'
              style={{
                boxSizing: `border-box`,
                border: `1px solid transparent`,
                width: `240px`,
                height: `32px`,
                padding: `0 12px`,
                borderRadius: `3px`,
                boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
                fontSize: `14px`,
                outline: `none`,
                textOverflow: `ellipses`,
                position: 'absolute',
                left: '50%',
                marginLeft: '-120px',
              }}
            />
          </Autocomplete>
        </GoogleMap>
      </div>
      <StandaloneSearchBox
        bounds={mapBounds ?? undefined}
        onLoad={setSearchbox}
        onPlacesChanged={handlePlacesChanged}
      >
        <input
          type='text'
          placeholder='Customized your placeholder'
          style={{
            boxSizing: `border-box`,
            border: `1px solid transparent`,
            width: `240px`,
            height: `32px`,
            padding: `0 12px`,
            borderRadius: `3px`,
            boxShadow: `0 2px 6px rgba(0, 0, 0, 0.3)`,
            fontSize: `14px`,
            outline: `none`,
            textOverflow: `ellipses`,
          }}
        />
      </StandaloneSearchBox>
      <div>
        place id: {selectedPlace?.placeId}
        coords: {JSON.stringify(selectedPlace?.pos)}
      </div>
    </div>
  ) : null;
});
