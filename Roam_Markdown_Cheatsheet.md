# Roam Markdown Cheatsheet

⭐️📋 > > > START 📋⭐️

## Markdown Styles in Roam:

- **Bold Text here**
- **Italics Text here**
- External Link: `[Link text](URL)`
- Image Embed: `![Alt text](URL)`
- ^^Highlighted Text here^^
- Bullet points: - or \* followed by a space and the text

## Roam-specific Markdown:

- Block references: ((block-id)) This inserts a reference to the content of a specific block.
- Page references: [[Page name]] This creates a link to another page within your Roam graph.
- Link to blocks: [Link Text](<((block-id))>) This will link to the block.
- Embed block in a block: {{[[embed]]: ((block-id))}}
- To-do items: `{{[[TODO]]}} todo text` or `{{[[DONE]]}} todo text`
- Syntax highlighting for fenced code blocks (add language next to backticks before fenced code block - all in one block) - Example:
  ```javascript
      const foo(bar) => {
          return bar;
      }
  ```
- Tags:
  - one-word: #word
  - multiple words: #[[two or more words]]
  - hyphenated words: #self-esteem

## Roam Tables

Roam tables are created by nesting blocks under a `{{[[table]]}}` parent block. The key to correct table rendering is to ensure proper indentation levels for headers and data cells. Each subsequent header or data cell within a row must be nested one level deeper than the previous one.

- The `{{[[table]]}}` block acts as the container for the entire table.
- The first header block should be at level 2 (one level deeper than `{{[[table]]}}`).
- Subsequent header blocks must increase their level by one.
- Each row starts at level 2.
- The first data cell in a row is at level 3 (one level deeper than the row block).
- Subsequent data cells within the same row must increase their level by one.

Example of a 4x4 table structure:

```
{{[[table]]}}
    - Header 1
        - Header 2
            - Header 3
                - Header 4
    - Row 1
        - Data 1.1
            - Data 1.2
                - Data 1.3
                    - Data 1.4
    - Row 2
        - Data 2.1
            - Data 2.2
                - Data 2.3
                    - Data 2.4
    - Row 3
        - Data 3.1
            - Data 3.2
                - Data 3.3
                    - Data 3.4
    - Row 4
        - Data 4.1
            - Data 4.2
                - Data 4.3
                    - Data 4.4
```

IMPORTANT: Always consult this cheatsheet for correct Roam-flavored markdown syntax BEFORE making any Roam tool calls.

---

## Specific notes and preferences concerning my Roam Research graph

---

⭐️📋 END (Cheat Sheet LOADED) < < < 📋⭐️
