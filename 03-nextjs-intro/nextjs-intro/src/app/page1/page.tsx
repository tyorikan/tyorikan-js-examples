"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Page1() {
  const [name, setName] = useState('');
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(`/page2?name=${name}`); // フォームデータをURLに含めて遷移
  };

  return (
    <div>
      <h1>Page 1: Your Name</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="name">Name:</label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button type="submit">Next</button>
      </form>
    </div>
  );
}
