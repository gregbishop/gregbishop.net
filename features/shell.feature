Feature: The home page terminal never leaves a visitor nowhere
  Acceptance criteria from board card #269, "Bring gregbishop.net under the standard",
  and Greg's 2026-09-19 requests, "Make the terminal usable on phones and introduce Melampus"
  and "Add direct navigation to the blog post index".

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

  Scenario Outline: Public pages remain readable at phone and desktop widths
    Given a browser <width> pixels wide with JavaScript <javascript>
    Then every public page fits the viewport with usable navigation

    Examples:
      | width | javascript |
      | 320   | enabled    |
      | 390   | enabled    |
      | 650   | enabled    |
      | 651   | enabled    |
      | 1280  | enabled    |
      | 320   | disabled   |
      | 390   | disabled   |
      | 1280  | disabled   |

  Scenario: Phone visitors can use the live terminal without sideways scrolling
    Given a browser 320 pixels wide with JavaScript enabled
    Then terminal commands fit the viewport and navigation still works

  Scenario Outline: Visitors can reach the post archive and read articles from every public page
    Given a browser <width> pixels wide with JavaScript <javascript>
    Then every public page links directly to the post archive and its articles

    Examples:
      | width | javascript |
      | 320   | enabled    |
      | 1280  | enabled    |
      | 320   | disabled   |
      | 1280  | disabled   |

  Scenario: Terminal visitors can read the Melampus explanation
    Given a visitor at the live prompt
    When they run "curl www.gregbishop.net/melampus"
    Then the screen says "The camera records the bird"
    And the screen says "github.com/gregbishop/melampus"

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
