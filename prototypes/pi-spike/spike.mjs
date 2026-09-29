// Throwaway spike: prove pi (pi-coding-agent) fits Questline's Engine assumptions.
// Runs keyless: pi-ai's faux provider scripts the model; every check exercises real pi code.
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, readdirSync } from "node:fs";
import * as fs from "node:fs/promises";
import { tmpdir, homedir } from "node:os";
import { join, resolve, relative, isAbsolute } from "node:path";
import { spawn } from "node:child_process";
import { fauxProvider, fauxAssistantMessage, fauxToolCall } from "@earendil-works/pi-ai";
import {
	createAgentSession, DefaultResourceLoader, ModelRuntime, SessionManager, SettingsManager,
	loadSkillsFromDir, createBashToolDefinition, createReadToolDefinition, createWriteToolDefinition, createEditToolDefinition,
} from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";

const results = [];
const check = (id, ok, note = "") => { results.push({ id, ok: !!ok, note }); console.log(`${ok ? "PASS" : "FAIL"} ${id}${note ? ` — ${note}` : ""}`); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- fixtures
const root = mkdtempSync(join(tmpdir(), "pi-spike-"));
const WORKTREE = join(root, "worktree");
const AGENT_DIR = join(root, "questline-agent"); // Questline-owned, never ~/.pi
const SKILLS = join(root, "bundled-skills");
mkdirSync(WORKTREE, { recursive: true });
mkdirSync(AGENT_DIR, { recursive: true });
writeFileSync(join(WORKTREE, "hello.txt"), "hello world\n");
writeFileSync(join(WORKTREE, "AGENTS.md"), "ROGUE_CONTEXT_FILE\n");
for (const d of [".claude/skills/rogue-claude", ".agents/skills/rogue-agents", ".pi/skills/rogue-pi"]) {
	mkdirSync(join(WORKTREE, d), { recursive: true });
	const name = d.split("/").pop();
	writeFileSync(join(WORKTREE, d, "SKILL.md"), `---\nname: ${name}\ndescription: repo skill that must not load\n---\nROGUE\n`);
}
const skill = (name, fm, body) => {
	mkdirSync(join(SKILLS, name), { recursive: true });
	writeFileSync(join(SKILLS, name, "SKILL.md"), `---\nname: ${name}\n${fm}---\n${body}\n`);
};
skill("grilling", "description: Grill the user about a plan.\n", "GRILLING_BODY. For setup see ../setup/SKILL.md");
skill("setup", "description: One-off project setup.\ndisable-model-invocation: true\n", "SETUP_BODY");

const userSkillNames = [join(homedir(), ".pi/agent/skills"), join(homedir(), ".agents/skills")]
	.filter(existsSync).flatMap((d) => readdirSync(d));

// ---------------------------------------------------------------- faux model
// Every model request goes through `respond`, which pops the next scripted step.
// Compaction summary requests are answered automatically.
const script = [];
const seenContexts = [];
const textOf = (m) => typeof m.content === "string" ? m.content : m.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
const lastUserText = (ctx) => { const m = ctx.messages.findLast((m) => m.role === "user"); return m ? textOf(m) : ""; };
const respond = (ctx) => {
	seenContexts.push(ctx);
	const text = lastUserText(ctx);
	if (/summar/i.test(text) && /conversation/i.test(text)) return fauxAssistantMessage("## Goal\nSUMMARY_OF_EARLIER_WORK");
	const step = script.shift();
	if (!step) return fauxAssistantMessage("(script exhausted)");
	return typeof step === "function" ? step(ctx) : step;
};
const faux = fauxProvider({ provider: "faux", models: [{ id: "faux-1", contextWindow: 6000, maxTokens: 1000 }], tokensPerSecond: 400 });
faux.setResponses(Array.from({ length: 200 }, () => respond));
const model = faux.getModel();

// ---------------------------------------------------------------- host executor (sandbox seam)
const execLog = [];
const jail = (p) => {
	const abs = isAbsolute(p) ? p : resolve(WORKTREE, p);
	const inside = (dir) => !relative(dir, abs).startsWith("..");
	if (!inside(WORKTREE) && !inside(SKILLS)) throw new Error(`Questline jail: ${p} is outside the worktree`);
	return abs;
};
const hostOps = {
	bash: {
		exec: (command, cwd, { onData, signal, env }) => {
			execLog.push({ op: "bash", command, cwd });
			return new Promise((res) => {
				const child = spawn("bash", ["-c", command], { cwd: jail(cwd), env, signal });
				child.stdout.on("data", onData);
				child.stderr.on("data", onData);
				child.on("error", () => res({ exitCode: 1 }));
				child.on("close", (code) => res({ exitCode: code }));
			});
		},
	},
	read: { readFile: async (p) => (execLog.push({ op: "read", p }), fs.readFile(jail(p))), access: async (p) => fs.access(jail(p)) },
	write: { writeFile: async (p, c) => (execLog.push({ op: "write", p }), fs.writeFile(jail(p), c)), mkdir: async (d) => fs.mkdir(jail(d), { recursive: true }) },
	edit: {
		readFile: async (p) => fs.readFile(jail(p)),
		writeFile: async (p, c) => (execLog.push({ op: "edit", p }), fs.writeFile(jail(p), c)),
		access: async (p) => fs.access(jail(p)),
	},
};

// ---------------------------------------------------------------- core `ask` tool (blocks until host answers)
let onAsk = null;
const askTool = {
	name: "ask",
	label: "Ask",
	description: "Ask the user a question and wait for the answer.",
	promptSnippet: "ask: ask the user a question",
	parameters: Type.Object({ question: Type.String() }),
	async execute(_id, params, signal) {
		const answer = await new Promise((res, rej) => {
			onAsk?.(params, res);
			signal?.addEventListener("abort", () => rej(new Error("aborted")));
		});
		return { content: [{ type: "text", text: `User answered: ${answer}` }], details: { answer } };
	},
};

// ---------------------------------------------------------------- session
const SYSTEM_PROMPT = "QUESTLINE_SYSTEM_PROMPT: you are the Questline Plan Stage agent.";
const loader = new DefaultResourceLoader({
	cwd: WORKTREE,
	agentDir: AGENT_DIR,
	noSkills: true,
	noPromptTemplates: true,
	noThemes: true,
	noContextFiles: true,
	systemPrompt: SYSTEM_PROMPT,
	skillsOverride: () => loadSkillsFromDir({ dir: SKILLS, source: "questline" }),
	// Only inline factories: Questline registers providers itself. No ~/.pi extensions.
	extensionFactories: [(api) => { api.registerProvider(faux.provider); }],
});
await loader.reload();

const modelRuntime = await ModelRuntime.create({ authPath: join(AGENT_DIR, "auth.json"), modelsPath: null, refreshOnCreate: false });
const settingsManager = SettingsManager.inMemory({
	compaction: { enabled: true, reserveTokens: 1500, keepRecentTokens: 300 },
	retry: { enabled: false },
});

const { session, extensionsResult } = await createAgentSession({
	cwd: WORKTREE,
	agentDir: AGENT_DIR,
	model,
	thinkingLevel: "off",
	modelRuntime,
	resourceLoader: loader,
	sessionManager: SessionManager.inMemory(WORKTREE),
	settingsManager,
	noTools: "builtin",
	customTools: [
		createBashToolDefinition(WORKTREE, { operations: hostOps.bash }),
		createReadToolDefinition(WORKTREE, { operations: hostOps.read }),
		createWriteToolDefinition(WORKTREE, { operations: hostOps.write }),
		createEditToolDefinition(WORKTREE, { operations: hostOps.edit }),
		askTool,
	],
});
if (extensionsResult.errors?.length) console.log("extension errors:", extensionsResult.errors);
await session.bindExtensions?.({});

const events = [];
session.subscribe((e) => events.push(e));
const eventTypes = () => [...new Set(events.map((e) => e.type))];

// ---------------------------------------------------------------- 1. system prompt + Skills
const sp = session.systemPrompt;
check("1a custom system prompt", sp.includes("QUESTLINE_SYSTEM_PROMPT"));
check("1b harness Skill listed", sp.includes("grilling"));
check("1c user-invoked Skill hidden from model", !sp.includes("One-off project setup"));
check("1d repo Skills not loaded", !/rogue-/.test(sp) && !loader.getSkills().skills.some((s) => s.name.startsWith("rogue")));
check("1e user Skills not loaded", loader.getSkills().skills.every((s) => s.filePath.startsWith(SKILLS)), `user skills on disk: ${userSkillNames.join(", ") || "none"}`);
check("1f AGENTS.md not loaded", !sp.includes("ROGUE_CONTEXT_FILE"));
check("1g only harness tools active", JSON.stringify(session.getActiveToolNames().sort()) === JSON.stringify(["ask", "bash", "edit", "read", "write"]), session.getActiveToolNames().join(","));

script.push(fauxAssistantMessage("ok"));
await session.prompt("/skill:setup");
check("1h /skill:<user-invoked> works as slash command", lastUserText(seenContexts.at(-1)).includes("SETUP_BODY"));

// Another Skill reaching the hidden one: the model reads its file via `read`.
script.push(fauxAssistantMessage([fauxToolCall("read", { path: join(SKILLS, "setup/SKILL.md") })], { stopReason: "toolUse" }));
script.push((ctx) => {
	const tr = ctx.messages.findLast((m) => m.role === "toolResult");
	return fauxAssistantMessage(JSON.stringify(tr?.content ?? "").includes("SETUP_BODY") ? "READ_HIDDEN_OK" : "READ_HIDDEN_FAIL");
});
await session.prompt("use grilling, it says to run setup");
check("1i hidden Skill reachable from another Skill (read)", session.getLastAssistantText() === "READ_HIDDEN_OK");

// ---------------------------------------------------------------- 2. blocking `ask` tool
let askedAt = 0, answeredAt = 0;
onAsk = (params, answer) => { askedAt = Date.now(); setTimeout(() => { answeredAt = Date.now(); answer(`yes to "${params.question}"`); }, 500); };
script.push(fauxAssistantMessage([fauxToolCall("ask", { question: "Ship it?" })], { stopReason: "toolUse" }));
script.push((ctx) => fauxAssistantMessage(JSON.stringify(ctx.messages.findLast((m) => m.role === "toolResult")?.content)));
await session.prompt("ask me");
check("2a ask blocks the Run until host answers", askedAt && answeredAt - askedAt >= 450, `${answeredAt - askedAt}ms`);
check("2b answer reaches the model", session.getLastAssistantText().includes("yes to"));

// ---------------------------------------------------------------- 3. executor seam
execLog.length = 0;
script.push(fauxAssistantMessage([
	fauxToolCall("bash", { command: "cat hello.txt && pwd" }),
	fauxToolCall("read", { path: "hello.txt" }),
	fauxToolCall("write", { path: "new.txt", content: "made by agent" }),
	fauxToolCall("edit", { path: "hello.txt", edits: [{ oldText: "world", newText: "questline" }] }),
	fauxToolCall("write", { path: "../escape.txt", content: "nope" }),
], { stopReason: "toolUse" }));
script.push(fauxAssistantMessage("done"));
await session.prompt("do file things");
const toolResults = session.messages.filter((m) => m.role === "toolResult").slice(-5);
const ops = execLog.map((e) => e.op);
check("3a bash routed through host executor", ops.includes("bash"));
check("3b read/write/edit routed through host executor", ["read", "write", "edit"].every((o) => ops.includes(o)), ops.join(","));
check("3c edit applied", readFileSync(join(WORKTREE, "hello.txt"), "utf8").includes("questline"));
check("3d jail blocks escape", !existsSync(join(root, "escape.txt")) && toolResults.at(-1)?.isError, JSON.stringify(toolResults.at(-1)?.content).slice(0, 120));

// ---------------------------------------------------------------- 4. context usage + compaction
const u1 = session.getContextUsage();
check("4a getContextUsage reports tokens + window", u1 && u1.contextWindow === 6000 && typeof u1.tokens === "number", JSON.stringify(u1));
const big = "lorem ipsum dolor sit amet ".repeat(300);
for (let i = 0; i < 3; i++) script.push(fauxAssistantMessage(`chunk ${i} ${big}`));
for (let i = 0; i < 3; i++) await session.prompt(`fill ${i} ${big}`);
await session.waitForIdle?.();
await sleep(200);
const autoCompacted = events.some((e) => /compaction/.test(e.type));
check("4b auto-compaction fires near the window", autoCompacted, `compaction events: ${eventTypes().filter((t) => /compac/.test(t)).join(",") || "none"}; usage=${JSON.stringify(session.getContextUsage())}`);
let manual = null;
try { manual = await session.compact("keep decisions"); } catch (e) { manual = e; }
check("4c manual compact() works", manual && !(manual instanceof Error), manual instanceof Error ? manual.message : `summary: ${String(manual?.summary).slice(0, 40)}`);
check("4d usage after compaction", true, JSON.stringify(session.getContextUsage()));

// ---------------------------------------------------------------- 5. events, abort, steer
check("5a streamed event types", eventTypes().includes("message_update") && eventTypes().includes("tool_execution_start"), eventTypes().join(","));

script.push(fauxAssistantMessage("x".repeat(20000)));
const running = session.prompt("talk forever");
await sleep(150);
await session.abort();
await running.catch(() => {});
const last = session.messages.findLast((m) => m.role === "assistant");
check("5b abort() stops a streaming Run", last?.stopReason === "aborted", `stopReason=${last?.stopReason}`);

onAsk = (_p, answer) => setTimeout(() => answer("fine"), 300);
script.push(fauxAssistantMessage([fauxToolCall("ask", { question: "?" })], { stopReason: "toolUse" }));
script.push((ctx) => fauxAssistantMessage(lastUserText(ctx).includes("STEER_ME") ? "STEER_SEEN" : `STEER_MISSING:${lastUserText(ctx).slice(0, 40)}`));
script.push(fauxAssistantMessage("after steer"));
const steered = session.prompt("start a turn");
await sleep(100);
const q = await session.steer("STEER_ME please also do X");
await steered;
await session.waitForIdle?.();
check("5c steer() queues into the running Run", session.messages.some((m) => m.role === "assistant" && JSON.stringify(m.content).includes("STEER_SEEN")), `steer returned ${q}`);

// ---------------------------------------------------------------- report
session.dispose();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
writeFileSync(new URL("./results.json", import.meta.url), JSON.stringify({ pi: "0.99.0", node: process.version, results, eventTypes: eventTypes() }, null, 2));
process.exit(failed.length ? 1 : 0);
