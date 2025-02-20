"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Page2() {
  const router = useRouter();
  const name = localStorage.getItem('name') || ''; // Retrieve name from localStorage

  const [age, setAge] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('age', age); // Store age in localStorage
    router.push('/page3'); // Navigate to Page3 without query parameters
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
