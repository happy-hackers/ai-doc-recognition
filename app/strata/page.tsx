'use client';

import DocumentUpload from "@/app/components/DocumentUpload";

export default function StrataPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-start p-8">
      <h1 className="mb-6 text-3xl font-semibold">Strata Document Analysis</h1>
      <DocumentUpload />
    </main>
  );
}
