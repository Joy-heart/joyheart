# MLS Performance Results

**Status:** NOT STARTED — no valid MLS benchmarks have been run.

## Required benchmark environment record
Every result must include:
- Device model, CPU, RAM and OS build.
- Browser/runtime and version, or Android/iOS app/runtime build.
- Candidate repository, exact commit/tag and crypto provider.
- Rust toolchain and build profile.
- Cipher suite and group size.
- Storage provider and persistence configuration.
- Warm-up count, measured iteration count, percentile method and sample size.

## Required measurements
- KeyPackage generation and serialization.
- Group creation and member join/Welcome processing.
- Application message encrypt/decrypt.
- Commit creation and processing for member add/remove.
- Epoch transition latency.
- State serialization and persistence latency.
- Memory peak and steady-state use.
- App restart and state restore.
- Offline queue reconciliation and sync.
- WebAssembly bundle size and cold-start latency.

## Benchmark rules
- Use synthetic data only.
- Use release builds for performance measurements.
- Report p50, p95, min/max and sample count; include failures and outliers.
- Compare identical cipher suites and hardware where possible.
- Do not publish invented or extrapolated measurements.
- Do not compare debug builds against release builds.

## Results

No measurements available. All metrics remain NOT STARTED. No performance claim is made.
