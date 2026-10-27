import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawDir = path.join(__dirname, '../data/raw');

console.log('Fixing PwD category separation across datasets...');

// ---------------------------------------------------------
// 1. RAJASTHAN FIXES
// ---------------------------------------------------------
const rajPath = path.join(rawDir, 'Rajasthan.json');
let rajData = JSON.parse(fs.readFileSync(rajPath, 'utf8'));

// A. Option 381249: SMS Jaipur MD Dermatology (OBC -> OBC-PwD)
const opt381249 = rajData.find(r => r.id === 381249);
if (opt381249) {
    opt381249.category = 'OBC-PwD';
    console.log('Fixed Option 381249 (SMS Jaipur MD Derm): category set to OBC-PwD');
}

// B. Option 381607: SPMC Bikaner MD General Medicine (OBC -> OBC-PwD)
const opt381607 = rajData.find(r => r.id === 381607);
if (opt381607) {
    opt381607.category = 'OBC-PwD';
    console.log('Fixed Option 381607 (SPMC Bikaner MD Medicine): category set to OBC-PwD');
}

// C. Option 381459: SPMC Bikaner MD Dermatology -> Merge into Option 439822 (OBC-PwD)
const opt381459 = rajData.find(r => r.id === 381459);
const opt439822 = rajData.find(r => r.id === 439822);
if (opt381459 && opt439822) {
    if (opt381459.cr_2025_2) opt439822.cr_2025_2 = opt381459.cr_2025_2;
    if (opt381459.cr_2025_3) opt439822.cr_2025_3 = opt381459.cr_2025_3;
    rajData = rajData.filter(r => r.id !== 381459);
    console.log('Merged Option 381459 2025 cutoffs into Option 439822 (SPMC Bikaner MD Derm OBC-PwD) and removed duplicate 381459');
}

// D. Option 381818: JLMC Ajmer MD General Medicine (OBC -> OBC-PwD)
const opt381818 = rajData.find(r => r.id === 381818);
if (opt381818) {
    opt381818.category = 'OBC-PwD';
    console.log('Fixed Option 381818 (JLMC Ajmer MD Medicine): category set to OBC-PwD');
}

// E. Option 446346: JLMC Ajmer MD Radio Diagnosis (EWS -> EWS-PwD)
const opt446346 = rajData.find(r => r.id === 446346);
if (opt446346) {
    opt446346.category = 'EWS-PwD';
    console.log('Fixed Option 446346 (JLMC Ajmer MD Radio): category set to EWS-PwD');
}

// F. Option 401155: SPMC Bikaner MD General Medicine (MBC -> MBC-PwD)
const opt401155 = rajData.find(r => r.id === 401155);
if (opt401155) {
    opt401155.category = 'MBC-PwD';
    console.log('Fixed Option 401155 (SPMC Bikaner MD Medicine): category set to MBC-PwD');
}

// G. Option 381231: SMS Jaipur MD General Medicine (split cr_2025_1 into MBC-PwD)
const opt381231 = rajData.find(r => r.id === 381231);
if (opt381231 && opt381231.cr_2025_1) {
    const newPwdOpt = JSON.parse(JSON.stringify(opt381231));
    newPwdOpt.id = 880001;
    newPwdOpt.category = 'MBC-PwD';
    delete newPwdOpt.cr_2025_2;
    delete newPwdOpt.cr_2025_3;
    delete opt381231.cr_2025_1;
    rajData.push(newPwdOpt);
    console.log('Split Option 381231 (SMS Jaipur MD Medicine): cr_2025_1 moved to new Option 880001 (MBC-PwD)');
}

// H. Option 397888: SMS Jaipur MD Psychiatry -> Move cr_2025_3 into Option 381563 (GEN-PwD)
const opt397888 = rajData.find(r => r.id === 397888);
const opt381563 = rajData.find(r => r.id === 381563);
if (opt397888 && opt397888.cr_2025_3 && opt381563) {
    opt381563.cr_2025_3 = opt397888.cr_2025_3;
    delete opt397888.cr_2025_3;
    console.log('Moved cr_2025_3 from Option 397888 to Option 381563 (SMS Jaipur MD Psychiatry GEN-PwD)');
}

// I. Option 519241: SPMC Bikaner MD Dermatology (EWS -> EWS-PwD)
const opt519241 = rajData.find(r => r.id === 519241);
if (opt519241) {
    opt519241.category = 'EWS-PwD';
    console.log('Fixed Option 519241 (SPMC Bikaner MD Derm): category set to EWS-PwD');
}

fs.writeFileSync(rajPath, JSON.stringify(rajData, null, 2), 'utf8');
console.log('Saved updated Rajasthan.json successfully.');


// ---------------------------------------------------------
// 2. UTTARAKHAND FIXES
// ---------------------------------------------------------
const ukPath = path.join(rawDir, 'Uttarakhand.json');
let ukData = JSON.parse(fs.readFileSync(ukPath, 'utf8'));

// Doon Medical College MS Orthopaedics Option 518261
const opt518261 = ukData.find(r => r.id === 518261);
if (opt518261 && opt518261.cr_2025_3) {
    const newUkPwdOpt = JSON.parse(JSON.stringify(opt518261));
    newUkPwdOpt.id = 880002;
    newUkPwdOpt.category = 'UR-PwD';
    delete newUkPwdOpt.cr_2025_1;
    delete newUkPwdOpt.cr_2025_2;
    delete opt518261.cr_2025_3;
    ukData.push(newUkPwdOpt);
    fs.writeFileSync(ukPath, JSON.stringify(ukData, null, 2), 'utf8');
    console.log('Split Option 518261 (Doon Medical College MS Ortho): cr_2025_3 moved to new Option 880002 (UR-PwD)');
}

console.log('All PwD category separation fixes completed successfully.');
