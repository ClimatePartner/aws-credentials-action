declare module 'aws-actions-configure-aws-credentials' {
  export function run(): Promise<void>
}

declare module 'aws-actions-configure-aws-credentials/cleanup' {
  export default function cleanup(): void
}

interface RepositoryMapping {
  name?: string
  crossAccountRole?: string
  roles: {
    [account: string]: string
  }
  refs: Array<string>
}

interface RepositoryMappings {
  [mappingName: string]: RepositoryMapping
}

interface RepositoriesMappings {
  [repository: string]: RepositoryMappings
}
