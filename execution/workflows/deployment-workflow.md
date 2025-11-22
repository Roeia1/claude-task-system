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
