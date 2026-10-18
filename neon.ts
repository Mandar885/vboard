import { defineConfig } from "@neon/config/v1"

export default defineConfig({
  auth: false,
  buckets: {
    "vboard-assets": { access: "public_read" },
  },
  branch: (branch) => {
    if (branch.isDefault || branch.exists) return {}
    return { ttl: "7d" }
  },
})
