import { create } from "zustand";
import type { AiSettings, AiSuggestion, Checkin, ExplorationRoute, GeoPoint, MapSettings } from "@beijing-memory-map/core";
import type { AppApi, CreateCheckinInput, CreateRouteInput, SaveAiSettingsInput, SaveMapSettingsInput } from "../../shared/ipc";

interface AppState {
  checkins: Checkin[];
  routes: ExplorationRoute[];
  aiSettings?: AiSettings;
  mapSettings?: MapSettings;
  aiSuggestion?: AiSuggestion;
  aiError?: string;
  selectedPoint?: GeoPoint;
  selectedName?: string;
  loading: boolean;
  load: () => Promise<void>;
  selectPoint: (point: GeoPoint, name?: string) => void;
  chooseImages: () => Promise<string[]>;
  createCheckin: (input: CreateCheckinInput) => Promise<Checkin>;
  createRoute: (input: CreateRouteInput) => Promise<ExplorationRoute>;
  saveAiSettings: (input: SaveAiSettingsInput) => Promise<void>;
  saveMapSettings: (input: SaveMapSettingsInput) => Promise<void>;
  generateSuggestion: (prompt: string) => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  checkins: [],
  routes: [],
  loading: true,
  load: async () => {
    const api = getApi();
    const [checkins, routes, aiSettings, mapSettings] = await Promise.all([
      api.listCheckins(),
      api.listRoutes(),
      api.getAiSettings(),
      api.getMapSettings()
    ]);
    set({ checkins, routes, aiSettings, mapSettings, loading: false });
  },
  selectPoint: (point, name) => set({ selectedPoint: point, selectedName: name }),
  chooseImages: () => getApi().chooseImages(),
  createCheckin: async (input) => {
    const api = getApi();
    const checkin = await api.createCheckin(input);
    set({ checkins: await api.listCheckins() });
    return checkin;
  },
  createRoute: async (input) => {
    const api = getApi();
    const route = await api.createRoute(input);
    set({ routes: await api.listRoutes() });
    return route;
  },
  saveAiSettings: async (input) => {
    set({ aiSettings: await getApi().saveAiSettings(input) });
  },
  saveMapSettings: async (input) => {
    set({ mapSettings: await getApi().saveMapSettings(input) });
  },
  generateSuggestion: async (prompt) => {
    set({ loading: true, aiError: undefined });
    let aiSuggestion: AiSuggestion;
    try {
      aiSuggestion = await getApi().generateSuggestion({ prompt });
    } catch (error) {
      set({
        aiError: error instanceof Error ? error.message : "AI 生成失败，请检查 API Key、Base URL 和模型配置。",
        loading: false
      });
      return;
    }
    set({ aiSuggestion, loading: false });
    const routes = get().routes;
    if (aiSuggestion.stops.length && !routes.some((route) => route.title === aiSuggestion.title)) {
      await get().createRoute({
        title: aiSuggestion.title,
        status: "planned",
        note: aiSuggestion.summary,
        stops: aiSuggestion.stops.map((placeName, index) => ({
          placeName,
          point: { lng: 116.34 + index * 0.02, lat: 39.97 - index * 0.01 },
          note: "AI 建议停靠点"
        }))
      });
    }
  }
}));

const PREVIEW_AI_STORAGE_KEY = "beijing-memory-map.preview.ai";

const previewAi = loadPreviewAiSettings();

const previewState: {
  checkins: Checkin[];
  routes: ExplorationRoute[];
  aiSettings: AiSettings;
  aiSecret: string;
  mapSettings: MapSettings;
} = {
  checkins: [],
  routes: [],
  aiSettings: previewAi.settings,
  aiSecret: previewAi.secret,
  mapSettings: {
    provider: "amap",
    amapKeySet: false,
    amapSecurityCodeSet: false
  }
};

