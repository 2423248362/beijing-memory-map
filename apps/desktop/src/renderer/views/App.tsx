import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import {
  Bot,
  Camera,
  CheckCircle2,
  ClipboardList,
  Crosshair,
  KeyRound,
  MapPin,
  Navigation,
  Route,
  Save,
  Search,
  Settings,
  Sparkles,
  Target
} from "lucide-react";
import type {
  AiSettings,
  Anchor,
  Checkin,
  CityTask,
  ExplorationRoute,
  GeoPoint,
  LifeCircle,
  MapSettings,
  RouteStatus,
  RouteTemplate
} from "@beijing-memory-map/core";
import type { SaveAiSettingsInput, SaveMapSettingsInput } from "../../shared/ipc";
import { cityTasks, lifeCircleCards, lifeCircles, routeTemplates, workAnchor } from "../data/beijing";
import { useAppStore } from "../store/appStore";

declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode?: string };
  }
}

type PlaceSource = "knowledge" | "memory";
type Place = LifeCircle & { source: PlaceSource; checkin?: Checkin };
type PanelTab = "today" | "place" | "route" | "memory" | "progress" | "settings";
type DraftCheckin = { point: GeoPoint; name: string; district: string; address: string };
type SaveAnchorInput = { name: string; address: string; lng: number; lat: number };
type DirectionProgress = {
  id: string;
  label: string;
  summary: string;
  placeIds: string[];
  routeThemes: string[];
  score: number;
  checkinCount: number;
  routeHit: boolean;
  complete: boolean;
};

const WORK_ANCHOR_STORAGE_KEY = "beijing-memory-map.workAnchor";

