#!/usr/bin/env bash
# Regenerate api/_pms-tools.ts from the voice-agent's tool_schemas() —
# voice-agent is the source of truth; this script walks its AST so we don't
# drift. Run after editing arryve/voice-agent/src/arryve_voice_agent/tools.py.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
VOICE_TOOLS="${ARRYVE_REPO:-$(cd "$FRONT_DIR/.." && pwd)}/voice-agent/src/arryve_voice_agent/tools.py"

if [[ ! -f "$VOICE_TOOLS" ]]; then
  echo "voice-agent tools.py not found at $VOICE_TOOLS" >&2
  echo "Set ARRYVE_REPO=/path/to/arryve and re-run" >&2
  exit 1
fi

OUT="$FRONT_DIR/api/_pms-tools.ts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

python3 - "$VOICE_TOOLS" "$OUT" <<'PYEOF'
import ast, json, sys
src_path, out_path = sys.argv[1], sys.argv[2]
src = open(src_path).read()
tree = ast.parse(src)
keep = []
for node in tree.body:
    if isinstance(node, ast.FunctionDef) and node.name in ('tool_schemas', '_prop'):
        keep.append(node)
    elif isinstance(node, ast.ClassDef) and node.name == 'ToolSchema':
        keep.append(node)
    elif isinstance(node, ast.ImportFrom) and node.module in ('dataclasses', 'typing'):
        keep.append(node)
mod = ast.Module(body=keep, type_ignores=[])
ast.fix_missing_locations(mod)
g = {}
exec(compile(mod, '<extracted>', 'exec'), g)
schemas = g['tool_schemas']()
schemas = [{'name': s.name, 'description': s.description, 'parameters': s.parameters} for s in schemas]

# Tools whose dispatch lives in voice-agent itself (Gmail-backed) — no
# automation flow registered, so the demo can't call them.
SKIP = {'send_info_email', 'send_folio_followup_email'}
schemas = [s for s in schemas if s['name'] not in SKIP]

TYPE_MAP = {
    'string':  'Type.STRING', 'object':  'Type.OBJECT',
    'integer': 'Type.INTEGER', 'number':  'Type.NUMBER',
    'boolean': 'Type.BOOLEAN', 'array':   'Type.ARRAY',
}
def js(s): return json.dumps(s)
def cp(p):
    parts = [f'type: {TYPE_MAP[p["type"]]}']
    if 'description' in p: parts.append(f'description: {js(p["description"])}')
    if 'items' in p: parts.append(f'items: {{ {cp(p["items"])} }}')
    return ', '.join(parts)
def cs(s):
    pp = ',\n'.join(f'        {js(k)}: {{ {cp(v)} }}' for k, v in s["parameters"].get("properties", {}).items())
    req = json.dumps(s["parameters"].get("required", []))
    return f'  {{\n    name: {js(s["name"])},\n    description: {js(s["description"])},\n    parameters: {{\n      type: Type.OBJECT,\n      properties: {{\n{pp}\n      }},\n      required: {req},\n    }},\n  }}'

with open(out_path, 'w') as fh:
    fh.write('// AUTO-GENERATED from voice-agent/src/arryve_voice_agent/tools.py\n')
    fh.write('// Re-run scripts/sync-tools.sh after editing the voice-agent schemas.\n')
    fh.write('// Schemas mirror automation/src/server.ts FLOWS exactly (snake_case ↔ kebab-case).\n')
    fh.write('// Excluded: tools whose dispatch lives outside automation (Gmail-backed: send_info_email,\n')
    fh.write('//   send_folio_followup_email).\n\n')
    fh.write("import { Type } from '@google/genai';\n\n")
    fh.write('export const PMS_TOOL_DECLARATIONS = [\n')
    fh.write(',\n'.join(cs(s) for s in schemas))
    fh.write('\n];\n\n')
    fh.write('export const PMS_TOOL_NAMES: readonly string[] = [\n')
    for s in schemas: fh.write(f'  {js(s["name"])},\n')
    fh.write('];\n\n')
    fh.write('/** snake_case Gemini name → kebab-case automation flow name */\n')
    fh.write('export function toolNameToFlow(name: string): string {\n')
    fh.write("  return name.replace(/_/g, '-');\n")
    fh.write('}\n')
print(f'wrote {out_path} ({len(schemas)} tools)')
PYEOF

echo "✓ regenerated $(basename "$OUT")"
echo "Don't forget to update automation/src/demo-hmac-auth.ts ALLOWED_DEMO_FLOWS"
echo "if you added/removed flows."
