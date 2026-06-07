import type { AiSettings, AiSuggestion, Checkin, ExplorationRoute, GeoPoint, MapSettings, RouteStatus } from "@beijing-memory-map/core";

export interface CreateCheckinInput {
  placeName: string;
  address: string;
  district: string;
  point: GeoPoint;
  visitedAt: string;
  note: string;
  tags: string[];
  mood?: string;
  companion?: string;
  cost?: number;
  transport?: string;
  imagePaths: string[];
}

export interface CreateRouteInput {
  title: string;
  status: RouteStatus;
  plannedDate?: string;
  note: string;
  stops: Array<{
    placeName: string;
    point: GeoPoint;
    note: string;
  }>;
}

export interface SaveAiSettingsInput {
  baseUrl: string;
  apiKey?: string;
  model: string;
  allowFootprints: boolean;
  allowNotes: boolean;
  allowImages: boolean;
}

export interface SaveMapSettingsInput {
  amapKey?: string;
  amapSecurityCode?: string;
}

export interface GenerateSuggestionInput {
  prompt: string;
}

export interface AppApi {
  listCheckins: () => Promise<Checkin[]>;
  createCheckin: (input: CreateCheckinInput) => Promise<Checkin>;
  chooseImages: () => Promise<string[]>;
  listRoutes: () => Promise<ExplorationRoute[]>;
  createRoute: (input: CreateRouteInput) => Promise<ExplorationRoute>;
  getAiSettings: () => Promise<AiSettings>;
  saveAiSettings: (input: SaveAiSettingsInput) => Promise<AiSettings>;
  getMapSettings: () => Promise<MapSettings>;
  saveMapSettings: (input: SaveMapSettingsInput) => Promise<MapSettings>;
  generateSuggestion: (input: GenerateSuggestionInput) => Promise<AiSuggestion>;
}

declare global {
  interface Window {
    beijingMemoryMap: AppApi;
  }
}
