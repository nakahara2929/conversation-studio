import { STATUS_OPTIONS, TIMING_OPTIONS } from "./constants.js";

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function validStatus(value) {
  if (STATUS_OPTIONS.includes(value)) {
    return value;
  }

  const legacyMap = {
    下書き: "作業中",
    要修正: "作業中",
    FIX: "完了",
  };

  return legacyMap[value] ?? STATUS_OPTIONS[0];
}

function validTiming(value) {
  return TIMING_OPTIONS.includes(value) ? value : TIMING_OPTIONS[0];
}

export function nowIso() {
  return new Date().toISOString();
}

export function createConversationBlock(overrides = {}) {
  return {
    id: asText(overrides.id, makeId("conv")),
    timing: validTiming(overrides.timing),
    characters: asText(overrides.characters),
    body: asText(overrides.body),
    memo: asText(overrides.memo),
  };
}

function normalizeConversationFromLegacy(source) {
  if (source && typeof source === "object" && !Array.isArray(source)) {
    return createConversationBlock(source);
  }

  if (Array.isArray(source) && source.length > 0) {
    return createConversationBlock(source[0]);
  }

  return createConversationBlock();
}

export function createEvent(overrides = {}) {
  return {
    id: asText(overrides.id, makeId("event")),
    name: asText(overrides.name, "新しいイベント"),
    status: validStatus(overrides.status),
    createdAt: asText(overrides.createdAt, nowIso()),
    updatedAt: asText(overrides.updatedAt, nowIso()),
    conversation: normalizeConversationFromLegacy(
      overrides.conversation ?? overrides.conversations,
    ),
  };
}

export function cloneEvent(source) {
  return createEvent({
    name: source.name.trim() ? `${source.name} コピー` : "イベント コピー",
    status: source.status,
    conversation: {
      ...source.conversation,
      id: undefined,
    },
  });
}

export function createWork(overrides = {}) {
  const eventsSource = Array.isArray(overrides.events) ? overrides.events : [];

  return {
    id: asText(overrides.id, makeId("work")),
    name: asText(overrides.name, "新しい作品"),
    summary: asText(overrides.summary),
    memo: asText(overrides.memo),
    createdAt: asText(overrides.createdAt, nowIso()),
    updatedAt: asText(overrides.updatedAt, nowIso()),
    events: eventsSource.map((item) => createEvent(item)),
  };
}

export function createSampleState() {
  const work = createWork({
    name: "サンプル作品",
    summary: "会話エディタの初期確認用サンプルです。",
    memo: "iPhone の縦持ちで確認しやすいよう、会話イベントを3件入れています。",
    events: [
      {
        name: "食卓を調べた時",
        status: "作業中",
        conversation: {
          timing: "初回",
          characters: "Mio, Stitchy",
          body: [
            "Mio「……何これ。完全に腐ってる」",
            "Stitchy「見りゃわかるだろ。食レポするなよ」",
            "Mio「するわけないでしょ」",
          ].join("\n"),
          memo: "差し替え前の本文や別案を残す欄。",
        },
      },
      {
        name: "絵画を調べた時",
        status: "未着手",
        conversation: {
          timing: "初回",
          characters: "Mio",
          body: "Mio「妙に視線を感じる……ただの絵なのに」",
          memo: "",
        },
      },
      {
        name: "ドアを調べた時",
        status: "完了",
        conversation: {
          timing: "進行後",
          characters: "Mio, Stitchy",
          body: [
            "Mio「この先、開く気がしないんだけど」",
            "Stitchy「だから進める前に見回れって言ったんだ」",
          ].join("\n"),
          memo: "後半用の差分案あり。",
        },
      },
    ],
  });

  return {
    version: 3,
    currentPage: "works",
    selectedWorkId: work.id,
    selectedEventId: work.events[0]?.id ?? null,
    works: [work],
  };
}

export function normalizeAppState(value) {
  const base = createSampleState();
  const works = Array.isArray(value?.works) ? value.works.map((item) => createWork(item)) : base.works;
  const selectedWork = works.find((work) => work.id === value?.selectedWorkId) ?? works[0] ?? null;
  const selectedEvent =
    selectedWork?.events.find((event) => event.id === value?.selectedEventId) ??
    selectedWork?.events[0] ??
    null;

  return {
    version: 3,
    currentPage:
      ["works", "events", "editor"].includes(value?.currentPage)
        ? value.currentPage
        : "works",
    selectedWorkId: selectedWork?.id ?? null,
    selectedEventId: selectedEvent?.id ?? null,
    works,
  };
}

export function touchEvent(event) {
  event.updatedAt = nowIso();
  return event;
}

export function touchWork(work) {
  work.updatedAt = nowIso();
  return work;
}
