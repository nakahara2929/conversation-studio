import React, { Fragment, startTransition, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { STATUS_META, STATUS_OPTIONS, TIMING_OPTIONS } from "./constants.js";
import { loadState, saveState } from "./db.js";
import { exportConversationBlocksCsv, exportEventsCsv, exportJson } from "./exporters.js";
import {
  createEvent,
  createSampleState,
  createWork,
  normalizeAppState,
  touchEvent,
  touchWork,
} from "./model.js";

const h = React.createElement;
const PAGE_ORDER = ["works", "data", "events", "editor"];
const PAGE_LABELS = {
  works: "作品管理",
  data: "データ操作",
  events: "イベント一覧",
  editor: "イベント操作",
};

function fieldId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function LabeledInput({
  label,
  value,
  onChange,
  placeholder = "",
  multiline = false,
  rows = 4,
}) {
  const id = useMemo(() => fieldId("field"), []);

  return h(
    "label",
    { className: "field", htmlFor: id },
    h("span", { className: "field-label" }, label),
    multiline
      ? h("textarea", {
          id,
          className: "field-input field-textarea",
          value,
          rows,
          placeholder,
          onChange: (event) => onChange(event.target.value),
        })
      : h("input", {
          id,
          className: "field-input",
          value,
          placeholder,
          onChange: (event) => onChange(event.target.value),
        }),
  );
}

function LabeledSelect({ label, value, onChange, options }) {
  const id = useMemo(() => fieldId("select"), []);

  return h(
    "label",
    { className: "field", htmlFor: id },
    h("span", { className: "field-label" }, label),
    h(
      "select",
      {
        id,
        className: "field-input",
        value,
        onChange: (event) => onChange(event.target.value),
      },
      options.map((option) =>
        h("option", { key: option.value, value: option.value }, option.label),
      ),
    ),
  );
}

function ToggleField({ label, checked, onChange }) {
  const id = useMemo(() => fieldId("toggle"), []);

  return h(
    "label",
    { className: "toggle-field", htmlFor: id },
    h("input", {
      id,
      type: "checkbox",
      checked,
      onChange: (event) => onChange(event.target.checked),
    }),
    h("span", null, label),
  );
}

function EmptyState({ title, body, actionLabel, onAction }) {
  return h(
    "div",
    { className: "empty-card" },
    h("h3", { className: "empty-title" }, title),
    h("p", { className: "empty-body" }, body),
    onAction
      ? h(
          "button",
          { className: "button button-primary", type: "button", onClick: onAction },
          actionLabel,
        )
      : null,
  );
}

function eventMatchesFilters(event, filters) {
  const nameQuery = filters.eventName.trim().toLowerCase();
  const bodyQuery = filters.body.trim().toLowerCase();
  const characterQuery = filters.character.trim().toLowerCase();

  const matchesName = !nameQuery || event.name.toLowerCase().includes(nameQuery);
  const matchesBody = !bodyQuery || event.conversation.body.toLowerCase().includes(bodyQuery);
  const matchesCharacter =
    !characterQuery || event.conversation.characters.toLowerCase().includes(characterQuery);
  const matchesStatus = filters.status === "all" || event.status === filters.status;
  const matchesSticky = !filters.stickyOnly || Boolean(event.stickyNote.trim());

  return matchesName && matchesBody && matchesCharacter && matchesStatus && matchesSticky;
}

function repairSelection(state) {
  const selectedWork = state.works.find((work) => work.id === state.selectedWorkId) ?? state.works[0];
  state.selectedWorkId = selectedWork?.id ?? null;

  if (!selectedWork) {
    state.selectedEventId = null;
    state.currentPage = "works";
    return;
  }

  const selectedEvent =
    selectedWork.events.find((event) => event.id === state.selectedEventId) ?? selectedWork.events[0];
  state.selectedEventId = selectedEvent?.id ?? null;

  if (!selectedEvent && state.currentPage === "editor") {
    state.currentPage = "events";
  }
}

function NavStep({ page, currentPage, disabled, onClick }) {
  return h(
    "button",
    {
      type: "button",
      className: `step-chip ${currentPage === page ? "is-active" : ""}`,
      disabled,
      onClick,
    },
    PAGE_LABELS[page],
  );
}

function StepFooter({ backLabel, onBack, nextLabel, onNext, nextDisabled = false }) {
  return h(
    "div",
    { className: "step-footer" },
    onBack
      ? h(
          "button",
          { className: "button", type: "button", onClick: onBack },
          backLabel,
        )
      : h("span"),
    onNext
      ? h(
          "button",
          {
            className: "button button-primary",
            type: "button",
            disabled: nextDisabled,
            onClick: onNext,
          },
          nextLabel,
        )
      : null,
  );
}

export default function App() {
  const [appState, setAppState] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [saveMessage, setSaveMessage] = useState("読み込み中...");
  const [filters, setFilters] = useState({
    eventName: "",
    body: "",
    character: "",
    status: "all",
    stickyOnly: false,
  });
  const importInputRef = useRef(null);
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    let cancelled = false;

    loadState()
      .then((stored) => {
        if (cancelled) {
          return;
        }

        if (stored) {
          setAppState(normalizeAppState(stored));
          setSaveMessage("保存データを読み込みました");
        } else {
          setAppState(createSampleState());
          setSaveMessage("サンプルデータを用意しました");
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setAppState(createSampleState());
        setSaveMessage("保存読込に失敗したためサンプルデータで開始しました");
      })
      .finally(() => {
        if (!cancelled) {
          setIsReady(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isReady || !appState) {
      return;
    }

    setSaveMessage("自動保存中...");

    const timerId = window.setTimeout(() => {
      saveState(appState)
        .then(() => {
          setSaveMessage(`保存済み ${new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" })}`);
        })
        .catch(() => {
          setSaveMessage("保存に失敗しました");
        });
    }, 250);

    return () => window.clearTimeout(timerId);
  }, [appState, isReady]);

  const selectedWork = useMemo(() => {
    if (!appState) {
      return null;
    }
    return appState.works.find((work) => work.id === appState.selectedWorkId) ?? null;
  }, [appState]);

  const selectedEvent = useMemo(() => {
    if (!selectedWork || !appState) {
      return null;
    }
    return selectedWork.events.find((event) => event.id === appState.selectedEventId) ?? null;
  }, [appState, selectedWork]);

  const filteredEvents = useMemo(() => {
    if (!selectedWork) {
      return [];
    }
    return selectedWork.events.filter((event) => eventMatchesFilters(event, deferredFilters));
  }, [deferredFilters, selectedWork]);

  function mutateState(mutator) {
    setAppState((current) => {
      const next = structuredClone(current);
      mutator(next);
      repairSelection(next);
      return next;
    });
  }

  function moveToPage(page) {
    mutateState((draft) => {
      draft.currentPage = page;
    });
  }

  function updateFilters(patch) {
    startTransition(() => {
      setFilters((current) => ({ ...current, ...patch }));
    });
  }

  function selectWork(workId) {
    mutateState((draft) => {
      draft.selectedWorkId = workId;
      const work = draft.works.find((item) => item.id === workId);
      draft.selectedEventId = work?.events[0]?.id ?? null;
    });
  }

  function selectEvent(eventId) {
    mutateState((draft) => {
      draft.selectedEventId = eventId;
    });
  }

  function addWork() {
    mutateState((draft) => {
      const work = createWork({
        name: `作品 ${draft.works.length + 1}`,
        events: [createEvent({ name: "最初のイベント" })],
      });
      draft.works.unshift(work);
      draft.selectedWorkId = work.id;
      draft.selectedEventId = work.events[0]?.id ?? null;
    });
  }

  function deleteWork(workId) {
    const work = appState?.works.find((item) => item.id === workId);
    if (!work || !window.confirm(`作品「${work.name}」を削除しますか？`)) {
      return;
    }

    mutateState((draft) => {
      draft.works = draft.works.filter((item) => item.id !== workId);
    });
  }

  function updateWorkField(field, value) {
    mutateState((draft) => {
      const work = draft.works.find((item) => item.id === draft.selectedWorkId);
      if (!work) {
        return;
      }
      work[field] = value;
      touchWork(work);
    });
  }

  function addEvent() {
    mutateState((draft) => {
      const work = draft.works.find((item) => item.id === draft.selectedWorkId);
      if (!work) {
        return;
      }
      const event = createEvent({ name: `イベント ${work.events.length + 1}` });
      work.events.unshift(event);
      draft.selectedEventId = event.id;
      touchWork(work);
    });
  }

  function deleteEvent(eventId) {
    const event = selectedWork?.events.find((item) => item.id === eventId);
    if (!event || !window.confirm(`イベント「${event.name}」を削除しますか？`)) {
      return;
    }

    mutateState((draft) => {
      const work = draft.works.find((item) => item.id === draft.selectedWorkId);
      if (!work) {
        return;
      }
      work.events = work.events.filter((item) => item.id !== eventId);
      touchWork(work);
      draft.currentPage = "events";
    });
  }

  function updateEventField(field, value) {
    mutateState((draft) => {
      const work = draft.works.find((item) => item.id === draft.selectedWorkId);
      const event = work?.events.find((item) => item.id === draft.selectedEventId);
      if (!event || !work) {
        return;
      }
      event[field] = value;
      touchEvent(event);
      touchWork(work);
    });
  }

  function updateConversationField(field, value) {
    mutateState((draft) => {
      const work = draft.works.find((item) => item.id === draft.selectedWorkId);
      const event = work?.events.find((item) => item.id === draft.selectedEventId);
      if (!event || !work) {
        return;
      }
      event.conversation[field] = value;
      touchEvent(event);
      touchWork(work);
    });
  }

  function handleJsonImport(event) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    file
      .text()
      .then((text) => JSON.parse(text))
      .then((value) => {
        const normalized = normalizeAppState(value);
        startTransition(() => {
          setAppState(normalized);
          setSaveMessage("JSONを読み込みました");
        });
      })
      .catch(() => {
        window.alert("JSONの読み込みに失敗しました。形式を確認してください。");
      })
      .finally(() => {
        if (importInputRef.current) {
          importInputRef.current.value = "";
        }
      });
  }

  if (!appState) {
    return h(
      "div",
      { className: "app-shell" },
      h(
        "main",
        { className: "app-main" },
        h(EmptyState, {
          title: "会話エディタを読み込み中です",
          body: "IndexedDB からデータを読み込んでいます。",
        }),
      ),
    );
  }

  const canGoData = Boolean(selectedWork);
  const canGoEvents = Boolean(selectedWork);
  const canGoEditor = Boolean(selectedWork && selectedEvent);

  function renderWorksPage() {
    return h(
      Fragment,
      null,
      h(
        "section",
        { className: "panel page-panel" },
        h(
          "div",
          { className: "section-headline" },
          h("h2", { className: "section-title" }, "作品管理"),
          h(
            "button",
            { className: "button button-primary", type: "button", onClick: addWork },
            "作品を追加",
          ),
        ),
        appState.works.length
          ? h(
              Fragment,
              null,
              h(
                "div",
                { className: "stack-list" },
                appState.works.map((work) =>
                  h(
                    "button",
                    {
                      key: work.id,
                      className: `work-card ${work.id === appState.selectedWorkId ? "is-active" : ""}`,
                      type: "button",
                      onClick: () => selectWork(work.id),
                    },
                    h("strong", { className: "work-card-title" }, work.name),
                    h("span", { className: "work-card-sub" }, `${work.events.length}件のイベント`),
                  ),
                ),
              ),
              selectedWork
                ? h(
                    "div",
                    { className: "editor-card" },
                    h(
                      "div",
                      { className: "danger-line" },
                      h("h3", { className: "subsection-title" }, "選択中の作品"),
                      h(
                        "button",
                        {
                          className: "button button-danger",
                          type: "button",
                          onClick: () => deleteWork(selectedWork.id),
                        },
                        "作品を削除",
                      ),
                    ),
                    h(
                      "div",
                      { className: "field-grid single-column" },
                      h(LabeledInput, {
                        label: "作品名",
                        value: selectedWork.name,
                        onChange: (value) => updateWorkField("name", value),
                        placeholder: "作品名を入力",
                      }),
                      h(LabeledInput, {
                        label: "概要",
                        value: selectedWork.summary,
                        onChange: (value) => updateWorkField("summary", value),
                        placeholder: "作品の目的や全体メモ",
                        multiline: true,
                        rows: 4,
                      }),
                      h(LabeledInput, {
                        label: "メモ",
                        value: selectedWork.memo,
                        onChange: (value) => updateWorkField("memo", value),
                        placeholder: "進行メモや管理メモ",
                        multiline: true,
                        rows: 5,
                      }),
                    ),
                  )
                : null,
            )
          : h(EmptyState, {
              title: "作品がまだありません",
              body: "最初の作品を作ると、このあとデータ操作とイベント編集へ進めます。",
              actionLabel: "作品を追加",
              onAction: addWork,
            }),
      ),
      h(StepFooter, {
        nextLabel: "データ操作へ",
        onNext: () => moveToPage("data"),
        nextDisabled: !canGoData,
      }),
    );
  }

  function renderDataPage() {
    return h(
      Fragment,
      null,
      h(
        "section",
        { className: "panel page-panel" },
        h("h2", { className: "section-title" }, "データ操作"),
        selectedWork
          ? h(
              "p",
              { className: "page-lead" },
              `現在の作品: ${selectedWork.name}`,
            )
          : null,
        h(
          "div",
          { className: "button-grid-mobile" },
          h(
            "button",
            {
              className: "button button-primary",
              type: "button",
              onClick: () => exportJson(appState),
            },
            "JSON出力",
          ),
          h(
            "button",
            {
              className: "button",
              type: "button",
              onClick: () => importInputRef.current?.click(),
            },
            "JSON読込",
          ),
          h(
            "button",
            {
              className: "button",
              type: "button",
              onClick: () => exportEventsCsv(appState),
            },
            "CSV出力（イベント）",
          ),
          h(
            "button",
            {
              className: "button",
              type: "button",
              onClick: () => exportConversationBlocksCsv(appState),
            },
            "CSV出力（会話）",
          ),
        ),
        h("input", {
          ref: importInputRef,
          className: "hidden-input",
          type: "file",
          accept: ".json,application/json",
          onChange: handleJsonImport,
        }),
      ),
      h(StepFooter, {
        backLabel: "作品管理へ",
        onBack: () => moveToPage("works"),
        nextLabel: "イベント一覧へ",
        onNext: () => moveToPage("events"),
        nextDisabled: !canGoEvents,
      }),
    );
  }

  function renderEventsPage() {
    return h(
      Fragment,
      null,
      h(
        "section",
        { className: "panel page-panel" },
        h(
          "div",
          { className: "section-headline" },
          h("h2", { className: "section-title" }, "イベント一覧"),
          h(
            "button",
            {
              className: "button button-primary",
              type: "button",
              onClick: addEvent,
              disabled: !selectedWork,
            },
            "イベントを追加",
          ),
        ),
        h(
          "div",
          { className: "field-grid single-column compact-grid" },
          h(LabeledInput, {
            label: "イベント名検索",
            value: filters.eventName,
            onChange: (value) => updateFilters({ eventName: value }),
            placeholder: "イベント名で検索",
          }),
          h(LabeledInput, {
            label: "本文検索",
            value: filters.body,
            onChange: (value) => updateFilters({ body: value }),
            placeholder: "本文の語句で検索",
          }),
          h(LabeledInput, {
            label: "キャラ名検索",
            value: filters.character,
            onChange: (value) => updateFilters({ character: value }),
            placeholder: "Mio, Stitchy など",
          }),
          h(LabeledSelect, {
            label: "ステータス",
            value: filters.status,
            onChange: (value) => updateFilters({ status: value }),
            options: [{ value: "all", label: "すべて" }].concat(
              STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
            ),
          }),
          h(ToggleField, {
            label: "付箋ありのみ",
            checked: filters.stickyOnly,
            onChange: (value) => updateFilters({ stickyOnly: value }),
          }),
        ),
        selectedWork
          ? filteredEvents.length
            ? h(
                "div",
                { className: "stack-list" },
                filteredEvents.map((eventItem) =>
                  h(
                    "button",
                    {
                      key: eventItem.id,
                      type: "button",
                      className: `event-card ${eventItem.id === appState.selectedEventId ? "is-active" : ""}`,
                      onClick: () => selectEvent(eventItem.id),
                    },
                    h("span", {
                      className: "event-status-bar",
                      style: { backgroundColor: STATUS_META[eventItem.status].color },
                    }),
                    h(
                      "div",
                      { className: "event-card-body" },
                      h(
                        "div",
                        { className: "event-item-head" },
                        h("strong", { className: "event-item-title" }, eventItem.name),
                        eventItem.stickyNote.trim()
                          ? h("span", { className: "sticky-badge" }, "付箋")
                          : null,
                      ),
                      h(
                        "div",
                        { className: "event-meta" },
                        h("span", null, eventItem.status),
                        h("span", null, eventItem.conversation.timing),
                      ),
                      eventItem.stickyNote.trim()
                        ? h("p", { className: "sticky-preview" }, eventItem.stickyNote)
                        : null,
                      h("p", { className: "event-summary" }, eventItem.conversation.body || "本文未入力"),
                    ),
                  ),
                ),
              )
            : h(EmptyState, {
                title: "条件に合うイベントがありません",
                body: "検索条件を調整するか、新しいイベントを追加してください。",
              })
          : h(EmptyState, {
              title: "作品を先に作成してください",
              body: "作品がないとイベント一覧は表示できません。",
            }),
      ),
      h(StepFooter, {
        backLabel: "データ操作へ",
        onBack: () => moveToPage("data"),
        nextLabel: "イベント操作へ",
        onNext: () => moveToPage("editor"),
        nextDisabled: !canGoEditor,
      }),
    );
  }

  function renderEditorPage() {
    return h(
      Fragment,
      null,
      h(
        "section",
        { className: "panel page-panel" },
        h(
          "div",
          { className: "danger-line" },
          h("h2", { className: "section-title" }, "イベント操作"),
          selectedEvent
            ? h(
                "button",
                {
                  className: "button button-danger",
                  type: "button",
                  onClick: () => deleteEvent(selectedEvent.id),
                },
                "イベントを削除",
              )
            : null,
        ),
        selectedEvent
          ? h(
              "div",
              { className: "editor-card" },
              h(
                "div",
                { className: "field-grid single-column" },
                h(LabeledInput, {
                  label: "イベント名",
                  value: selectedEvent.name,
                  onChange: (value) => updateEventField("name", value),
                  placeholder: "イベント名",
                }),
                h(LabeledSelect, {
                  label: "ステータス",
                  value: selectedEvent.status,
                  onChange: (value) => updateEventField("status", value),
                  options: STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
                }),
                h(LabeledInput, {
                  label: "付箋メモ",
                  value: selectedEvent.stickyNote,
                  onChange: (value) => updateEventField("stickyNote", value),
                  placeholder: "一覧で目立たせたい短いメモ",
                  multiline: true,
                  rows: 2,
                }),
                h("div", { className: "divider-label" }, "会話本文"),
                h(LabeledInput, {
                  label: "会話タイトル",
                  value: selectedEvent.conversation.conversationTitle,
                  onChange: (value) => updateConversationField("conversationTitle", value),
                  placeholder: "例: 食卓 / 廊下 / 別れ際",
                }),
                h(LabeledSelect, {
                  label: "タイミング",
                  value: selectedEvent.conversation.timing,
                  onChange: (value) => updateConversationField("timing", value),
                  options: TIMING_OPTIONS.map((timing) => ({ value: timing, label: timing })),
                }),
                h(LabeledInput, {
                  label: "登場キャラ",
                  value: selectedEvent.conversation.characters,
                  onChange: (value) => updateConversationField("characters", value),
                  placeholder: "自由入力 / カンマ区切り",
                }),
                h(LabeledInput, {
                  label: "本文",
                  value: selectedEvent.conversation.body,
                  onChange: (value) => updateConversationField("body", value),
                  placeholder:
                    "Mio「……ここ、前にも来た気がする」\nStitchy「気のせいってことにしとけ」",
                  multiline: true,
                  rows: 14,
                }),
                h(LabeledInput, {
                  label: "会話メモ",
                  value: selectedEvent.conversation.memo,
                  onChange: (value) => updateConversationField("memo", value),
                  placeholder: "演出メモや差分条件メモ",
                  multiline: true,
                  rows: 5,
                }),
              ),
            )
          : h(EmptyState, {
              title: "イベントを選択してください",
              body: "イベント一覧で対象を選ぶと、ここで会話を編集できます。",
            }),
      ),
      h(StepFooter, {
        backLabel: "イベント一覧へ",
        onBack: () => moveToPage("events"),
      }),
    );
  }

  const pageContent = {
    works: renderWorksPage(),
    data: renderDataPage(),
    events: renderEventsPage(),
    editor: renderEditorPage(),
  }[appState.currentPage];

  return h(
    "div",
    { className: "app-shell phone-first" },
    h(
      "header",
      { className: "topbar" },
      h(
        "div",
        null,
        h("p", { className: "eyebrow" }, "iPhone 縦持ち向け / PWA"),
        h("h1", { className: "app-title" }, "会話エディタ"),
        h("p", { className: "app-subtitle" }, "作品を選び、順番に進みながら会話を1件ずつ整える構成です。"),
      ),
      h(
        "div",
        { className: "save-indicator" },
        h("span", { className: "save-dot" }),
        h("span", null, saveMessage),
      ),
      h(
        "nav",
        { className: "step-nav" },
        PAGE_ORDER.map((page) =>
          h(NavStep, {
            key: page,
            page,
            currentPage: appState.currentPage,
            disabled:
              (page === "data" && !canGoData) ||
              (page === "events" && !canGoEvents) ||
              (page === "editor" && !canGoEditor),
            onClick: () => moveToPage(page),
          }),
        ),
      ),
    ),
    h("main", { className: "app-main single-page" }, pageContent),
  );
}
