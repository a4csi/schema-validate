# schema-org-validate

[![npm version](https://img.shields.io/npm/v/schema-validate.svg)](https://www.npmjs.com/package/schema-validate)  
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Validator for [schema.org](https://schema.org/) JSON-LD data, based on local type maps extracted from official schema.org vocabulary.

**Note:** This is a third-party tool and **not an official release** from schema.org or any affiliated organization.

## Features

- Validate JSON-LD objects against schema.org types and properties  
- Supports inheritance between schema.org types  
- Checks expected property types, including nested objects and arrays  
- Easily extensible with updated schema.org definitions  

## Installation

```bash
npm install schema-org-validate
```
## Usage

### Simple use

```js
const SchemaOrgValidator = require('schema-org-validate');

const validator = new SchemaOrgValidator();

const exampleJsonLd = {
  "@context": "https://schema.org/",
  "@type": "HowTo",
  "name": "How to make tea",
  "totalTime": "PT10M",
  "step": [
    {
      "@type": "HowToStep",
      "name": "Boil water",
      "text": "Fill kettle and boil water."
    },
    {
      "@type": "HowToStep",
      "name": "Steep tea",
      "text": "Pour boiling water over tea leaves and steep."
    }
  ]
};

const errors = validator.validate(exampleJsonLd);
if (errors.length) {
  console.error('Validation errors:', errors);
} else {
  console.log('JSON-LD is valid!');
}

// You can also strip invalid properties:
const cleaned = validator.stripInvalid(exampleJsonLd);
console.log('Cleaned JSON-LD:', cleaned);
```

## Updating schema definitions

If you want to update the schema.org vocabulary data (`typeMap.json` and `subclassMap.json`), you can run the build script:

```bash
node scripts/build-type-map.js
```

Make sure you have downloaded the latest schemaorg-current-https.jsonld file into the scripts directory before running the build.  

This will regenerate the type and subclass maps used by the validator.  
