import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { LocalDatabase } from "./database.js";
import type {
  CreateCheckinInput,
  CreateRouteInput,
  GenerateSuggestionInput,
  SaveAiSettingsInput,
  SaveMapSettingsInput
} from "../shared/ipc.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rendererUrl = process.env.ELECTRON_RENDERER_URL;

let mainWindow: BrowserWindow | undefined;
let database: LocalDatabase;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 1080,
    minHeight: 720,
    title: "北京记忆地图",
    backgroundColor: "#f4f6f8",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (rendererUrl) {
    await mainWindow.loadURL(rendererUrl);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    await mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}

function registerIpc() {
  ipcMain.handle("checkins:list", () => database.listCheckins());
  ipcMain.handle("checkins:create", (_event, input: CreateCheckinInput) => database.createCheckin(input));
  ipcMain.handle("routes:list", () => database.listRoutes());
  ipcMain.handle("routes:create", (_event, input: CreateRouteInput) => database.createRoute(input));
  ipcMain.handle("ai:get-settings", () => database.getAiSettings());
  ipcMain.handle("ai:save-settings", (_event, input: SaveAiSettingsInput) => database.saveAiSettings(input));
  ipcMain.handle("map:get-settings", () => database.getMapSettings());
  ipcMain.handle("map:save-settings", (_event, input: SaveMapSettingsInput) => database.saveMapSettings(input));
  ipcMain.handle("ai:generate-suggestion", async (_event, input: GenerateSuggestionInput) => generateSuggestion(input));
  ipcMain.handle("images:choose", async () => chooseImages());
}

async function chooseImages() {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: "选择打卡图片",
    properties: ["openFile", "multiSelections"],
    filters: [{ name: "Images", extensions: ["jpg", "jpeg", "png", "webp", "gif"] }]
  });
  if (result.canceled) return [];

  const imageDir = path.join(app.getPath("userData"), "images");
  fs.mkdirSync(imageDir, { recursive: true });
  return result.filePaths.map((source) => {
    const ext = path.extname(source);
    const target = path.join(imageDir, `${crypto.randomUUID()}${ext}`);
    fs.copyFileSync(source, target);
    return target;
  });
}

async function generateSuggestion(input: GenerateSuggestionInput) {
  const settings = database.getAiSettings();
  const apiKey = database.getAiSecret();
  if (!apiKey) {
    throw new Error("请先在设置里配置 AI API Key。");
  }

  const context = database.buildLocalAiContext();
  const response = await fetch(`${settings.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        {
          role: "system",
          content:
            "你是北京记忆地图的俏皮城市教练，像一个很会带路的北京朋友。基于用户授权的本地上下文和用户提示里的工作锚点，给出简洁、可执行的北京探索建议。输出 JSON，字段为 title、summary、stops。summary 要可爱、有画面感，但不要幼稚、不要堆表情。"
        },
        {
          role: "user",
          content: JSON.stringify({ prompt: input.prompt, context })
        }
      ],
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(`AI 请求失败：${response.status} ${message.slice(0, 160)}`);
  }
  const payload = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("AI 响应为空，请检查模型配置。");
  }
  try {
    const parsed = JSON.parse(content) as { title?: string; summary?: string; stops?: string[] };
    return {
      title: parsed.title || "北京探索建议",
      summary: parsed.summary || "已基于本地上下文生成建议。",
      stops: Array.isArray(parsed.stops) ? parsed.stops : []
    };
  } catch {
    throw new Error("AI 响应不是有效 JSON，请换一个支持结构化输出的模型。");
  }
}

app.whenReady().then(async () => {
  database = new LocalDatabase(path.join(app.getPath("userData"), "beijing-memory-map.sqlite"));
  await database.init();
  registerIpc();
  await createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) void createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
