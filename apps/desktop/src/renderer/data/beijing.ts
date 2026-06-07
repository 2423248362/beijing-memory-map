import type { Anchor, CityTask, LifeCircle, RouteTemplate } from "@beijing-memory-map/core";

export const workAnchor: Anchor = {
  id: "byte-dazhongsi",
  name: "字节跳动大钟寺工区",
  type: "work",
  address: "北京市海淀区大钟寺",
  point: { lng: 116.3455, lat: 39.9682 }
};

export const lifeCircles: LifeCircle[] = [
  {
    id: "dazhongsi",
    name: "大钟寺",
    district: "海淀区",
    summary: "北三环工作锚点，连接知春路、西直门和学院路，是理解北京北部通勤的起点。",
    point: { lng: 116.3455, lat: 39.9682 },
    unlockState: "visited"
  },
  {
    id: "zhichunlu",
    name: "知春路",
    district: "海淀区",
    summary: "10 号线和 13 号线交汇处，适合作为工作日短途探索的第一站。",
    point: { lng: 116.341, lat: 39.976 },
    unlockState: "learned"
  },
  {
    id: "wudaokou",
    name: "五道口",
    district: "海淀区",
    summary: "高校、咖啡、留学生和互联网气质交织的夜生活半径。",
    point: { lng: 116.337, lat: 39.992 },
    unlockState: "planned"
  },
  {
    id: "zhongguancun",
    name: "中关村",
    district: "海淀区",
    summary: "北京知识密度和科技创业记忆的核心区域。",
    point: { lng: 116.316, lat: 39.983 },
    unlockState: "planned"
  },
  {
    id: "xizhimen",
    name: "西直门",
    district: "西城区",
    summary: "2/4/13 号线换乘枢纽，连接老城、海淀和北部通勤带。",
    point: { lng: 116.355, lat: 39.94 },
    unlockState: "locked"
  },
  {
    id: "shichahai",
    name: "什刹海/鼓楼",
    district: "西城区",
    summary: "从北三环进入老北京胡同和中轴线记忆的友好入口。",
    point: { lng: 116.397, lat: 39.941 },
    unlockState: "locked"
  },
  {
    id: "forbidden-city",
    name: "故宫",
    district: "东城区",
    summary: "北京中轴线的核心地标，适合作为第一次理解老城秩序的主线任务。",
    point: { lng: 116.397, lat: 39.916 },
    unlockState: "locked"
  },
  {
    id: "qianmen",
    name: "前门/天坛",
    district: "东城区",
    summary: "中轴线南段，适合作为第一次老城文化路线。",
    point: { lng: 116.397, lat: 39.899 },
    unlockState: "locked"
  },
  {
    id: "sanlitun",
    name: "三里屯",
    district: "朝阳区",
    summary: "北京社交、夜生活和国际化消费的代表区域。",
    point: { lng: 116.454, lat: 39.934 },
    unlockState: "planned"
  },
  {
    id: "guomao",
    name: "国贸",
    district: "朝阳区",
    summary: "CBD 天际线和商务北京的核心观察点。",
    point: { lng: 116.46, lat: 39.908 },
    unlockState: "locked"
  },
  {
    id: "wangjing",
    name: "望京",
    district: "朝阳区",
    summary: "互联网、韩餐、社区商业和东北四环通勤共同构成的生活圈。",
    point: { lng: 116.481, lat: 39.996 },
    unlockState: "planned"
  },
  {
    id: "liangmahe",
    name: "亮马河",
    district: "朝阳区",
    summary: "适合夜间步行和城市水岸观察的轻松路线。",
    point: { lng: 116.466, lat: 39.949 },
    unlockState: "learned"
  },
  {
    id: "798",
    name: "798 艺术区",
    district: "朝阳区",
    summary: "工业遗存、展览和周末城市漫游结合的典型场景。",
    point: { lng: 116.501, lat: 39.989 },
    unlockState: "locked"
  },
  {
    id: "xueyuanlu",
    name: "学院路",
    district: "海淀区",
    summary: "高校密集区，适合建立北京北部知识生活的空间感。",
    point: { lng: 116.36, lat: 39.99 },
    unlockState: "planned"
  },
  {
    id: "xitucheng",
    name: "西土城",
    district: "海淀区",
    summary: "靠近高校与北三环，是大钟寺向北探索的自然延伸。",
    point: { lng: 116.354, lat: 39.976 },
    unlockState: "learned"
  },
  {
    id: "haidianhuangzhuang",
    name: "海淀黄庄",
    district: "海淀区",
    summary: "教育、商业和地铁换乘叠加的海淀核心节点。",
    point: { lng: 116.318, lat: 39.976 },
    unlockState: "planned"
  },
  {
    id: "renda",
    name: "人民大学",
    district: "海淀区",
    summary: "从中关村向南理解海淀高校生活的重要点位。",
    point: { lng: 116.32, lat: 39.966 },
    unlockState: "locked"
  },
  {
    id: "pku-tsinghua",
    name: "北大清华",
    district: "海淀区",
    summary: "北京高校记忆最集中的区域，适合周末慢行路线。",
    point: { lng: 116.316, lat: 39.999 },
    unlockState: "locked"
  },
  {
    id: "yuanmingyuan",
    name: "圆明园",
    district: "海淀区",
    summary: "历史遗址和校园边界共同构成的北部文化地标。",
    point: { lng: 116.305, lat: 40.008 },
    unlockState: "locked"
  },
  {
    id: "summer-palace",
    name: "颐和园",
    district: "海淀区",
    summary: "北京西北方向最适合完整半日游的皇家园林。",
    point: { lng: 116.275, lat: 39.999 },
    unlockState: "locked"
  },
  {
    id: "zoo",
    name: "动物园",
    district: "西城区",
    summary: "连接西直门、展览馆和西外大街的城市节点。",
    point: { lng: 116.34, lat: 39.938 },
    unlockState: "locked"
  },
  {
    id: "gulou",
    name: "鼓楼",
    district: "东城区",
    summary: "适合把胡同、咖啡和中轴线夜景串起来的点位。",
    point: { lng: 116.397, lat: 39.948 },
    unlockState: "planned"
  },
  {
    id: "yonghegong",
    name: "雍和宫",
    district: "东城区",
    summary: "地铁、寺庙、胡同和餐饮高度聚合的老城入口。",
    point: { lng: 116.417, lat: 39.947 },
    unlockState: "locked"
  },
  {
    id: "olympic-forest",
    name: "奥森",
    district: "朝阳区",
    summary: "北中轴线的开放绿地，适合运动和城市尺度感建立。",
    point: { lng: 116.396, lat: 40.015 },
    unlockState: "locked"
  },
  {
    id: "tongzhou",
    name: "通州",
    district: "通州区",
    summary: "北京城市副中心，适合后续拓展到运河和东部生活圈。",
    point: { lng: 116.657, lat: 39.91 },
    unlockState: "locked"
  },
  {
    id: "yizhuang",
    name: "亦庄",
    district: "大兴区",
    summary: "产业园区和南部通勤生活的代表区域。",
    point: { lng: 116.506, lat: 39.795 },
    unlockState: "locked"
  },
  {
    id: "beijing-south",
    name: "北京南站",
    district: "丰台区",
    summary: "高铁出行和南城交通的关键节点。",
    point: { lng: 116.379, lat: 39.865 },
    unlockState: "locked"
  },
  {
    id: "lize",
    name: "丽泽",
    district: "丰台区",
    summary: "新兴商务区，适合观察北京西南方向的城市更新。",
    point: { lng: 116.334, lat: 39.871 },
    unlockState: "locked"
  },
  {
    id: "shougang",
    name: "首钢园",
    district: "石景山区",
    summary: "工业遗存、冬奥记忆和城市更新结合的西部地标。",
    point: { lng: 116.163, lat: 39.914 },
    unlockState: "locked"
  }
];

