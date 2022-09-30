import 'source-map-support/register'

import { setFailed, getInput, getIDToken, exportVariable } from '@actions/core'
import { context } from '@actions/github'
import { setOutput } from '@actions/core'

import * as AWS from 'aws-sdk'

import wildcardMatch from 'wildcard-match'

import { run as runConfigureAwsCredentials } from 'aws-actions-configure-aws-credentials'
import { RetriableWebIdentityCredentials } from './RetriableWebIdentityCredentials'

interface Config {
  roleArn: string
  mappingBucket: string
  mappingKey: string
}

const getMappings = async (): Promise<RepositoriesMappings> => {
  const config: Config = JSON.parse(getInput('config', { required: true }))

  if (!config.roleArn || !config.mappingBucket || !config.mappingKey) {
    throw new Error(
      `roleArn, mappingBucket or mappingKey is not specified in config`,
    )
  }

  const webIdentityToken = await getIDToken('sts.amazonaws.com')

  const credentials = new RetriableWebIdentityCredentials({
    RoleArn: config.roleArn,
    RoleSessionName: 'prepare-pipeline',
    WebIdentityToken: webIdentityToken,
  })

  const s3Client = new AWS.S3({ credentials })

  return JSON.parse(
    (
      await s3Client
        .getObject({
          Bucket: config.mappingBucket,
          Key: config.mappingKey,
        })
        .promise()
    ).Body.toString('utf-8'),
  )
}

const getRepositoryMappings = async (): Promise<RepositoryMappings> => {
  const allMappings = await getMappings()
  const mappings = allMappings[context.repo.repo]
  if (!mappings || !Object.keys(mappings).length) {
    throw new Error(
      `repository ${context.repo.repo} is not mapped to any AWS account`,
    )
  }
  return mappings
}

const getRepositoryMapping = async (): Promise<RepositoryMapping> => {
  const mappings = Object.entries(await getRepositoryMappings()).reduce(
    (acc, [mappingName, mapping]): RepositoryMappings =>
      mapping.refs.some(pattern =>
        wildcardMatch(pattern, { separator: false })(context.ref),
      )
        ? { ...acc, [mappingName]: mapping }
        : acc,
    {},
  )

  let mappingName = getInput('name', { required: false })

  if (!mappingName) {
    const mappingKeys = Object.keys(mappings)
    if (mappingKeys.length !== 1) {
      throw new Error(
        `More than 1 mapping found for this repo matching to ref ${context.ref}, ` +
          `please specify 'name' parameter. ` +
          `Available mappings are: [${mappingKeys.join(', ')}]`,
      )
    }
    mappingName = mappingKeys[0]
  }

  const mapping = mappings[mappingName]

  if (!mapping) {
    throw new Error(
      `Mapping with name '${mappingName}' not found matching to ref ${context.ref}`,
    )
  }

  return { ...mapping, name: mappingName }
}

const getRoleArn = (mapping: RepositoryMapping): string => {
  const multiAccount = getInput('multi-account', { required: false }) === 'true'
  const account = getInput('account', { required: false })

  if (multiAccount && account) {
    throw new Error(
      `Both account and multi-account attributes are specified. Please only set one.`,
    )
  }

  if (!account) {
    if (multiAccount) {
      if (!mapping.crossAccountRole) {
        throw new Error(
          `The mapping '${mapping.name}' is not a multi-account mapping, but multi-account was requested`,
        )
      }

      return mapping.crossAccountRole
    }

    const accounts = Object.keys(mapping.roles)

    if (accounts.length !== 1) {
      throw new Error(
        `The mapping '${mapping.name}' contains multple accounts, but account parameter was not set. ` +
          `Please specify the account. Available accounts are: [${accounts.join(
            ', ',
          )}]`,
      )
    }

    return mapping.roles[accounts[0]]
  }

  if (!mapping.roles[account]) {
    throw new Error(
      `The mapping ${mapping.name} does not have account '${account}' assigned. ` +
        `Please specify correct account. Available accounts are: [${Object.keys(
          mapping.roles,
        ).join(', ')}]`,
    )
  }

  return mapping.roles[account]
}

const runAction = async (): Promise<void> => {
  if (context.eventName === 'pull_request') {
    throw Error('pull requests are not supported (yet)')
  }

  const mapping = await getRepositoryMapping()
  const roleArn = getRoleArn(mapping)

  exportVariable('AWS_AVAILABLE_ROLES', JSON.stringify(mapping.roles))

  // Set input parameters for configure-aws-credentials action
  process.env['INPUT_AWS-REGION'] = 'eu-central-1'
  process.env['INPUT_MASK-AWS-ACCOUNT-ID'] = 'false'
  process.env['INPUT_ROLE-TO-ASSUME'] = roleArn
  process.env['INPUT_ROLE-DURATION-SECONDS'] = '3600'

  await runConfigureAwsCredentials()

  // The account id set by aws-actions/configure-aws-credentials is not correct
  // when other AWS credentials are present in the environment
  setOutput('aws-account-id', roleArn.split(':')[4])
}

export const run = async (): Promise<void> =>
  runAction().catch(error => {
    setFailed(error)
    console.trace(error)
  })
