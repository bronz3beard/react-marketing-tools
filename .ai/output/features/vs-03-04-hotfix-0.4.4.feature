Feature: 0.4.4 hotfix — the published package works as documented
  As a developer using react-marketing-tools 0.4.x
  I want the documented setup to deliver events and the package to load in any supported environment
  So that I can rely on it without workarounds while 1.0 is built

  Scenario: Events reach the dataLayer with the documented configuration
    Given the library is configured with only an app name and a session cookie name
    When an interaction is tracked to the dataLayer
    Then the event is added to the dataLayer

  Scenario: An explicit misconfiguration still fails loudly
    Given server location lookup is enabled without a lookup token
    When an interaction is tracked
    Then tracking is rejected with the server-location configuration error
    And nothing is added to the dataLayer

  Scenario: Tracking works before the Tag Manager snippet has run
    Given the page has no dataLayer yet
    When an interaction is tracked
    Then a dataLayer is created and receives the event

  Scenario Outline: The package loads and renders in every supported React version
    Given an application using React <react>
    When the application loads the package with <loader>
    Then all public exports are available
    And the provider renders

    Examples:
      | react  | loader         |
      | 17     | import         |
      | 17     | require        |
      | 18     | import         |
      | 18     | require        |
      | 19     | import         |
      | 19     | require        |

  Scenario: Existing CDN script tags keep working
    Given a page that loads the UMD bundle from its 0.4.3 path with a global React
    When the page runs
    Then the library is available as a browser global

  Scenario: Type declarations resolve for every module resolution mode
    When the packed package is checked for node10, node16 (CommonJS and ESM) and bundler resolution
    Then no type resolution problems are reported
