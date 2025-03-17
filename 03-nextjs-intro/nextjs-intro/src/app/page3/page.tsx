"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function Page3() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [age, setAge] = useState<string>("");

  useEffect(() => {
    if (typeof window !== 'undefined') {
        // You're on the client-side, so you can access localStorage
        setName(localStorage.getItem('name') || '');
        setAge(localStorage.getItem('age') || '');
        // Consider clearing localStorage after displaying data, if needed.
        // localStorage.clear();
    }
  }, []);

  return (
    <div>
      <h1>Page 3: Confirmation</h1>
      <p>Name: {name}</p>
      <p>Age: {age}</p>
      <button type="button" onClick={() => router.back()}>Back</button>
    </div>
  );
}
