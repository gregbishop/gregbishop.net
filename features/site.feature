Feature: A personal website visitors can browse without knowing terminal commands
  Acceptance criteria from Greg's 2026-09-19 redesign request:
  remove the terminal presentation and use the visual character of Larder,
  with clear blog navigation and readable phone layouts.

  Scenario Outline: Every public page is readable with familiar navigation
    Given a browser <width> pixels wide with JavaScript <javascript>
    Then every public page fits the viewport with readable text and usable navigation

    Examples:
      | width | javascript |
      | 320   | enabled    |
      | 390   | enabled    |
      | 650   | enabled    |
      | 651   | enabled    |
      | 1280  | enabled    |
      | 320   | disabled   |
      | 1280  | disabled   |

  Scenario Outline: Readers reach articles, tags and the blog without commands
    Given a browser <width> pixels wide with JavaScript <javascript>
    Then a reader can browse from every page to the blog and read an article
    And the homepage offers recent posts, Melampus, contact and RSS

    Examples:
      | width | javascript |
      | 320   | enabled    |
      | 1280  | enabled    |
      | 320   | disabled   |
      | 1280  | disabled   |

  Scenario Outline: Keyboard visitors can skip navigation and follow links
    Given a browser 390 pixels wide with JavaScript <javascript>
    Then the keyboard skip link and visible navigation focus work on every public page

    Examples:
      | javascript |
      | enabled    |
      | disabled   |

  Scenario: Explicit text, Markdown and RSS resources remain available
    Given a browser 390 pixels wide with JavaScript disabled
    Then ordinary pages serve HTML and explicit reading formats remain available

  Scenario Outline: About retains its prose and contact link
    Given a browser 390 pixels wide with JavaScript <javascript>
    Then the About page preserves its paragraphs and offers a visible contact link

    Examples:
      | javascript |
      | enabled    |
      | disabled   |

  Scenario: Draft collection entries remain unpublished
    Given a browser 390 pixels wide with JavaScript disabled
    Then draft posts stay absent from listings and reading formats

  Scenario: Topics are discoverable as named groups
    Given a browser 390 pixels wide with JavaScript disabled
    Then articles and post listings expose named topic groups
