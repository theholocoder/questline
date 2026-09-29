# How can execution be sandboxed on Linux and Windows?

Research for [#15](https://github.com/theholocoder/questline/issues/15) (map [#1](https://github.com/theholocoder/questline/issues/1)). Feeds [Sandbox policy (#16)](https://github.com/theholocoder/questline/issues/16). Checked 2026-09-29 against official docs, published npm packages and upstream source. Versions inspected: `@earendil-works/pi-coding-agent` 0.99.1, `@anthropic-ai/sandbox-runtime` 0.0.77, `openai/codex` `main`, bubblewrap 0.12.0, git 2.55.0.

This file reports facts and their consequences for Questline. The policy itself (on by default or opt-in, network per Stage, what happens with no Docker) belongs to #16.

## TL;DR

- **pi can run bash in a container through one seam.** `createBashToolDefinition(cwd, { operations: { exec } })` hands every command to a host function, which can call `docker exec` [P1]. The file tools (`read`, `write`, `edit`, `ls`, `find`) take `operations` the same way. **`grep` does not.** It always spawns the host's `rg` on host paths, and its `operations` only cover `isDirectory` and `readFile` [P2]. pi's own micro-VM example rewrites `grep` from scratch for this reason [P5].
- **Simplest Docker design: run only `bash` in the container and keep the file tools on the host.** The worktree is bind-mounted, so both sides see the same files. The file tools are harness code with a path jail, and `bash` is the only way to run arbitrary code. This avoids a `docker exec` per file read and needs no `grep` rewrite. On Linux, mounting at the same absolute path means no path translation at all.
- **A Session worktree cannot run git when it is mounted on its own.** Its `.git` is a file (`gitdir: <main>/.git/worktrees/<name>`) pointing outside the mount, so git fails with "not a git repository" [G1][E1]. The main repo's `.git` must also be mounted, at the same absolute path, or at the same relative position if the worktree was made with `--relative-paths` [G1][E1]. **ADR 0004 has the harness make the only commit, on the host, at Complete.** So the container can mount the main `.git` **read-only**: `git status`, `git diff` and `git log` work, while `git add`/`commit` fail and hooks, config and refs stay out of reach [E1]. Codex does the same by default: it re-mounts `.git` read-only inside writable roots [X1].
- **On Windows, Docker means Docker Desktop and a Linux VM.** It needs WSL 2 (or Hyper-V), 8 GB RAM, virtualization in firmware, Windows 10 22H2 or 11 23H2 [D2], and a paid subscription for companies with 250+ employees or over $10M revenue [D3]. Bind mounts from `C:\` are slow and get no inotify events; Docker and Microsoft both say to keep code in the Linux filesystem [D1][W1][W2]. Git also writes absolute `C:/…` gitdir paths, which a Linux container cannot resolve, so Windows worktrees would need `--relative-paths` [G1][G2].
- **Lighter options exist on both OSes, and the major agents use them rather than Docker.** Claude Code uses bubblewrap on Linux and WSL2 (no native Windows) [C1]. Codex uses bubblewrap plus seccomp on Linux; on Windows it uses restricted tokens, dedicated sandbox users, ACLs and WFP firewall filters [X1][X2][X3]. **Anthropic's `@anthropic-ai/sandbox-runtime` (Apache-2.0) wraps all of this as a Node library**: bubblewrap on Linux, and an **alpha** Windows backend using a dedicated `srt-sandbox` user, NTFS ACEs and a WFP egress fence. The Windows backend needs a one-time elevated install [S1]. pi ships an example extension that sandboxes `bash` with it [P6].
- **Network:** Docker gives `--network none` (loopback only) or `--internal` networks [D4][D5]. A domain allowlist needs a proxy. bubblewrap gives `--unshare-net` (nothing) [E1], and sandbox-runtime adds a host HTTP/SOCKS proxy with domain allow and deny lists and an async per-host ask callback on Linux, macOS and Windows [S1][S2]. Landlock can filter only by port, not host [L1]. Hostname allowlists that do not inspect TLS can be bypassed with domain fronting [C1].

## 1. pi's tool-operation overrides and a Docker executor

### What each tool lets the host replace

From the published `.d.ts` files [P1]:

| Tool | Override | What the host supplies | Notes |
|---|---|---|---|
| `bash` | `BashOperations` | `exec(command, cwd, { onData, signal, timeout, env }) → { exitCode }` | Also `commandPrefix`, `shellPath`, and a synchronous `spawnHook(ctx) → ctx` that can rewrite command, cwd and env |
| `powershell` | `PowerShellOperations` = `BashOperations` | same | Same shape as bash [P1] |
| `read` | `ReadOperations` | `readFile`, `access`, optional `detectImageMimeType` | |
| `write` | `WriteOperations` | `writeFile`, `mkdir` | |
| `edit` | `EditOperations` | `readFile`, `writeFile`, `access` | |
| `ls` | `LsOperations` | `exists`, `stat`, `readdir` | |
| `find` | `FindOperations` | `exists`, `glob(pattern, cwd, { ignore, limit })` | If `glob` is supplied, pi skips its bundled `fd` [P2] |
| `grep` | `GrepOperations` | `isDirectory`, `readFile` (context lines only) | **Still spawns host `rg` on the resolved host path**, whatever the override [P2] |

`grep.js` calls `ensureTool("rg")` and `spawn(rgPath, [..., "--", pattern, searchPath])` unconditionally. The custom operations only decide whether the path is a directory and read context lines [P2]. pi's Gondolin (micro-VM) example therefore registers its own `grep` that walks the guest filesystem [P5].

### Two ways to build a Docker executor

**A. Only `bash` goes into the container (recommended).**

- Start one long-lived container per Session. Mount only the Session worktree read-write, the main repo's `.git` read-only (see §3), and the Skills dir read-only (spike #14 found Skills reference each other by path).
- `BashOperations.exec` spawns `docker exec -i -w <cwd> -e … <container> bash -c <command>`, pipes stdout and stderr to `onData`, and resolves with the exit code.
- `read`/`write`/`edit`/`ls`/`find`/`grep` stay on the host with the existing jail. They see the same bytes through the bind mount.
- On Linux, mount the worktree at its **host absolute path**. Then `cwd`, file paths and tool output need no translation. On Windows, `cwd` needs mapping from `C:\…` to the container path, and bash output shows container paths.
- pi's docs call this pattern "narrower" isolation. The pi process and any extension tools stay on the host [P3][P4]. That matches Questline, where the harness's own tools are trusted code (ADR 0001).

**B. Every built-in tool goes into the container (the Gondolin pattern [P5]).**

- Each file op becomes a container call (`docker exec cat`, or a small agent in the container), `grep` must be rewritten, and the system prompt must describe the guest cwd. The Gondolin example does this with `before_agent_start` [P5].
- More moving parts and a round-trip per file op, for no security gain over A, since the file tools are already harness-jailed.

### Known pitfalls

- **Abort does not kill the process in the container.** Killing the `docker exec` client leaves the spawned process running (moby/moby#9098, open since 2014) [D7]. The executor must kill inside the container itself: run the command in its own process group and `docker exec <c> kill -- -<pgid>`, or use `timeout`. pi's sandbox example kills the host process group on abort and timeout [P6]. A Docker executor needs the in-container equivalent.
- **File ownership (Linux Docker Engine).** The container user writes files into the bind mount under its own uid. Running with `--user $(id -u):$(id -g)` keeps worktree files owned by the user. Git also refuses repos owned by another user unless `safe.directory` allows them [G2].
- **Environment:** `exec` receives `env` from pi, including `PI_*` session variables unless `exposeSessionEnvironment: false` [P1]. Pass only an allowlist into the container. pi warns that its Gondolin example leaks host env vars into the VM [P3].
- **Toolchain split.** The container has its own toolchain. A Linux container cannot build Windows-only projects. Native `node_modules` built on the host differ from ones built in the container (an inference, not measured).

### Off-the-shelf options pi documents

pi documents four ways to isolate it: plain Docker (whole process), Docker Sandboxes (`sbx`, micro-VM, host proxy that injects credentials), NVIDIA OpenShell, and the Gondolin micro-VM extension (tools only, Linux + QEMU) [P3]. Docker Sandboxes are micro-VMs with "filesystem passthrough" mounts. All TCP egress goes through a host proxy that enforces policy and swaps in credentials [D6]. They would isolate the whole agent process, which does not fit pi running in Electron main (ADR 0001, #5).

## 2. What Docker costs on Windows

| Cost | Fact | Source |
|---|---|---|
| Install | Docker Desktop, WSL 2 backend (WSL ≥ 2.1.5) or Hyper-V backend. Windows 10 22H2 (19045) or Windows 11 23H2 (22631) or later. 8 GB RAM, SLAT CPU, virtualization on in BIOS/UEFI | [D2] |
| Admin | Per-user install needs no admin. All-users install needs admin. The Hyper-V backend needs admin to turn on Windows features | [D2] |
| License | Free for fewer than 250 employees **and** under $10M revenue, personal use, education and non-commercial OSS. Paid (Pro/Team/Business) for larger companies and government | [D3] |
| Bind-mount speed | "Performance is much higher when files are bind-mounted from the Linux filesystem, rather than accessed from the Windows host filesystem" | [D1] |
| File watching | "Linux containers only receive file change events, 'inotify events', if the original files are stored in the Linux filesystem" | [D1] |
| Cross-OS files | WSL 2 is ❌ on "performance across OS file systems". Microsoft recommends keeping files on the same OS as the tools | [W2][W1] |
| Memory | WSL 2 "does not yet release cached pages in memory back to Windows until the WSL instance is shut down" | [W2] |

**What this means for Questline:** a Windows user's Project normally lives on NTFS (`C:\…`), where the Windows IDE and git are fast. Container `bash` would then run over the slow cross-OS mount. Moving worktrees into the WSL filesystem (`\\wsl$\…`) fixes the container side, but slows every host-side access instead: Electron, the file tools, the host `rg` in pi's `grep`, and the user's editor [W1][W2]. No layout is fast for both sides. Docker's paid "synchronized file shares" feature targets this problem but was not verified here.

**Docker without Docker Desktop:** Docker Engine can be installed inside a WSL 2 distro. Docker's Windows docs cover only Docker Desktop, so treat this as unsupported. The cross-OS mount cost is the same.

## 3. Git worktrees inside the container

How a linked worktree finds its repo [G1]:

- The worktree's top-level `.git` is a **file** that sets `$GIT_DIR` to `<main>/.git/worktrees/<name>`. `$GIT_COMMON_DIR` points back to `<main>/.git`.
- Per-worktree state (`HEAD`, `index`) lives in `$GIT_DIR`. Refs, objects, config and hooks live in `$GIT_COMMON_DIR`.
- Paths are **absolute by default**. `git worktree add --relative-paths` or `worktree.useRelativePaths=true` (which turns on `extensions.relativeWorktrees` and breaks older Git) writes relative links. `git worktree repair` rewrites links after a move [G1][G2].

Experiment [E1] (bubblewrap bind mounts, which work like `docker run -v`, git 2.55):

| Mount layout | Result |
|---|---|
| Worktree alone at `/workspace` | `fatal: not a git repository` |
| Worktree alone at its host path | `fatal: not a git repository` (the gitdir target is not mounted) |
| Worktree + main `.git`, both at host paths, read-write | `status`, `add`, `commit` all work (the commit lands in the shared repo) |
| `--relative-paths` worktree + main `.git`, mounted at `/w/wt2` and `/w/main/.git` (same relative layout, different root) | `status` works |
| Worktree read-write + main `.git` **read-only** at host paths | `status` works. `add` fails: `Unable to create '…/.git/worktrees/wt/index.lock': Read-only file system` |

Consequences:

- **A writable main `.git` is an escape route.** It holds `hooks/` and `config`, which the user's own git runs on the host later, and every branch's refs. Claude Code allows writes to the shared `.git` for linked worktrees but always denies `hooks/` and `config` [C1]. sandbox-runtime denies `.git/hooks` and `.git/config` by default [S1]. Codex re-mounts `.git` and the resolved `gitdir:` read-only inside writable roots [X1].
- **Questline can go further.** Under ADR 0004 nothing is committed during Implement, and the harness commits on the host at Complete. So the container can mount the main `.git` read-only. The agent keeps `status`/`diff`/`log`, and the only git writes happen on the host. The per-Ticket "hidden git tree snapshot" must then be taken by the harness on the host, not by a command the model runs.
- **Windows + Linux container:** Git for Windows writes `gitdir: C:/…`, which a Linux container cannot resolve. Create Session worktrees with `--relative-paths` and mount the repo and worktrees in the same relative layout. Windows git and Linux git in the container will also both refresh the same index, with different stat data and line-ending settings; expect extra refresh cost (inference, not measured).

## 4. Lighter alternatives

### Linux

- **bubblewrap (`bwrap`)**: an unprivileged sandbox builder based on user namespaces; setuid mode has been removed. It sets `PR_SET_NO_NEW_PRIVS`. It is "not a complete, ready-made sandbox with a specific security policy": the caller writes the policy [B1]. Startup is a process spawn, with no daemon or image.
  - Needs unprivileged user namespaces. Ubuntu 24.04+ restricts them through AppArmor (`kernel.apparmor_restrict_unprivileged_userns`), so users need a sysctl change or an AppArmor profile [S1][C1][X1].
  - Inside an unprivileged container it cannot mount a fresh `/proc` without a weaker "nested" mode [C1].
- **Landlock**: an unprivileged, stackable LSM that lets a process restrict itself. TCP bind/connect filtering by **port only** arrived in ABI 4, UDP in ABI 10. Abstract-unix-socket and signal scoping arrived in ABI 6 [L1]. Codex has demoted it to "legacy", because it "cannot isolate app-server Unix sockets", and made bubblewrap the default [X1].
- **What the agents ship:**
  - Claude Code: bubblewrap + socat, with an optional seccomp filter that blocks Unix sockets. It writes to cwd plus a temp dir, reads everywhere by default, and sends network through a host proxy. Its sandbox applies only to Bash/PowerShell/Monitor; the Read/Edit/Write tools use its permission system [C1].
  - Codex: bubblewrap is the default. It runs `--ro-bind / /`, then binds writable roots, re-mounts `.git`/`gitdir:`/`.codex` read-only, uses `--unshare-user --unshare-pid`, and adds `--unshare-net` or a managed proxy bridge plus seccomp [X1].

### Windows

| Option | How it isolates | Fit for Questline |
|---|---|---|
| **sandbox-runtime (srt) Windows backend, alpha** | Runs the command as a dedicated local `srt-sandbox` user: `CreateProcessWithLogonW` starts a runner, which spawns the command under a restricted token in a job object. Filesystem: additive NTFS ACEs for that SID (allowWrite → MODIFY, denies as DENY ACEs), removed at `reset()`. Network: WFP filters block every connect from that SID except loopback to the proxy port range (default 60080–60089) | Closest drop-in: the same Node API as Linux [S1]. Costs: one-time elevated `windows-install` (UAC), alpha status, **no per-command `allowWrite`** (grants are session-wide at `initialize()`), and schannel revocation checks fail behind the fence (`git -c http.schannelCheckRevoke=false`) [S1] |
| **Codex's Windows sandbox** | Elevated mode: "dedicated lower-privilege sandbox users, filesystem permission boundaries, firewall rules, and local policy changes". Unelevated fallback: a restricted token from the current user, ACL boundaries, and env-level offline controls ("weaker than elevated") [X2]. Source: `CreateRestrictedToken`, persistent WFP filters keyed on the account [X3] | Shows the same design as srt. It is Rust inside Codex, not a library Questline can use directly |
| **AppContainer** | Kernel-enforced per-app identity. Files and registry need explicit grants; network needs capabilities (Internet, Intranet, server) [W4] | Powerful, but dev CLIs (git, node, compilers) assume the user's profile and registry. Neither Codex nor srt uses it for shells |
| **Windows Sandbox** | A disposable Hyper-V VM with mapped folders; networking can be turned off in `.wsb` config (it is on by default) | **Unsuitable**: "doesn't allow multiple instances to run simultaneously", not on Home edition, starts empty (no host toolchain) [W3] |
| **WSL 2 + bubblewrap** | The Linux path inside WSL. Claude Code and Codex both support it; WSL 1 is unsupported [C1][X1] | Needs WSL and has the same cross-OS file cost as Docker (§2). WSL interop lets sandboxed code launch Windows `.exe`s through a Unix socket unless sockets are blocked [C1] |

### pi integration of the light options

pi's `sandbox` example extension does exactly this. It replaces `bash` with `BashOperations.exec`, which calls `SandboxManager.wrapWithSandbox(command)` and spawns the result in its own process group, killing the group on abort or timeout. Its default config allows writes to `.` and `/tmp`, denies reads of `~/.ssh`, `~/.aws` and `~/.gnupg`, and allowlists registry and GitHub domains [P6]. `spawnHook` is synchronous and `wrapWithSandbox` is async, so the wrapping belongs in `operations.exec`, not `spawnHook` [P1][S2]. `wrapWithSandbox` takes a per-call `customConfig`, so a different worktree per Session works on Linux and macOS, but not on Windows (see the table above) [S1][S2].

## 5. Network restriction per approach

| Approach | No network | Domain allowlist | Notes |
|---|---|---|---|
| Docker | `--network none`: only a loopback device is created [D4] | Not built in. Put the container on an `--internal` network (no default route; firewall drops traffic to other networks) [D5] plus a proxy container that is also on an outside network | Docker Sandboxes (`sbx`) have a policy proxy built in [D6] |
| bubblewrap | `--unshare-net` (the experiment could not resolve DNS) [E1] | Via sandbox-runtime: the netns is removed, and HTTP and SOCKS5 proxies run on the host behind Unix sockets bind-mounted into the sandbox [S1] | seccomp blocks new `AF_UNIX` sockets (x64/arm64) so code cannot reach other local services [S1] |
| Landlock | Deny TCP connect on all ports (ABI 4+) | No: ports only [L1] | |
| srt on Windows | Empty `allowedDomains` | WFP fence per SID; only loopback to the proxy ports is allowed. Env vars point tools at the proxy, but the WFP filter is the real boundary [S1] | alpha |
| srt (all OSes) | Default: "all network access is denied" | `allowedDomains` / `deniedDomains`. `SandboxAskCallback(host) → Promise<boolean>` asks the host per unknown domain. `--control-fd` / live config updates change domain lists mid-run [S1][S2] | By default it blocks loopback, link-local, cloud-metadata and the host's own addresses even for allowed names [S1] |

Caveats:

- A hostname allowlist that does not terminate TLS can be bypassed with **domain fronting**. Claude Code documents this, and offers a TLS-terminating proxy mode as experimental [C1].
- srt's `SandboxAskCallback` fits Questline's single `requestApproval` callback (#5): an unknown domain can become an inline approval.

## Sources

- **[P1]** `@earendil-works/pi-coding-agent` 0.99.1, `dist/core/tools/{bash,read,write,edit,ls,find,grep,powershell}.d.ts` (npm). Upstream: https://github.com/earendil-works/pi/tree/main/packages/coding-agent
- **[P2]** Same package, `dist/core/tools/grep.js` (unconditional `ensureTool("rg")` + `spawn`) and `find.js` (custom `glob` skips `fd`)
- **[P3]** pi docs, `docs/containerization.md` ("Run Pi in an isolated environment")
- **[P4]** pi docs, `docs/security.md` ("Run Pi safely")
- **[P5]** pi `examples/extensions/gondolin/index.ts` (overrides all 7 built-in tools; custom `executeGondolinGrep`)
- **[P6]** pi `examples/extensions/sandbox/index.ts` (bash via `@anthropic-ai/sandbox-runtime`)
- **[P7]** pi docs, `docs/windows.md` (Git Bash default on native Windows)
- **[S1]** `@anthropic-ai/sandbox-runtime` 0.0.77 README (Apache-2.0), https://github.com/anthropics/sandbox-runtime
- **[S2]** Same package, `dist/sandbox/sandbox-manager.d.ts`, `sandbox-schemas.d.ts`
- **[C1]** Claude Code, "Configure the sandboxed Bash tool", https://code.claude.com/docs/en/sandboxing
- **[X1]** Codex, `codex-rs/linux-sandbox/README.md`, https://github.com/openai/codex/tree/main/codex-rs/linux-sandbox
- **[X2]** Codex, "Windows sandbox", https://learn.chatgpt.com/codex/windows/windows-sandbox (also https://learn.chatgpt.com/docs/sandboxing)
- **[X3]** Codex, `codex-rs/windows-sandbox-rs/src/{token.rs,wfp.rs}`, https://github.com/openai/codex/tree/main/codex-rs/windows-sandbox-rs
- **[D1]** Docker, "Best practices" (WSL), https://docs.docker.com/desktop/features/wsl/best-practices/
- **[D2]** Docker, "Install Docker Desktop on Windows", https://docs.docker.com/desktop/setup/install/windows-install/
- **[D3]** Docker, "Docker Desktop license agreement", https://docs.docker.com/subscription/desktop-license/
- **[D4]** Docker, "None network driver", https://docs.docker.com/engine/network/drivers/none/
- **[D5]** Docker, `docker network create --internal`, https://docs.docker.com/reference/cli/docker/network/create/
- **[D6]** Docker Sandboxes architecture, https://docs.docker.com/ai/sandboxes/architecture/
- **[D7]** moby/moby#9098, "Kill `docker exec` command will not terminate the spawned process" (open), https://github.com/moby/moby/issues/9098
- **[W1]** Microsoft, "Working across file systems" (WSL), https://learn.microsoft.com/en-us/windows/wsl/filesystems
- **[W2]** Microsoft, "Comparing WSL versions", https://learn.microsoft.com/en-us/windows/wsl/compare-versions
- **[W3]** Microsoft, "Windows Sandbox", https://learn.microsoft.com/en-us/windows/security/application-security/application-isolation/windows-sandbox/
- **[W4]** Microsoft, "AppContainer isolation", https://learn.microsoft.com/en-us/windows/win32/secauthz/appcontainer-isolation
- **[G1]** `git-worktree(1)`, git 2.55.0 (DETAILS, `--relative-paths`, `repair`), https://git-scm.com/docs/git-worktree
- **[G2]** `git-config(1)`, git 2.55.0 (`worktree.useRelativePaths`, `safe.directory`), https://git-scm.com/docs/git-config
- **[B1]** bubblewrap README, https://github.com/containers/bubblewrap
- **[L1]** Linux kernel, "Landlock: unprivileged access control", https://docs.kernel.org/userspace-api/landlock.html
- **[E1]** Local experiment, 2026-09-29, Linux, bubblewrap 0.12.0, git 2.55.0: `git init main; git worktree add ../wt`, then `bwrap --unshare-all` with the bind-mount layouts in §3; one extra worktree made with `--relative-paths`. Docker itself was not run (no daemon access on the test machine). bubblewrap bind mounts behave like `docker run -v` for this purpose.