const previewApi: AppApi = {
  listCheckins: async () => previewState.checkins,
  createCheckin: async (input) => {
    const record: Checkin = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    previewState.checkins = [record, ...previewState.checkins];
    return record;
  },
  chooseImages: async () => [],
  listRoutes: async () => previewState.routes,
  createRoute: async (input) => {
    const route: ExplorationRoute = {
      ...input,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stops: input.stops.map((stop, index) => ({
        ...stop,
        id: crypto.randomUUID(),
        sortOrder: index
      }))
    };
    previewState.routes = [route, ...previewState.routes];
    return route;
  },
  getAiSettings: async () => previewState.aiSettings,
  saveAiSettings: async (input) => {
    if (input.apiKey?.trim()) previewState.aiSecret = input.apiKey.trim();
    previewState.aiSettings = {
      baseUrl: input.baseUrl.trim(),
      model: input.model.trim(),
      apiKeySet: Boolean(previewState.aiSecret),
      allowFootprints: input.allowFootprints,
      allowNotes: input.allowNotes,
      allowImages: input.allowImages
    };
    savePreviewAiSettings(previewState.aiSettings, previewState.aiSecret);
    return previewState.aiSettings;
  },
  getMapSettings: async () => previewState.mapSettings,
  saveMapSettings: async (input) => {
    previewState.mapSettings = {
      provider: "amap",
      amapKeySet: Boolean(input.amapKey),
      amapSecurityCodeSet: Boolean(input.amapSecurityCode),
      amapKey: input.amapKey,
      amapSecurityCode: input.amapSecurityCode
    };
    return previewState.mapSettings;
  },
  generateSuggestion: async (input) => {
    if (!previewState.aiSecret) {
      throw new Error("请先配置 AI API Key。");
    }
    const response = await fetch(`${previewState.aiSettings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${previewState.aiSecret}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: previewState.aiSettings.model,
        messages: [
          {
            role: "system",
            content: "你是北京记忆地图的俏皮城市教练，像一个很会带路的北京朋友。输出 JSON，字段为 title、summary、stops。summary 要可爱、有画面感，但不要幼稚、不要堆表情。"
          },
          { role: "user", content: input.prompt }
        ],
        response_format: { type: "json_object" }
      })
    });
    if (!response.ok) throw new Error(`AI 请求失败：${response.status}`);
    const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = payload.choices?.[0]?.message?.content;
    if (!content) throw new Error("AI 响应为空。");
    const parsed = JSON.parse(content) as Partial<AiSuggestion>;
    return {
      title: parsed.title || "北京探索建议",
      summary: parsed.summary || "已生成建议。",
      stops: Array.isArray(parsed.stops) ? parsed.stops : []
    };
  }
};

function getApi() {
  return window.beijingMemoryMap ?? previewApi;
}

function loadPreviewAiSettings(): { settings: AiSettings; secret: string } {
  const fallback = {
    settings: {
      baseUrl: "https://api.longcat.chat/openai/v1",
      apiKeySet: false,
      model: "LongCat-2.0-Preview",
      allowFootprints: true,
      allowNotes: true,
      allowImages: false
    },
    secret: ""
  };
  try {
    const raw = localStorage.getItem(PREVIEW_AI_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<AiSettings> & { apiKey?: string };
    const secret = parsed.apiKey || "";
    return {
      settings: {
        baseUrl: parsed.baseUrl || fallback.settings.baseUrl,
        apiKeySet: Boolean(secret),
        model: parsed.model || fallback.settings.model,
        allowFootprints: parsed.allowFootprints ?? fallback.settings.allowFootprints,
        allowNotes: parsed.allowNotes ?? fallback.settings.allowNotes,
        allowImages: parsed.allowImages ?? fallback.settings.allowImages
      },
      secret
    };
  } catch {
    return fallback;
  }
}

function savePreviewAiSettings(settings: AiSettings, secret: string) {
  localStorage.setItem(PREVIEW_AI_STORAGE_KEY, JSON.stringify({ ...settings, apiKey: secret }));
}
