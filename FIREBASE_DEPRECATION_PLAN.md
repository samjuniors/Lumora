# Firebase Deprecation Plan (Phase 2)

## Remaining Firebase-Critical Systems
Currently, Firebase Firestore is still acting as:
- A secondary data store. All core resources (Users, Assignments, Submissions) use a dual-write (Postgarten primary, Firestore fallback) system.
- The Auth system. Firebase Authentication handles logins.

## Realtime Dependencies
The application relies heavily on `onSnapshot` queries for reactive data updates. Current listeners in use:
- `subscribeToUser(userId)`
- `subscribeToStudents()`
- `subscribeToAssessedSubmissions()`

*Removal Strategy*: These need to be replaced with Server-Sent Events (SSE) or WebSockets from the Express Node backend to preserve the live-update UX. Alternatively, we could refactor the UI to use React Query with aggressive polling in high-stakes scenarios.

## Economy Dependencies
The user's wallet, syndicates, and economy state are still entangled with the `FirebaseUserService`. Specifically, operations that require atomicity like updating balances are currently dual-writing without a distributed lock. 

*Removal Strategy*: A dedicated Postgres `WalletTransaction` table needs to be established to provide an audit log and calculate balances deterministically, moving away from simple field increments in both databases.

## Staged Removal Candidates
1. **Fallback Dual-Writes**: Once `HybridDiagnostics` reports a drift variance of near 0% under load, the `updateDoc`, `setDoc`, and `deleteDoc` calls to Firestore can be safely removed.
2. **Read Fallbacks**: The `try/catch` fallback blocks inside the service layer can be disabled.
3. **Realtime Listeners**: Refactor `onSnapshot` inside `FirebaseUserService` and `FirebaseSubmissionService` to use a polling wrapper over `pgFetch` or a true unified Express-level SSE feed.

## Conclusion
The application is currently entirely operative and stable with a SQL-First Architecture, treating Firebase entirely as a passive backup.
