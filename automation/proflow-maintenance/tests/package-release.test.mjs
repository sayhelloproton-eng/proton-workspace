import assert from "node:assert/strict";
import test from "node:test";
import { packageRelease } from "../package-release.mjs";

test("one package plus optional summary delegates once to canonical launcher", () => {
	let calls = 0;
	const result = packageRelease(
		{ package: "dev-tunnel", summary: "Fix" },
		"release",
		(command, args, options) => {
			calls++;
			assert.equal(command, "pnpm");
			assert.deepEqual(args, [
				"--silent",
				"package:release",
				"dev-tunnel",
				"--summary",
				"Fix",
			]);
			assert.match(options.cwd, /repos\/proflow$/);
			return {
				status: 0,
				stdout: JSON.stringify({
					contract: "proflow.package-release.v2",
					status: "RUNNING",
					runId: "one",
					stage: "QUEUED",
					receiptPath: "/authority/receipt.json",
					next: "PACKAGE_RELEASE_STATUS",
				}),
			};
		},
	);
	assert.equal(calls, 1);
	assert.equal(result.status, "RUNNING");
	assert.equal(result.runId, "one");
	assert.equal(result.receiptPath, "/authority/receipt.json");
	assert.match(result.statusCommand, /package-release.mjs status/);
});

test("invalid or expanded model inputs never invoke ProFlow", () => {
	for (const input of [
		null,
		{},
		{ package: ["a", "b"] },
		{ package: "a b" },
		{ package: "--all" },
		{ package: "dev-tunnel", version: "1.0.0" },
		{ package: "dev-tunnel", repo: "/tmp" },
	]) {
		assert.equal(
			packageRelease(input, "release", () => assert.fail("called owner"))
				.status,
			"BLOCKED",
		);
	}
});

test("status and retry preserve owner terminal semantics without polling", () => {
	for (const status of ["PASS", "BLOCKED", "UNKNOWN", "FAIL", "RUNNING"]) {
		let calls = 0;
		const result = packageRelease(
			{ package: "dev-tunnel" },
			"status",
			(_command, args) => {
				calls++;
				assert.equal(args.at(-1), "--status");
				return {
					stdout: JSON.stringify({
						contract: "proflow.package-release.v2",
						status,
						next: status === "PASS" ? "PACKAGE_ADOPTION" : null,
					}),
				};
			},
		);
		assert.equal(result.status, status);
		assert.equal(calls, 1);
	}
	const result = packageRelease(
		{ package: "dev-tunnel" },
		"retry",
		(_command, args) => {
			assert.equal(args.at(-1), "--retry");
			return { error: new Error("timeout"), stdout: "" };
		},
	);
	assert.equal(result.status, "UNKNOWN");
	assert.equal(result.requiredAction, "READ_PACKAGE_RELEASE_STATUS");
});