export const lifeCircleCards: Record<string, Required<Pick<LifeCircle, "cognitiveMeaning" | "anchorRelation" | "bestFor" | "companion" | "recommendedAction" | "concepts">>> = {
  dazhongsi: {
    cognitiveMeaning: "这是你的北京坐标原点。先理解大钟寺，就能把北三环、海淀通勤、13 号线和 10 号线串成一个方向感。",
    anchorRelation: "工作锚点本身，适合用来判断 30/60/90 分钟生活半径。",
    bestFor: "工作日午休、下班后 1 小时内的轻探索。",
    companion: "自己、同事或刚认识北京的朋友。",
    recommendedAction: "先完成一次周边打卡，再生成到知春路或西土城的短线。",
    concepts: ["工作锚点", "北三环", "通勤半径"]
  },
  zhichunlu: {
    cognitiveMeaning: "知春路是大钟寺向西北理解海淀的第一个换乘节点，比景点更适合练习地铁方向感。",
    anchorRelation: "离大钟寺很近，是工作日短线的第一站。",
    bestFor: "工作日晚间 30-60 分钟。",
    companion: "自己或同事。",
    recommendedAction: "从大钟寺到知春路建一条短路线，记录 10/13 号线的方向差异。",
    concepts: ["地铁换乘", "海淀", "工作日短线"]
  },
  wudaokou: {
    cognitiveMeaning: "五道口代表海淀高校、留学生、咖啡和夜间生活混合的生活圈。",
    anchorRelation: "从大钟寺向北，是下班后最容易感受到海淀年轻生活的一段。",
    bestFor: "工作日晚餐、夜间短逛。",
    companion: "朋友、同学、同事。",
    recommendedAction: "加入海淀知识线，完成一次夜间打卡。",
    concepts: ["高校生活圈", "海淀", "夜间短线"]
  },
  zhongguancun: {
    cognitiveMeaning: "中关村不是单个商场，而是理解北京科技、教育和创业记忆的高密度区域。",
    anchorRelation: "从大钟寺向西，是海淀知识线的核心节点。",
    bestFor: "工作日傍晚或周末半天。",
    companion: "同事、朋友。",
    recommendedAction: "和五道口、北大清华一起组成海淀知识线。",
    concepts: ["科技", "教育", "海淀知识线"]
  },
  xizhimen: {
    cognitiveMeaning: "西直门是海淀进入老城的通勤枢纽，理解它就能理解北京北部如何接入二环内。",
    anchorRelation: "从大钟寺向南，是北三环进入老城的入口。",
    bestFor: "工作日晚间换乘观察、周末老城路线起点。",
    companion: "自己或熟悉地铁的朋友。",
    recommendedAction: "创建从大钟寺到西直门的路线，再延伸到什刹海。",
    concepts: ["换乘枢纽", "老城入口", "二环"]
  },
  shichahai: {
    cognitiveMeaning: "什刹海/鼓楼是新人第一次把胡同、湖面、中轴线夜景串起来的友好入口。",
    anchorRelation: "从大钟寺经西直门进入老城，路径清晰、认知收益高。",
    bestFor: "周末半天或工作日晚间。",
    companion: "朋友、约会、外地来访者。",
    recommendedAction: "完成老城文化线并写一段复盘。",
    concepts: ["中轴线", "胡同", "老城文化线"]
  },
  "forbidden-city": {
    cognitiveMeaning: "故宫是理解北京中轴线和老城秩序的核心点，不只是历史景点。",
    anchorRelation: "从大钟寺出发需要一次明确的老城纵深移动。",
    bestFor: "周末半天到全天。",
    companion: "朋友、家人、外地来访者。",
    recommendedAction: "与前门、天坛组成中轴线任务。",
    concepts: ["中轴线", "老城秩序", "历史文化"]
  },
  sanlitun: {
    cognitiveMeaning: "三里屯代表朝阳社交、国际化消费和夜生活，是理解东部生活方式的入口。",
    anchorRelation: "从大钟寺跨到东三环，能明显感知北京东西生活圈差异。",
    bestFor: "周五晚、周末晚间。",
    companion: "朋友、同事。",
    recommendedAction: "加入朝阳社交线，和亮马河或国贸对比。",
    concepts: ["朝阳", "社交", "国际化消费"]
  },
  liangmahe: {
    cognitiveMeaning: "亮马河用水岸步行把朝阳的轻松、夜景和国际化街区连接起来。",
    anchorRelation: "从大钟寺过来成本较高，更适合作为专门的晚间路线。",
    bestFor: "工作日晚间、周末夜景。",
    companion: "朋友、约会。",
    recommendedAction: "搜索亮马河后创建周末路线，并记录夜景打卡。",
    concepts: ["朝阳社交线", "水岸", "夜景"]
  },
  guomao: {
    cognitiveMeaning: "国贸是北京 CBD 的空间符号，用来理解商务北京和东三环尺度。",
    anchorRelation: "从大钟寺到国贸是一次跨城通勤体验。",
    bestFor: "工作日傍晚、周末城市观察。",
    companion: "同事、朋友。",
    recommendedAction: "和三里屯、亮马河对比朝阳不同生活场景。",
    concepts: ["CBD", "东三环", "商务"]
  }
};

