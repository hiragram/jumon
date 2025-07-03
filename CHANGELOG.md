# Changelog

## 0.3.0 (2025-07-03)


### ⚠ BREAKING CHANGES

* cccsc.json format changed to repository-based structure
* Lock file format changed from commands to repositories structure

### Features

* add 'only' property to lock file for selective command installation ([b9a0953](https://github.com/hiragram/jumon/commit/b9a0953bcbd58a1e361594f4045eeec3576f53f0))
* add comprehensive unit tests and GitHub Actions CI ([52348dc](https://github.com/hiragram/jumon/commit/52348dc2db142380163ad8f34be8ec2c05e52d16))
* add diff preview and confirmation to update command ([b4f96fe](https://github.com/hiragram/jumon/commit/b4f96fe0f40459de98b0899e1399149b76c1124e))
* add interactive confirmation for repository configuration conflicts ([29de2bd](https://github.com/hiragram/jumon/commit/29de2bdff56bf9c421a57bdb4b3ebcc6e3b5ece9))
* add update command for refreshing commands based on version constraints ([7f97925](https://github.com/hiragram/jumon/commit/7f979252bd4bb648590b987c2900a6f61ef875c0))
* change default installation to local and add .claude directory validation ([6255007](https://github.com/hiragram/jumon/commit/6255007ea7a4d00ebf4e67fa183f9070b411814e))
* implement MVP of Claude Code command package manager ([ddee4d3](https://github.com/hiragram/jumon/commit/ddee4d3a7fbf09daa635b4721a929465262edb81))
* move global configuration files to ~/.cccsc/ directory ([05a7e38](https://github.com/hiragram/jumon/commit/05a7e38d519fdf9840b7dcd125900b19c3d9c4e5))
* rename 'commands' to 'only' and add version/branch/tag support ([a80d077](https://github.com/hiragram/jumon/commit/a80d077c0eeaaf64843b4edc46280069f53afb48))
* restructure cccsc.json to repository-based format ([6874e8f](https://github.com/hiragram/jumon/commit/6874e8fd05eec9713f837d4e3a9df137c49275f3))
* restructure lock file to use repository-based tracking ([66839dc](https://github.com/hiragram/jumon/commit/66839dc7e76dc97bfda7f7073c242d64f857c93f))
* set default branch to 'main' when no version constraints specified ([5db4931](https://github.com/hiragram/jumon/commit/5db4931aaf16f04342eed35e24a512ef7cc62f0e))


### Bug Fixes

* add branch parameter support to GitHub API functions ([7413a9e](https://github.com/hiragram/jumon/commit/7413a9efec8e3c6f4312183543757856f85d82e5))
* add branch parameter support to GitHub API functions ([873b927](https://github.com/hiragram/jumon/commit/873b9277c23e7d127ca11ee0f61c7b1266a83cd1))
* add missing @vitest/coverage-v8 dependency ([fbe3373](https://github.com/hiragram/jumon/commit/fbe3373d0439be6ba86843733fdf4cccccaa0273))
* correct command name handling and test expectations ([8b94a44](https://github.com/hiragram/jumon/commit/8b94a44b3b793cef05bf658926aba9bffae15102))
* correct Jest mocking and test expectations ([18e7ab0](https://github.com/hiragram/jumon/commit/18e7ab0436e3dcd53b34b90fd51aed2fd8b87e37))
* remove problematic github.test.js to resolve memory issues ([0bb01f2](https://github.com/hiragram/jumon/commit/0bb01f201fdff616b4cb94d7d6422c8236352696))
* update GitHub Actions permissions and use googleapis/release-please-action ([0ff0894](https://github.com/hiragram/jumon/commit/0ff0894f3e56b48ba11dfc956b69eee6d48b4900))