export function App() {
  const {
    checkins,
    routes,
    aiSettings,
    aiSuggestion,
    aiError,
    mapSettings,
    loading,
    load,
    createRoute,
    saveAiSettings,
    saveMapSettings
  } = useAppStore();
  const [selectedPlaceId, setSelectedPlaceId] = useState("dazhongsi");
  const [draftCheckin, setDraftCheckin] = useState<DraftCheckin | undefined>();
  const [panelTab, setPanelTab] = useState<PanelTab>("today");
  const [query, setQuery] = useState("");
  const [activeRouteId, setActiveRouteId] = useState<string | undefined>();
  const [selectedTaskId, setSelectedTaskId] = useState<string | undefined>();
  const [savedNotice, setSavedNotice] = useState("");
  const [currentAnchor, setCurrentAnchor] = useState<Anchor>(() => loadWorkAnchor());
  const places = useMemo(() => mergePlaces(checkins), [checkins]);
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0];
  const activeRoute = routes.find((route) => route.id === activeRouteId) ?? routes[0] ?? templateToRoute(routeTemplates[0]);
  const selectedTask = cityTasks.find((task) => task.id === selectedTaskId) ?? findTaskForPlace(selectedPlace.id, cityTasks);
  const recommendedTemplate = findRouteTemplateForPlace(selectedPlace.id, routeTemplates);
  const searchResults = useMemo(() => buildSearchResults(query, places, cityTasks, routeTemplates), [places, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveWorkAnchor = useCallback((input: SaveAnchorInput) => {
    const nextAnchor: Anchor = {
      id: "custom-work-anchor",
      type: "work",
      name: input.name.trim() || workAnchor.name,
      address: input.address.trim() || workAnchor.address,
      point: {
        lng: Number.isFinite(input.lng) ? input.lng : workAnchor.point.lng,
        lat: Number.isFinite(input.lat) ? input.lat : workAnchor.point.lat
      }
    };
    setCurrentAnchor(nextAnchor);
    localStorage.setItem(WORK_ANCHOR_STORAGE_KEY, JSON.stringify(nextAnchor));
    setSavedNotice(`已更新工作锚点：${nextAnchor.name}`);
  }, []);

  const selectPlace = useCallback((place: Place) => {
    setSelectedPlaceId(place.id);
    setSelectedTaskId(findTaskForPlace(place.id, cityTasks).id);
    setDraftCheckin(undefined);
    setSavedNotice("");
    setPanelTab("place");
  }, []);

  const selectDraftPoint = useCallback((draft: DraftCheckin) => {
    setDraftCheckin(draft);
    setSavedNotice("");
    setPanelTab("memory");
  }, []);

  const createRouteToPlace = useCallback(async (place: Place) => {
    const coach = buildPlaceCoach(place, currentAnchor);
    const route = await createRoute({
      title: `${currentAnchor.name} -> ${place.name}`,
      status: "planned",
      note: `围绕 ${place.name} 建立一条北京空间认知路线。`,
      stops: [
        { placeName: currentAnchor.name, point: currentAnchor.point, note: "出发锚点" },
        { placeName: place.name, point: place.point, note: coach.nextAction }
      ]
    });
    setActiveRouteId(route.id);
    setSavedNotice(`已创建路线：${route.title}`);
    setPanelTab("route");
    return route;
  }, [createRoute, currentAnchor]);

  const selectRoute = useCallback((routeId: string) => {
    setActiveRouteId(routeId);
    setSavedNotice("");
  }, []);

  return (
    <main className="appShell">
      <header className="topBar">
        <div className="brand">
          <div className="brandMark">京</div>
          <div>
            <h1>北京记忆地图</h1>
            <span>30 天建立可用的北京认知</span>
          </div>
        </div>
        <label className="searchBox">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索地点、任务、路线" />
          {query && (
            <div className="searchResults">
              {searchResults.length ? (
                searchResults.map((item) => (
                  <button
                    key={`${item.kind}-${item.id}`}
                    onClick={() => {
                      setQuery("");
                      if (item.kind === "place") selectPlace(item.payload as Place);
                      if (item.kind === "task") {
                        const task = item.payload as CityTask;
                        setSelectedTaskId(task.id);
                        const firstTarget = places.find((place) => task.targets.includes(place.id));
                        if (firstTarget) setSelectedPlaceId(firstTarget.id);
                        setSavedNotice("");
                        setPanelTab("today");
                      }
                      if (item.kind === "route") setPanelTab("route");
                    }}
                  >
                    <strong>{item.title}</strong>
                    <span>{item.meta}</span>
                  </button>
                ))
              ) : (
                <div className="emptyState">没有匹配结果。配置高德 Key 后可继续用地图选点打卡。</div>
              )}
            </div>
          )}
        </label>
        <div className="anchorBadge">
          <Navigation size={16} />
          <span>工作锚点</span>
          <strong>{currentAnchor.name}</strong>
        </div>
        <button className="iconTextButton" onClick={() => setPanelTab("settings")}>
          <Settings size={17} />
          地图设置
        </button>
      </header>

      <section className="mapArea">
        <AmapView
          mapSettings={mapSettings}
          anchor={currentAnchor}
          places={places}
          checkins={checkins}
          activeRoute={activeRoute}
          selectedPlaceId={selectedPlace.id}
          onSelectPlace={selectPlace}
          onSelectDraftPoint={selectDraftPoint}
          onOpenSettings={() => setPanelTab("settings")}
        />

        <div className="mapStats">
          <Metric label="生活圈" value={String(lifeCircles.length)} />
          <Metric label="打卡" value={String(checkins.length)} />
          <Metric label="路线" value={String(routes.length)} />
          <Metric label="完成率" value={`${progressScore(checkins, routes)}%`} />
        </div>
      </section>

      <aside className="sidePanel">
        <PanelTabs active={panelTab} onChange={setPanelTab} />
        {panelTab === "today" && (
          <GuidePanel
            place={selectedPlace}
            tasks={cityTasks}
            templates={routeTemplates}
            selectedTask={selectedTask}
            recommendedTemplate={recommendedTemplate}
            anchor={currentAnchor}
            settings={aiSettings}
            suggestion={aiSuggestion}
            error={aiError}
            loading={loading}
            onCreateRoute={() => createRouteToPlace(selectedPlace)}
            onOpenPlace={() => setPanelTab("place")}
            onOpenMemory={() => setPanelTab("memory")}
            onOpenSettings={() => setPanelTab("settings")}
            onOpenRoutes={() => setPanelTab("route")}
          />
        )}
        {panelTab === "place" && (
          <DetailPanel
            place={selectedPlace}
            onCreateRoute={() => createRouteToPlace(selectedPlace)}
            onOpenMemory={() => setPanelTab("memory")}
          />
        )}
        {panelTab === "memory" && (
          <CheckinPanel
            place={selectedPlace}
            draftCheckin={draftCheckin}
            savedNotice={savedNotice}
            onSaved={(checkin) => {
              setSavedNotice(`已保存记忆：${checkin.placeName}`);
              setDraftCheckin(undefined);
            }}
          />
        )}
        {panelTab === "route" && (
          <RoutePanel
            place={selectedPlace}
            recommendedTemplate={recommendedTemplate}
            anchor={currentAnchor}
            templates={routeTemplates}
            places={places}
            routes={routes}
            activeRouteId={activeRoute.id}
            savedNotice={savedNotice}
            onSelectRoute={selectRoute}
            onRouteCreated={(route) => {
              setActiveRouteId(route.id);
              setSavedNotice(`已创建路线：${route.title}`);
            }}
          />
        )}
        {panelTab === "progress" && (
          <ProgressPanel
            checkins={checkins}
            routes={routes}
            places={places}
            onSelectPlace={selectPlace}
            onOpenRoutes={() => setPanelTab("route")}
          />
        )}
        {panelTab === "settings" && (
          <MapSettingsPanel
            mapSettings={mapSettings}
            aiSettings={aiSettings}
            anchor={currentAnchor}
            onSaveMap={saveMapSettings}
            onSaveAi={saveAiSettings}
            onSaveAnchor={saveWorkAnchor}
          />
        )}
      </aside>
    </main>
  );
}

function AmapView({
  mapSettings,
  anchor,
  places,
  checkins,
  activeRoute,
  selectedPlaceId,
  onSelectPlace,
  onSelectDraftPoint,
  onOpenSettings
}: {
  mapSettings?: MapSettings;
  anchor: Anchor;
  places: Place[];
  checkins: Checkin[];
  activeRoute?: ExplorationRoute;
  selectedPlaceId: string;
  onSelectPlace: (place: Place) => void;
  onSelectDraftPoint: (draft: DraftCheckin) => void;
  onOpenSettings: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const amapRef = useRef<any>(null);
  const geocoderRef = useRef<any>(null);
  const overlaysRef = useRef<any[]>([]);
  const [error, setError] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const ready = Boolean(mapSettings?.amapKey && mapSettings?.amapSecurityCode);

  useEffect(() => {
    if (!containerRef.current || !ready || mapRef.current) return;
    let cancelled = false;
    setError("");
    window._AMapSecurityConfig = { securityJsCode: mapSettings?.amapSecurityCode };

    AMapLoader.load({
      key: mapSettings!.amapKey!,
      version: "2.0",
      plugins: ["AMap.Scale", "AMap.ToolBar", "AMap.Geocoder"]
    })
      .then((AMap) => {
        if (cancelled || !containerRef.current) return;
        amapRef.current = AMap;
        geocoderRef.current = new AMap.Geocoder({ city: "010" });
        const map = new AMap.Map(containerRef.current, {
          center: [anchor.point.lng, anchor.point.lat],
          zoom: 13,
          viewMode: "2D",
          resizeEnable: true
        });
        map.addControl(new AMap.Scale());
        map.addControl(new AMap.ToolBar({ position: "RB" }));
        map.on("click", (event: any) => {
          const point = { lng: event.lnglat.getLng(), lat: event.lnglat.getLat() };
          reverseGeocode(geocoderRef.current, point).then((draft) => onSelectDraftPoint(draft));
        });
        mapRef.current = map;
        setMapReady(true);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "高德地图加载失败，请检查 key、securityCode 和高德后台域名配置。");
      });

    return () => {
      cancelled = true;
      overlaysRef.current.forEach((overlay) => overlay.setMap?.(null));
      overlaysRef.current = [];
      mapRef.current?.destroy?.();
      mapRef.current = null;
      amapRef.current = null;
      setMapReady(false);
    };
  }, [anchor.point.lat, anchor.point.lng, mapSettings?.amapKey, mapSettings?.amapSecurityCode, onSelectDraftPoint, ready]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    mapRef.current.setCenter?.([anchor.point.lng, anchor.point.lat]);
  }, [anchor.point.lat, anchor.point.lng, mapReady]);

  useEffect(() => {
    const map = mapRef.current;
    const AMap = amapRef.current;
    if (!mapReady || !map || !AMap) return;
    overlaysRef.current.forEach((overlay) => overlay.setMap?.(null));
    overlaysRef.current = [];

    const routePoints = activeRoute?.stops.map((stop) => [stop.point.lng, stop.point.lat]) ?? [];
    if (routePoints.length > 1) {
      const polyline = new AMap.Polyline({
        path: routePoints,
        strokeColor: "#155eef",
        strokeWeight: 5,
        strokeOpacity: 0.86,
        lineJoin: "round",
        lineCap: "round"
      });
      map.add(polyline);
      overlaysRef.current.push(polyline);
    }

    places.forEach((place) => {
      const marker = new AMap.Marker({
        position: [place.point.lng, place.point.lat],
        title: place.name,
        anchor: "bottom-center",
        content: markerHtml(place, place.id === selectedPlaceId)
      });
      marker.on("click", () => onSelectPlace(place));
      map.add(marker);
      overlaysRef.current.push(marker);
    });

    checkins.forEach((checkin) => {
      const marker = new AMap.Marker({
        position: [checkin.point.lng, checkin.point.lat],
        title: checkin.placeName,
        anchor: "bottom-center",
        content: `<div class="marker marker-memory"><span>记</span><strong>${escapeHtml(checkin.placeName)}</strong></div>`
      });
      map.add(marker);
      overlaysRef.current.push(marker);
    });
  }, [activeRoute, checkins, mapReady, onSelectPlace, places, selectedPlaceId]);

  if (!ready) {
    return (
      <div className="mapPlaceholder">
        <KeyRound size={34} />
        <h2>配置高德地图 Key 后加载真实地图</h2>
        <p>当前不会加载地图 SDK。请在本地输入高德 Web JS API Key 和 Security Code；内置任务、认知卡和路线模板仍可先预览。</p>
        <button onClick={onOpenSettings}>打开地图设置</button>
      </div>
    );
  }

  return (
    <>
      <div ref={containerRef} className="amapContainer" />
      {error && (
        <div className="mapError">
          <strong>地图加载失败</strong>
          <span>{error}</span>
          <button onClick={onOpenSettings}>检查地图设置</button>
        </div>
      )}
    </>
  );
}