export const cityTasks: CityTask[] = [
  {
    id: "day1-anchor",
    title: "北京入门第一步：认识你的工作锚点",
    type: "concept",
    stage: "第 1 天",
    cognitiveGoal: "说清楚大钟寺与北三环、知春路、西直门的关系。",
    estimatedMinutes: 20,
    recommendedTime: "工作日午休或下班后",
    start: "大钟寺",
    targets: ["dazhongsi", "zhichunlu", "xizhimen"],
    completion: "查看大钟寺认知卡并保存一次打卡。",
    unlocks: ["工作锚点", "北三环方向感"]
  },
  {
    id: "day2-zhichunlu",
    title: "从大钟寺到知春路：练习第一次短线移动",
    type: "route",
    stage: "第 2-7 天",
    cognitiveGoal: "理解 10 号线和 13 号线在海淀北部的换乘意义。",
    estimatedMinutes: 45,
    recommendedTime: "工作日晚间",
    start: "大钟寺",
    targets: ["dazhongsi", "zhichunlu"],
    completion: "创建路线并记录路线笔记。",
    unlocks: ["地铁换乘", "工作日短线"]
  },
  {
    id: "day3-wudaokou",
    title: "五道口夜间短线：理解海淀高校生活圈",
    type: "checkin",
    stage: "第 2-7 天",
    cognitiveGoal: "把高校、咖啡、夜间餐饮和互联网工作区联系起来。",
    estimatedMinutes: 90,
    recommendedTime: "工作日晚间",
    start: "大钟寺",
    targets: ["wudaokou", "xueyuanlu"],
    completion: "完成一次五道口打卡。",
    unlocks: ["海淀高校生活圈"]
  },
  {
    id: "day8-xizhimen",
    title: "从北三环到西直门：找到进入老城的入口",
    type: "region",
    stage: "第 8-14 天",
    cognitiveGoal: "理解海淀、北三环和二环老城之间的连接方式。",
    estimatedMinutes: 60,
    recommendedTime: "周末半天或工作日晚间",
    start: "大钟寺",
    targets: ["dazhongsi", "xizhimen", "shichahai"],
    completion: "生成大钟寺到什刹海路线。",
    unlocks: ["老城入口", "二环"]
  },
  {
    id: "day10-axis",
    title: "什刹海/鼓楼半日线：第一次进入中轴线",
    type: "route",
    stage: "第 8-14 天",
    cognitiveGoal: "用一条步行路线理解胡同、湖面和中轴线夜景。",
    estimatedMinutes: 180,
    recommendedTime: "周末半天",
    start: "西直门",
    targets: ["shichahai", "gulou", "forbidden-city"],
    completion: "完成路线并写一段复盘。",
    unlocks: ["中轴线", "胡同", "老城文化"]
  },
  {
    id: "day15-chaoyang",
    title: "亮马河夜景线：理解朝阳社交水岸",
    type: "route",
    stage: "第 15-21 天",
    cognitiveGoal: "区分朝阳的社交、商务和水岸生活场景。",
    estimatedMinutes: 120,
    recommendedTime: "周五晚或周末晚间",
    start: "大钟寺",
    targets: ["sanlitun", "liangmahe", "guomao"],
    completion: "搜索亮马河并创建路线。",
    unlocks: ["朝阳社交线", "东三环"]
  },
  {
    id: "day18-knowledge",
    title: "海淀知识线：中关村到北大清华",
    type: "route",
    stage: "第 15-21 天",
    cognitiveGoal: "把科技、教育、高校和公园串成海淀知识地图。",
    estimatedMinutes: 240,
    recommendedTime: "周末半天",
    start: "大钟寺",
    targets: ["zhongguancun", "pku-tsinghua", "yuanmingyuan"],
    completion: "完成至少两个停靠点打卡。",
    unlocks: ["海淀知识线"]
  },
  {
    id: "day22-gap",
    title: "补齐未探索方向：选择一个非海淀区域",
    type: "gap",
    stage: "第 22-30 天",
    cognitiveGoal: "发现自己熟悉区域之外的空白方向。",
    estimatedMinutes: 30,
    recommendedTime: "任意晚上",
    start: "我的进度",
    targets: ["sanlitun", "qianmen", "tongzhou", "yizhuang"],
    completion: "选择一个未熟悉区域加入路线。",
    unlocks: ["个人北京画像"]
  }
];

