# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Changelog can be generated by using `npm version major|minor|patch && npx changelogen --output CHANGELOG.md`.

## 1.1.0
- Offer programmatic access of the prune functionality via `await new PrunifyCli(options).run();`

## 1.0.0 - Initial Release 🎉

-	Core CLI Command: Introduced the prunify CLI for pruning unnecessary dependencies from `node_modules` before your deployment to reduce project size.
-	Command Options:
-	`--dry-run`: Simulates the pruning process without making changes, listing dependencies that would be removed.
-	`--externals <list>`: Allows users to specify a comma-separated list of dependencies to exclude from pruning.
-	`--prune <list>`: Enables users to force prune specific dependencies, specified as a comma-separated list.
-   Size Comparison: Displays the size of node_modules before and after the pruning process, with human-readable formatting (e.g., 2.5 MB).
-	Recursive Pruning: Handles transitive dependencies by analyzing and retaining necessary sub-dependencies while pruning others.
-	Mono-repo Support: Supports mono-repo packages by correctly iterating through dependencies under a global package
-	Dependency Filtering: Supports regular expressions for force-pruned dependencies, such as /@types/ or /eslint/.
