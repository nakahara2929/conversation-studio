import { STATUS_OPTIONS, TIMING_OPTIONS } from "./constants.js";

function makeId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function asText(value, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function validStatus(value) {
  return STATUS_OPTIONS.includes(value) ? value : STATUS_OPTIONS[0];
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
    conversationTitle: asText(overrides.conversationTitle, "会話"),
    timing: validTiming(overrides.timing),
    characters: asText(overrides.characters),
    body: asText(overrides.body),
    memo: asText(overrides.memo),
  };
}

export function createEvent(overrides = {}) {
  const conversationsSource = Array.isArray(overrides.conversations)
    ? overrides.conversations
    : [createConversationBlock()];

  return {
    id: asText(overrides.id, makeId("event")),
    name: asText(overrides.name, "新しいイベント"),
    category: asText(overrides.category),
    summary: asText(overrides.summary),
    memo: asText(overrides.memo),
    status: validStatus(overrides.status),
    stickyNote: asText(overrides.stickyNote),
    createdAt: asText(overrides.createdAt, nowIso()),
    updatedAt: asText(overrides.updatedAt, nowIso()),
    conversations: conversationsSource.map((item) => createConversationBlock(item)),
  };
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
    summary: "会話エディタの動作確認用サンプルです。",
    memo: "イベント一覧の色分け、本文検索、CSV出力を試せます。",
    events: [
      {
        name: "食卓を調べた時",
        category: "調査",
        summary: "食卓を調べた時の会話イベント。",
        status: "下書き",
        stickyNote: "テンポ確認",
        conversations: [
          {
            conversationTitle: "食卓",
            timing: "初回",
            characters: "Mio, Stitchy",
            body: [
              "Mio「……何これ。完全に腐ってる」",
              "Stitchy「見りゃわかるだろ。食レポするなよ」",
              "Mio「するわけないでしょ」",
            ].join("\n"),
            memo: "導入の軽口。空気感の基準。",
          },
        ],
      },
      {
        name: "絵画を調べた時",
        category: "調査",
        summary: "壁の絵画に反応する会話。",
        status: "未着手",
        conversations: [
          {
            conversationTitle: "絵画",
            timing: "初回",
            characters: "Mio",
            body: "Mio「妙に目が合う……気のせいじゃないよね」",
            memo: "",
          },
        ],
      },
      {
        name: "ドアを調べた時",
        category: "進行",
        summary: "次の部屋へ進む前の会話。",
        status: "要修正",
        stickyNote: "分岐条件を後で反映",
        conversations: [
          {
            conversationTitle: "ドア",
            timing: "進行後",
            characters: "Mio, Stitchy",
            body: [
              "Mio「この先、行くしかないか」",
              "Stitchy「帰り道がある保証もねぇけどな」",
            ].join("\n"),
            memo: "前イベントの結果で変化予定。",
          },
        ],
      },
    ],
  });

  return {
    version: 1,
    selectedWorkId: work.id,
    selectedEventId: work.events[0]?.id ?? null,
    works: [work],
  };
}

export function normalizeAppState(value) {
  const base = createSampleState();
  const works = Array.isArray(value?.works) ? value.works.map((item) => createWork(item)) : base.works;
  const selectedWork =
    works.find((work) => work.id === value?.selectedWorkId) ?? works[0] ?? null;
  const selectedEvent =
    selectedWork?.events.find((event) => event.id === value?.selectedEventId) ??
    selectedWork?.events[0] ??
    null;

  return {
    version: 1,
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

