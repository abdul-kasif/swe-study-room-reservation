import { eq } from "drizzle-orm";
import { db } from "../../db";
import { users, type NewUser, type User } from "../../db/schema";

export class AuthRepository {
  async findByUsername(username: string): Promise<User | undefined> {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return result[0];
  }

  async createUser(data: NewUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }
}
