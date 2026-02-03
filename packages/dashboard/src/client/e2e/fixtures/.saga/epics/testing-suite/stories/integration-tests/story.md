---
id: integration-tests
title: Integration Testing Setup
status: blocked
epic: testing-suite
tasks:
  - id: t1
    title: Set up test database
    status: completed
  - id: t2
    title: Create API test utilities
    status: pending
---

## Context

Establish the integration testing infrastructure including test database setup and API testing utilities.

## Scope Boundaries

**In scope:**
- Test database configuration
- API testing helpers
- Mock service setup

**Out of scope:**
- E2E browser tests
- Performance testing

## Interface

### Inputs

- Database schema
- API specifications

### Outputs

- Integration test framework
- Test data fixtures

## Acceptance Criteria

- [x] Test database can be seeded and reset
- [ ] API tests can make authenticated requests
- [ ] Tests run in isolation

## Tasks

### t1: Set up test database

**Done when:**
- Test DB is separate from production
- Migrations run automatically

### t2: Create API test utilities

**Done when:**
- Helper functions for common API operations exist
