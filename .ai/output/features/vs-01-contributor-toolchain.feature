Feature: Contributor toolchain baseline
  As a contributor
  I want the repository to install, type-check, test and build on current tooling
  So that I can change the library with confidence

  Background:
    Given a clean clone of the repository on a supported Node.js release

  Scenario: Dependencies install from the lockfile
    When the contributor installs dependencies from the lockfile
    Then the installation succeeds without dependency conflicts

  Scenario: The library type-checks on TypeScript 7
    Given dependencies are installed
    When the contributor type-checks the library
    Then no type errors are reported
    And the TypeScript 6 compiler API remains available for lint tooling

  Scenario: The published package contents are unchanged
    Given dependencies are installed
    When the contributor builds and packs the library
    Then the packed file list matches the 0.4.3 file list
    And the public type declarations export the same names as 0.4.3

  Scenario: The known default-configuration defect is pinned by a test
    Given the 0.4 configuration with only an app name and a session cookie name
    When an event is tracked to the dataLayer
    Then the call is rejected with the server-location configuration error
    And nothing is added to the dataLayer

  Scenario: Every change to main is verified
    When a change is pushed to main or proposed in a pull request
    Then install, type-check, tests, build and pack run on Node.js 22, 24 and 26
    And the result of each run is reported on the commit
