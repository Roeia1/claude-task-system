# Technical Plan: [Feature Name]

**Feature**: [Link to feature.md]
**Created**: [YYYY-MM-DD]
**Status**: Draft | Review | Approved

## Executive Summary

High-level summary of the technical approach in 2-3 sentences.

## Technical Approach

Overall strategy for implementing this feature:

- **Architectural Pattern**: [e.g., event-driven, layered architecture, microservices]
- **Integration Points**: [Where this feature connects with existing systems]
- **Development Strategy**: [Incremental, big bang, parallel development, etc.]

## System Architecture

### Components

1. **[Component Name]**
   - **Purpose**: What it does
   - **Responsibilities**: Key functions
   - **Interfaces**: How it communicates

2. **[Component Name]**
   - **Purpose**: What it does
   - **Responsibilities**: Key functions
   - **Interfaces**: How it communicates

### Component Diagram

```
[ASCII diagram or description of how components interact]

[Frontend] <--> [API Gateway] <--> [Backend Service] <--> [Database]
                      |
                      v
                [External Service]
```

### Data Flow

Describe how data moves through the system:

1. User action triggers [event]
2. [Component] processes request
3. Data stored/retrieved from [storage]
4. Response returned to user

## Technology Choices

**Reference**: See [tech-stack.md](../docs/tech-stack.md) for approved technologies

### Core Technologies

- **Language/Runtime**: [choice] - *Rationale: [why]*
- **Framework**: [choice] - *Rationale: [why]*
- **Database**: [choice] - *Rationale: [why]*

### Libraries & Dependencies

| Library | Purpose | Version | Rationale |
|---------|---------|---------|-----------|
| [name] | [what it does] | [version] | [why chosen] |
| [name] | [what it does] | [version] | [why chosen] |

### Tools & Infrastructure

- **CI/CD**: [tool] - [reason]
- **Monitoring**: [tool] - [reason]
- **Deployment**: [platform] - [reason]

## Data Models

### Entity: [EntityName]

```
EntityName:
  - id: UUID (primary key)
  - field1: string (description)
  - field2: integer (description)
  - created_at: timestamp
  - updated_at: timestamp
```

**Relationships**:
- Has many [RelatedEntity]
- Belongs to [ParentEntity]

### Entity: [AnotherEntity]

```
[Schema definition]
```

## API Contracts

### Endpoint: [HTTP METHOD] /api/resource

**Purpose**: What this endpoint does

**Authentication**: Required | Optional | None

**Request**:
```json
{
  "field1": "value",
  "field2": 123
}
```

**Response** (200 OK):
```json
{
  "id": "uuid",
  "field1": "value",
  "field2": 123
}
```

**Error Responses**:
- 400: Bad Request - [reason]
- 401: Unauthorized - [reason]
- 404: Not Found - [reason]
- 500: Internal Server Error - [reason]

## Implementation Strategy

### Phase 1: Foundation
1. [Task description]
2. [Task description]
3. [Task description]

**Success Criteria**: [What must be done to complete this phase]

### Phase 2: Core Features
1. [Task description]
2. [Task description]
3. [Task description]

**Success Criteria**: [What must be done to complete this phase]

### Phase 3: Integration & Polish
1. [Task description]
2. [Task description]
3. [Task description]

**Success Criteria**: [What must be done to complete this phase]

## Testing Strategy

### Unit Testing
- **Coverage Target**: [percentage]
- **Focus Areas**: [What to test]
- **Framework**: [Testing tool]

### Integration Testing
- **Scope**: [What to test end-to-end]
- **Test Scenarios**:
  1. [Scenario description]
  2. [Scenario description]

### End-to-End Testing
- **User Flows**:
  1. [Complete user journey to test]
  2. [Complete user journey to test]

### Performance Testing
- **Load Tests**: [Expected load and response times]
- **Stress Tests**: [Breaking points and failure modes]

## Security Considerations

- **Authentication**: [How users are authenticated]
- **Authorization**: [How permissions are enforced]
- **Data Protection**: [Encryption, PII handling]
- **Input Validation**: [How to prevent injection attacks]
- **Rate Limiting**: [API protection]

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation Strategy |
|------|-----------|--------|---------------------|
| [Risk description] | Low/Med/High | Low/Med/High | [How to address] |
| [Risk description] | Low/Med/High | Low/Med/High | [How to address] |
| [Risk description] | Low/Med/High | Low/Med/High | [How to address] |

## Performance Considerations

- **Expected Load**: [Users, requests/sec, data volume]
- **Response Time Targets**: [Latency requirements]
- **Optimization Strategies**: [Caching, indexing, lazy loading, etc.]
- **Scalability Plan**: [How to handle growth]

## Dependencies

### External Services
- **[Service Name]**: [What it provides] - [Integration approach]
- **[Service Name]**: [What it provides] - [Integration approach]

### Internal Dependencies
- **[Feature/Component]**: [What is needed and why]
- **[Feature/Component]**: [What is needed and why]

### Infrastructure Requirements
- **Compute**: [Server/serverless requirements]
- **Storage**: [Database, file storage needs]
- **Network**: [Bandwidth, CDN, etc.]

## Deployment Plan

1. **Preparation**: [What needs to be ready]
2. **Deployment Steps**: [How to deploy]
3. **Rollback Plan**: [How to undo if needed]
4. **Monitoring**: [What to watch after deployment]

## Open Questions

- [ ] Question 1 requiring technical decision
- [ ] Question 2 requiring technical decision
- [ ] Question 3 requiring architecture review

## Architecture Decisions

**ADRs created for this feature**:
- [ADR 001: Decision Title](./adr/001-decision.md) - [Brief description]
- [ADR 002: Decision Title](./adr/002-decision.md) - [Brief description]

## Future Considerations

Features or improvements that are out of scope now but may be relevant later:

- [Future enhancement 1]
- [Future enhancement 2]
- [Potential optimization 1]

---

**Note**: This document describes HOW to build the feature. It should be reviewed and approved before generating tasks.
