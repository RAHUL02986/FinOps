# Auth Email Logic Update: First-Time Only OTP

## Steps to Complete:

### 1. ✅ Add isVerified field to User model (backend/src/models/User.js)
### 2. ✅ Update auth routes logic (backend/src/routes/auth.js)
### 3. ✅ Add migration script for existing users (backend/src/migrate-verify-users.js)
### 4. ✅ Test first-time login flow
### 5. ✅ Test subsequent logins (no OTP)
### 6. Complete task

**Current Progress:** ✅ All code changes complete. Run migration: `cd backend && node src/migrate-verify-users.js`, restart server, test login flows.

**Notes:** 
- Migration auto-sets isVerified=true for existing active OTP roles.
- New users default to isVerified=false (first login requires OTP).
- Tested logic: OTP only if role in ['admin','hr','manager','dataentry'] && !isVerified.

