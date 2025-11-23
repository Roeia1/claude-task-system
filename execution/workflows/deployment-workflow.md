# AWS Deployment Task Workflow

## Overview

This workflow guides the deployment of application components to AWS infrastructure, ensuring safe and repeatable deployments across environments.

**Division of responsibilities**:
- **User**: Makes changes in AWS Console
- **Agent**: Verifies changes via AWS CLI and manages deployment process

> **Note**: This workflow differs from standard 8-phase execution due to the operational nature of deployment tasks. It has deployment-specific phases focused on infrastructure and application deployment.

## Prerequisites

- AWS credentials configured
- Deployment branch prepared and tested
- All tests passing locally
- Infrastructure changes reviewed if applicable

## Journal Structure

Initialize journal for deployment tasks with:

```markdown
# Task #[NUMBER]: [TITLE]

## Current Phase: Phase 1 - Pre-Deployment Analysis

## Git References

- **Branch**: deploy/[environment]-[date]-[component]
- **Deployment Target**: [environment]

## Deployment Plan

[Filled in Phase 1]

## Infrastructure Changes

[Filled in Phase 3]

## Application Deployment

[Filled in Phase 4]

## Validation Results

[Filled in Phase 5]

## Progress Log

[Updated throughout with timestamped entries]

## Key Learnings

[Updated throughout]
```

> **Journal Guidelines**: See [Journal Entry Guidelines](../shared/journal-guidelines.md). For deployments, document all infrastructure changes, validation results, and rollback procedures.

## Phase 1: Pre-Deployment Analysis

### Deployment Planning

1. **Identify deployment scope**:
   - Which components are being deployed
   - What infrastructure changes are needed
   - Dependencies between components

2. **Review current infrastructure state** via AWS CLI:
   - List running resources
   - Verify all required services are operational
   - Confirm resource availability
   - Check service configurations

3. **Document deployment plan**:
   - Components to deploy
   - Order of deployment
   - Rollback strategy
   - Expected downtime (if any)

4. **Validate credentials and permissions**:
   ```bash
   aws sts get-caller-identity
   # Additional service-specific validation commands
   ```

5. **Invoke journaling subagent** to document pre-deployment analysis:
   ```
   task_id: Current task number
   phase: "Phase 1: Pre-Deployment Analysis"
   activity: "Phase 1 Complete: Deployment Plan Finalized"
   is_phase_transition: true
   content: |
     [Prepared deployment plan including:
      - Components being deployed
      - Infrastructure changes needed
      - Current infrastructure state verified
      - Deployment order and strategy
      - Rollback strategy
      - Expected downtime (if any)
      - Credentials validated]
   next_action: "Request user permission to proceed to Phase 2 (Environment Preparation)"
   ```

### Exit Criteria
- Deployment scope clearly defined
- Infrastructure state verified
- Credentials confirmed working

> **Phase Transition**: See [Phase Transition Rules](../shared/phase-transition-rules.md)

**Request permission to proceed to Phase 2**

## Phase 2: Environment Preparation

1. **Create deployment branch**:
   ```bash
   git checkout -b deploy/[environment]-[date]-[component]
   git push -u origin deploy/[environment]-[date]-[component]
   ```

2. **Run pre-deployment checks**:
   ```bash
   pnpm quality:check
   pnpm test
   pnpm build
   ```

3. **Prepare environment-specific configurations**:
   - Update environment variables
   - Review secrets management
   - Verify resource naming conventions

4. **Create backup of current state** (if updating existing deployment):
   - Export data snapshots
   - Backup service configurations
   - Document current service versions

5. **Invoke journaling subagent** to document environment preparation:
   ```
   task_id: Current task number
   phase: "Phase 2: Environment Preparation"
   activity: "Phase 2 Complete: Environment Prepared"
   is_phase_transition: true
   content: |
     [Prepared documentation including:
      - Deployment branch created
      - All tests passing (quality checks, tests, build)
      - Environment-specific configurations prepared
      - Backups created (if applicable)
      - Ready for infrastructure deployment]
   next_action: "Request user permission to proceed to Phase 3 (Infrastructure Deployment)"
   ```

### Exit Criteria
- All tests passing
- Environment configs prepared
- Backups created (if applicable)

**Request permission to proceed to Phase 3**

## Phase 3: Infrastructure Deployment

1. **User applies infrastructure changes** via AWS Console:
   - User creates/updates AWS resources
   - User configures services and permissions
   - User applies changes incrementally

2. **Agent verifies each change** via AWS CLI:
   ```bash
   # Verify resource creation/updates
   aws [service] describe-[resource]

   # Check configuration status
   aws [service] get-[configuration]

   # List deployed resources
   aws [service] list-[resources]
   ```

