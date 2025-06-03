'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ComboDrop = dynamic(
  () => import('@/app/components/ComboDrop'),
  { ssr: false }
);

export default function ComboPage() {
  return (
    <main className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Mistral + OpenAI</h2>
      <Suspense fallback={<p>Loading…</p>}>
        <ComboDrop />
      </Suspense>
    </main>
  );
}
