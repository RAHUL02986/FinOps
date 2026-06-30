# TODO
- [x] Update `backend/src/routes/transactions.js` so `Account.currentBalance` is adjusted only when a transaction is `Approved`.
- [x] Ensure balances are correctly reversed when an Approved transaction is deleted.
- [x] Ensure balances are reversed when an Approved transaction transitions away from Approved (e.g., Rejected if allowed).
- [x] Ensure no balance changes happen on create/update while status is Pending/Draft/Rejected.
- [ ] Run backend lint/tests (or start server) to verify no syntax/runtime errors.


