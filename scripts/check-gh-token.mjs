const t = (process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN ?? "").trim();
if (!t) {
  console.error("[release] Missing GH_TOKEN or GITHUB_TOKEN.");
  console.error(
    "Create a token with repo scope (classic PAT) or fine-grained with Contents: Read and write on this repo:",
    "https://github.com/settings/tokens",
  );
  console.error('PowerShell: $env:GH_TOKEN="ghp_..." ; npm run release');
  process.exit(1);
}