export const routeTemplates: RouteTemplate[] = [
  {
    id: "route-after-work",
    title: "工作日短线：大钟寺到知春路",
    theme: "通勤与换乘",
    recommendedTime: "工作日晚间 45 分钟",
    cognitiveGoal: "从工作锚点出发建立第一段地铁方向感。",
    stopIds: ["dazhongsi", "zhichunlu", "xitucheng"]
  },
  {
    id: "route-old-city",
    title: "老城文化线：西直门到什刹海/鼓楼",
    theme: "老城入口",
    recommendedTime: "周末半天",
    cognitiveGoal: "理解北三环进入老城与中轴线的关系。",
    stopIds: ["dazhongsi", "xizhimen", "shichahai", "gulou"]
  },
  {
    id: "route-haidian",
    title: "海淀知识线：中关村到北大清华",
    theme: "知识生活圈",
    recommendedTime: "周末半天",
    cognitiveGoal: "建立海淀科技、高校和公园的空间连接。",
    stopIds: ["dazhongsi", "zhongguancun", "pku-tsinghua", "yuanmingyuan"]
  },
  {
    id: "route-chaoyang",
    title: "朝阳社交线：三里屯到亮马河",
    theme: "社交与水岸",
    recommendedTime: "周五晚或周末晚间",
    cognitiveGoal: "理解朝阳的国际化消费、水岸和夜间生活。",
    stopIds: ["sanlitun", "liangmahe", "guomao"]
  }
];
