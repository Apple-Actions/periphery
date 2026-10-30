# Periphery

A GitHub Action that installs a pinned [Periphery](https://github.com/peripheryapp/periphery) and runs `periphery scan` with GitHub Actions annotations. Designed to compose with the rest of the Apple-Actions suite:

- [`Apple-Actions/swiftlint`](https://github.com/Apple-Actions/swiftlint)
- [`Apple-Actions/swiftformat`](https://github.com/Apple-Actions/swiftformat)
- [`Apple-Actions/import-codesign-certs`](https://github.com/Apple-Actions/import-codesign-certs)
- [`Apple-Actions/download-provisioning-profiles`](https://github.com/Apple-Actions/download-provisioning-profiles)
- [`Apple-Actions/xcodebuild`](https://github.com/Apple-Actions/xcodebuild)
- [`Apple-Actions/upload-testflight-build`](https://github.com/Apple-Actions/upload-testflight-build)
- [`Apple-Actions/create-dmg`](https://github.com/Apple-Actions/create-dmg)
- [`Apple-Actions/notarize`](https://github.com/Apple-Actions/notarize)

Runs on `macos-*` only. Selects Xcode, resolves Swift packages for the given project/scheme, installs Periphery, then scans. Uses `.periphery.yml` when present; otherwise passes `--project` / `--schemes` from the inputs.

## Usage

### Pin Periphery

```yaml
- uses: Apple-Actions/periphery@v1
  with:
    project: App.xcodeproj
    scheme: App
    version: 3.8.0
    xcode-version: "16.4"
```

### Pin from files

```text
# .periphery-version
3.8.0
```

```text
# .xcode-version
~27.0.0
```

npm-style ranges (`~27.0.0`, `^16.4.0`) and exact/partial versions (`16.4`) are supported, matching [`maxim-lobanov/setup-xcode`](https://github.com/maxim-lobanov/setup-xcode). When several installed Xcodes satisfy a range, the highest matching version is selected.

```yaml
- uses: Apple-Actions/periphery@v1
  with:
    project: App.xcodeproj
    scheme: App
    version-file: .periphery-version
```

If both `version` and `version-file` are set, `version` wins. If neither is set, the action installs the latest Periphery release. For Xcode, a non-empty `xcode-version` input wins over `.xcode-version`.

### Options

| Input | Default | Description |
|-------|---------|-------------|
| `project` | *(required)* | `.xcodeproj` path |
| `scheme` | *(required)* | Scheme to resolve and scan |
| `version` | | Periphery version (for example `3.8.0`) or `latest` |
| `version-file` | | Path to a file containing the Periphery version |
| `xcode-version` | `.xcode-version` | Xcode version or npm-style range to select (for example `16.4`, `~27.0.0`) |
| `args` | `--strict --relative-results --format github-actions` | Extra `periphery scan` flags |
| `token` | `${{ github.token }}` | Token for GitHub Releases API / downloads |

| Output | Description |
|--------|-------------|
| `version` | Resolved Periphery version that was installed |
| `periphery-path` | Absolute path to the `periphery` binary |
| `xcode-version` | Resolved Xcode version that was selected |
