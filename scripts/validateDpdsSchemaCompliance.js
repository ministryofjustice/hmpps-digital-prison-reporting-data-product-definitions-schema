/**
 * Validates all the schema files against the standard JSON schema:
 */

const Ajv = require("ajv");
const fs = require("fs");

const main = async () => {
    const ajv = new Ajv({ allErrors: true, strict: true, loadSchema: async (uri) => { return (await (await fetch(uri)).json()) } })
    // Adding these schemas automatically validates them as per https://ajv.js.org/api.html#ajv-validateschema-schema-object-boolean
    const validate = await ajv
        .compileAsync(JSON.parse(fs.readFileSync("schema/data-product-definition-schema.json"))).then((validate) => {

            let valid = true;
            
            const data = JSON.parse(fs.readFileSync("schema/test-dpd.json"));
            if (!validate(data)) {
                const filteredErrors = validate.errors
                if (filteredErrors.length > 0) {
                    console.error(JSON.stringify(filteredErrors, null, 2));
                    valid = false;
                }
            }
        
            if (!valid) process.exit(1);
        })
        
}

main()