#!/bin/bash

echo "Analyzing code lines..."
echo

# Find all TypeScript/JavaScript files and count their lines
find . -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) \
  -not -path "*/node_modules/*" \
  -not -path "*/dist/*" \
  -not -path "*/coverage/*" \
  -not -path "*/.next/*" \
  -not -path "*/build/*" | while read -r file; do
  lines=$(wc -l < "$file")
  echo "$lines $file"
done | sort -nr > temp_analysis.txt

echo "Files that should be split (more than 1000 lines):"
echo "================================================"
awk '$1 > 1000 {printf "\033[31m%-6s lines: %s\033[0m\n", $1, $2}' temp_analysis.txt
echo

echo "Top 10 files by line count (excluding generated files):"
echo "===================================================="
echo "Note: Consider splitting files over 300 lines for better maintainability"
echo
awk '{
  if ($1 > 300) {
    printf "\033[33m%-6s lines: %s\033[0m\n", $1, $2
  } else {
    printf "%-6s lines: %s\n", $1, $2
  }
}' temp_analysis.txt | head -n 10
echo
echo "Color legend:"
echo "  \033[31mRed\033[0m: Must be split (>1000 lines)"
echo "  \033[33mYellow\033[0m: Consider splitting (>300 lines)"
echo "  Normal: OK"

# Cleanup
rm temp_analysis.txt 