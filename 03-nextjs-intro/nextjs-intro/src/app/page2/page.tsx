"use client";
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function Page2() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || ''; // URLからnameを取得

  const [age, setAge] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/page3?name=${name}&age=${age}`); // フォームデータをURLに含めて遷移
  };

  return (
    <div>
      <h1>Page 2: Your Age</h1>
      <p>Name: {name}</p>
      <form onSubmit={handleSubmit}>
        <label htmlFor="age">Age:</label>
        <input
          type="number"
          id="age"
          value={age}
          onChange={(e) => setAge(e.target.value)}
        />
        <button type="submit">Next</button>
        <button type="button" onClick={() => router.back()}>Back</button>
      </form>
    </div>
  );
}
