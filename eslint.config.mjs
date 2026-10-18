import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const restrictedDatabaseImports = [
  {
    name: "pg",
    message: "Runtime database connections belong in the database boundary.",
  },
  {
    name: "@neondatabase/serverless",
    message: "Use the transaction-scoped database boundary.",
  },
  {
    name: "drizzle-orm/node-postgres",
    message: "Runtime database connections belong in the database boundary.",
  },
  {
    name: "@/db/driver",
    message: "Use withDb for protected domain operations.",
  },
  {
    name: "@/db/pool",
    message: "Runtime database connections belong in the database boundary.",
  },
]

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores(["docs/**", ".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/label-has-associated-control": [
        "warn",
        {
          controlComponents: [
            "Input",
            "Select",
            "SelectTrigger",
            "Textarea",
            "Checkbox",
            "Switch",
            "RadioGroup",
          ],
        },
      ],
      "jsx-a11y/control-has-associated-label": ["warn", { depth: 3 }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
  {
    files: ["src/{app,components,lib}/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            ...restrictedDatabaseImports,
            {
              name: "@/db/auth-db",
              message:
                "Only authentication and guarded dev identity use authDb.",
            },
          ],
        },
      ],
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "MemberExpression[object.object.name='process'][object.property.name='env'][property.name='DIRECT_URL']",
          message:
            "Administrative credentials are restricted to database tools.",
        },
      ],
    },
  },
  {
    files: ["src/lib/auth.ts", "src/lib/dev-auth.ts"],
    rules: {
      "no-restricted-imports": ["error", { paths: restrictedDatabaseImports }],
    },
  },
  {
    files: ["src/components/ui/**"],
    rules: {
      "jsx-a11y/label-has-associated-control": "off",
      "jsx-a11y/click-events-have-key-events": "off",
      "jsx-a11y/no-static-element-interactions": "off",
      "jsx-a11y/control-has-associated-label": "off",
    },
  },
])

export default eslintConfig
