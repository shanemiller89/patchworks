#!/bin/bash

set -euo pipefail

echo "🧪 Testing Patchworks CLI Package"

echo "🛠️ Building CLI entry points..."
npm run build

# 1. Test the bin file directly first
echo "1️⃣ Testing bin file directly..."
if node ./dist/bin/patchworks.js --help; then
    echo "✅ Bin file works directly"
else
    echo "❌ Bin file fails - check permissions and shebang"
    exit 1
fi

# 2. Test packaging
echo "2️⃣ Testing package contents..."
npm pack --dry-run

# 3. Clean up any existing links
echo "3️⃣ Cleaning up existing installations..."
npm unlink -g patchworks 2>/dev/null || true

# 4. Link the package
echo "4️⃣ Linking package globally..."
npm link

# 5. Check if the command is available
echo "5️⃣ Checking global command availability..."
if command -v patchworks >/dev/null 2>&1; then
    echo "✅ patchworks command found in PATH"
    
    # 6. Test the command
    echo "6️⃣ Testing patchworks command..."
    if patchworks --help; then
        echo "✅ patchworks command works!"
    else
        echo "❌ patchworks command fails"
    fi
else
    echo "❌ patchworks command not found in PATH"
    echo "🔍 Diagnostic info:"
    echo "   npm bin -g: $(npm bin -g)"
    echo "   PATH: $PATH"
    echo "   Checking for symlink:"
    ls -la "$(npm bin -g)"/patchworks* 2>/dev/null || echo "   No patchworks symlink found"
fi

# 7. Cleanup
echo "7️⃣ Cleaning up..."
npm unlink -g patchworks

echo "🏁 Test complete!"
