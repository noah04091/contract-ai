#!/usr/bin/env python3
"""
Script to remove Feed, Notifications, Benchmarking, and External (Gesetzessuche) tabs
from LegalPulse.tsx contract detail view.
"""

import re

# Read the file
with open(r'frontend\src\pages\LegalPulse.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Step 1: Update the activeTab type definition
# Remove 'feed', 'external', 'benchmarking', 'notifications' from the type
content = re.sub(
    r"const \[activeTab, setActiveTab\] = useState<'overview' \| 'risks' \| 'recommendations' \| 'history' \| 'feed' \| 'external' \| 'benchmarking' \| 'forecast' \| 'notifications'>\('overview'\);",
    r"const [activeTab, setActiveTab] = useState<'overview' | 'risks' | 'recommendations' | 'history' | 'forecast'>('overview');",
    content
)

# Step 2: Remove Feed tab button (lines ~759-768)
content = re.sub(
    r'          <button\s+className=\{`\$\{styles\.tabButton\} \$\{activeTab === \'feed\' \? styles\.active : \'\'\}`\}\s+onClick=\{\(\) => setActiveTab\(\'feed\'\)\}\s+>\s+<svg[^>]*>.*?</svg>\s+Live Feed[^<]*\{feedEvents\.length > 0 && `\(\$\{feedEvents\.length\}\)`\}\s+\{feedConnected && <span className=\{styles\.liveDot\}></span>\}\s+</button>\s+',
    '',
    content,
    flags=re.DOTALL
)

# Step 3: Remove External/Gesetzessuche tab button (lines ~769-777)
content = re.sub(
    r'          <button\s+className=\{`\$\{styles\.tabButton\} \$\{activeTab === \'external\' \? styles\.active : \'\'\}`\}\s+onClick=\{\(\) => setActiveTab\(\'external\'\)\}\s+>\s+<svg[^>]*>.*?</svg>\s+Gesetzessuche\s+</button>\s+',
    '',
    content,
    flags=re.DOTALL
)

# Step 4: Remove Benchmarking tab button (lines ~778-787)
content = re.sub(
    r'          <button\s+className=\{`\$\{styles\.tabButton\} \$\{activeTab === \'benchmarking\' \? styles\.active : \'\'\}`\}\s+onClick=\{\(\) => setActiveTab\(\'benchmarking\'\)\}\s+>\s+<svg[^>]*>.*?</svg>\s+Markt-Benchmark\s+</button>\s+',
    '',
    content,
    flags=re.DOTALL
)

# Step 5: Remove Notifications tab button (lines ~797-806)
content = re.sub(
    r'          <button\s+className=\{`\$\{styles\.tabButton\} \$\{activeTab === \'notifications\' \? styles\.active : \'\'\}`\}\s+onClick=\{\(\) => setActiveTab\(\'notifications\'\)\}\s+>\s+<svg[^>]*>.*?</svg>\s+Benachrichtigungen\s+</button>\s+',
    '',
    content,
    flags=re.DOTALL
)

# Step 6: Remove Feed tab content
content = re.sub(
    r'          \{activeTab === \'feed\' && \(\s+<div className=\{styles\.feedTab\}>.*?</div>\s+\)\}\s+',
    '',
    content,
    flags=re.DOTALL
)

# Step 7: Remove Benchmarking tab content (large section with Market Overview Cards, etc.)
content = re.sub(
    r'          \{activeTab === \'benchmarking\' && \(\s+<div className=\{styles\.benchmarkingTab\}>.*?</div>\s+\)\}\s+',
    '',
    content,
    flags=re.DOTALL
)

# Step 8: Remove Notifications tab content
content = re.sub(
    r'          \{activeTab === \'notifications\' && \(\s+<div className=\{styles\.notificationsTab\}>.*?</div>\s+\)\}\s+',
    '',
    content,
    flags=re.DOTALL
)

# Step 9: Remove External/Gesetzessuche tab content (very large section with search form, filters, results)
content = re.sub(
    r'          \{activeTab === \'external\' && \(\s+<div className=\{styles\.externalTab\}>.*?</div>\s+\)\}\s+',
    '',
    content,
    flags=re.DOTALL
)

# Write the modified content back
with open(r'frontend\src\pages\LegalPulse.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Successfully removed Feed, Notifications, Benchmarking, and Gesetzessuche tabs!")
print("  - Updated activeTab type definition")
print("  - Removed 4 tab buttons")
print("  - Removed 4 tab content sections")
