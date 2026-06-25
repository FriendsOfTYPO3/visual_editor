# Repository Guidelines

## Project Structure & Module Organization

This repository is a TYPO3 CMS extension. PHP source lives in `Classes/`, grouped by role: backend controllers, middleware, services, ViewHelpers, events, and compatibility helpers. TYPO3 configuration is in `Configuration/`, including backend routes, icons, JavaScript modules, services, TypoScript, and request middlewares. Templates and language files are in `Resources/Private/`; browser assets, web components, CSS, icons, and JavaScript tests are in `Resources/Public/`. PHPUnit tests live in `Tests/Unit/` and `Tests/Functional/`; functional fixtures are under `Tests/Functional/Fixtures/Extensions/blog_example`.

## Build, Test, and Development Commands

- `composer test:unit`: runs PHPUnit unit tests via `Build/phpunit/UnitTests.xml`.
- `composer test:functional`: runs functional tests through `Build/Scripts/runTests.sh` with sqlite by default.
- `npm run test`: runs Node tests for `Resources/Public/JavaScript/**/*.test.js`.
- `npm run lint`: runs ESLint checks for JavaScript files.
- `npm run lint -- --fix`: runs ESLint with automatic fixes for JavaScript files.
- `./Build/Scripts/runTests.sh -s unit -- --filter EditModeServiceTest`: run one PHPUnit test class.
- `./Build/Scripts/runTests.sh -s functional -d mysql`: run functional tests against a specific DBMS.

The `runTests.sh` script requires Docker or Podman and supports PHP `8.2` through `8.5`.

## Coding Style & Naming Conventions

Use strict PHP types and PSR-4 namespaces rooted at `TYPO3\CMS\VisualEditor\`. PHP classes are `PascalCase`; methods and variables are `camelCase`; test classes end in `Test`. Include type information in code, either with native types or docblock types where native types are not expressive enough. Keep services focused and prefer TYPO3 core APIs over custom infrastructure. Follow the existing four-space PHP indentation and two-space JavaScript indentation. Static analysis is configured through `phpstan.neon` with TYPO3-specific baselines; Rector configuration is in `rector.php`.

## Testing Guidelines

Use PHPUnit 11 for PHP tests. Put isolated logic tests in `Tests/Unit/` and TYPO3 integration or database-dependent coverage in `Tests/Functional/`. Prioritize PHPUnit data providers for related input/output scenarios instead of duplicating similar test methods; use named provider keys matching the test method arguments, such as `arguments`, `routeArguments`, and `expected`. Name test methods after observable behavior, for example `getUsedArgumentsReplacesDuplicateRouteArguments`. JavaScript tests should sit beside the module they cover and use the `.test.js` suffix. Only add JavaScript tests when the behavior can be tested without mocking; avoid mock-heavy tests. For JavaScript changes, run `npm run test` and `npm run lint`; use `npm run lint -- --fix` for automatic ESLint fixes before the final lint check.

## Commit & Pull Request Guidelines

Recent history uses short, imperative subjects, usually with scoped prefixes such as `[BUGFIX]`, `[FEATURE]`, or `[DOCS]`, for example `[BUGFIX] Disable frontend cache in edit mode`. Keep commits focused on one behavior. Pull requests should describe the problem, the implemented behavior, and the tests run; link related issues and include screenshots or short recordings for backend or frontend UI changes.

## Agent-Specific Instructions

Before editing, inspect existing patterns and keep changes absolutely narrow. Do not revert unrelated local changes. After running tests, remove generated artifacts such as temporary autoload or cache output unless they are intentionally tracked.

Use constructor dependency injection for services wherever possible instead of `GeneralUtility::makeInstance()`. Reserve direct instantiation for runtime value/context objects that are not services.

If you are unclear about my intent ask me questions!
