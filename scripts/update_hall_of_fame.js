#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const repoRoot = path.resolve(__dirname, "..");
const hallPath = path.join(repoRoot, "data", "hall_of_fame.json");
const eventPath = process.env.GITHUB_EVENT_PATH;

function parseBodyFields(body = "") {
  const fields = {};
  const lines = body.split(/\r?\n/);

  let currentKey = null;
  for (const rawLine of lines) {
    const line = rawLine.trim();
    const heading = line.match(/^###\s+(.+)$/);
    if (heading) {
      currentKey = heading[1].toLowerCase().replace(/\s+/g, "_");
      fields[currentKey] = "";
      continue;
    }

    if (currentKey && line && line !== "_No response_") {
      fields[currentKey] = fields[currentKey]
        ? `${fields[currentKey]}\n${line}`
        : line;
    }
  }

  return fields;
}

function loadEventPayload() {
  if (eventPath && fs.existsSync(eventPath)) {
    return JSON.parse(fs.readFileSync(eventPath, "utf8"));
  }
  return {
    issue: {
      number: Number(process.env.ISSUE_NUMBER || 0),
      title: process.env.ISSUE_TITLE || "",
      body: process.env.ISSUE_BODY || "",
      html_url: process.env.ISSUE_URL || "",
      user: {
        login: process.env.ISSUE_USER || "unknown",
      },
    },
  };
}

function normalizeEntry(payload) {
  const issue = payload.issue || {};
  const fields = parseBodyFields(issue.body || "");

  const username =
    fields.github_username || issue.title.replace("[Hall of Fame]:", "").trim();

  return {
    username,
    type_name: fields.dna_type_name || "Unknown Type",
    alias_name: fields.dna_alias_name || "Unknown Alias",
    rarity: fields.rarity_tier || "Common",
    share_card_url: fields.share_card_url_(optional) || "",
    notes: fields.notes_(optional) || "",
    submitted_by: issue.user?.login || "unknown",
    issue_number: issue.number || 0,
    issue_url: issue.html_url || "",
    submitted_at: new Date().toISOString(),
  };
}

function updateHallFile(entry) {
  const hall = JSON.parse(fs.readFileSync(hallPath, "utf8"));
  hall.entries = hall.entries || [];

  const exists = hall.entries.find(
    (item) =>
      String(item.username).toLowerCase() === String(entry.username).toLowerCase()
  );

  if (exists) {
    Object.assign(exists, entry);
  } else {
    hall.entries.push(entry);
  }

  hall.updated_at = new Date().toISOString();
  fs.writeFileSync(hallPath, `${JSON.stringify(hall, null, 2)}\n`);
}

function main() {
  if (!fs.existsSync(hallPath)) {
    throw new Error(`Missing hall file: ${hallPath}`);
  }

  const payload = loadEventPayload();
  const entry = normalizeEntry(payload);
  if (!entry.username) {
    throw new Error("Could not infer username from issue payload.");
  }

  updateHallFile(entry);
  console.log(`Updated Hall of Fame for ${entry.username}`);
}

main();
