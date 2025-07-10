#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Input file name (expected in root of project)
const INPUT_FILE = path.join(__dirname, 'schemaorg-current-https.jsonld');

// Output file names
const TYPE_MAP_FILE = path.join(__dirname, '..', 'data', 'typeMap.json');
const SUBCLASS_MAP_FILE = path.join(__dirname, '..', 'data', 'subclassMap.json');

// Check if input file exists
if (!fs.existsSync(INPUT_FILE)) {
  console.error('❌ Missing required file: schemaorg-current-https.jsonld');
  console.error('👉 Download it from: https://schema.org/docs/developers.html');
  console.error('   or directly from: https://github.com/schemaorg/schemaorg/tree/main/data/releases');
  process.exit(1);
}

// Read and parse JSON-LD
const raw = JSON.parse(fs.readFileSync(INPUT_FILE, 'utf8'));

// Build maps
const typeMap = {};       // Maps type => { property: [allowed types] }
const subclassMap = {};   // Maps subclass => parent class

// Extract graph items
const graph = raw['@graph'];
if (!Array.isArray(graph)) {
  console.error('❌ Invalid JSON-LD: missing "@graph"');
  process.exit(1);
}

// First pass: build typeMap and subclassMap
graph.forEach(item => {
  const id = item['@id'];
  const type = item['@type'];

  // Find subclasses
  if (item['rdfs:subClassOf']) {
    let parents = item['rdfs:subClassOf'];
    if (!Array.isArray(parents)) {
      parents = [parents];
    }
    parents.forEach(parent => {
      if (typeof parent === 'object' && parent['@id']) {
        subclassMap[id.replace('schema:', '')] = parent['@id'].replace('schema:', '');
      }
    });
  }

  // Find properties and their ranges
  if (type === 'rdf:Property') {
    const domainIncludes = item['http://schema.org/domainIncludes'] || item['schema:domainIncludes'];
    const rangeIncludes = item['http://schema.org/rangeIncludes'] || item['schema:rangeIncludes'];

    let domains = [];
    let ranges = [];

    if (domainIncludes) {
      domains = Array.isArray(domainIncludes) ? domainIncludes : [domainIncludes];
    }
    if (rangeIncludes) {
      ranges = Array.isArray(rangeIncludes) ? rangeIncludes : [rangeIncludes];
    }

    domains.forEach(domain => {
      const domainName = domain['@id'].replace('schema:', '');
      const rangeNames = ranges.map(r => r['@id'].replace('schema:', ''));

      if (!typeMap[domainName]) {
        typeMap[domainName] = {};
      }

      // Add this property and its allowed ranges
      typeMap[domainName][id.replace('schema:', '')] = rangeNames;
    });
  }
});

// Ensure output directory exists
const outputDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write files
fs.writeFileSync(TYPE_MAP_FILE, JSON.stringify(typeMap, null, 2));
fs.writeFileSync(SUBCLASS_MAP_FILE, JSON.stringify(subclassMap, null, 2));

console.log('✅ Successfully built:');
console.log('  -', TYPE_MAP_FILE);
console.log('  -', SUBCLASS_MAP_FILE);
