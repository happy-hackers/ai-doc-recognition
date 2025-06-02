'use client';

import dynamic from "next/dynamic";
import { Suspense } from "react";


const DocumentUpload = dynamic(
  () => import("@/app/components/DocumentUpload"),
  { ssr: false }
);

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">
      <h1 className="mb-6 text-3xl font-semibold">AI Document Extractor</h1>

      {/* Suspense 可选，用于加载指示 */}
      <Suspense fallback={<p>Loading component…</p>}>
        <DocumentUpload />
      </Suspense>
    </main>
  );
}
