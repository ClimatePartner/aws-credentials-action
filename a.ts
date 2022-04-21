import wildcardMatch from 'wildcard-match'

const getRepositoryMappings = () => ({
  pipeline: {
    crossAccountRole:
      'arn:aws:iam::686887603722:role/gh-cross-account_climate-service_pipeline',
    refs: ['feature/refactor-auth-and-pipeline'],
    roles: {
      build:
        'arn:aws:iam::100422486906:role/gh-pipeline_climate-service_pipeline',
      staging:
        'arn:aws:iam::761049481526:role/gh-pipeline_climate-service_pipeline',
    },
  },
})

const context = {
  ref: 'feature/refactor-auth-and-pipeline',
}

const mappings = Object.entries(getRepositoryMappings()).reduce(
  (acc, [mappingName, mapping]): RepositoryMappings =>
    mapping.refs.some(pattern =>
      wildcardMatch(pattern, { separator: false })(context.ref),
    )
      ? { ...acc, [mappingName]: mapping }
      : acc,
  {},
)

console.log(mappings)
