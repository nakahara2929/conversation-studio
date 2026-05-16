function escapeCsvCell(value) {
  const text = `${value ?? ""}`.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  if (text.includes(",") || text.includes("\"") || text.includes("\n")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function createCsv(rows) {
  const lines = rows.map((row) => row.map((cell) => escapeCsvCell(cell)).join(","));
  return `\uFEFF${lines.join("\n")}`;
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function stamp() {
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = `${date.getMonth() + 1}`.padStart(2, "0");
  const dd = `${date.getDate()}`.padStart(2, "0");
  const hh = `${date.getHours()}`.padStart(2, "0");
  const min = `${date.getMinutes()}`.padStart(2, "0");
  return `${yyyy}${mm}${dd}-${hh}${min}`;
}

export function exportJson(state) {
  downloadBlob(
    `conversation-editor-${stamp()}.json`,
    JSON.stringify(
      {
        ...state,
        exportedAt: new Date().toISOString(),
      },
      null,
      2,
    ),
    "application/json;charset=utf-8",
  );
}

export function exportEventsCsv(state) {
  const rows = [
    [
      "作品名",
      "イベント名",
      "ステータス",
      "会話タイトル",
      "タイミング",
      "登場キャラ",
      "本文",
      "会話バックアップ",
    ],
  ];

  state.works.forEach((work) => {
    work.events.forEach((event) => {
      rows.push([
        work.name,
        event.name,
        event.status,
        event.conversation.conversationTitle,
        event.conversation.timing,
        event.conversation.characters,
        event.conversation.body,
        event.conversation.memo,
      ]);
    });
  });

  downloadBlob(
    `conversation-events-${stamp()}.csv`,
    createCsv(rows),
    "text/csv;charset=utf-8",
  );
}

export function exportConversationBlocksCsv(state) {
  const rows = [
    [
      "作品名",
      "イベント名",
      "ステータス",
      "会話ID",
      "会話タイトル",
      "タイミング",
      "登場キャラ",
      "本文",
      "会話バックアップ",
    ],
  ];

  state.works.forEach((work) => {
    work.events.forEach((event) => {
      rows.push([
        work.name,
        event.name,
        event.status,
        event.conversation.id,
        event.conversation.conversationTitle,
        event.conversation.timing,
        event.conversation.characters,
        event.conversation.body,
        event.conversation.memo,
      ]);
    });
  });

  downloadBlob(
    `conversation-blocks-${stamp()}.csv`,
    createCsv(rows),
    "text/csv;charset=utf-8",
  );
}
