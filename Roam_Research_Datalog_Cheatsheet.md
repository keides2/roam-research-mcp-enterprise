# Roam Research Datalog Cheatsheet

## Basic Structure
- Roam uses Datascript (JavaScript/ClojureScript Datalog implementation)
- Each fact is a datom: `[entity-id attribute value transaction-id]`

## Core Components
### Entity IDs
- Hidden ID: Internal database entity-id
- Public ID: Block reference (e.g., `((GGv3cyL6Y))`) or page title (`[[Page Title]]`)

### Common Block Attributes
```clojure
:block/uid        # Nine-character block reference
:create/email     # Creator's email
:create/time      # Creation timestamp
:edit/email       # Editor's email  
:edit/time        # Last edit timestamp
```

### Page-Specific Attributes
```clojure
:node/title       # Page title (pages only)
```

### Paragraph-Specific Attributes
```clojure
:block/page      # Reference to page entity-id
:block/order     # Sequence within parent
:block/string    # Block content
:block/parents   # List of ancestor blocks
```

### Optional Block Attributes
```clojure
:children/view-type  # 'bullet', 'document', 'numbered'
:block/heading      # 1, 2, 3 for H1-H3
:block/props        # Image/iframe sizing, slider position
:block/text-align   # 'left', 'center', 'right', 'justify'
```

## Query Syntax

### Basic Query
```clojure
[:find ?variable
 :where [?entity :attribute ?variable]]
```

### Query with Input Parameters
```clojure
[:find ?title ?uid
 :in $ ?block_ref
 :where 
 [?b :block/uid ?block_ref]
 [?b :block/string ?title]
 [?b :block/uid ?uid]]
```

### Predicates
Available functions:
- clojure.string/includes?
- clojure.string/starts-with?
- clojure.string/ends-with?
- count
- <, >, <=, >=, =, not=, !=

Example:
```clojure
[:find ?string ?size
 :where 
 [?b :block/string ?string]
 [(count ?string) ?size]]
```

### Aggregates
Available functions: sum, max, min, avg, count, distinct

Example:
```clojure
[:find (distinct ?type)
 :where [_ :children/view-type ?type]]
```

### Rules and Ancestors

#### Basic Ancestor Rule
```clojure
[[(ancestor ?child ?parent)
  [?parent :block/children ?child]]
 [(ancestor ?child ?grand_parent)
  [?parent :block/children ?child]
  (ancestor ?parent ?grand_parent)]]
```

#### Find All Descendants
```clojure
[:find ?block (count ?child)
 :in $ ?block_uid %
 :where 
 [?block :block/uid ?block_uid]
 (ancestor ?child ?block)]
```

#### Find Direct Children Only
```clojure
[:find ?child_string
 :where
 [?parent :block/uid "parent-block-uid"]
 [?parent :block/children ?child]
 [?child :block/string ?child_string]]
```

#### Find All Ancestors
```clojure
[:find ?ancestor_string
 :where
 [?block :block/uid "block-uid"]
 [?block :block/parents ?ancestor]
 [?ancestor :block/string ?ancestor_string]]
```

## Common Queries

### Find All Pages
```clojure
[:find ?p ?title
 :where [?p :node/title ?title]]
```

### Find Block by Reference
```clojure
[:find ?string
 :where 
 [?b :block/uid "block-ref-here"]
 [?b :block/string ?string]]
```

### Find Modified Blocks After Date
```clojure
[:find ?block_ref ?string
 :in $ ?start_of_day
 :where 
 [?b :edit/time ?time]
 [(> ?time ?start_of_day)]
 [?b :block/uid ?block_ref]
 [?b :block/string ?string]]
```

### Search Page Titles
```clojure
[:find ?title ?uid
 :where 
 [?page :node/title ?title]
 [?page :block/uid ?uid]
 [(clojure.string/includes? ?title "search-term")]]
```

## Tips
- Use `:block/parents` for ancestors (includes all levels)
- Use `:block/children` for immediate descendants only
- Combine `clojure.string` functions for complex text matching
- Use `distinct` to avoid duplicate results
- Remember to handle case sensitivity in string operations

## JavaScript Integration
```javascript
// Basic query
window.roamAlphaAPI.q(`
  [:find ?title
   :where [?p :node/title ?title]]
`);

// Query with parameters
window.roamAlphaAPI.q(`
  [:find ?title
   :in $ ?term
   :where 
   [?p :node/title ?title]
   [(clojure.string/includes? ?title ?term)]]
`, "search-term");

// Complex example: Find pages with specific tag excluding a container
// Credit: David Bieber (https://gist.github.com/dbieber/f54996410a10d755b5ea61dd9923164b)
let container = "Tree of knowledge";
let tag = "zettel";

let ancestorrule=`[ 
   [(ancestor ?child ?parent) 
    [?parent :block/children ?child]]
   [(ancestor ?child ?a) 
    [?parent :block/children ?child] 
    (ancestor ?parent ?a)]
]`;

let blocks = window.roamAlphaAPI.q(`
[:find ?page_title
  :in $ % ?container_title ?tag_text
  :where 
    [?container_page :node/title ?container_title]
    [?page :node/title ?page_title]
    (ancestor ?tagged_block ?page)
    [?tagged_block :block/refs ?tag_page]
    [?tag_page :node/title ?tag_text]
    (not (ancestor ?container_block ?container_page)
         [?container_block :block/refs ?page])
]`, ancestorrule, container, tag);
```
