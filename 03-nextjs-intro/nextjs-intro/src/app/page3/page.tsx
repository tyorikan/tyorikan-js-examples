"use client";
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

export default function Page3() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || ''; // URLからnameを取得
  const age = searchParams.get('age') || ''; // URLからageを取得


  return (
    <div>
      <h1>Page 3: Confirmation</h1>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
      <button type="button" onClick={() => router.back()}>Back</button>
    </div>
  );
}
