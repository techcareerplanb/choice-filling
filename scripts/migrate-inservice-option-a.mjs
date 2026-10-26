import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, '../data/raw');
const backupDir = path.join(__dirname, '../data/backups/raw_before_inservice_split');

if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.json') && !f.includes('seat_matrix') && !f.startsWith('All-India'));

console.log(`Starting In-Service Option A separation across ${files.length} state datasets...`);

function isCutoffInservice(co, qName, optId, k) {
    if (!co) return false;
    if (co.candidate_flag === 'inservice_candidate') return true;
    if (co.candidate_flag && typeof co.candidate_flag === 'string' && co.candidate_flag.toLowerCase().includes('inservice')) return true;
    if (co.inservice_candidate === true) return true;
    if (qName && (qName.toLowerCase().includes('inservice') || qName.toLowerCase().includes('in-service') || qName.toLowerCase().includes('in service'))) return true;
    // Known unflagged in Rajasthan 2025:
    if (optId === 381398 && (k === 'cr_2025_2' || k === 'cr_2025_3')) return true;
    if (optId === 398067 && (k === 'cr_2025_2' || k === 'cr_2025_3')) return true;
    if (optId === 397778 && k === 'cr_2025_1') return true;
    return false;
}

function getInserviceQuota(origQuota) {
    if (!origQuota) return origQuota;
    const qName = origQuota.name || '';
    if (qName.toLowerCase().includes('inservice') || qName.toLowerCase().includes('in-service') || qName.toLowerCase().includes('in service')) {
        return origQuota; // already in-service
    }
    const id = origQuota.id ? origQuota.id + 8000 : 8999;
    const name = origQuota.name + ' (In-Service)';
    const short_name = (origQuota.short_name || origQuota.name) + ' (In-Service)';
    const master_quota = origQuota.master_quota || origQuota.name;
    return {
        id,
        name,
        short_name,
        tooltip_content: origQuota.tooltip_content || null,
        tooltip_content_html: origQuota.tooltip_content_html || null,
        master_quota
    };
}

let totalOriginalOptions = 0;
let totalSplitOptions = 0;
let totalPureInserviceOptions = 0;
let totalPureDirectOptions = 0;
let totalTransformedOptions = 0;

let nextGlobalOptionId = 800000;

for (const file of files) {
    const filePath = path.join(rawDir, file);
    const backupFilePath = path.join(backupDir, file);

    // Backup original
    fs.copyFileSync(filePath, backupFilePath);

    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    totalOriginalOptions += raw.length;

    let splitCount = 0;
    let pureInserviceCount = 0;
    let pureDirectCount = 0;

    const transformed = [];

    for (const item of raw) {
        const qName = item.quota?.name || '';
        const inKeys = [];
        const directKeys = [];

        Object.keys(item).forEach(k => {
            if (k.startsWith('cr_') && item[k]) {
                if (isCutoffInservice(item[k], qName, item.id, k)) {
                    inKeys.push(k);
                } else {
                    directKeys.push(k);
                }
            }
        });

        if (inKeys.length > 0 && directKeys.length > 0) {
            // Mixed option: split into Direct and In-Service options
            splitCount++;

            // 1. Pure Direct Option (retains original ID)
            const directItem = JSON.parse(JSON.stringify(item));
            inKeys.forEach(k => delete directItem[k]);
            directKeys.forEach(k => {
                directItem[k].inservice_candidate = false;
            });
            transformed.push(directItem);

            // 2. Pure In-Service Option (gets new unique ID & In-Service Quota)
            const inItem = JSON.parse(JSON.stringify(item));
            directKeys.forEach(k => delete inItem[k]);
            inItem.id = nextGlobalOptionId++;
            inItem.quota = getInserviceQuota(item.quota);
            inKeys.forEach(k => {
                inItem[k].inservice_candidate = true;
                if (!inItem[k].candidate_flag) inItem[k].candidate_flag = 'inservice_candidate';
            });
            transformed.push(inItem);

        } else if (inKeys.length > 0) {
            // Pure In-Service Option
            pureInserviceCount++;
            const inItem = JSON.parse(JSON.stringify(item));
            inItem.quota = getInserviceQuota(item.quota);
            inKeys.forEach(k => {
                inItem[k].inservice_candidate = true;
                if (!inItem[k].candidate_flag) inItem[k].candidate_flag = 'inservice_candidate';
            });
            transformed.push(inItem);

        } else {
            // Pure Direct Option
            pureDirectCount++;
            const directItem = JSON.parse(JSON.stringify(item));
            directKeys.forEach(k => {
                directItem[k].inservice_candidate = false;
            });
            transformed.push(directItem);
        }
    }

    totalSplitOptions += splitCount;
    totalPureInserviceOptions += pureInserviceCount;
    totalPureDirectOptions += pureDirectCount;
    totalTransformedOptions += transformed.length;

    // Overwrite the raw JSON file
    fs.writeFileSync(filePath, JSON.stringify(transformed, null, 2), 'utf8');

    console.log(`[${file}] Original: ${raw.length} | Split: ${splitCount} | Pure In-Service: ${pureInserviceCount} | Pure Direct: ${pureDirectCount} | Final: ${transformed.length}`);
}

console.log('\n======================================================');
console.log('MIGRATION SUMMARY');
console.log(`Total Original Options Across States: ${totalOriginalOptions}`);
console.log(`Total Mixed Options Split:            ${totalSplitOptions}`);
console.log(`Total Pure In-Service Options:        ${totalPureInserviceOptions + totalSplitOptions}`);
console.log(`Total Pure Direct Options:            ${totalPureDirectOptions + totalSplitOptions}`);
console.log(`Total Final Options Across States:    ${totalTransformedOptions}`);
console.log('======================================================');
