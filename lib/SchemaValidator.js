const fs = require('fs');
const path = require('path');

// Load maps once
const typeMap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'typeMap.json'), 'utf8'));
const subclassMap = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'subclassMap.json'), 'utf8'));

class SchemaValidator {
  constructor() {}

  // Get all superclasses (e.g., HowTo -> CreativeWork -> Thing)
  getAllSuperClasses(type) {
    const supers = [];
    let current = type;
    while (subclassMap[current]) {
      current = subclassMap[current];
      supers.push(current);
    }
    return supers;
  }

  // Check if actualType is expectedType or its subtype
  isTypeOrSubtype(actualType, expectedTypes) {
    if (expectedTypes.includes(actualType)) return true;
    const supers = this.getAllSuperClasses(actualType);
    return expectedTypes.some(t => supers.includes(t));
  }

  // Guess simple value types
  guessValueType(value) {
    if (typeof value === 'string') {
      if (this.isIso8601Duration(value)) return 'Duration';
      if (this.isValidUrl(value)) return 'URL';
      return 'Text';
    }
    if (typeof value === 'number') return Number.isInteger(value) ? 'Integer' : 'Number';
    if (typeof value === 'boolean') return 'Boolean';
    if (Array.isArray(value)) {
      return this.guessValueType(value[0]); // assume homogenous array
    }
    if (typeof value === 'object' && value !== null) {
      if (value['@type']) return value['@type'];
      return 'Unknown';
    }
    return 'Unknown';
  }

  isIso8601Duration(str) {
    return typeof str === 'string' && /^P(T(\d+H)?(\d+M)?(\d+S)?)?$/i.test(str);
  }

  isValidUrl(str) {
    return typeof str === 'string' && /^(https?:)?\/\//i.test(str);
  }

  // Validate JSON-LD object recursively
  validate(jsonLd, parentType = null, pathPrefix = '') {
    const errors = [];

    const type = jsonLd['@type'];
    if (!type) {
      errors.push({ path: pathPrefix || '', message: 'Missing @type' });
      return errors;
    }

    // Collect allowed props from type and its superclasses
    const allTypes = [type, ...this.getAllSuperClasses(type)];
    const allowedProps = Object.assign({}, ...allTypes.map(t => typeMap[t] || {}));

    if (!Object.keys(allowedProps).length) {
      errors.push({ path: pathPrefix, message: `Unknown type: "${type}"` });
      return errors;
    }

    for (const prop of Object.keys(jsonLd)) {
      if (prop === '@type' || prop === '@context') continue;

      const value = jsonLd[prop];

      if (!allowedProps[prop]) {
        errors.push({ path: pathPrefix + prop, message: `Property "${prop}" is not allowed for type "${type}".` });
        continue;
      }

      const expectedTypes = allowedProps[prop];

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          const v = value[i];
          const actualType = this.guessValueType(v);
          if (!this.isTypeOrSubtype(actualType, expectedTypes)) {
            errors.push({
              path: `${pathPrefix}${prop}[${i}]`,
              message: `Property "${prop}" expects: ${expectedTypes.join(' | ')}, got: ${actualType}`
            });
          }
          if (typeof v === 'object' && v !== null && v['@type']) {
            errors.push(...this.validate(v, type, `${pathPrefix}${prop}[${i}].`));
          }
        }
      } else {
        const actualType = this.guessValueType(value);
        if (!this.isTypeOrSubtype(actualType, expectedTypes)) {
          errors.push({
            path: pathPrefix + prop,
            message: `Property "${prop}" expects: ${expectedTypes.join(' | ')}, got: ${actualType}`
          });
        }
        if (typeof value === 'object' && value !== null && value['@type']) {
          errors.push(...this.validate(value, type, `${pathPrefix}${prop}.`));
        }
      }
    }

    return errors;
  }

  // Remove invalid properties
  stripInvalid(jsonLd) {
    const type = jsonLd['@type'];
    if (!type) return jsonLd;

    const allTypes = [type, ...this.getAllSuperClasses(type)];
    const allowedProps = Object.assign({}, ...allTypes.map(t => typeMap[t] || {}));

    const clean = {};
    for (const prop of Object.keys(jsonLd)) {
      if (prop === '@type' || prop === '@context' || allowedProps[prop]) {
        const value = jsonLd[prop];
        if (Array.isArray(value)) {
          clean[prop] = value.map(v =>
            typeof v === 'object' && v !== null && v['@type'] ? this.stripInvalid(v) : v
          );
        } else if (typeof value === 'object' && value !== null && value['@type']) {
          clean[prop] = this.stripInvalid(value);
        } else {
          clean[prop] = value;
        }
      }
    }
    return clean;
  }
}

module.exports = SchemaValidator;
