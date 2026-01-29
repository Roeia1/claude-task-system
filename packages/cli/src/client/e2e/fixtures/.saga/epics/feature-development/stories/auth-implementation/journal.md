# Journal

## Session: 2025-01-15T10:30:00Z

### Task: t1 - Set up JWT token generation

**What was done:**
- Installed jsonwebtoken package
- Created token generation utility
- Added unit tests for token verification

**Decisions:**
- Chose RS256 algorithm for better security
- Set default expiration to 1 hour

**Next steps:**
- Implement login endpoint

## Blocker: Database Connection Issue

**Task**: t2 - Implement login endpoint
**What I'm trying to do**: Connect to the user database to validate credentials
**What I tried**: Using the standard connection string from environment variables
**What I need**: Clarification on whether to use connection pooling
**Suggested options**:
1. Use single connection per request (simpler, but may have performance issues)
2. Use pg-pool for connection pooling (more complex, better performance)

## Resolution: Database Connection

Decided to use pg-pool with a pool size of 10 connections. This provides good balance between complexity and performance for expected load.

## Session: 2025-01-16T14:00:00Z

### Task: t2 - Implement login endpoint

**What was done:**
- Created POST /api/auth/login endpoint
- Added input validation for email and password
- Implemented credential checking against database

**Decisions:**
- Using bcrypt.compare for password verification
- Returning both access and refresh tokens

**Next steps:**
- Complete password hashing implementation
