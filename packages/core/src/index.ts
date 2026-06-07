export type UnlockKind = "district" | "lifeCircle" | "route" | "subway" | "theme";

export type UnlockState = "locked" | "planned" | "learned" | "visited" | "deep";

export type RouteStatus = "planned" | "partial" | "completed" | "revisit";

export type CheckinTag = string;

export interface GeoPoint {
  lng: number;
  lat: number;
}

export interface Anchor {
  id: string;
  name: string;
  type: "work" | "home" | "custom";
  address: string;
  point: GeoPoint;
}

export interface LifeCircle {
  id: string;
  name: string;
  district: string;
  summary: string;
  cognitiveMeaning?: string;
  anchorRelation?: string;
  bestFor?: string;
  companion?: string;
  recommendedAction?: string;
  concepts?: string[];
  point: GeoPoint;
  unlockState: UnlockState;
}

export type TaskType = "region" | "route" | "checkin" | "concept" | "gap";

export interface CityTask {
  id: string;
  title: string;
  type: TaskType;
  stage: string;
  cognitiveGoal: string;
  estimatedMinutes: number;
  recommendedTime: string;
  start: string;
  targets: string[];
  completion: string;
  unlocks: string[];
}

export interface RouteTemplate {
  id: string;
  title: string;
  theme: string;
  recommendedTime: string;
  cognitiveGoal: string;
  stopIds: string[];
}

export interface Checkin {
  id: string;
  placeName: string;
  address: string;
  district: string;
  point: GeoPoint;
  visitedAt: string;
  note: string;
  tags: CheckinTag[];
  mood?: string;
  companion?: string;
  cost?: number;
  transport?: string;
  imagePaths: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RouteStop {
  id: string;
  placeName: string;
  point: GeoPoint;
  note: string;
  sortOrder: number;
}

export interface ExplorationRoute {
  id: string;
  title: string;
  status: RouteStatus;
  plannedDate?: string;
  note: string;
  stops: RouteStop[];
  createdAt: string;
  updatedAt: string;
}

export interface AiSettings {
  baseUrl: string;
  apiKeySet: boolean;
  model: string;
  allowFootprints: boolean;
  allowNotes: boolean;
  allowImages: boolean;
}

export interface AiSuggestion {
  title: string;
  summary: string;
  stops: string[];
}

export interface MapSettings {
  provider: "amap";
  amapKeySet: boolean;
  amapSecurityCodeSet: boolean;
  amapKey?: string;
  amapSecurityCode?: string;
}
