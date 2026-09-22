#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const repo = resolve(import.meta.dirname, "../../repos/proflow");
const statuses = new Set(["RUNNING", "PASS", "BLOCKED", "UNKNOWN", "FAIL"]);

export function packageRelease(
	input,
	operation = "release",
	invoke = spawnSync,
) {
	const blocked = {
		contract: "proflow.maintenance.package-release.v1",
		status: "BLOCKED",
		reason: "SINGLE_PACKAGE_INPUT_REQUIRED",
		requiredAction: "PROVIDE_ONE_PACKAGE_AND_OPTIONAL_SUMMARY",
	};
	if (
		!input ||
		typeof input !== "object" ||
		Array.isArray(input) ||
		Object.keys(input).some((key) => !["package", "summary"].includes(key)) ||
		typeof input.package !== "string" ||
		!/^(?:[a-z0-9][a-z0-9._-]*|@[a-z0-9._-]+\/[a-z0-9][a-z0-9._-]*)$/.test(
			input.package,
		) ||
		(input.summary !== undefined &&
			(typeof input.summary !== "string" || !input.summary.trim())) ||
		!["release", "status", "retry"].includes(operation) ||
		(operation === "status" && input.summary !== undefined)
	)
		return blocked;
	const args = ["--silent", "package:release", input.package];
	if (operation !== "release") args.push(`--${operation}`);
	if (input.summary !== undefined) args.push("--summary", input.summary);
	// Wait only for the fast launcher. Never poll or wait for the detached worker.
	const result = invoke("pnpm", args, {
		cwd: repo,
		encoding: "utf8",
		timeout: 10_000,
		maxBuffer: 1024 * 1024,
	});
	let receipt;
	try {
		receipt = JSON.parse(result.stdout.trim());
	} catch {}
	if (
		result.error ||
		!receipt ||
		receipt.contract !== "proflow.package-release.v2" ||
		!statuses.has(receipt.status)
	)
		return {
			contract: "proflow.maintenance.package-release.v1",
			status: "UNKNOWN",
			reason: "RELEASE_DELEGATION_UNCONFIRMED",
			requiredAction: "READ_PACKAGE_RELEASE_STATUS",
			statusCommand: command(input.package, "status"),
		};
	return {
		...receipt,
		package: input.package,
		statusCommand: command(input.package, "status"),
		retryCommand: command(input.package, "retry"),
	};
}

function command(pkg, operation) {
	return `node automation/proflow-maintenance/package-release.mjs ${operation} '${JSON.stringify({ package: pkg })}'`;
}

if (
	process.argv[1] &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	let receipt;
	try {
		const [operation, json, ...extra] = process.argv.slice(2);
		receipt = extra.length
			? packageRelease(null)
			: packageRelease(JSON.parse(json), operation);
	} catch {
		receipt = packageRelease(null);
	}
	process.stdout.write(`${JSON.stringify(receipt)}\n`);
	process.exitCode = { RUNNING: 0, PASS: 0, BLOCKED: 2, UNKNOWN: 3, FAIL: 1 }[
		receipt.status
	];
}
