# NPM Optional Dependencies Issue

## Problem

When running Storybook (or other tools that depend on Rollup/Vite), you may encounter this error:

```
Error: Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to
optional dependencies (https://github.com/npm/cli/issues/4828).
```

## Root Cause

This is caused by [npm bug #4828](https://github.com/npm/cli/issues/4828) where npm incorrectly handles optional dependencies when:

1. You have an existing `node_modules` directory
2. You delete only `package-lock.json` 
3. You run `npm install`

In this scenario, npm generates a `package-lock.json` that only includes the optional dependency for your current platform, omitting other platform-specific packages. When the lockfile is committed and used on a different platform or in CI, the required platform-specific package is missing.

### Why This Happens

Packages like `rollup` use optional peer dependencies for platform-specific native binaries:
- `@rollup/rollup-linux-x64-gnu` (Linux x64)
- `@rollup/rollup-darwin-arm64` (Mac M1)
- `@rollup/rollup-darwin-x64` (Mac Intel)
- `@rollup/rollup-win32-x64-msvc` (Windows)
- etc.

Rollup loads the appropriate one for your platform at runtime. However, npm's bug causes incomplete lockfiles that break on other platforms.

## Solutions

### Solution 1: Clean Install (Recommended)

When installing dependencies, always clean both `node_modules` AND `package-lock.json`:

```bash
rm -rf node_modules package-lock.json
npm install
```

This ensures npm generates a complete lockfile with all optional dependencies.

### Solution 2: Use npm ci

In CI/CD environments, use `npm ci` instead of `npm install`:

```bash
npm ci
```

This respects the lockfile and handles optional dependencies correctly.

### Solution 3: Explicit Dependency (Workaround)

If you encounter the error and need a quick fix, you can explicitly install the missing package:

```bash
npm install --save-dev @rollup/rollup-linux-x64-gnu
```

**Note:** This is a workaround. The proper solution is to fix your lockfile using Solution 1.

### Solution 4: Add postinstall Hook

Add a postinstall script to automatically handle missing optional dependencies:

```json
{
  "scripts": {
    "postinstall": "npm rebuild || true"
  }
}
```

## For This Project

If you encounter the rollup error:

1. **First time setup:**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **If error persists:**
   ```bash
   npm install --save-dev @rollup/rollup-linux-x64-gnu
   ```

3. **For Storybook specifically:**
   ```bash
   npm run storybook
   ```

## Why We Don't Keep It in devDependencies

We removed `@rollup/rollup-linux-x64-gnu` from `devDependencies` because:

1. **It's platform-specific:** Only needed on Linux x64 systems
2. **It's already an optional dependency:** Rollup declares it, so it should be auto-installed
3. **Bloats package.json:** Other platforms need different packages (darwin-arm64, etc.)
4. **Masks the real issue:** The npm bug should be fixed with proper install procedures

## References

- [npm bug #4828](https://github.com/npm/cli/issues/4828) - Optional dependencies bug
- [Rollup optional dependencies](https://github.com/rollup/rollup/blob/master/package.json)
- [npm ci documentation](https://docs.npmjs.com/cli/v8/commands/npm-ci)

## Status

This is a known npm issue that affects many projects using native dependencies. The npm team is aware and working on a fix. Until then, use the solutions above.
