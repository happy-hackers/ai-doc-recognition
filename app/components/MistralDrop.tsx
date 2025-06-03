"use client";

import { useState } from "react";
import { Upload, message, Card } from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { Dragger } = Upload;

export default function MistralDrop() {
  // OCR results and loading state
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload configuration
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
        // Send PDF to OCR API
        const res = await fetch("/api/ai/mistral-ocr", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // Append results
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
      {/* Upload dropzone */}
      <Dragger {...props} disabled={loading} style={{ padding: 20 }}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <p className="ant-upload-text">Drag or click to upload PDF</p>
        <p className="ant-upload-hint">
          Process with Mistral OCR (mistral-ocr-latest) to extract Markdown
        </p>
      </Dragger>

      {/* Display OCR results */}
      {results.map((r, idx) => (
        <Card key={idx} title={`Result #${idx + 1}`} style={{ marginTop: 24 }}>
          <pre style={{ whiteSpace: "pre-wrap" }}>{r.markdown}</pre>
        </Card>
      ))}
    </>
  );
}
