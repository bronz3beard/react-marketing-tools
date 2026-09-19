# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

- __Added__ for new features.
- __Changed__ for changes in existing functionality.
- __Deprecated__ for soon-to-be removed features.
- __Removed__ for now removed features.
- __Fixed__ for any bug fixes.
- __Security__ in case of vulnerabilities.

## [Unreleased]
__Changed__
- development toolchain: Vite 8, TypeScript 7 (with TypeScript 6 side-by-side for lint tooling), `@types/node` 22
- type declarations are now emitted by `tsc` (output identical to 0.4.3)
- `check-types` script renamed to `typecheck`
__Fixed__
- `npm ci` failed with a peer dependency conflict (`@vitejs/plugin-react` vs `vite`)
__Added__
- Vitest test suite and GitHub Actions CI (Node 22, 24, 26)
__Removed__
- unused `prop-types` dependency
- `vite-plugin-dts` and `@vitejs/plugin-react` dev dependencies
- broken `dev`/`preview` scripts and `index.html` (they referenced a missing `src/main.tsx`)

## [0.4.3] - 02-01-2024
__Fixed__
- IP_INFO_TOKEN
__Changed__
- types

## [0.3.6] - 07-01-2023
__Fixed__
- package exports
- types exports and paths
- package.json

## [0.3.2] - 07-01-2023
__Change__
- package exports

## [0.3.0] - 07-01-2023
__Change__
- type declaration file
- tsconfig file

## [0.2.9] - 07-01-2023
__Change__
- CHANGELOG order
- type declaration file
- tsconfig file

## [0.2.8] - 07-01-2023
__Change__
- README added new Codepen demo and a blog post link fora detailed implementing example

## [0.2.6] - 07-01-2023
__Change__
- README

## [0.2.0] - 06-01-2023
__Added__
- typescript
__Change__
- jsDocs

## [0.1.2] - 05-01-2023
__Added__
- boolean check for user object attribute on buildNewUserData function
__Changed__
- README

## [0.0.9] - 01-09-2022
__Changed__
- user object attribute check for buildNewUserData
- README
__Fixed__
- TOKENS assertion for GA4

## [0.0.4] - 20-08-2022
__Fixed__ 
- serverLocationData bug duplicate entries in payload
- variable name for dataLayerCheck
__Changed__
- README
__Added__
- appSessionCookieName and appName to useMarketingState Context 

## [0.0.1] - 19-08-2022
__Changed__
- README

## [0.0.1] - 13-08-2022
__Added__
- README
- CHANGELOG
- pull_request_template
- codebase untested
