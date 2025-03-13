# Publishing Checklist for Bun Packages

This document outlines the steps to publish a package to the Bun registry.

## Before Publishing

1. Update version number in `package.json`
2. Ensure all tests pass:
    ```
    bun test
    ```
3. Build the package:
    ```
    bun run build
    ```
4. Verify the generated files in the `dist` directory
5. Update README.md with any new features or changes

## Publishing Process

1. Login to the Bun registry if you haven't already:

    ```
    bun login
    ```

2. Publish the package:

    ```
    bun publish
    ```

    Or to publish a specific tag:

    ```
    bun publish --tag beta
    ```

3. Verify the package was published successfully:
    ```
    bun info <package-name>
    ```

## After Publishing

1. Create a git tag for the release:

    ```
    git tag v1.0.0
    git push origin v1.0.0
    ```

2. Update any examples or documentation to match the released version

## Local Testing Before Publishing

If you want to test the package locally before publishing:

1. Create a package tarball:

    ```
    bun pack
    ```

2. In another project, install the package from the local tarball:

    ```
    bun add /path/to/<package-name>-1.0.0.tgz
    ```

3. Test your package functionality in the test project
