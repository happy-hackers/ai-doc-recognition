"use client";

import React, { useState } from "react";
import { Form, Upload, Button, message, Card, Space } from "antd";
import { UploadOutlined } from "@ant-design/icons";

// Supported document types
const FILE_FIELDS = [
  { label: "Plan Of Subdivision", key: "planOfSubDivision" },
  { label: "Letter Of Acquisition", key: "letterOfAcquisition" },
  { label: "Managing Authority Form", key: "managingAuthorityForm" },
  { label: "Insurance Invoice", key: "insuranceInvoice" },
  { label: "Insurance CoC", key: "insuranceCoC" },
  { label: "Insurance Valuation Report", key: "insuranceValuationReport" },
  { label: "Owner List", key: "ownerlist" },
  // { label: "Contract Of Appointment", key: "contractOfAppointment" },
] as const;

type FileKey = (typeof FILE_FIELDS)[number]["key"];

export default function DocumentUpload() {
  // File upload states
  const [uploadLists, setUploadLists] = useState<Record<FileKey, any[]>>(
    {} as any
  );
  const [analysis, setAnalysis] = useState<any>(null); // parsed results
  const [loading, setLoading] = useState(false); // loading state

  // Update file list for each field
  const handleFileChange = (k: FileKey, info: any) =>
    setUploadLists((prev) => ({ ...prev, [k]: info.fileList }));

  // Submit all uploaded files for processing
  const handleSubmit = async () => {
    const allFiles = Object.values(uploadLists).flat();
    if (allFiles.length === 0) return message.warning("Please select files");

    setLoading(true);
    const formData = new FormData();
    Object.entries(uploadLists).forEach(([k, list]) =>
      list.forEach((f: any) =>
        formData.append(k, f.originFileObj as Blob, f.name)
      )
    );

    try {
      const res = await fetch("/api/ai/extract", { method: "POST", body: formData });
      if (!res.ok) throw new Error(await res.text());
      setAnalysis(await res.json());
      message.success("Analysis completed");
    } catch (e: any) {
      message.error("Analysis failed: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  // Render form and results
  return (
    <Form layout="vertical">
      {/* Upload buttons for each doc type */}
      {FILE_FIELDS.map(({ label, key }) => (
        <Form.Item key={key} label={label}>
          <Upload
            accept=".pdf"
            multiple
            fileList={uploadLists[key] || []}
            onChange={(info) => handleFileChange(key, info)}
          >
            <Button icon={<UploadOutlined />}>上传 {label}</Button>
          </Upload>
        </Form.Item>
      ))}

      {/* Submit button */}
      <Form.Item>
        <Button type="primary" loading={loading} onClick={handleSubmit}>
          Start Analysis
        </Button>
      </Form.Item>

      {/* Display parsed results */}
      {analysis && (
        <Space direction="vertical" style={{ width: "100%" }}>
          {Object.entries(analysis.results).map(([field, arr]: any) =>
            arr.map((item: any, i: number) => (
              <Card key={`${field}-${i}`} title={`${field} #${i + 1}`}>
                <pre style={{ whiteSpace: "pre-wrap" }}>
                  {JSON.stringify(item.parsed, null, 2)}
                </pre>
              </Card>
            ))
          )}
          <Card title="🔷 Merged Result">
            <pre style={{ whiteSpace: "pre-wrap" }}>
              {JSON.stringify(analysis.mergedResult, null, 2)}
            </pre>
          </Card>
        </Space>
      )}
    </Form>
  );
}
