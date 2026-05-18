# Firestore to SQL (Neon + Prisma) Migration Audit

## 1. Firestore Data Architecture Audit

The current application heavily relies on Firestore's NoSQL design. The architecture is primarily flat, utilizing top-level collections with explicit document IDs to emulate relationships.

**Current Collections:**
- `users`: Core profile data, wallet balances, role metadata.
- `assignments`: Educational tasks containing constraints, rewards (coins/diamonds), penalties.
- `enrollments`: Connection between a user and an assignment (tracks statuses: active, missed, graded).
- `submissions`: Student payloads, AI assessment outputs, grader feedback.
- `syndicates`: Group entities containing leader info and member IDs.
- `transactions`: Immutable append-only ledger for the economy.
- `notifications`: User-specific alerts.
- `recharge_requests`: Manual fiat-to-currency requests.
- `inviteCodes`: Pre-registration codes for specific roles.

**Key Behaviours & Patterns:**
- **Denormalization:** Some data is duplicated (e.g. `memberIds` array in `syndicates` vs `syndicateId` inside `users`).
- **Batched Writes:** The economy is currently powered by Firestore `writeBatch`. For example, `transferCoins` modifies sender, receiver, and writes a transaction artifact atomically.
- **Client-heavy Listeners:** Extensive use of `onSnapshot()` throughout services (`subscribeToUser`, `subscribeToStudents`, notifications, submissions). 

---

## 2. Relational Data Mapping (Candidate Prisma Models)

The domain is inherently relational and will map cleanly to PostgreSQL:

```prisma
model User {
  id              String         @id @default(uuid())
  email           String         @unique
  name            String
  role            String         // ENUM: student, admin, superadmin
  coins           Int            @default(0)
  diamonds        Int            @default(0)
  syndicateId     String?
  syndicate       Syndicate?     @relation(fields: [syndicateId], references: [id])
  
  enrollments     Enrollment[]
  submissions     Submission[]
  notifications   Notification[]
  sentTransacts   Transaction[]  @relation("Sender")
  recvTransacts   Transaction[]  @relation("Receiver")
  
  followers       Follows[]      @relation("Following")
  following       Follows[]      @relation("Followers")
  
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}

model Syndicate {
  id              String         @id @default(uuid())
  name            String
  leaderId        String
  members         User[]
  level           Int            @default(1)
  xp              Int            @default(0)
}

model Assignment {
  id              String         @id @default(uuid())
  title           String
  description     String
  dueDate         DateTime
  entryFee        Int
  bonusReward     Int
  creatorId       String
  
  enrollments     Enrollment[]
}

model Enrollment {
  id              String         @id @default(uuid())
  userId          String
  assignmentId    String
  user            User           @relation(fields: [userId], references: [id])
  assignment      Assignment     @relation(fields: [assignmentId], references: [id])
  status          String         // ENUM: active, submitted, graded, missed
  grade           Int?
  
  @@unique([userId, assignmentId])
}

model Submission {
  id              String         @id @default(uuid())
  assignmentId    String
  studentId       String
  content         String
  aiScore         Int?
  aiFeedback      String?
  status          String
  
  user            User           @relation(fields: [studentId], references: [id])
}

model Transaction {
  id              String         @id @default(uuid())
  senderId        String
  receiverId      String
  amount          Int
  type            String         // ENUM: transfer, reward, penalty, etc.
  sender          User           @relation("Sender", fields: [senderId], references: [id])
  receiver        User           @relation("Receiver", fields: [receiverId], references: [id])
  timestamp       DateTime       @default(now())
}
```

---

## 3. Migration Complexity & Risks

### Low Risk
- **Assignments, Templates, Notifications:** Simple CRUD items largely written by admins and read by students. Easily ported to standard queries.

### Medium Risk
- **Enrollments & Submissions:** Require proper mapping to 1-to-many and junction tables. Client-side aggregation and grouping logic relies on Firebase's payload limits. SQL `JOIN`s will drastically optimize this.
- **Syndicates:** Dual-source-of-truth syncing (`memberIds` vs `userId` mapping) will be eliminated in favor of a true Relation in SQL. 

### High Risk
- **Real-time Subscriptions (`onSnapshot`):** 
  - **Risk:** SQL databases do not natively push updates to the browser without additional infrastructure.
  - **Remedy:** Real-time listeners will need to be replaced with **WebSockets (Socket.io) / SSE** for critical updates (like active matches/grades), and **SWR / React Query Polling** for dashboard data.
- **The Economy (Transactions):**
  - **Risk:** Currently batched in Firestore. 
  - **Remedy:** Must be strictly wrapped in `Prisma.$transaction` with appropriate isolation levels directly on the server to prevent race conditions during concurrent requests.
  - **Remedy:** Moving to a PostgreSQL database will improve the robustness of transactions exponentially compared to client-side Firestore batches, assuming deadlocks are prevented by ordered row-locking.

---

## 4. Potential Indexing Needs

As we shift away from Firestore's automatic indexing, PostgreSQL requires explicit index creation to maintain performance:

- **User Lookups:**
  - `@unique` on `email` is guaranteed by default.
  - `@@index([syndicateId])` to quickly fetch members of a syndicate.
  - `@@index([luminaId])` or unique constraints if this is used for lookups.

- **Enrollment / Grade Queries:**
  - `@@index([userId, assignmentId])` for fast individual lookup.
  - `@@index([assignmentId, status])` for calculating assignment completion rates or grading progress.
  - `@@index([userId, status])` for querying active vs completed missions for a specific student.

- **Transactions / Economy:**
  - `@@index([senderId, timestamp(sort: Desc)])` and `@@index([receiverId, timestamp(sort: Desc)])` for fast wallet statement loading.
  - `@@index([type, timestamp])` for admin analytics (e.g., "all tax collected this week").

