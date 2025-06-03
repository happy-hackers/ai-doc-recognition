"use client";

import Link from "next/link";
import { Typography, Card, Button, Space } from "antd";
import { RobotOutlined, ThunderboltOutlined } from "@ant-design/icons";

export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <Card
        hoverable
        style={{ maxWidth: 360, width: "100%", textAlign: "center" }}
      >
        <Typography.Title level={3}>AI Document Extractor</Typography.Title>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Link href="/strata" passHref>
            <Button type="primary" block>
              Strata Document Analysis
            </Button>
          </Link>
          <Link href="/openai" passHref>
            <Button type="default" icon={<RobotOutlined />} block>
              OpenAI Analysis
            </Button>
          </Link>
          <Link href="/mistral" passHref>
            <Button type="default" icon={<RobotOutlined />} block>
              Mistral Analysis
            </Button>
          </Link>
          <Link href="/combo" passHref>
            <Button type="default" icon={<ThunderboltOutlined />} block>
              Mistral + OpenAI Analysis
            </Button>
          </Link>
        </Space>
      </Card>
    </div>
  );
}
