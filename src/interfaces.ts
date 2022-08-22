export interface SelectedPlace {
  placeId?: string | null;
  pos: {
    lat: number;
    lng: number;
  };
}
