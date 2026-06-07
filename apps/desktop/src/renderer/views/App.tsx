import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AMapLoader from "@amap/amap-jsapi-loader";
import {
  Bot,
  Camera,
  CheckCircle2,
  ClipboardList,
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
type PanelTab = "guide" | "tasks" | "checkin" | "route" | "progress" | "settings";
type DraftCheckin = { point: GeoPoint; name: string; district: string; address: string };

export function App() {
  const { checkins, routes, aiSettings, aiSuggestion, aiError, mapSettings, loading, load, saveAiSettings, saveMapSettings } = useAppStore();
  const [selectedPlaceId, setSelectedPlaceId] = useState("dazhongsi");
  const [draftCheckin, setDraftCheckin] = useState<DraftCheckin | undefined>();
  const [panelTab, setPanelTab] = useState<PanelTab>("guide");
  const [guidePopKey, setGuidePopKey] = useState(0);
  const [query, setQuery] = useState("");
  const [activeRouteId, setActiveRouteId] = useState<string | undefined>();
  const places = useMemo(() => mergePlaces(checkins), [checkins]);
  const selectedPlace = places.find((place) => place.id === selectedPlaceId) ?? places[0];
  const activeRoute = routes.find((route) => route.id === activeRouteId) ?? routes[0] ?? templateToRoute(routeTemplates[0]);
  const searchResults = useMemo(() => buildSearchResults(query, places, cityTasks, routeTemplates), [places, query]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectPlace = useCallback((place: Place) => {
    setSelectedPlaceId(place.id);
    setDraftCheckin(undefined);
    setPanelTab("guide");
    setGuidePopKey((value) => value + 1);
  }, []);

  const selectDraftPoint = useCallback((draft: DraftCheckin) => {
    setDraftCheckin(draft);
    setPanelTab("checkin");
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
                      if (item.kind === "task") setPanelTab("tasks");
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
          <strong>{workAnchor.name}</strong>
        </div>
        <button className="iconTextButton" onClick={() => setPanelTab("settings")}>
          <Settings size={17} />
          地图设置
        </button>
      </header>

      <section className="mapArea">
        <AmapView
          mapSettings={mapSettings}
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
        {panelTab === "guide" && (
          <GuidePanel
            popKey={guidePopKey}
            place={selectedPlace}
            settings={aiSettings}
            suggestion={aiSuggestion}
            error={aiError}
            loading={loading}
            onSaveSettings={saveAiSettings}
            onOpenCheckin={() => setPanelTab("checkin")}
            onOpenTasks={() => setPanelTab("tasks")}
            onOpenRoutes={() => setPanelTab("route")}
          />
        )}
        {panelTab === "tasks" && <TaskPanel tasks={cityTasks} places={places} onSelectPlace={selectPlace} />}
        {panelTab === "checkin" && <CheckinPanel place={selectedPlace} draftCheckin={draftCheckin} />}
        {panelTab === "route" && (
          <RoutePanel
            place={selectedPlace}
            templates={routeTemplates}
            places={places}
            routes={routes}
            onSelectRoute={(routeId) => setActiveRouteId(routeId)}
          />
        )}
        {panelTab === "progress" && <ProgressPanel checkins={checkins} routes={routes} places={places} />}
        {panelTab === "settings" && <MapSettingsPanel settings={mapSettings} onSave={saveMapSettings} />}
      </aside>
    </main>
  );
}

function AmapView({
  mapSettings,
  places,
  checkins,
  activeRoute,
  selectedPlaceId,
  onSelectPlace,
  onSelectDraftPoint,
  onOpenSettings
}: {
  mapSettings?: MapSettings;
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
          center: [workAnchor.point.lng, workAnchor.point.lat],
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
  }, [mapSettings?.amapKey, mapSettings?.amapSecurityCode, onSelectDraftPoint, ready]);

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
    ["guide", "导览"],
    ["tasks", "任务"],
    ["checkin", "打卡"],
    ["route", "路线"],
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
  popKey,
  place,
  settings,
  suggestion,
  error,
  loading,
  onSaveSettings,
  onOpenCheckin,
  onOpenTasks,
  onOpenRoutes
}: {
  popKey: number;
  place: Place;
  settings?: AiSettings;
  suggestion?: { title: string; summary: string; stops: string[] };
  error?: string;
  loading: boolean;
  onSaveSettings: (input: SaveAiSettingsInput) => Promise<void>;
  onOpenCheckin: () => void;
  onOpenTasks: () => void;
  onOpenRoutes: () => void;
}) {
  const { generateSuggestion, createRoute } = useAppStore();
  const coach = buildPlaceCoach(place);
  const hasKey = Boolean(settings?.apiKeySet);
  const prompt = buildInteractiveGuidePrompt(place);

  return (
    <section className="guidePanel">
      <div className="guideHero">
        <AnimeGuideAvatar popKey={popKey} />
        <div className="guideSpeech">
          <span className="eyebrow">城市导游 · 当前地点</span>
          <h2>{place.name}</h2>
          <p>{coach.intro}</p>
        </div>
      </div>

      <div className="guideActions">
        <button className="guideAction primaryGuideAction" disabled={!hasKey || loading} onClick={() => generateSuggestion(prompt)}>
          <Sparkles size={17} /> {loading ? "导游思考中" : "让导游讲解"}
        </button>
        <button
          className="guideAction"
          onClick={() =>
            createRoute({
              title: `导游路线：大钟寺 -> ${place.name}`,
              status: "planned",
              note: `由互动导游围绕 ${place.name} 创建的探索路线。`,
              stops: [
                { placeName: workAnchor.name, point: workAnchor.point, note: "从你的工作锚点出发" },
                { placeName: place.name, point: place.point, note: coach.nextAction }
              ]
            }).then(onOpenRoutes)
          }
        >
          <Route size={16} /> 规划路线
        </button>
        <button className="guideAction" onClick={onOpenCheckin}>
          <Save size={16} /> 去打卡
        </button>
        <button className="guideAction" onClick={onOpenTasks}>
          <Target size={16} /> 匹配任务
        </button>
      </div>

      {!hasKey && (
        <CompactAiSetup settings={settings} onSaveSettings={onSaveSettings} />
      )}

      {error && <div className="errorBox">{error}</div>}

      <div className="guideDeck">
        <InfoBlock title="它和你的北京有什么关系" text={coach.whyNow} />
        <InfoBlock title="第一次去别只拍照，重点看这些" text={coach.observe} />
        <InfoBlock title="导游给你的下一步" text={coach.nextAction} />
      </div>

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

function AnimeGuideAvatar({ popKey }: { popKey: number }) {
  return (
    <div key={popKey} className="avatarStage avatarPop" aria-hidden="true">
      <div className="avatarShadow" />
      <div className="avatarModel">
        <div className="avatarHalo" />
        <div className="avatarHair hairBack" />
        <div className="avatarBeret" />
        <div className="avatarHead">
          <div className="avatarHair hairBang left" />
          <div className="avatarHair hairBang right" />
          <div className="avatarEye left" />
          <div className="avatarEye right" />
          <div className="avatarBlush left" />
          <div className="avatarBlush right" />
          <div className="avatarMouth" />
        </div>
        <div className="avatarEarpiece left" />
        <div className="avatarEarpiece right" />
        <div className="avatarScarf" />
        <div className="avatarBody">
          <div className="avatarBadge">京</div>
        </div>
        <div className="avatarArm left" />
        <div className="avatarArm right" />
      </div>
    </div>
  );
}

function CompactAiSetup({ settings, onSaveSettings }: { settings?: AiSettings; onSaveSettings: (input: SaveAiSettingsInput) => Promise<void> }) {
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? "https://api.longcat.chat/openai/v1");
  const [model, setModel] = useState(settings?.model ?? "LongCat-2.0-Preview");

  return (
    <div className="compactSetup">
      <strong>先接入 AI，导游才会开口</strong>
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
        <input type="password" value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="请输入 API Key" />
      </label>
      <button
        className="secondaryButton"
        onClick={() => onSaveSettings({ baseUrl, model, apiKey, allowFootprints: true, allowNotes: true, allowImages: false })}
      >
        <KeyRound size={16} /> 保存 AI 配置
      </button>
    </div>
  );
}

function DetailPanel({ place }: { place: Place }) {
  const card = lifeCircleCards[place.id];
  return (
    <section className="panelContent">
      <span className="eyebrow">{place.district} / {stateText(place.unlockState)}</span>
      <h2>{place.name}</h2>
      <p>{card?.cognitiveMeaning ?? place.summary}</p>
      <div className="detailStack">
        <InfoBlock title="它和我的锚点有什么关系" text={card?.anchorRelation ?? "这是你个人北京地图中的一个地点，可通过打卡逐步沉淀记忆。"} />
        <InfoBlock title="适合什么时候去" text={card?.bestFor ?? "适合在路线或任务中进一步探索。"} />
        <InfoBlock title="适合和谁去" text={card?.companion ?? "自己或朋友都可以。"} />
        <InfoBlock title="推荐行动" text={card?.recommendedAction ?? "保存一次打卡，或把它加入一条路线。"} />
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

function CheckinPanel({ place, draftCheckin }: { place: Place; draftCheckin?: DraftCheckin }) {
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
      <span className="eyebrow">{draftCheckin ? "地图选点草稿" : "地点打卡"}</span>
      <h2>记录一次北京记忆</h2>
      <p>位置：{target.name}（{target.point.lng.toFixed(4)}, {target.point.lat.toFixed(4)}）</p>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="写下这次探索的空间感、同行人或下次想补看的地方" />
      <div className="imageStrip">
        {images.map((image) => <img key={image} src={toFileUrl(image)} alt="打卡图片" />)}
        <button onClick={async () => setImages(await chooseImages())}><Camera size={17} /> 选择图片</button>
      </div>
      <button
        className="primaryButton"
        onClick={async () => {
          await createCheckin({
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
        }}
      >
        <Save size={17} /> 保存打卡
      </button>
    </section>
  );
}

function RoutePanel({
  place,
  templates,
  places,
  routes,
  onSelectRoute
}: {
  place: Place;
  templates: RouteTemplate[];
  places: Place[];
  routes: ExplorationRoute[];
  onSelectRoute: (routeId: string) => void;
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
    await createRoute({ title: template.title, status, note: template.cognitiveGoal, stops });
  };

  return (
    <section className="panelContent">
      <span className="eyebrow">主题路线 / 城市学习路径</span>
      <h2>从大钟寺出发规划路线</h2>
      <p>当前地点：{place.name}。路线不是简单连线，而是一个认知主题。</p>
      <button
        className="primaryButton"
        onClick={() =>
          createRoute({
            title: `大钟寺 -> ${place.name}`,
            status,
            note: `围绕 ${place.name} 建立一条北京空间认知路线。`,
            stops: [
              { placeName: workAnchor.name, point: workAnchor.point, note: "出发锚点" },
              { placeName: place.name, point: place.point, note: place.summary }
            ]
          })
        }
      >
        <Route size={17} /> 生成到当前地点的路线
      </button>
      <div className="routeList">
        {templates.map((template) => (
          <div key={template.id}>
            <strong>{template.title}</strong>
            <span>{template.theme} · {template.recommendedTime}</span>
            <p>{template.cognitiveGoal}</p>
            <button className="secondaryButton" onClick={() => createFromTemplate(template)}>
              <ClipboardList size={16} /> 使用模板
            </button>
          </div>
        ))}
      </div>
      <h3>已创建路线</h3>
      <div className="routeList">
        {routes.slice(0, 5).map((route) => (
          <button key={route.id} className="routeButton" onClick={() => onSelectRoute(route.id)}>
            <strong>{route.title}</strong>
            <span>{route.status} · {route.stops.map((stop) => stop.placeName).join(" -> ")}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProgressPanel({ checkins, routes, places }: { checkins: Checkin[]; routes: ExplorationRoute[]; places: Place[] }) {
  const visitedDistricts = new Set(checkins.map((item) => item.district));
  const completedRoutes = routes.filter((route) => route.status === "completed").length;
  const learnedPlaces = places.filter((place) => place.unlockState === "learned" || place.unlockState === "visited" || place.unlockState === "deep").length;
  const gaps = ["朝阳区", "东城区", "西城区", "丰台区", "通州区", "大兴区"].filter((district) => !visitedDistricts.has(district));
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
      <InfoBlock title="已经熟悉的区域" text={visitedDistricts.size ? Array.from(visitedDistricts).join("、") : "还没有形成个人打卡区域，先从大钟寺或知春路开始。"} />
      <InfoBlock title="建议补齐方向" text={gaps.length ? gaps.slice(0, 4).join("、") : "核心城区方向已经有记录，可以开始做复盘。"} />
      <div className="chipRow">
        {["海淀知识线", "老城文化线", "朝阳社交线", "南城更新线"].map((item) => <span key={item}>{item}</span>)}
      </div>
    </section>
  );
}

function AiPanel({
  place,
  settings,
  suggestion,
  error,
  loading,
  onSaveSettings
}: {
  place: Place;
  settings?: AiSettings;
  suggestion?: { title: string; summary: string; stops: string[] };
  error?: string;
  loading: boolean;
  onSaveSettings: (input: SaveAiSettingsInput) => Promise<void>;
}) {
  const { generateSuggestion } = useAppStore();
  const defaultPrompt = buildPlacePrompt(place);
  const [prompt, setPrompt] = useState(defaultPrompt);
  const [baseUrl, setBaseUrl] = useState(settings?.baseUrl ?? "https://api.longcat.chat/openai/v1");
  const [model, setModel] = useState(settings?.model ?? "LongCat-2.0-Preview");
  const [apiKey, setApiKey] = useState("");
  const [allowFootprints, setAllowFootprints] = useState(settings?.allowFootprints ?? true);
  const [allowNotes, setAllowNotes] = useState(settings?.allowNotes ?? true);

  useEffect(() => {
    setPrompt(defaultPrompt);
  }, [defaultPrompt]);

  useEffect(() => {
    setBaseUrl(settings?.baseUrl ?? "https://api.longcat.chat/openai/v1");
    setModel(settings?.model ?? "LongCat-2.0-Preview");
    setAllowFootprints(settings?.allowFootprints ?? true);
    setAllowNotes(settings?.allowNotes ?? true);
  }, [settings]);

  const hasKey = Boolean(settings?.apiKeySet);

  return (
    <section className="panelContent">
      <span className="eyebrow">AI 城市教练</span>
      <h2>配置 API Key 后介绍 {place.name}</h2>
      <div className="settingsStatus">
        <Bot size={17} />
        <span>AI API Key：{hasKey ? "已配置" : "未配置"}。未配置时不会生成本地建议。</span>
      </div>

      <div className="aiSettingsGrid">
        <label>
          <span>Base URL</span>
          <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://api.longcat.chat/openai/v1" />
        </label>
        <label>
          <span>Model</span>
          <input value={model} onChange={(event) => setModel(event.target.value)} placeholder="LongCat-2.0-Preview" />
        </label>
        <label className="fullWidth">
          <span>API Key</span>
          <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder={hasKey ? "已配置，留空则不覆盖" : "请输入 API Key"} type="password" />
        </label>
        <label className="checkRow">
          <input type="checkbox" checked={allowFootprints} onChange={(event) => setAllowFootprints(event.target.checked)} />
          <span>允许使用本地打卡地点作为上下文</span>
        </label>
        <label className="checkRow">
          <input type="checkbox" checked={allowNotes} onChange={(event) => setAllowNotes(event.target.checked)} />
          <span>允许使用本地笔记作为上下文</span>
        </label>
      </div>
      <button
        className="secondaryButton"
        onClick={() =>
          onSaveSettings({
            baseUrl,
            model,
            apiKey,
            allowFootprints,
            allowNotes,
            allowImages: false
          })
        }
      >
        <KeyRound size={16} /> 保存 AI 配置
      </button>

      <h3>点击地点上下文</h3>
      <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
      <button className="primaryButton" disabled={!hasKey || loading} onClick={() => generateSuggestion(prompt)}>
        <Sparkles size={17} /> {loading ? "生成中" : `用 AI 介绍 ${place.name}`}
      </button>
      {!hasKey && <div className="errorBox">请先保存 AI API Key。这里不会提供无需 Key 的本地建议。</div>}
      {error && <div className="errorBox">{error}</div>}
      {suggestion && (
        <div className="suggestion">
          <strong>{suggestion.title}</strong>
          <p>{suggestion.summary}</p>
          <span>{suggestion.stops.join(" -> ")}</span>
        </div>
      )}
    </section>
  );
}

function MapSettingsPanel({ settings, onSave }: { settings?: MapSettings; onSave: (input: SaveMapSettingsInput) => Promise<void> }) {
  const [amapKey, setAmapKey] = useState("");
  const [amapSecurityCode, setAmapSecurityCode] = useState("");
  return (
    <section className="panelContent">
      <h2>高德地图设置</h2>
      <p>配置高德 Web JS API 2.0 的 Key 和 Security Code。配置会保存到本机 SQLite 设置表。</p>
      <label>
        <span>Web JS API Key</span>
        <input value={amapKey} onChange={(event) => setAmapKey(event.target.value)} placeholder={settings?.amapKeySet ? "已配置，留空则不覆盖" : "请输入高德 Key"} />
      </label>
      <label>
        <span>Security Code</span>
        <input value={amapSecurityCode} onChange={(event) => setAmapSecurityCode(event.target.value)} placeholder={settings?.amapSecurityCodeSet ? "已配置，留空则不覆盖" : "请输入 Security Code"} />
      </label>
      <button className="primaryButton" onClick={() => onSave({ amapKey, amapSecurityCode })}>
        <KeyRound size={17} /> 保存地图配置
      </button>
      <div className="settingsStatus">
        <CheckCircle2 size={17} />
        <span>Key：{settings?.amapKeySet ? "已配置" : "未配置"}；SecurityCode：{settings?.amapSecurityCodeSet ? "已配置" : "未配置"}</span>
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

function buildPlaceCoach(place: Place) {
  const concepts = place.concepts?.length ? place.concepts.join("、") : "个人记忆";
  return {
    intro:
      place.cognitiveMeaning ??
      `${place.name} 不是地图上的孤立点，它是你正在形成的个人北京地图里的一枚坐标。先把它和工作锚点、交通方向、生活场景联系起来，比背一串攻略更有用。`,
    whyNow:
      place.anchorRelation ??
      `你当前从 ${workAnchor.name} 出发理解北京，${place.name} 可以作为一次低成本的空间练习：看它在哪个方向、属于哪个区、和你已经去过的地方是否连得上。`,
    observe:
      `到这里时先观察三件事：它和地铁/环路的关系，它更像工作日地点还是周末地点，以及它代表的城市概念：${concepts}。`,
    nextAction:
      place.recommendedAction ??
      `把 ${place.name} 加入一条从大钟寺出发的路线；如果已经去过，就补一条打卡笔记，写清楚“我为什么记住这里”。`
  };
}

function buildPlacePrompt(place: Place) {
  const coach = buildPlaceCoach(place);
  return [
    `请以“北京记忆地图”的城市教练口吻，具体介绍我刚点击的地点：${place.name}。`,
    `我的工作锚点是：${workAnchor.name}。`,
    `地点所在区域：${place.district}。`,
    `请不要写百科介绍，要像一个熟悉北京的朋友解释：`,
    `1. 这个地方对刚来北京的人为什么重要；`,
    `2. 它和大钟寺/海淀/老城/朝阳等方向的关系；`,
    `3. 适合什么时候去、和谁去；`,
    `4. 第一次去应该观察什么；`,
    `5. 给出一条可落到地图上的路线建议。`,
    `已知认知信息：${coach.intro}`,
    `锚点关系：${coach.whyNow}`,
    `观察重点：${coach.observe}`,
    `建议行动：${coach.nextAction}`,
    `输出 JSON，字段为 title、summary、stops。summary 要自然、有温度，但保持简洁。`
  ].join("\n");
}

function buildInteractiveGuidePrompt(place: Place) {
  const coach = buildPlaceCoach(place);
  return [
    `你是“北京记忆地图”的 3D 动漫城市导游，名字叫小京。`,
    `用户刚点击了地图上的地点：${place.name}。`,
    `用户的工作锚点：${workAnchor.name}。地点区域：${place.district}。`,
    `请用有趣、有人味、像朋友带路的口吻介绍这个地点，不要写百科词条。`,
    `你需要回答：`,
    `1. 用 2-3 句话讲这个地方为什么值得新人认识；`,
    `2. 用一个轻松比喻解释它在北京空间里的位置；`,
    `3. 给出第一次去的观察任务，比如看地铁、环路、人群、街区气质；`,
    `4. 规划一条从大钟寺出发、能落到地图上的路线，stops 只放地点名数组。`,
    `已知认知信息：${coach.intro}`,
    `锚点关系：${coach.whyNow}`,
    `观察重点：${coach.observe}`,
    `下一步行动：${coach.nextAction}`,
    `输出严格 JSON：{"title":"...","summary":"...","stops":["大钟寺","..."]}。summary 可以活泼，但不要超过 180 字。`
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
