import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals'

// export default [
//     {
//         files: ["src/**/*.ts"],
//         ignores: ["**/*.config.js", "!**/eslint.config.js", "./dist/*", "./node_modules/*"],
//         rules: {
//             semi: "error"
//         },
//         env: {
//             jasmine: true
//         }
//     }
// ];

export default tseslint.config(
    {
        languageOptions: {
            globals: globals.jasmine
        },
        files: ["src/**/*.ts"],
        ignores: ["**/*.config.js", "!**/eslint.config.js", "./dist/*", "./node_modules/*", "./spec/*"]
        // env: {
        //     jasmine: true
        // }
    },
    {
        rules: {
            "no-unused-vars": "off"
        }
    },
    eslint.configs.recommended,
    ...tseslint.configs.recommended,

);