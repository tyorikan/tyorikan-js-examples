## Firestore Rule 例
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, create, update: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```