Feature: The home page terminal never leaves a visitor nowhere
  Acceptance criteria of the ticket "Bring gregbishop.net under the standard"
  on the gregbishop.net board, as scenarios.

  Scenario: The replay hands over a live prompt with the bar
    Given a visitor opens the home page
    When the replay finishes
    Then the prompt is live
    And the bar offers help, home, the post listing, about, and back

  Scenario: Back and home always land somewhere
    Given a visitor at the live prompt
    When they run "help"
    And they run "ls posts/"
    And they run "back"
    Then the screen shows the help output
    When they run "back"
    Then the screen shows the opening screen
    When they run "back"
    Then the screen shows the opening screen

  Scenario: A typo gets a suggestion that can be clicked
    Given a visitor at the live prompt
    When they run "caat posts/hello-world.md"
    Then the screen says "did you mean cat?"
    When they click the suggestion
    Then the screen shows the post's markdown

  Scenario: Every command takes over the screen
    Given a visitor at the live prompt
    When they run "help"
    And they run "rss"
    Then the screen shows the feed
    And the screen does not show the help output

  Scenario: Melampus is discoverable without typing a command
    Given a visitor at the live prompt
    Then the home page links to the Melampus explanation
    When they run "open melampus"
    Then the screen says "opening /melampus/"

  Scenario: Compact home content survives terminal navigation
    Given a visitor at the live prompt
    Then the terminal offers compact content with the same links
    When they run "help"
    And they run "home"
    Then the terminal offers compact content with the same links
    When they run "back"
    Then the screen shows the help output