3. **Verification checklist**:
   - Confirm all resources created successfully
   - Validate configurations match requirements
   - Check IAM roles and permissions
   - Verify network and security settings

4. **Invoke journaling subagent** to document infrastructure deployment:
   ```
   task_id: Current task number
   phase: "Phase 3: Infrastructure Deployment"
   activity: "Phase 3 Complete: Infrastructure Deployed"
   is_phase_transition: true
   content: |
     [Prepared documentation including:
      - Infrastructure changes applied via AWS Console
      - All resources verified via AWS CLI
      - Resources created/updated (list with ARNs/IDs)
      - Configurations validated
      - IAM roles and permissions verified
      - Network and security settings confirmed
      - No discrepancies between console and CLI]
   next_action: "Request user permission to proceed to Phase 4 (Application Deployment)"
   update_sections:
     "Infrastructure Changes": "Summary of resources deployed"
   ```

### Exit Criteria
- User confirms all infrastructure changes applied
- Agent verified all resources via CLI
- No discrepancies between console and CLI

**Request permission to proceed to Phase 4**

## Phase 4: Application Deployment

1. **Deploy data pipeline components**:
   - Upload processing scripts to appropriate locations
   - Configure scheduled jobs
   - Set up monitoring

2. **Deploy AI/ML components**:
   - Update model configurations
   - Deploy inference endpoints
   - Configure service integrations

3. **Deploy API/service components**:
   - Deploy application code
   - Update API configurations
   - Configure load balancers (if applicable)

4. **Run smoke tests** for each deployed component:
   - Test data pipeline with sample data
   - Verify AI/ML service responses
   - Check API endpoints

5. **Monitor initial deployment**:
   - Check CloudWatch logs
   - Monitor error rates
   - Verify data flow

6. **Invoke journaling subagent** to document application deployment:
   ```
   task_id: Current task number
   phase: "Phase 4: Application Deployment"
   activity: "Phase 4 Complete: Application Deployed"
   is_phase_transition: true
   content: |
     [Prepared documentation including:
      - Components deployed (data pipeline, AI/ML, API/services)
      - Smoke tests passing for all components
      - CloudWatch logs showing normal operation
      - No critical errors detected
      - Data flow verified
      - Initial monitoring results]
   next_action: "Request user permission to proceed to Phase 5 (Validation & Testing)"
   update_sections:
     "Application Deployment": "Summary of deployed components"
   ```

### Exit Criteria
- All components deployed
- Smoke tests passing
- No critical errors in logs

**Request permission to proceed to Phase 5**

## Phase 5: Validation & Testing

1. **Run integration tests**:
   - Test end-to-end data flow
   - Verify service interactions
   - Check cross-component communication

2. **Performance validation**:
   - Check database query performance
   - Monitor data transfer speeds
   - Validate API response times

3. **Security verification**:
   - Confirm IAM permissions are least-privilege
   - Verify encryption settings
   - Check network security groups

4. **Cost validation**:
   - Review AWS Cost Explorer
   - Verify auto-scaling settings
   - Check for unnecessary resources

5. **Invoke journaling subagent** to document validation results:
   ```
   task_id: Current task number
   phase: "Phase 5: Validation & Testing"
   activity: "Phase 5 Complete: Validation Passed"
   is_phase_transition: true
   content: |
     [Prepared validation documentation including:
      - Integration tests passing (end-to-end data flow verified)
      - Performance validation results (database, API, data transfer)
      - Security verification complete (IAM, encryption, network)
      - Cost validation results (Cost Explorer review, auto-scaling)
      - All validations passing]
   next_action: "Request user permission to proceed to Phase 6 (Monitoring Setup)"
   update_sections:
     "Validation Results": "Summary of all validation checks"
   ```

### Exit Criteria
- All validations passing
- Performance acceptable
- Security checks complete

**Request permission to proceed to Phase 6**

## Phase 6: Monitoring Setup

1. **Configure CloudWatch dashboards**:
   - Set up key metrics monitoring
   - Create custom metrics if needed
   - Configure log aggregation

2. **Set up alerts**:
   - Error rate thresholds
   - Performance degradation alerts
   - Cost anomaly detection

3. **Create runbooks**:
   - Document common issues and solutions
   - Create troubleshooting guides
   - Update operational procedures

4. **Test monitoring**:
   - Trigger test alerts
   - Verify dashboard accuracy
   - Check log accessibility

5. **Invoke journaling subagent** to document monitoring setup:
   ```
   task_id: Current task number
   phase: "Phase 6: Monitoring Setup"
   activity: "Phase 6 Complete: Monitoring Configured"
   is_phase_transition: true
   content: |
     [Prepared monitoring documentation including:
      - CloudWatch dashboards configured
      - Alerts set up (error rates, performance, cost anomalies)
      - Runbooks created (common issues, troubleshooting)
      - Monitoring tested (test alerts triggered, verified)
      - Log accessibility confirmed]
   next_action: "Request user permission to proceed to Phase 7 (Rollback Preparation)"
   ```

