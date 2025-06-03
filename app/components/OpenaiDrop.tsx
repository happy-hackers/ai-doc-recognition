"use client";

import { useState } from "react";
import { Upload, message, Card } from "antd";
import type { UploadProps } from "antd";
import { InboxOutlined } from "@ant-design/icons";

const { Dragger } = Upload;

export default function OpenaiDrop() {
  // State to store extracted results and loading status
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload configuration
  const props: UploadProps = {
    name: "file",
    multiple: true,
    accept: ".pdf",
    customRequest: async (options) => {
      const { file, onSuccess, onError } = options;
      const formData = new FormData();
      formData.append("file", file as Blob, (file as any).name);

      try {
        setLoading(true);
        // Send PDF to OpenAI-based extraction API
        const res = await fetch("/api/ai/openai-extract", {
          method: "POST",
          body: formData,
        });
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        // Append extracted results
        setResults((prev) => [...prev, ...data.results]);
        onSuccess?.(null, file as any);
      } catch (err: any) {
        message.error("Analysis failed: " + err.message);
        onError?.(err);
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
          Process with OpenAI GPT-4o to extract full result
        </p>
      </Dragger>

      {/* Render extracted results */}
      {results.map((r, idx) => (
        <Card key={idx} title={`Result #${idx + 1}`} style={{ marginTop: 24 }}>
          <pre style={{ whiteSpace: "pre-wrap" }}>{r.result}</pre>
        </Card>
      ))}
    </>
  );
}
