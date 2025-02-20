"use client";
import { useRouter } from 'next/navigation';

export default function Page3() {
  const router = useRouter();
  const name = localStorage.getItem('name') || ''; // Retrieve name from localStorage
  const age = localStorage.getItem('age') || ''; // Retrieve age from localStorage

  // Consider clearing localStorage after displaying data to avoid persistence across sessions.
  // localStorage.clear();

  return (
    <div>
      <h1>Page 3: Confirmation</h1>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
      <button type="button" onClick={() => router.back()}>Back</button>
    </div>
  );
}
