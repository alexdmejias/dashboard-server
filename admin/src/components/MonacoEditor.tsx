import * as monaco from "monaco-editor/esm/vs/editor/editor.api";
import "monaco-editor/esm/vs/language/json/monaco.contribution";
import { createEffect, onCleanup, onMount } from "solid-js";

// Global registry so multiple editors can have schemas without overwriting each other
const schemaRegistry = new Map<
  string,
  { uri: string; fileMatch: string[]; schema: object }
>();

function flushSchemas() {
  monaco.languages.json.jsonDefaults.setDiagnosticsOptions({
    validate: true,
    schemaValidation: "error",
    schemas: Array.from(schemaRegistry.values()),
  });
}

function registerSchema(modelUri: string, schema: object): void {
  const schemaId = `inmemory://schema/${encodeURIComponent(modelUri)}`;
  schemaRegistry.set(modelUri, {
    uri: schemaId,
    fileMatch: [modelUri],
    schema,
  });
  flushSchemas();
}

function unregisterSchema(modelUri: string): void {
  if (schemaRegistry.delete(modelUri)) {
    flushSchemas();
  }
}

let instanceCounter = 0;

export interface MonacoEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: string;
  /** JSON Schema object for validation and autocomplete (JSON language only) */
  schema?: object;
  height?: string;
  readOnly?: boolean;
}

export function MonacoEditor(props: MonacoEditorProps) {
  let containerRef!: HTMLDivElement;
  let editor: monaco.editor.IStandaloneCodeEditor | undefined;
  const modelUri = `inmemory://editor/${++instanceCounter}`;

  onMount(() => {
    if (props.schema) {
      registerSchema(modelUri, props.schema);
    }

    const model = monaco.editor.createModel(
      props.value,
      props.language ?? "json",
      monaco.Uri.parse(modelUri),
    );

    editor = monaco.editor.create(containerRef, {
      model,
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
      readOnly: props.readOnly ?? false,
      scrollBeyondLastLine: false,
      folding: true,
      lineNumbers: "on",
      fontSize: 13,
      tabSize: 2,
      wordWrap: "on",
    });

    editor.onDidChangeModelContent(() => {
      props.onChange?.(editor!.getValue());
    });
  });

  // Sync external value changes into the editor (e.g. layout reset, raw mode init)
  createEffect(() => {
    const incoming = props.value;
    if (editor && editor.getValue() !== incoming) {
      editor.setValue(incoming);
    }
  });

  onCleanup(() => {
    if (props.schema) unregisterSchema(modelUri);
    editor?.getModel()?.dispose();
    editor?.dispose();
    editor = undefined;
  });

  return (
    <div
      ref={containerRef}
      style={{
        height: props.height ?? "150px",
        width: "100%",
        border: "1px solid #333",
        "border-radius": "4px",
        overflow: "hidden",
      }}
    />
  );
}
