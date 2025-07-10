const path = require('path');
const SchemaValidator = require('../lib/SchemaOrgValidator');

describe('SchemaOrgValidator', () => {
  let validator;

  beforeAll(() => {
    validator = new SchemaValidator();
  });

  test('should validate a correct HowTo JSON-LD without errors', () => {
    const data = {
      "@context": "https://schema.org/",
      "@type": "HowTo",
      "name": "Make Tea",
      "totalTime": "PT5M",  // correct type: Duration as ISO 8601 string
      "tool": {
        "@type": "HowToTool",
        "name": "Kettle"
      },
      "step": [
        {
          "@type": "HowToStep",
          "name": "Boil water"
        }
      ]
    };

    const errors = validator.validate(data);
    expect(errors).toHaveLength(0);
  });

  test('should report error for wrong type in totalTime', () => {
    const data = {
      "@context": "https://schema.org/",
      "@type": "HowTo",
      "name": "Make Tea",
      "totalTime": 5  // wrong: should be Duration (ISO string)
    };

    const errors = validator.validate(data);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toHaveProperty('message');
    expect(errors[0].message).toMatch(/totalTime/i);
  });

  test('should strip invalid properties', () => {
    const data = {
      "@context": "https://schema.org/",
      "@type": "HowTo",
      "name": "Make Tea",
      "totalTime": "PT5M",
      "invalidProperty": "this should be removed",
      "step": [
        {
          "@type": "HowToStep",
          "name": "Boil water",
          "badField": "should be removed too"
        }
      ]
    };

    const clean = validator.stripInvalid(data);
    expect(clean).not.toHaveProperty('invalidProperty');
    expect(clean.step[0]).not.toHaveProperty('badField');
    expect(clean).toHaveProperty('totalTime');
    expect(clean.step[0]).toHaveProperty('name');
  });

  test('should handle missing @type gracefully', () => {
    const data = {
      "name": "No type here"
    };

    const errors = validator.validate(data);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].message).toMatch(/Missing @type/i);
  });
});
