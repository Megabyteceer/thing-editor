module.exports = {
    "env": {
        "browser": true,
        "es2021": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "overrides": [
        {
            "env": {
                "node": true
            },
            "files": ["thing-editor/electron-main/**/*.js"],
            "parserOptions": {
                "sourceType": "script"
            }
        }
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": "latest",
        "sourceType": "module"
    },
    "plugins": [
        "@typescript-eslint"
    ],
    "rules": {
        "no-debugger": 0,
        "prefer-const": 0,
        "@typescript-eslint/no-this-alias": 0,
        "@typescript-eslint/no-non-null-assertion": 0,
        "@typescript-eslint/no-explicit-any": 0,
        "@typescript-eslint/no-var-requires": 0,
        "@typescript-eslint/no-namespace": 0,
        "@typescript-eslint/no-unused-vars": 0, /*ts check it already */
        "no-useless-catch": 0,
        "no-prototype-builtins": 0,
        "no-useless-escape": 0
    }
}
