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
const PAGE_ORDER = ["works", "events"];
const PAGE_LABELS = {
  works: "作品管理",
  events: "イベント一覧",
  editor: "イベント編集",
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
  const matchesStatus = filters.status === "all" || event.status === filters.status;
  const matchesSticky = !filters.stickyOnly || Boolean(event.stickyNote.trim());

  return matchesStatus && matchesSticky;
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
  const isActive = currentPage === page || (page === "events" && currentPage === "editor");

  return h(
    "button",
    {
      type: "button",
      className: `step-chip ${isActive ? "is-active" : ""}`,
      disabled,
      onClick,
    },
    PAGE_LABELS[page],
  );
}

export default function App() {
  const [appState, setAppState] = useState(null);
  const [isReady, setIsReady] = useState(false);
  const [saveMessage, setSaveMessage] = useState("読み込み中...");
  const [filters, setFilters] = useState({
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
          setSaveMessage("保存済みデータを読み込みました");
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
        setSaveMessage("読み込みに失敗したためサンプルデータで開始しました");
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
          setSaveMessage(
            `保存済み ${new Date().toLocaleTimeString("ja-JP", {
              hour: "2-digit",
              minute: "2-digit",
            })}`,
          );
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
      draft.currentPage = "editor";
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
      draft.currentPage = "editor";
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
                    Fragment,
                    null,
                    h(
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
                          placeholder: "作品の概要や全体メモ",
                          multiline: true,
                          rows: 4,
                        }),
                        h(LabeledInput, {
                          label: "メモ",
                          value: selectedWork.memo,
                          onChange: (value) => updateWorkField("memo", value),
                          placeholder: "補足メモや設定メモ",
                          multiline: true,
                          rows: 5,
                        }),
                      ),
                    ),
                    h(
                      "div",
                      { className: "editor-card" },
                      h("h3", { className: "subsection-title" }, "データ操作"),
                      h(
                        "p",
                        { className: "page-lead" },
                        `現在の作品: ${selectedWork.name}`,
                      ),
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
                  )
                : null,
            )
          : h(EmptyState, {
              title: "作品がまだありません",
              body: "最初の作品を作ると、このあとイベント一覧と編集へ進めます。",
              actionLabel: "作品を追加",
              onAction: addWork,
            }),
      ),
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
                body: "絞り込み条件を見直すか、新しいイベントを追加してください。",
              })
          : h(EmptyState, {
              title: "先に作品を選択してください",
              body: "作品がないとイベント一覧は表示できません。",
            }),
      ),
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
          h("h2", { className: "section-title" }, PAGE_LABELS.editor),
          h(
            "div",
            { className: "header-actions" },
            h(
              "button",
              {
                className: "button",
                type: "button",
                onClick: () => moveToPage("events"),
              },
              "一覧へ戻る",
            ),
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
                  rows: 1,
                }),
                h("div", { className: "divider-label" }, "会話本文"),
                h(LabeledInput, {
                  label: "会話タイトル",
                  value: selectedEvent.conversation.conversationTitle,
                  onChange: (value) => updateConversationField("conversationTitle", value),
                  placeholder: "例: 食卓 / 廊下 / 回想",
                }),
                h(LabeledSelect, {
                  label: "タイミング",
                  value: selectedEvent.conversation.timing,
                  onChange: (value) => updateConversationField("timing", value),
                  options: TIMING_OPTIONS.map((timing) => ({ value: timing, label: timing })),
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
                  label: "会話バックアップ",
                  value: selectedEvent.conversation.memo,
                  onChange: (value) => updateConversationField("memo", value),
                  placeholder: "本文の退避や差し替え前の控え",
                  multiline: true,
                  rows: 5,
                }),
              ),
            )
          : h(EmptyState, {
              title: "イベントを選択してください",
              body: "イベント一覧で選ぶと、この画面で編集できます。",
            }),
      ),
    );
  }

  const pageContent = {
    works: renderWorksPage(),
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
        { className: "title-row" },
        h("h1", { className: "app-title" }, "会話エディタ"),
        h(
          "div",
          { className: "save-indicator title-save-indicator" },
          h("span", { className: "save-dot" }),
          h("span", null, saveMessage),
        ),
      ),
      h(
        "nav",
        { className: "step-nav" },
        PAGE_ORDER.map((page) =>
          h(NavStep, {
            key: page,
            page,
            currentPage: appState.currentPage,
            disabled: page === "events" && !selectedWork,
            onClick: () => moveToPage(page),
          }),
        ),
      ),
    ),
    h("main", { className: "app-main single-page" }, pageContent),
  );
}