### Exit Criteria
- Monitoring fully configured
- Alerts tested and working
- Runbooks documented

**Request permission to proceed to Phase 7**

## Phase 7: Rollback Preparation

1. **Document rollback procedure**:
   - Step-by-step rollback instructions
   - Resource-specific rollback commands
   - Data recovery procedures

2. **Test rollback capability**:
   - Perform rollback in test environment
   - Verify data integrity after rollback
   - Document rollback duration

3. **Create rollback automation** (if applicable):
   - Script common rollback tasks
   - Create rollback pipelines
   - Test automation thoroughly

4. **Invoke journaling subagent** to document rollback preparation:
   ```
   task_id: Current task number
   phase: "Phase 7: Rollback Preparation"
   activity: "Phase 7 Complete: Rollback Ready"
   is_phase_transition: true
   content: |
     [Prepared rollback documentation including:
      - Rollback procedures documented step-by-step
      - Rollback tested in test environment
      - Data recovery procedures confirmed
      - Rollback automation created (if applicable)
      - Team notified of procedures]
   next_action: "Request user permission to proceed to Phase 8 (Post-Deployment)"
   ```

### Exit Criteria
- Rollback procedures documented
- Rollback tested successfully
- Team aware of procedures

**Request permission to proceed to Phase 8**

## Phase 8: Post-Deployment

1. **Update documentation**:
   - Update deployment guides
   - Document configuration changes
   - Update architecture diagrams

2. **Communicate deployment**:
   - Notify stakeholders
   - Update deployment log
   - Share lessons learned

3. **Monitor for 24 hours**:
   - Watch for delayed issues
   - Monitor performance trends
   - Check cost implications

4. **Create post-deployment report**:
   - What was deployed
   - Issues encountered and resolved
   - Performance metrics
   - Cost analysis

5. **Archive deployment artifacts**:
   - Tag deployment commit
   - Archive deployment scripts
   - Store configuration snapshots

6. **Invoke journaling subagent** for final deployment summary:
   ```
   task_id: Current task number
   phase: "Phase 8: Post-Deployment"
   activity: "Phase 8 Complete: Deployment Finalized"
   is_phase_transition: true
   content: |
     [Prepared post-deployment report including:
      - What was deployed (components, infrastructure)
      - Issues encountered and how resolved
      - Performance metrics and results
      - Cost analysis
      - Documentation updates completed
      - Stakeholders notified
      - 24-hour monitoring results
      - Key learnings from deployment
      - Recommendations for future deployments]
   next_action: "Deployment complete - monitor for stability"
   ```

### Exit Criteria
- Documentation updated
- Stakeholders notified
- Monitoring shows stability

**Deployment Complete**

## Rollback Procedures

If issues arise at any phase:

1. **Immediate actions**:
   - Stop deployment process
   - Assess impact and severity
   - Notify stakeholders

2. **Rollback decision criteria**:
   - Critical functionality broken
   - Data integrity compromised
   - Performance severely degraded
   - Security vulnerability exposed

3. **Rollback execution**:
   - Follow documented rollback procedures
   - Restore from backups if needed
   - Verify system stability
   - Document rollback reason and actions

## Cost Monitoring

Throughout deployment:

1. **Monitor AWS costs**:
   - Check Cost Explorer hourly
   - Watch for unexpected charges
   - Verify resource auto-shutdown

2. **Cost checkpoints**:
   - After infrastructure deployment
   - After application deployment
   - 24 hours post-deployment

3. **Cost optimization**:
   - Identify unused resources
   - Right-size compute resources
   - Optimize data transfer patterns

## Security Considerations

For every deployment:

1. **Pre-deployment security check**:
   - No hardcoded credentials
   - Secrets properly managed
   - IAM roles follow least privilege

2. **Post-deployment security validation**:
   - Run security scan
   - Check exposed endpoints
   - Verify encryption in transit/at rest

## Special Considerations

### Database Services
- Consider scaling during off-hours
- Monitor compute usage
- Optimize query patterns

### AI/ML Services
- Test model responses thoroughly
- Monitor inference usage
- Validate model updates

### Storage Services
- Verify lifecycle policies
- Check replication settings
- Monitor storage costs

## Emergency Contacts

Document in deployment journal:
- AWS support case process
- Team escalation path
- Critical issue procedures

## Related Shared Protocols

While deployment workflows differ from standard task execution, these shared protocols may still be useful:

- **[Journal Guidelines](../shared/journal-guidelines.md)** - Document deployment decisions and learnings
- **[Phase Transition Rules](../shared/phase-transition-rules.md)** - Permission gates between deployment phases
