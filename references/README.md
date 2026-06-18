# Reference repositories

Place extracted reference repository source here when GitHub cannot be reached from the execution environment.

Recommended layout:

```text
references/
  WorldCu026/
  sports-prediction-market-aggregator/
  wor-bet/
```

Please do not commit archive files or generated dependency/build folders. The root `.gitignore` excludes common archive formats, `node_modules/`, `dist/`, `build/`, `.next/`, and `coverage/`.

Recommended local workflow:

1. Download each reference repository as a zip on your machine.
2. Extract each zip locally.
3. Copy only the source files into the matching directory above.
4. Do not include `.git/`, `node_modules/`, build outputs, or large generated files.

If you only want to share the most relevant files, prioritize files related to betting records, odds aggregation, prediction markets, betting pools, user accounts, API routes, database schemas, and shared data models.
