import { contextBridge, ipcRenderer } from "electron";
import type { AppApi, CreateCheckinInput, CreateRouteInput, GenerateSuggestionInput, SaveAiSettingsInput, SaveMapSettingsInput } from "../shared/ipc.js";

const api: AppApi = {
  listCheckins: () => ipcRenderer.invoke("checkins:list"),
  createCheckin: (input: CreateCheckinInput) => ipcRenderer.invoke("checkins:create", input),
  chooseImages: () => ipcRenderer.invoke("images:choose"),
  listRoutes: () => ipcRenderer.invoke("routes:list"),
  createRoute: (input: CreateRouteInput) => ipcRenderer.invoke("routes:create", input),
  getAiSettings: () => ipcRenderer.invoke("ai:get-settings"),
  saveAiSettings: (input: SaveAiSettingsInput) => ipcRenderer.invoke("ai:save-settings", input),
  getMapSettings: () => ipcRenderer.invoke("map:get-settings"),
  saveMapSettings: (input: SaveMapSettingsInput) => ipcRenderer.invoke("map:save-settings", input),
  generateSuggestion: (input: GenerateSuggestionInput) => ipcRenderer.invoke("ai:generate-suggestion", input)
};

contextBridge.exposeInMainWorld("beijingMemoryMap", api);
