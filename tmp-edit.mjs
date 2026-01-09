import { readFileSync, writeFileSync } from 'fs';
const path = 'app/admin/houses/create/page.tsx';
let text = readFileSync(path, 'utf8');
const pattern = /\{invite\.expires_at && [^]+\}/;
text = text.replace(pattern, "{invite.expires_at && expira }" );
writeFileSync(path, text);