function PanelTabs({ active, onChange }: { active: PanelTab; onChange: (tab: PanelTab) => void }) {
  const tabs: Array<[PanelTab, string]> = [
    ["today", "今日"],
    ["place", "地点"],
    ["route", "路线"],
    ["memory", "记忆"],
    ["progress", "进度"],
    ["settings", "设置"]
  ];
  return (
    <div className="panelTabs">
      {tabs.map(([id, label]) => (
        <button key={id} className={active === id ? "active" : ""} onClick={() => onChange(id)}>
          {label}
        </button>
      ))}
    </div>
  );
}

function GuidePanel({
  place,
  tasks,
  templates,
  selectedTask,
  recommendedTemplate,
  anchor,
  settings,
  suggestion,
  error,
  loading,
  onCreateRoute,
  onOpenPlace,
  onOpenMemory,
  onOpenSettings,
  onOpenRoutes
}: {
  place: Place;
  tasks: CityTask[];
  templates: RouteTemplate[];
  selectedTask: CityTask;
  recommendedTemplate: RouteTemplate;
  anchor: Anchor;
  settings?: AiSettings;
  suggestion?: { title: string; summary: string; stops: string[] };
  error?: string;
  loading: boolean;
  onCreateRoute: () => Promise<ExplorationRoute>;
  onOpenPlace: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
  onOpenRoutes: () => void;
}) {
  const { generateSuggestion } = useAppStore();
  const coach = buildPlaceCoach(place, anchor);
  const hasKey = Boolean(settings?.apiKeySet);
  const prompt = buildInteractiveGuidePrompt(place, anchor);
  const todayTask = selectedTask ?? tasks[0];
  const recommendedRoute = recommendedTemplate ?? templates[0];

  return (
    <section className="guidePanel">
      <div className="guideHero">
        <div className="guideStamp">
          <span>01</span>
          <strong>今日认知</strong>
        </div>
        <div className="guideSpeech">
          <span className="eyebrow">从 {anchor.name} 出发</span>
          <h2>{place.name}</h2>
          <p>{coach.intro}</p>
        </div>
      </div>

      <div className="todayBrief">
        <InfoBlock title="今天先理解" text={todayTask.cognitiveGoal} />
        <InfoBlock title="推荐路线" text={`${recommendedRoute.title} · ${recommendedRoute.recommendedTime}`} />
      </div>

      <div className="guideActions">
        <button className="guideAction primaryGuideAction" disabled={!hasKey || loading} onClick={() => generateSuggestion(prompt)}>
          <Sparkles size={17} /> {loading ? "生成中" : "生成城市建议"}
        </button>
        <button
          className="guideAction"
          onClick={() => onCreateRoute().then(onOpenRoutes)}
        >
          <Route size={16} /> 规划路线
        </button>
        <button className="guideAction" onClick={onOpenPlace}>
          <MapPin size={16} /> 地点档案
        </button>
        <button className="guideAction" onClick={onOpenMemory}>
          <Save size={16} /> 记录记忆
        </button>
      </div>

      {!hasKey && (
        <div className="settingsStatus">
          <KeyRound size={17} />
          <span>AI Key 未配置。你仍可查看地点、规划路线和记录记忆；需要生成城市建议时，请到设置里接入 AI。</span>
          <button className="secondaryButton" onClick={onOpenSettings}>打开 AI 设置</button>
        </div>
      )}

      {error && <div className="errorBox">{error}</div>}

      <div className="guideDeck">
        <InfoBlock title="它和你的北京有什么关系" text={coach.whyNow} />
        <InfoBlock title="第一次去重点看这些" text={coach.observe} />
        <InfoBlock title="下一步行动" text={coach.nextAction} />
      </div>

      <article className="taskCard featuredTask">
        <div>
          <span>{todayTask.stage} · {todayTask.recommendedTime}</span>
          <strong>{todayTask.title}</strong>
        </div>
        <p>{todayTask.completion}</p>
        <div className="taskMeta">
          <span>{todayTask.estimatedMinutes} 分钟</span>
          <span>解锁 {todayTask.unlocks.slice(0, 2).join(" / ")}</span>
        </div>
        <div className="routeStops">
          <span>起点：{todayTask.start}</span>
          <span>目标点 {todayTask.targets.length} 个</span>
        </div>
      </article>

      {suggestion && (
        <div className="aiResultCard">
          <div className="coachHeader">
            <Bot size={18} />
            <strong>{suggestion.title}</strong>
          </div>
          <p>{suggestion.summary}</p>
          <div className="routeRibbon">
            {suggestion.stops.map((stop) => <span key={stop}>{stop}</span>)}
          </div>
        </div>
      )}

      <div className="chipRow">
        {(place.concepts ?? ["城市认知"]).map((concept) => <span key={concept}>{concept}</span>)}
      </div>
    </section>
  );
}

