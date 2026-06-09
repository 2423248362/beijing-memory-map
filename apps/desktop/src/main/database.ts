import fs from "node:fs";
import path from "node:path";
import initSqlJs, { type Database, type SqlJsStatic, type SqlValue } from "sql.js";
import type { AiSettings, Checkin, ExplorationRoute, MapSettings, RouteStop } from "@beijing-memory-map/core";
import type { CreateCheckinInput, CreateRouteInput, SaveAiSettingsInput, SaveMapSettingsInput } from "../shared/ipc.js";

const nowIso = () => new Date().toISOString();
const id = () => crypto.randomUUID();

export class LocalDatabase {
  private SQL?: SqlJsStatic;
  private db?: Database;

  constructor(private readonly dbPath: string) {}

  async init() {
    this.SQL = await initSqlJs();
    fs.mkdirSync(path.dirname(this.dbPath), { recursive: true });
    if (fs.existsSync(this.dbPath)) {
      this.db = new this.SQL.Database(fs.readFileSync(this.dbPath));
    } else {
      this.db = new this.SQL.Database();
    }
    this.migrate();
    this.persist();
  }

  listCheckins(): Checkin[] {
    return this.query<Checkin>("select * from checkins order by visited_at desc", [], (row) => ({
      id: String(row.id),
      placeName: String(row.place_name),
      address: String(row.address),
      district: String(row.district),
      point: { lng: Number(row.lng), lat: Number(row.lat) },
      visitedAt: String(row.visited_at),
      note: String(row.note),
      tags: JSON.parse(String(row.tags || "[]")),
      mood: optionalString(row.mood),
      companion: optionalString(row.companion),
      cost: row.cost === null || row.cost === undefined ? undefined : Number(row.cost),
      transport: optionalString(row.transport),
      imagePaths: JSON.parse(String(row.image_paths || "[]")),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
  }

  createCheckin(input: CreateCheckinInput): Checkin {
    const record: Checkin = {
      id: id(),
      placeName: input.placeName.trim(),
      address: input.address.trim(),
      district: input.district.trim(),
      point: input.point,
      visitedAt: input.visitedAt,
      note: input.note.trim(),
      tags: input.tags,
      mood: input.mood?.trim() || undefined,
      companion: input.companion?.trim() || undefined,
      cost: input.cost,
      transport: input.transport?.trim() || undefined,
      imagePaths: input.imagePaths,
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.exec(
      `insert into checkins (
        id, place_name, address, district, lng, lat, visited_at, note, tags, mood,
        companion, cost, transport, image_paths, created_at, updated_at
      ) values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        record.id,
        record.placeName,
        record.address,
        record.district,
        record.point.lng,
        record.point.lat,
        record.visitedAt,
        record.note,
        JSON.stringify(record.tags),
        record.mood ?? null,
        record.companion ?? null,
        record.cost ?? null,
        record.transport ?? null,
        JSON.stringify(record.imagePaths),
        record.createdAt,
        record.updatedAt
      ]
    );
    this.touchUnlock(record.district, "visited");
    this.persist();
    return record;
  }

  listRoutes(): ExplorationRoute[] {
    const routes = this.query<Omit<ExplorationRoute, "stops">>("select * from routes order by created_at desc", [], (row) => ({
      id: String(row.id),
      title: String(row.title),
      status: row.status as ExplorationRoute["status"],
      plannedDate: optionalString(row.planned_date),
      note: String(row.note),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at)
    }));
    return routes.map((route) => ({
      ...route,
      stops: this.query<RouteStop>("select * from route_stops where route_id = ? order by sort_order asc", [route.id], (row) => ({
        id: String(row.id),
        placeName: String(row.place_name),
        point: { lng: Number(row.lng), lat: Number(row.lat) },
        note: String(row.note),
        sortOrder: Number(row.sort_order)
      }))
    }));
  }

  createRoute(input: CreateRouteInput): ExplorationRoute {
    const route: ExplorationRoute = {
      id: id(),
      title: input.title.trim(),
      status: input.status,
      plannedDate: input.plannedDate || undefined,
      note: input.note.trim(),
      stops: input.stops.map((stop, index) => ({
        id: id(),
        placeName: stop.placeName.trim(),
        point: stop.point,
        note: stop.note.trim(),
        sortOrder: index
      })),
      createdAt: nowIso(),
      updatedAt: nowIso()
    };
    this.exec(
      "insert into routes (id, title, status, planned_date, note, created_at, updated_at) values (?, ?, ?, ?, ?, ?, ?)",
      [route.id, route.title, route.status, route.plannedDate ?? null, route.note, route.createdAt, route.updatedAt]
    );
    route.stops.forEach((stop) => {
      this.exec(
        "insert into route_stops (id, route_id, place_name, lng, lat, note, sort_order) values (?, ?, ?, ?, ?, ?, ?)",
        [stop.id, route.id, stop.placeName, stop.point.lng, stop.point.lat, stop.note, stop.sortOrder]
      );
    });
    this.touchUnlock(route.title, "planned");
    this.persist();
    return route;
  }

  getAiSettings(): AiSettings {
    const values = this.getSettingsMap();
    return {
      baseUrl: values.baseUrl || "https://api.longcat.chat/openai/v1",
      apiKeySet: Boolean(values.apiKey),
      model: values.model || "LongCat-2.0-Preview",
      allowFootprints: values.allowFootprints !== "false",
      allowNotes: values.allowNotes !== "false",
      allowImages: values.allowImages === "true"
    };
  }

  saveAiSettings(input: SaveAiSettingsInput): AiSettings {
    const entries: Record<string, string> = {
      baseUrl: input.baseUrl.trim(),
      model: input.model.trim(),
      allowFootprints: String(input.allowFootprints),
      allowNotes: String(input.allowNotes),
      allowImages: String(input.allowImages)
    };
    if (input.apiKey?.trim()) entries.apiKey = input.apiKey.trim();
    this.saveSettings(entries);
    return this.getAiSettings();
  }

  getMapSettings(): MapSettings {
    const values = this.getSettingsMap();
    return {
      provider: "amap",
      amapKeySet: Boolean(values.amapKey),
      amapSecurityCodeSet: Boolean(values.amapSecurityCode),
      amapKey: values.amapKey || undefined,
      amapSecurityCode: values.amapSecurityCode || undefined
    };
  }

  saveMapSettings(input: SaveMapSettingsInput): MapSettings {
    const entries: Record<string, string> = {};
    if (input.amapKey?.trim()) entries.amapKey = input.amapKey.trim();
    if (input.amapSecurityCode?.trim()) entries.amapSecurityCode = input.amapSecurityCode.trim();
    this.saveSettings(entries);
    return this.getMapSettings();
  }

  getAiSecret() {
    return this.getSettingsMap().apiKey || "";
  }

  buildLocalAiContext() {
    const settings = this.getAiSettings();
    const checkins = settings.allowFootprints ? this.listCheckins().slice(0, 20) : [];
    const routes = this.listRoutes().slice(0, 10);
    return {
      workAnchor: "以用户提示中的当前工作锚点为准",
      privacyScope: {
        checkins: settings.allowFootprints,
        notes: settings.allowNotes,
        images: settings.allowImages
      },
      checkins: checkins.map((item) => ({
        placeName: item.placeName,
        district: item.district,
        visitedAt: item.visitedAt,
        tags: item.tags,
        note: settings.allowNotes ? item.note : ""
      })),
      routes: routes.map((route) => ({
        title: route.title,
        status: route.status,
        stops: route.stops.map((stop) => stop.placeName)
      }))
    };
  }

  private migrate() {
    this.exec(`
      create table if not exists checkins (
        id text primary key,
        place_name text not null,
        address text not null,
        district text not null,
        lng real not null,
        lat real not null,
        visited_at text not null,
        note text not null,
        tags text not null,
        mood text,
        companion text,
        cost real,
        transport text,
        image_paths text not null,
        created_at text not null,
        updated_at text not null
      );
      create table if not exists routes (
        id text primary key,
        title text not null,
        status text not null,
        planned_date text,
        note text not null,
        created_at text not null,
        updated_at text not null
      );
      create table if not exists route_stops (
        id text primary key,
        route_id text not null,
        place_name text not null,
        lng real not null,
        lat real not null,
        note text not null,
        sort_order integer not null,
        foreign key(route_id) references routes(id) on delete cascade
      );
      create table if not exists settings (
        key text primary key,
        value text not null,
        updated_at text not null
      );
      create table if not exists unlock_progress (
        id text primary key,
        kind text not null,
        name text not null,
        state text not null,
        updated_at text not null
      );
    `);
  }

  private saveSettings(entries: Record<string, string>) {
    Object.entries(entries).forEach(([key, value]) => {
      this.exec(
        "insert into settings (key, value, updated_at) values (?, ?, ?) on conflict(key) do update set value = excluded.value, updated_at = excluded.updated_at",
        [key, value, nowIso()]
      );
    });
    this.persist();
  }

  private getSettingsMap() {
    const rows = this.query<{ key: string; value: string }>("select key, value from settings", [], (row) => ({
      key: String(row.key),
      value: String(row.value)
    }));
    return Object.fromEntries(rows.map((row) => [row.key, row.value]));
  }

  private touchUnlock(name: string, state: "planned" | "visited") {
    this.exec(
      "insert into unlock_progress (id, kind, name, state, updated_at) values (?, ?, ?, ?, ?) on conflict(id) do update set state = excluded.state, updated_at = excluded.updated_at",
      [`district:${name}`, "district", name, state, nowIso()]
    );
  }

  private exec(sql: string, params: SqlValue[] = []) {
    if (!this.db) throw new Error("Database is not initialized.");
    if (params.length) {
      this.db.run(sql, params);
      return;
    }
    this.db.exec(sql);
  }

  private query<T>(sql: string, params: SqlValue[], map: (row: Record<string, unknown>) => T): T[] {
    if (!this.db) throw new Error("Database is not initialized.");
    const statement = this.db.prepare(sql, params);
    const rows: T[] = [];
    while (statement.step()) rows.push(map(statement.getAsObject()));
    statement.free();
    return rows;
  }

  private persist() {
    if (!this.db) throw new Error("Database is not initialized.");
    fs.writeFileSync(this.dbPath, this.db.export());
  }
}

function optionalString(value: unknown) {
  if (value === null || value === undefined || value === "") return undefined;
  return String(value);
}
