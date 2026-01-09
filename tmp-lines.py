from pathlib import Path
lines = Path('app/admin/onboarding/page.tsx').read_text(encoding='utf-8').splitlines()
for i,line in enumerate(lines, 1):
    if 'accept' in line.lower():
        print(i, line)
