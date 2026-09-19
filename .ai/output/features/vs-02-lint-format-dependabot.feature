Feature: Lint, formatting and dependency hygiene
  As a contributor
  I want code quality and formatting enforced automatically
  So that every change to main meets the same standard without manual review of style

  Background:
    Given dependencies are installed from the lockfile

  Scenario: The codebase passes lint
    When the contributor lints the repository
    Then no lint errors are reported
    And no lint rule has been silenced with inline disable comments

  Scenario: Legacy public types keep their published shape
    Given the 0.4 public type declarations
    When the contributor builds the library
    Then the shipped type declarations are identical to 0.4.3

  Scenario: The codebase is consistently formatted
    When the contributor checks formatting
    Then every formatted file already matches the project style

  Scenario: A change that breaks lint or formatting is rejected
    Given a change that introduces a lint error or unformatted code
    When the change is pushed to main or proposed in a pull request
    Then the verification run fails

  Scenario: Dependencies are kept current automatically
    When a new version of a dependency or GitHub Action is published
    Then a grouped update is proposed within a week
    And React major updates are held back until the bundled JSX runtime is removed
