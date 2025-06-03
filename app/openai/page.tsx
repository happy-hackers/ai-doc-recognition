'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const OpenaiDrop = dynamic(
  () => import('@/app/components/OpenaiDrop'),
  { ssr: false }
);

export default function OpenaiPage() {
  return (
    <main className="p-6">
      <h2 className="text-2xl font-semibold mb-4">OpenAI</h2>
      <Suspense fallback={<p>Loading…</p>}>
        <OpenaiDrop />
      </Suspense>
    </main>
  );
}
