lunr-instant-search provides a layer of abstraction on top of Lunr.js the search engine designed for use in the browser.

With lunr-instant-search, you can use Instantsearch to build a search experience.

## Getting Started

Let's consider these prerequisite :
- [you are working in a nodejs environnement](https://github.com/nvm-sh/nvm?tab=readme-ov-file#install--update-script)
- [you started a web project.](https://nextjs.org/docs/app/getting-started/installation)
- [you are designing a page around the instant search ](https://www.algolia.com/doc/guides/building-search-ui/installation/react)

### Installation

```
npm install lunr-instant-search
```

### Configuration

Create this JSON file accessible with ajax at the url ./search_index.json
```
{
  "mapping":{
    "ref":"id",
    "fields" : ["name", "text", "rank"]
  },
  "docs": [
    {"id":"alan_bean","name":"alan bean","text":"Alan Bean was one of the third group of astronauts named by NASA in October 1963.", "rank":"Captain"},
    {"id":"alan_shepard","name":"alan shepard","text":"Rear Admiral Shepard was one of the Mercury astronauts named by NASA in April 1959", "rank":"Rear Admiral"},
    {"id":"edgar_mitchell","name":"edgar mitchell","text":"Mitchell was a member of Group 5, selected for astronaut training in April 1966.", "rank":"Captain"}
   ]
}
```

### Usage

Create a search client and supply the client to the InstantSearch component.

```
import createSearchClient from 'lunr-instantsearch-client';

import { InstantSearch, SearchBox, Hits } from "react-instantsearch";

function App() {
  return (
    <InstantSearch searchClient={createSearchClient("./search_index.json")} indexName="./search_index_moon.json">
      {/* Add widgets here */}
      <SearchBox placeholder="Search" autoFocus />
      <Hits/>
    </InstantSearch>
  );
}
```