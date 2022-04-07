import 'source-map-support/register'

import cleanup from 'aws-actions-configure-aws-credentials/cleanup'

import { exportVariable } from '@actions/core'

if (require.main === module) {
  exportVariable('AWS_AVAILABLE_ROLES', '')
  exportVariable('INPUT_AWS-REGION', '')
  exportVariable('INPUT_MASK-AWS-ACCOUNT-ID', '')
  exportVariable('INPUT_ROLE-TO-ASSUME', '')
  exportVariable('INPUT_ROLE-DURATION-SECONDS', '')
  cleanup()
}