function CompactAiSetup({ settings, onSaveSettings }: { settings?: AiSettings; onSaveSettings: (input: SaveAiSettingsInput) => Promise<void> }) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? "https://api.longcat.chat/openai/v1");
  const [model, setModel] = useState(settings?.model ?? "LongCat-2.0-Preview");
  const hasKey = Boolean(settings?.apiKeySet);

  return (
    <div className="compactSetup">
      <strong>{hasKey ? "AI 已接入，可在这里更新配置" : "接入 AI 后可生成城市建议"}</strong>
      <label>
        <span>Base URL</span>
        <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
      </label>
      <label>
        <span>Model</span>
        <input value={model} onChange={(event) => setModel(event.target.value)} />
      </label>
      <label>
        <span>API Key</span>
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasKey ? "已配置，留空则不覆盖" : "请输入 API Key"} />
      </label>
      <button
        className="secondaryButton"
        onClick={() => onSaveSettings({ baseUrl, model, apiKey, allowFootprints: true, allowNotes: true, allowImages: false })}
      >
        <KeyRound size={16} /> {hasKey ? "更新 AI 配置" : "保存 AI 配置"}
      </button>
    </div>
  );
}

function DetailPanel({
  place,
  onCreateRoute,
  onOpenMemory
}: {
  place: Place;
  onCreateRoute: () => Promise<ExplorationRoute>;
  onOpenMemory: () => void;
}) {
  const card = lifeCircleCards[place.id];
  return (
    <section className="panelContent">
      <span className="eyebrow">地点档案 / {place.district} / {stateText(place.unlockState)}</span>
      <h2>{place.name}</h2>
      <p>{card?.cognitiveMeaning ?? place.summary}</p>
      <div className="detailStack">
        <InfoBlock title="它和我的锚点有什么关系" text={card?.anchorRelation ?? "这是你个人北京地图中的一个地点，可通过打卡逐步沉淀记忆。"} />
        <InfoBlock title="适合什么时候去" text={card?.bestFor ?? "适合在路线或任务中进一步探索。"} />
        <InfoBlock title="适合和谁去" text={card?.companion ?? "自己或朋友都可以。"} />
        <InfoBlock title="推荐行动" text={card?.recommendedAction ?? "保存一次打卡，或把它加入一条路线。"} />
      </div>
      <div className="ctaRow">
        <button className="primaryButton" onClick={onCreateRoute}>
          <Route size={17} /> 创建到这里的路线
        </button>
        <button className="secondaryButton" onClick={onOpenMemory}>
          <Save size={16} /> 记录这里的记忆
        </button>
      </div>
      <div className="chipRow">
        {(card?.concepts ?? ["个人记忆"]).map((concept) => <span key={concept}>{concept}</span>)}
      </div>
      {place.checkin && (
        <div className="memoryNote">
          <strong>打卡笔记</strong>
          <p>{place.checkin.note || "暂无笔记"}</p>
        </div>
      )}
    </section>
  );
}

