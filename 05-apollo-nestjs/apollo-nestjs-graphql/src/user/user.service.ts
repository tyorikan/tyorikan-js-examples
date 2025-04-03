import { Injectable } from '@nestjs/common';
import { User } from './user.model';

@Injectable()
export class UserService {
  private users: User[] = [
    { id: '1', name: 'John Doe', email: 'john.doe@example.com' },
    { id: '2', name: 'Jane Smith', email: 'jane.smith@example.com' },
  ];

  findAll(): User[] {
    return this.users;
  }

  findOne(id: string): User | null {
    const user = this.users.find((user) => user.id === id);
    return user || null;
  }
}