- **Leaderboards & Syndicates:**
  - `@@index([xp(sort: Desc)])` on `User` for global leaderboards.
  - `@@index([level(sort: Desc), xp(sort: Desc)])` on `Syndicate` for war zone rankings.

---

## 5. Caching Considerations

PostgreSQL reads are synchronous and fast, but hitting the DB on every single app navigation will be heavily noticeable compared to Firestore's local cache behavior:

- **Client-Side Caching (SWR / React Query):** The UI should be updated to use HTTP fetch hooks (e.g., `useSWR`) that automatically cache requests and revalidate in the background (`stale-while-revalidate`).
- **Data Layers (Redis / Upstash):** 
  - Global leaderboards and Syndicate Rankings are heavily requested but infrequently undergo massive reordering. Caching these with an expiration TTL (e.g., 5-10 minutes) will prevent DB hits on the standard dashboard load.
  - User profile data and active assignment constraints can be cached upon login via standard Context layers (already implemented partially).
- **Connection Pooling:** Considering Neon as the backing database, Neon's serverless connection pooling or Prisma Accelerate can buffer connections and cache repetitive query results at the edge.

---

## 6. Future Real-Time Replacement Strategies

The biggest hurdle is replacing `onSnapshot` dependencies across the app. 

- **Critical Real-time Needs (Transactions, Notifications, Grades):** 
  - Instead of direct DB listeners, we can implement **Server-Sent Events (SSE)** or **WebSockets** via an external layer (e.g., Pusher, PartyKit, or Socket.io if running a continuous Node server). 
  - Alternatively, the DB itself can publish triggers via PostgreSQL's `LISTEN`/`NOTIFY` commands which are routed to the clients via the API.
- **Non-Critical Real-time Needs (Leaderboards, Mission Availability):**
  - Should be completely replaced by **High-Frequency Polling** via SWR (e.g., fetching every 30-60 seconds while the tab is active). 
- **Optimistic UI Updates:** 
  - The UI currently relies on Firestore's immediate cache-updates. When moving to standard REST/GraphQL + Prisma mutations, the frontend MUST use Optimistic UI patterns—immediately updating the local state (wallet balance, grade) while the background request resolves, reverting if it errors.

---

## 7. Next Steps for SQL Readiness

To prepare the application without breaking its ongoing Firestore functionality:
1. **Service Layer Abstraction:** Verify that every call to `collection(db)` or `doc(db)` is fully encapsulated within a `service` class. Currently, `IUserService`, `IAssignmentService` exist and help achieve this encapsulation. Ensure UI components **never** import `getDocs` or `onSnapshot` directly. 
2. **Remove Array Mutations on Client:** Patterns utilizing `arrayUnion` or `arrayRemove` (like in following/unfollowing) will become simpler update relationships (`connect`/`disconnect` in Prisma). Avoid adding new complex Array logics inside Firestore.
3. **Transition to SWR (Stale-While-Revalidate):** Begin gradually changing less-critical real-time components (e.g. Leaderboards, Past Missions) from `subscribe` models to a standard `fetch` + `polling` mechanism that simulates real-time without open WebSockets.

---

## 8. High-Risk Transactional Workflows (Prisma Mapping Guide)

Certain operations in this system require absolute transactional consistency (ACID) to prevent economy dupes or race conditions. When migrating to Prisma, these must explicitly utilize `Prisma.$transaction`.

### 1. The Economy / Wallets (`transferCoins`)
- **Current Pattern:** Firebase `writeBatch` modifying sender balance, receiver balance, and inserting a `transaction` ledger record.
- **SQL / Prisma Future:** 
  ```ts
  prisma.$transaction(async (tx) => {
    const sender = await tx.user.update({
      where: { id: senderId, coins: { gte: amount } }, // Optimistic locking guard
      data: { coins: { decrement: amount } }
    });
    if (!sender) throw new Error("Insufficient funds");
    
    await tx.user.update({
      where: { id: receiverId },
      data: { coins: { increment: amount } }
    });
    
    await tx.transaction.create({ data: { senderId, receiverId, amount, type: 'transfer' }});
  })
  ```
  *(Note the use of compound conditions `coins: { gte: amount }` natively supported in Postgres to prevent double-spend during race conditions without relying strictly on Isolation Levels).*

### 2. Assignment Submissions (`submitAssignment`)
- **Current Pattern:** Modifying `enrollments` table, adding to `submissions` table, charging entry fees occasionally from `users`.
- **SQL / Prisma Future:** This flow connects a User, an Assignment, an Enrollment, and a Submission. `Prisma.$transaction` will allow inserting the submission while synchronously flipping the enrollment status from "active" to "submitted". 

### 3. Grading & Rewards (`gradeSubmission`)
- **Current Pattern:** Modifies `submissions`, `enrollments`, `users` (reward dispensing), and sends a notification using `writeBatch`.
- **SQL / Prisma Future:** Relies on sequential updates within `prisma.$transaction`. Rewards must calculate the "Tax" system reliably in memory, then update the balance atomically.

### 4. Syndicate Operations (`joinSyndicate` / `leaveSyndicate`)
- **Current Pattern:** Array mutations (`arrayUnion`) on the syndicate's `memberIds` list.
- **SQL / Prisma Future:** Simple relational update connecting/disconnecting the foreign key.
  ```ts
  await prisma.user.update({
    where: { id: userId },
    data: { syndicate: { connect: { id: syndicateId } } } // or disconnect
  });
  ```

*Do NOT migrate the actual data yet, the Firestore environment must still be treated as primary until abstract layers are fully decoupled from SDK listener types.*