function TaskPanel({ tasks, places, onSelectPlace }: { tasks: CityTask[]; places: Place[]; onSelectPlace: (place: Place) => void }) {
  return (
    <section className="panelContent">
      <span className="eyebrow">今日任务 / 阶段任务</span>
      <h2>先从一个认知目标开始</h2>
      <div className="taskList">
        {tasks.map((task) => (
          <article key={task.id} className="taskCard">
            <div>
              <span>{task.stage} · {task.recommendedTime}</span>
              <strong>{task.title}</strong>
            </div>
            <p>{task.cognitiveGoal}</p>
            <div className="taskMeta">
              <span>{task.estimatedMinutes} 分钟</span>
              <span>{task.completion}</span>
            </div>
            <div className="chipRow">
              {task.unlocks.map((item) => <span key={item}>{item}</span>)}
            </div>
            <button
              className="secondaryButton"
              onClick={() => {
                const firstTarget = places.find((place) => task.targets.includes(place.id));
                if (firstTarget) onSelectPlace(firstTarget);
              }}
            >
              <Target size={16} /> 查看第一个地点
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

function CheckinPanel({
  place,
  draftCheckin,
  savedNotice,
  onSaved
}: {
  place: Place;
  draftCheckin?: DraftCheckin;
  savedNotice: string;
  onSaved: (checkin: Checkin) => void;
}) {
  const { createCheckin, chooseImages } = useAppStore();
  const [note, setNote] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const target = draftCheckin ?? {
    point: place.point,
    name: place.name,
    district: place.district,
    address: place.name
  };

  return (
    <section className="panelContent">
      <span className="eyebrow">{draftCheckin ? "地图选点草稿" : "记忆档案"}</span>
      <h2>记录一次北京记忆</h2>
      <p>位置：{target.name}（{target.point.lng.toFixed(4)}, {target.point.lat.toFixed(4)}）</p>
      {savedNotice && <div className="successBox">{savedNotice}</div>}
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="写下这次探索的空间感、同行人或下次想补看的地方" />
      <div className="imageStrip">
        {images.map((image) => <img key={image} src={toFileUrl(image)} alt="打卡图片" />)}
        <button onClick={async () => setImages(await chooseImages())}><Camera size={17} /> 选择图片</button>
      </div>
      <button
        className="primaryButton"
        onClick={async () => {
          const checkin = await createCheckin({
            placeName: target.name,
            district: target.district,
            address: target.address,
            note,
            tags: ["探索", target.district],
            visitedAt: new Date().toISOString(),
            point: target.point,
            imagePaths: images
          });
          setImages([]);
          setNote("");
          onSaved(checkin);
        }}
      >
        <Save size={17} /> 保存打卡
      </button>
    </section>
  );
}

function RoutePanel({
  place,
  recommendedTemplate,
  anchor,
  templates,
  places,
  routes,
  activeRouteId,
  savedNotice,
  onSelectRoute,
  onRouteCreated
}: {
  place: Place;
  recommendedTemplate: RouteTemplate;
  anchor: Anchor;
  templates: RouteTemplate[];
  places: Place[];
  routes: ExplorationRoute[];
  activeRouteId?: string;
  savedNotice: string;
  onSelectRoute: (routeId: string) => void;
  onRouteCreated: (route: ExplorationRoute) => void;
}) {
  const { createRoute } = useAppStore();
  const [status] = useState<RouteStatus>("planned");
  const createFromTemplate = async (template: RouteTemplate) => {
    const stops = template.stopIds
      .map((id) => places.find((item) => item.id === id))
      .filter(Boolean)
      .map((item) => ({
        placeName: item!.name,
        point: item!.point,
        note: item!.summary
      }));
    if (stops.length < 2) return;
    const route = await createRoute({ title: template.title, status, note: template.cognitiveGoal, stops });
    onRouteCreated(route);
  };
  const createCurrentRoute = async () => {
    const route = await createRoute({
      title: `${anchor.name} -> ${place.name}`,
      status,
      note: `围绕 ${place.name} 建立一条北京空间认知路线。`,
      stops: [
        { placeName: anchor.name, point: anchor.point, note: "出发锚点" },
        { placeName: place.name, point: place.point, note: place.summary }
      ]
    });
    onRouteCreated(route);
  };

  return (
    <section className="panelContent">
      <span className="eyebrow">路线学习 / 城市骨架</span>
      <h2>从 {anchor.name} 出发</h2>
      <p>当前地点：{place.name}。路线不是简单连线，而是一个认知主题。</p>
      {savedNotice && <div className="successBox">{savedNotice}</div>}
      <div className="ctaRow">
        <button className="primaryButton" onClick={createCurrentRoute}>
          <Route size={17} /> 生成到当前地点的路线
        </button>
        <button className="secondaryButton" onClick={() => createFromTemplate(recommendedTemplate)}>
          <ClipboardList size={16} /> 使用推荐模板
        </button>
      </div>
      <div className="routeList">
        {templates.map((template) => (
          <div key={template.id}>
            <strong>{template.title}</strong>
            <span>{template.theme} · {template.recommendedTime} · {template.stopIds.length} 站</span>
            <p>{template.cognitiveGoal}</p>
            <div className="routeStops">
              {template.stopIds
                .map((id) => places.find((item) => item.id === id)?.name)
                .filter(Boolean)
                .map((name) => <span key={name}>{name}</span>)}
            </div>
            <button className="secondaryButton" onClick={() => createFromTemplate(template)}>
              <ClipboardList size={16} /> 使用模板
            </button>
          </div>
        ))}
      </div>
      <h3>已创建路线</h3>
      <div className="routeList">
        {routes.length ? (
          routes.slice(0, 5).map((route) => (
            <button
              key={route.id}
              className={`routeButton${route.id === activeRouteId ? " active" : ""}`}
              onClick={() => onSelectRoute(route.id)}
            >
              <strong>{route.title}</strong>
              <span>{route.status} · {route.stops.map((stop) => stop.placeName).join(" -> ")}</span>
            </button>
          ))
        ) : (
          <div className="emptyPanel">
            <strong>还没有创建路线</strong>
            <p>先使用推荐模板，建立第一条能落到地图上的城市学习路径。</p>
          </div>
        )}
      </div>
    </section>
  );
}

function ProgressPanel({
  checkins,
  routes,
  places,
  onSelectPlace,
  onOpenRoutes
}: {
  checkins: Checkin[];
  routes: ExplorationRoute[];
  places: Place[];
  onSelectPlace: (place: Place) => void;
  onOpenRoutes: () => void;
}) {
  const visitedDistricts = new Set(checkins.map((item) => item.district));
  const completedRoutes = routes.filter((route) => route.status === "completed").length;
  const learnedPlaces = places.filter((place) => place.unlockState === "learned" || place.unlockState === "visited" || place.unlockState === "deep").length;
  const directionProgress = buildDirectionProgress(checkins, routes, places);
  const nextGap = getNextDirectionGap(directionProgress);
  const nextPlace = nextGap ? places.find((place) => nextGap.placeIds.includes(place.id)) : undefined;
  return (
    <section className="panelContent">
      <span className="eyebrow">我的北京进度</span>
      <h2>{progressScore(checkins, routes)}% 入门进度</h2>
      <div className="infoGrid">
        <Metric label="已打卡记忆" value={String(checkins.length)} />
        <Metric label="已创建路线" value={String(routes.length)} />
        <Metric label="完成路线" value={String(completedRoutes)} />
        <Metric label="已理解点位" value={String(learnedPlaces)} />
      </div>
      <InfoBlock title="已经熟悉的区域" text={visitedDistricts.size ? Array.from(visitedDistricts).join("、") : "还没有形成个人打卡区域，先从工作锚点或知春路开始。"} />
      <div className="directionList">
        {directionProgress.map((direction) => (
          <article key={direction.id} className={`directionCard ${direction.complete ? "complete" : ""}`}>
            <div>
              <strong>{direction.label}</strong>
              <span>{direction.routeHit ? "已有路线" : "待建路线"} · {direction.checkinCount} 条记忆</span>
            </div>
            <div className="directionBar" aria-label={`${direction.score}%`}>
              <span style={{ width: `${direction.score}%` }} />
            </div>
            <p>{direction.summary}</p>
          </article>
        ))}
      </div>
      <InfoBlock
        title="建议补齐方向"
        text={nextGap ? `${nextGap.label}：${nextGap.summary}` : "核心方向都有了初步记录，可以开始做一次复盘。"}
      />
      <div className="ctaRow">
        {nextPlace && (
          <button className="primaryButton" onClick={() => onSelectPlace(nextPlace)}>
            <MapPin size={17} /> 查看下一地点
          </button>
        )}
        <button className="secondaryButton" onClick={onOpenRoutes}>
          <Route size={16} /> 查看路线建议
        </button>
      </div>
    </section>
  );
}

function MapSettingsPanel({
  mapSettings,
  aiSettings,
  anchor,
  onSaveMap,
  onSaveAi,
  onSaveAnchor
}: {
  mapSettings?: MapSettings;
  aiSettings?: AiSettings;
  anchor: Anchor;
  onSaveMap: (input: SaveMapSettingsInput) => Promise<void>;
  onSaveAi: (input: SaveAiSettingsInput) => Promise<void>;
  onSaveAnchor: (input: SaveAnchorInput) => void;
}) {
  const [amapKey, setAmapKey] = useState("");
  const [amapSecurityCode, setAmapSecurityCode] = useState("");
  const [anchorName, setAnchorName] = useState(anchor.name);
  const [anchorAddress, setAnchorAddress] = useState(anchor.address);
  const [anchorLng, setAnchorLng] = useState(String(anchor.point.lng));
  const [anchorLat, setAnchorLat] = useState(String(anchor.point.lat));

  useEffect(() => {
    setAnchorName(anchor.name);
    setAnchorAddress(anchor.address);
    setAnchorLng(String(anchor.point.lng));
    setAnchorLat(String(anchor.point.lat));
  }, [anchor]);

  return (
    <section className="panelContent">
      <span className="eyebrow">本机设置</span>
      <h2>锚点、地图与 AI 设置</h2>
      <p>配置项会保存在本机。工作锚点决定地图默认中心、路线起点和 AI 城市建议的上下文。</p>
      <div className="settingsGroup">
        <h3>工作锚点</h3>
        <label>
          <span>锚点名称</span>
          <input value={anchorName} onChange={(event) => setAnchorName(event.target.value)} placeholder="例如：字节跳动大钟寺工区" />
        </label>
        <label>
          <span>地址备注</span>
          <input value={anchorAddress} onChange={(event) => setAnchorAddress(event.target.value)} placeholder="例如：北京市海淀区大钟寺" />
        </label>
        <div className="coordinateGrid">
          <label>
            <span>经度 lng</span>
            <input value={anchorLng} onChange={(event) => setAnchorLng(event.target.value)} inputMode="decimal" />
          </label>
          <label>
            <span>纬度 lat</span>
            <input value={anchorLat} onChange={(event) => setAnchorLat(event.target.value)} inputMode="decimal" />
          </label>
        </div>
        <button
          className="primaryButton"
          onClick={() =>
            onSaveAnchor({
              name: anchorName,
              address: anchorAddress,
              lng: Number(anchorLng),
              lat: Number(anchorLat)
            })
          }
        >
          <Crosshair size={17} /> 保存工作锚点
        </button>
        <div className="settingsStatus">
          <Navigation size={17} />
          <span>当前锚点：{anchor.name}（{anchor.point.lng.toFixed(4)}, {anchor.point.lat.toFixed(4)}）</span>
        </div>
      </div>
      <div className="settingsGroup">
        <h3>高德地图</h3>
        <label>
          <span>Web JS API Key</span>
          <input value={amapKey} onChange={(event) => setAmapKey(event.target.value)} placeholder={mapSettings?.amapKeySet ? "已配置，留空则不覆盖" : "请输入高德 Key"} />
        </label>
        <label>
          <span>Security Code</span>
          <input value={amapSecurityCode} onChange={(event) => setAmapSecurityCode(event.target.value)} placeholder={mapSettings?.amapSecurityCodeSet ? "已配置，留空则不覆盖" : "请输入 Security Code"} />
        </label>
        <button className="primaryButton" onClick={() => onSaveMap({ amapKey, amapSecurityCode })}>
          <KeyRound size={17} /> 保存地图配置
        </button>
        <div className="settingsStatus">
          <CheckCircle2 size={17} />
          <span>Key：{mapSettings?.amapKeySet ? "已配置" : "未配置"}；SecurityCode：{mapSettings?.amapSecurityCodeSet ? "已配置" : "未配置"}</span>
        </div>
      </div>
      <div className="settingsGroup">
        <h3>AI 城市建议</h3>
        <CompactAiSetup settings={aiSettings} onSaveSettings={onSaveAi} />
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}

function InfoBlock({ title, text }: { title: string; text: string }) {
  return (
    <div className="infoBlock">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function loadWorkAnchor(): Anchor {
  try {
    const raw = localStorage.getItem(WORK_ANCHOR_STORAGE_KEY);
    if (!raw) return workAnchor;
    const parsed = JSON.parse(raw) as Anchor;
    if (!parsed?.name || !parsed?.point || !Number.isFinite(parsed.point.lng) || !Number.isFinite(parsed.point.lat)) {
      return workAnchor;
    }
    return {
      id: parsed.id || "custom-work-anchor",
      type: parsed.type || "work",
      name: parsed.name,
      address: parsed.address || "",
      point: parsed.point
    };
  } catch {
    return workAnchor;
  }
}

function mergePlaces(checkins: Checkin[]): Place[] {
  return [
    ...lifeCircles.map((place) => ({ ...place, ...lifeCircleCards[place.id], source: "knowledge" as const })),
    ...checkins.map((checkin) => ({
      id: checkin.id,
      name: checkin.placeName,
      district: checkin.district,
      summary: checkin.note || "这是你在北京留下的一段记忆。",
      point: checkin.point,
      unlockState: checkin.imagePaths.length ? "deep" as const : "visited" as const,
      source: "memory" as const,
      checkin
    }))
  ];
}

function buildSearchResults(query: string, places: Place[], tasks: CityTask[], templates: RouteTemplate[]) {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return [];
  return [
    ...places
      .filter((place) => [place.name, place.district, place.summary, place.cognitiveMeaning, ...(place.concepts ?? [])].filter(Boolean).some((text) => String(text).toLowerCase().includes(keyword)))
      .slice(0, 5)
      .map((place) => ({ kind: "place", id: place.id, title: place.name, meta: `${place.district} · ${stateText(place.unlockState)}`, payload: place })),
    ...tasks
      .filter((task) => [task.title, task.cognitiveGoal, task.stage, ...task.unlocks].some((text) => text.toLowerCase().includes(keyword)))
      .slice(0, 3)
      .map((task) => ({ kind: "task", id: task.id, title: task.title, meta: `${task.stage} · ${task.estimatedMinutes} 分钟`, payload: task })),
    ...templates
      .filter((template) => [template.title, template.theme, template.cognitiveGoal].some((text) => text.toLowerCase().includes(keyword)))
      .slice(0, 3)
      .map((template) => ({ kind: "route", id: template.id, title: template.title, meta: `${template.theme} · ${template.recommendedTime}`, payload: template }))
  ];
}

function findTaskForPlace(placeId: string, tasks: CityTask[]) {
  return tasks.find((task) => task.targets.includes(placeId)) ?? tasks[0];
}

function findRouteTemplateForPlace(placeId: string, templates: RouteTemplate[]) {
  return templates.find((template) => template.stopIds.includes(placeId)) ?? templates[0];
}

function buildDirectionProgress(checkins: Checkin[], routes: ExplorationRoute[], places: Place[]): DirectionProgress[] {
  const configs = [
    {
      id: "haidian-short",
      label: "海淀短线",
      summary: "从工作锚点、知春路、西土城建立工作日方向感。",
      placeIds: ["dazhongsi", "zhichunlu", "xitucheng", "wudaokou"],
      routeThemes: ["工作日短线", "海淀"]
    },
    {
      id: "old-city-axis",
      label: "老城中轴",
      summary: "从西直门进入什刹海、鼓楼和中轴线。",
      placeIds: ["xizhimen", "shichahai", "gulou", "forbidden-city", "qianmen"],
      routeThemes: ["老城", "中轴"]
    },
    {
      id: "chaoyang-social",
      label: "朝阳社交",
      summary: "理解三里屯、亮马河、国贸代表的夜间和商务场景。",
      placeIds: ["sanlitun", "liangmahe", "guomao", "wangjing", "798"],
      routeThemes: ["朝阳", "社交"]
    },
    {
      id: "south-renewal",
      label: "南城更新",
      summary: "补齐北京南站、丽泽、亦庄代表的南向城市更新。",
      placeIds: ["beijing-south", "lize", "yizhuang"],
      routeThemes: ["南城", "更新"]
    },
    {
      id: "weekend-outer",
      label: "远郊周末",
      summary: "把首钢、通州和更远的周末目的地纳入个人地图。",
      placeIds: ["shougang", "tongzhou", "summer-palace", "olympic-forest"],
      routeThemes: ["周末", "远郊"]
    }
  ];
  const checkinNames = new Set(checkins.map((checkin) => checkin.placeName));
  return configs.map((config) => {
    const placeNames = config.placeIds
      .map((id) => places.find((place) => place.id === id)?.name)
      .filter(Boolean) as string[];
    const knownPlaceCount = placeNames.filter((name) => checkinNames.has(name)).length;
    const routeHit = routes.some((route) => {
      const text = `${route.title} ${route.note}`;
      const routePlaces = route.stops.map((stop) => stop.placeName);
      return (
        config.routeThemes.some((theme) => text.includes(theme)) ||
        placeNames.some((name) => routePlaces.includes(name))
      );
    });
    const checkinCount = checkins.filter((checkin) => placeNames.includes(checkin.placeName)).length;
    const learnedCount = config.placeIds.filter((id) => {
      const place = places.find((item) => item.id === id);
      return place && ["learned", "visited", "deep"].includes(place.unlockState);
    }).length;
    const score = Math.min(100, learnedCount * 18 + knownPlaceCount * 18 + (routeHit ? 28 : 0) + Math.min(checkinCount, 2) * 9);
    return {
      ...config,
      score,
      checkinCount,
      routeHit,
      complete: score >= 70
    };
  });
}

function getNextDirectionGap(progress: DirectionProgress[]) {
  return progress.find((direction) => !direction.complete) ?? progress.sort((a, b) => a.score - b.score)[0];
}

function buildPlaceCoach(place: Place, anchor: Anchor = workAnchor) {
  const concepts = place.concepts?.length ? place.concepts.join("、") : "个人记忆";
  return {
    intro:
      place.cognitiveMeaning ??
      `${place.name} 不是地图上的孤立点，它是你正在形成的个人北京地图里的一枚坐标。先把它和工作锚点、交通方向、生活场景联系起来，比背一串攻略更有用。`,
    whyNow:
      place.anchorRelation ??
      `你当前从 ${anchor.name} 出发理解北京，${place.name} 可以作为一次低成本的空间练习：看它在哪个方向、属于哪个区、和你已经去过的地方是否连得上。`,
    observe:
      `到这里时先观察三件事：它和地铁/环路的关系，它更像工作日地点还是周末地点，以及它代表的城市概念：${concepts}。`,
    nextAction:
      place.recommendedAction ??
      `把 ${place.name} 加入一条从 ${anchor.name} 出发的路线；如果已经去过，就补一条打卡笔记，写清楚“我为什么记住这里”。`
  };
}

function buildInteractiveGuidePrompt(place: Place, anchor: Anchor = workAnchor) {
  const coach = buildPlaceCoach(place, anchor);
  return [
    `你是“北京记忆地图”的城市认知教练，口吻俏皮可爱，像一个很会带路的北京朋友。`,
    `用户刚点击了地图上的地点：${place.name}。`,
    `用户的工作锚点：${anchor.name}。地点区域：${place.district}。`,
    `请用清晰、具体、俏皮但不幼稚的口吻介绍这个地点，不要写百科词条，不要堆表情符号。`,
    `你需要回答：`,
    `1. 用 2-3 句话讲这个地方为什么值得新人认识；`,
    `2. 用一个轻松比喻解释它在北京空间里的位置；`,
    `3. 给出第一次去的观察任务，比如看地铁、环路、人群、街区气质；`,
    `4. 规划一条从${anchor.name}出发、能落到地图上的路线，stops 只放地点名数组。`,
    `已知认知信息：${coach.intro}`,
    `锚点关系：${coach.whyNow}`,
    `观察重点：${coach.observe}`,
    `下一步行动：${coach.nextAction}`,
    `输出严格 JSON：{"title":"...","summary":"...","stops":["${anchor.name}","..."]}。summary 要活泼、有一点可爱的小比喻，但不要超过 180 字。`
  ].join("\n");
}

function templateToRoute(template: RouteTemplate): ExplorationRoute {
  const stops = template.stopIds
    .map((id) => lifeCircles.find((place) => place.id === id))
    .filter(Boolean)
    .map((place, index) => ({
      id: `${template.id}-${place!.id}`,
      placeName: place!.name,
      point: place!.point,
      note: place!.summary,
      sortOrder: index
    }));
  return {
    id: template.id,
    title: template.title,
    status: "planned",
    note: template.cognitiveGoal,
    stops,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString()
  };
}

function markerHtml(place: Place, selected: boolean) {
  const className = `marker marker-${place.unlockState}${selected ? " selected" : ""}`;
  return `<div class="${className}" data-place-id="${escapeHtml(place.id)}"><span>${markerGlyph(place)}</span><strong>${escapeHtml(place.name)}</strong></div>`;
}

function markerGlyph(place: Place) {
  if (place.source === "memory") return "记";
  if (place.unlockState === "locked") return "未";
  if (place.unlockState === "planned") return "划";
  if (place.unlockState === "learned") return "学";
  if (place.unlockState === "deep") return "深";
  return "到";
}

function stateText(state: LifeCircle["unlockState"]) {
  return {
    locked: "未了解",
    planned: "推荐了解",
    learned: "已学习",
    visited: "已去过",
    deep: "深度记录"
  }[state];
}

async function reverseGeocode(geocoder: any, point: GeoPoint): Promise<DraftCheckin> {
  if (!geocoder) {
    return { point, name: "地图选点", district: "北京市", address: "地图选点" };
  }
  return new Promise((resolve) => {
    geocoder.getAddress([point.lng, point.lat], (status: string, result: any) => {
      const component = result?.regeocode?.addressComponent;
      const address = result?.regeocode?.formattedAddress;
      const poiName = result?.regeocode?.pois?.[0]?.name;
      resolve({
        point,
        name: poiName || address || "地图选点",
        district: component?.district || "北京市",
        address: address || "地图选点"
      });
    });
  });
}

function progressScore(checkins: Checkin[], routes: ExplorationRoute[]) {
  const checkinScore = Math.min(checkins.length, 10) * 5;
  const routeScore = Math.min(routes.length, 4) * 10;
  const completedScore = routes.filter((route) => route.status === "completed").length * 10;
  return Math.min(100, checkinScore + routeScore + completedScore);
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#039;"
  })[char]!);
}

function toFileUrl(filePath: string) {
  return `file:///${filePath.replace(/\\/g, "/")}`;
}
