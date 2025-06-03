'use client';

import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const MistralDrop = dynamic(
  () => import('@/app/components/MistralDrop'),
  { ssr: false }
);

export default function MistralPage() {
  return (
    <main className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Mistral</h2>
      <Suspense fallback={<p>Loading…</p>}>
        <MistralDrop />
      </Suspense>
    </main>
  );
}
