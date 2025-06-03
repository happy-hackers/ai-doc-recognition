"use client";

import { useState } from "react";
import { Upload, message, Card } from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { Dragger } = Upload;

export default function ComboDrop() {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const props = {
    name: "file",
    multiple: true,
    accept: ".pdf",
    customRequest: async (options: any) => {
      const { file, onSuccess, onError } = options;
      const formData = new FormData();
      formData.append("file", file as Blob, file.name);

      try {
        setLoading(true);
        const res = await fetch("/api/ai/mistral-openai", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setResults((prev) => [...prev, ...data.results]);
        onSuccess(null);
      } catch (e: any) {
        message.error("Analysis failed: " + e.message);
        onError(e);
      } finally {
        setLoading(false);
      }
    },
  };

  return (
    <>
      <Dragger {...props} disabled={loading} style={{ padding: 20 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Drag or click to upload PDF</p>
        <p className="ant-upload-hint">
          Workflow: 1️⃣ Extract Markdown using Mistral OCR → 2️⃣ Analyze with GPT-4o
        </p>
      </Dragger>

      {results.map((r, idx) => (
        <Card key={idx} title={`Result #${idx + 1}`} style={{ marginTop: 24 }}>
          <p className="font-medium mb-2">🔹 OpenAI Output:</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{r.openai}</pre>
          <p className="font-medium mt-4 mb-2">🔹 OCR Markdown:</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>{r.markdown}</pre>
        </Card>
      ))}
    </>
  );
}
