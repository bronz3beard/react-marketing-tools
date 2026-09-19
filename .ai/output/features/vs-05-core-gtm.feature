Feature: Track an event into Google Tag Manager with one call
  As a developer
  I want to create an analytics instance once and track events from anywhere
  So that every analytics destination receives the same event with a shared identifier

  Background:
    Given an analytics instance with an explicit consent choice and a Google Tag Manager container

  Scenario: Events tracked before start are delivered in order
    Given two events are tracked before the instance is started
    When the instance is started
    Then both events reach the dataLayer in the order they were tracked

  Scenario: A tracked event carries its parameters and a unique identifier
    Given the instance has started
    When a sign-up with method "google" is tracked
    Then the dataLayer receives the event name, the method and a unique event identifier
    And event parameters cannot overwrite the event name or identifier

  Scenario: The container is loaded exactly once
    Given a Content-Security-Policy nonce is configured
    When the instance is started more than once
    Then the Tag Manager container is requested once, carrying the nonce

  Scenario: An existing Tag Manager snippet is respected
    Given the page already includes the Tag Manager snippet
    When the instance is started
    Then no second container is loaded and page-view triggers do not fire twice

  Scenario: Server rendering is safe
    Given the code runs on a server without a DOM
    When the instance is created, started and used to track
    Then nothing fails and nothing is queued

  Scenario: Configuration mistakes fail fast
    When an instance is created without a consent choice or with a malformed container identifier
    Then creation fails with a message naming the problem
