const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const isDryRun = process.argv.includes('--dry-run');

console.log(`=== MCC All-India 2026 Round 1 Ingestion ${isDryRun ? '(DRY RUN)' : '(LIVE EXECUTION)'} ===`);

const CSV_PATH = path.join(__dirname, '../data/raw/cutoffs_round_1_2026.csv');
const ALL_INDIA_PATH = path.join(__dirname, '../data/All-India.json');
const RAW_ALL_INDIA_PATH = path.join(__dirname, '../data/raw/All-India.json');
const COURSES_PATH = path.join(__dirname, '../data/processed/courses.json');
const QUOTAS_PATH = path.join(__dirname, '../data/processed/quotas.json');
const INSTITUTES_PATH = path.join(__dirname, '../data/processed/institutes.json');

const csvContent = fs.readFileSync(CSV_PATH, 'utf8');
const records = parse(csvContent, { columns: true, skip_empty_lines: true });

const existingData = JSON.parse(fs.readFileSync(ALL_INDIA_PATH, 'utf8'));
const courses = JSON.parse(fs.readFileSync(COURSES_PATH, 'utf8'));
const quotas = JSON.parse(fs.readFileSync(QUOTAS_PATH, 'utf8'));
const institutes = JSON.parse(fs.readFileSync(INSTITUTES_PATH, 'utf8'));

console.log(`Existing choices count: ${existingData.length}`);
console.log(`New CSV rows count: ${records.length}`);

// 1. Quota Map
const quotaObjMap = new Map();
quotas.forEach(q => quotaObjMap.set(q.id, q));

// 2. Course Mapping logic
const courseObjMap = new Map();
courses.forEach(c => courseObjMap.set(c.id, c));

function mapSpecialization(spec) {
  const s = (spec || '').toUpperCase().replace(/\s+/g, ' ').trim();
  
  if (s.startsWith('(NBEMS-DIPLOMA)')) {
    if (s.includes('ANAESTHESIOLOGY')) return 146;
    if (s.includes('ENT')) return 147;
    if (s.includes('FAMILY MEDICINE')) return 148;
    if (s.includes('OBSTETRICS')) return 149;
    if (s.includes('OPHTHALMOLOGY')) return 150;
    if (s.includes('PAEDIATRICS')) return 151;
    if (s.includes('RADIO DIAGNOSIS') || s.includes('RADIODIAGNOSIS')) return 152;
    if (s.includes('TUBERCULOSIS')) return 153;
    if (s.includes('EMERGENCY MEDICINE')) return 402;
  }

  if (s.startsWith('(NBEMS)')) {
    if (s.includes('ANAESTHESIOLOGY')) return 77;
    if (s.includes('ANATOMY')) return 78;
    if (s.includes('BIOCHEMISTRY')) return 79;
    if (s.includes('CARDIOVASCULAR')) return 80;
    if (s.includes('DERMATOLOGY')) return 81;
    if (s.includes('EMERGENCY')) return 82;
    if (s.includes('FAMILY')) return 83;
    if (s.includes('FORENSIC')) return 84;
    if (s.includes('GENERALMEDICINE') || s.includes('GENERAL MEDICINE')) return 85;
    if (s.includes('GENERALSURGERY') || s.includes('GENERAL SURGERY')) return 86;
    if (s.includes('HOSPITALADMINISTRATION') || s.includes('HOSPITAL ADMINISTRATION')) return 87;
    if (s.includes('IMMUNOHEMATOLOGY') || s.includes('IMMUNO')) return 88;
    if (s.includes('MICROBIOLOGY')) return 89;
    if (s.includes('NEUROSURGERY') || s.includes('NEURO SURGERY')) return 90;
    if (s.includes('NUCLEAR')) return 91;
    if (s.includes('OBSTETRICS')) return 92;
    if (s.includes('OPHTHALMOLOGY')) return 93;
    if (s.includes('ORTHOPAEDICS') || s.includes('ORTHOPEDICS')) return 94;
    if (s.includes('OTORHINOLARYNGOLOGY') || s.includes('ENT')) return 95;
    if (s.includes('PAEDIATRICSURGERY') || s.includes('PAEDIATRIC SURGERY')) return 96;
    if (s.includes('PAEDIATRICS') || s.includes('PEDIATRICS')) return 97;
    if (s.includes('PATHOLOGY')) return 98;
    if (s.includes('PHARMACOLOGY')) return 99;
    if (s.includes('PHYSICALMEDICINE') || s.includes('PHYSICAL MEDICINE')) return 100;
    if (s.includes('PHYSIOLOGY')) return 101;
    if (s.includes('PLASTIC')) return 102;
    if (s.includes('PSYCHIATRY')) return 103;
    if (s.includes('RADIODIAGNOSIS') || s.includes('RADIO-DIAGNOSIS')) return 104;
    if (s.includes('RADIATIONONCOLOGY') || s.includes('RADIATION ONCOLOGY') || s.includes('RADIOTHERAPY')) return 105;
    if (s.includes('RESPIRATORY')) return 106;
    if (s.includes('COMMUNITYMEDICINE') || s.includes('COMMUNITY MEDICINE')) return 108;
    if (s.includes('GERIATRIC')) return 259;
    if (s.includes('PALLIATIVE')) return 155;
  }

  if (s.includes('D.A.') || s.includes('DIPLOMA INANAESTHESIOLOGY') || s.includes('DIPLOMA IN ANAESTHESIOLOGY')) return 1;
  if (s.includes('D.C.H.') || s.includes('PAEDIATRICS (D.C.H.)')) return 3;
  if (s.includes('D.C.P.') || s.includes('CLINICALPATHOLOGY') || s.includes('CLINICAL PATHOLOGY')) return 4;
  if (s.includes('D.D.V.L.') || s.includes('DERMATOLOGY, VENEREOLOGYAND LEPROSY (D.D.V.L.)')) return 6;
  if (s.includes('DIABETOLOGY')) return 7;
  if (s.includes('D.F.M.') || s.includes('FORENSICMEDICINE (D.F.M.)')) return 9;
  if (s.includes('D.H.A.') || s.includes('HEALTHADMINISTRATION')) return 10;
  if (s.includes('D.I.H.B.T.')) return 13;
  if (s.includes('D.G.O.') || s.includes('OBSTETRICS ANDGYNAECOLOGY (D.G.O.)')) return 18;
  if (s.includes('D.O.') || s.includes('OPHTHALMOLOGY(D.O.)')) return 19;
  if (s.includes('D.ORTH.') || s.includes('ORTHOPAEDICS(D.ORTH.)')) return 20;
  if (s.includes('D.L.O.') || s.includes('OTORHINOLARYNGOLOGY(D.L.O.)')) return 21;
  if (s.includes('D.P.M.') || s.includes('PSYCHIATRY(D.P.M.)')) return 23;
  if (s.includes('D.P.H.') || s.includes('PUBLIC HEALTH(D.P.H.)')) return 24;
  if (s.includes('D.R.M.') || s.includes('RADIATION MEDICINE')) return 25;
  if (s.includes('D.M.R.D.') || s.includes('RADIODIAGNOSIS(D.M.R.D.)')) return 27;
  if (s.includes('D.S.M.') || s.includes('SPORT MEDICINE')) return 28;
  if (s.includes('D.T.C.D.') || s.includes('TUBERCULOSISAND CHEST')) return 30;

  if (s.includes('EPIDEMIOLOGY')) return 31;
  if (s.includes('ANAESTHESIOLOGY')) return 32;
  if (s.includes('ANATOMY')) return 34;
  if (s.includes('BIO-CHEMISTRY') || s.includes('BIOCHEMISTRY')) return 37;
  if (s.includes('COMMUNITYHEALTH ADMN') || s.includes('COMMUNITY HEALTH')) return 41;
  if (s.includes('COMMUNITYMEDICINE') || s.includes('SOCIAL ANDPREVENTIVE') || s.includes('SOCIAL AND PREVENTIVE')) return 63;
  if (s.includes('DERMATOLOGY')) return 42;
  if (s.includes('EMERGENCY MEDICINE')) return 43;
  if (s.includes('FAMILY MEDICINE')) return 44;
  if (s.includes('FORENSIC')) return 45;
  if (s.includes('GENERAL MEDICINE')) return 46;
  if (s.includes('GERIATRICS')) return 47;
  if (s.includes('HOSPITALADMINISTRATION') || s.includes('HOSPITAL ADMINISTRATION')) return 48;
  if (s.includes('IMMUNOHAEMATOLOGY') || s.includes('IMMUNO-HAEMATOLOGY') || s.includes('IMMUNOLOGY')) return 49;
  if (s.includes('LABORATORY MEDICINE')) return 50;
  if (s.includes('MICROBIOLOGY')) return 51;
  if (s.includes('NUCLEAR MEDICINE')) return 52;
  if (s.includes('PAEDIATRICS')) return 53;
  if (s.includes('PALLIATIVE')) return 54;
  if (s.includes('PATHOLOGY')) return 55;
  if (s.includes('PHARMACOLOGY')) return 57;
  if (s.includes('PHYSICAL MEDICINE')) return 58;
  if (s.includes('PHYSIOLOGY')) return 59;
  if (s.includes('PSYCHIATRY')) return 60;
  if (s.includes('RADIATION ONCOLOGY') || s.includes('RADIOTHERAPY')) return 61;
  if (s.includes('RADIO-DIAGNOSIS') || s.includes('RADIODIAGNOSIS') || s.includes('RADIOLOGY')) return 62;
  if (s.includes('SPORTS MEDICINE')) return 64;
  if (s.includes('TROPICAL MEDICINE')) return 66;
  if (s.includes('RESPIRATORYMEDICINE') || s.includes('RESPIRATORY MEDICINE') || s.includes('TUBERCULOSIS')) return 67;
  if (s.includes('OTORHINOLARYNGOLOGY') || s.includes('ENT')) return 68;
  if (s.includes('GENERAL SURGERY')) return 69;
  if (s.includes('OBSTETRICS')) return 70;
  if (s.includes('OPHTHALMOLOGY')) return 71;
  if (s.includes('ORTHOPAEDICS')) return 72;
  if (s.includes('TRAUMATOLOGY')) return 73;
  if (s.includes('NEURO SURGERY') || s.includes('NEUROSURGERY')) return 75;

  return null;
}

// 3. Category Mapping
function mapCategory(cat) {
  const c = (cat || '').trim();
  switch (c) {
    case 'Open': return 'GEN';
    case 'OpenPwD':
    case 'Open PwD': return 'GEN-PwD';
    case 'OBC': return 'OBC';
    case 'OBC PwD':
    case 'OBCPwD': return 'OBC-PwD';
    case 'SC': return 'SC';
    case 'SC PwD':
    case 'SCPwD': return 'SC-PwD';
    case 'ST': return 'ST';
    case 'ST PwD':
    case 'STPwD': return 'ST-PwD';
    case 'EWS': return 'EWS';
    case 'EWSPwD':
    case 'EWS PwD': return 'EWS-PwD';
    default: return c;
  }
}

// 4. Quota Mapping
function mapQuota(quotaStr, courseId) {
  const q = (quotaStr || '').trim();
  switch (q) {
    case 'All India': return quotaObjMap.get(1);
    case 'Self-Financed MeritSeat': return quotaObjMap.get(2);
    case 'Muslim MinorityQuota': return quotaObjMap.get(3);
    case 'Jain Minority Quota': return quotaObjMap.get(4);
    case 'Non-Resident Indian': return quotaObjMap.get(5);
    case 'Delhi UniversityQuota': return quotaObjMap.get(6);
    case 'IP University Quota': return quotaObjMap.get(7);
    case 'Banaras HinduUniversity': return quotaObjMap.get(8);
    case 'Aligarh MuslimUniversity': return quotaObjMap.get(9);
    case 'DNB Quota': {
      if ([146, 147, 148, 149, 150, 151, 152, 153, 402].includes(courseId)) {
        return quotaObjMap.get(146); // NBE Diploma
      }
      return quotaObjMap.get(145); // DNB Post MBBS
    }
    default: return quotaObjMap.get(1);
  }
}

// 5. Institute Mapping Engine
function normName(s) {
  return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

const stopWords = new Set([
  'medical', 'college', 'hospital', 'institute', 'sciences', 'science', 'research',
  'centre', 'center', 'university', 'general', 'memorial', 'govt', 'government',
  'and', 'the', 'for', 'ltd', 'limited', 'pvt', 'private', 'dr', 'shri', 'sri',
  'state', 'autonomous', 'society', 'allied', 'postgraduate', 'education'
]);

function getTokens(str) {
  return (str || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b([a-z])\s+([a-z])\b/g, '$1$2')
    .replace(/medial/g, 'medical')
    .trim()
    .split(/\s+/)
    .filter(t => t.length > 2 && !stopWords.has(t));
}

function extractPin(s) {
  const m = (s || '').match(/\b([1-9][0-9]{5})\b/);
  return m ? m[1] : null;
}

const stateList = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
  'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
  'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
  'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
  'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Delhi', 'Puducherry', 'Chandigarh', 'Jammu and Kashmir', 'Ladakh'
];

function extractState(csvCol) {
  const parts = csvCol.split(',').map(p => p.trim());
  for (let p of parts) {
    for (let st of stateList) {
      if (p.toLowerCase().includes(st.toLowerCase())) return st;
    }
  }
  return null;
}

const instList = institutes.map(inst => {
  const parts = inst.name.split(',').map(p => p.trim());
  return {
    inst,
    id: inst.id,
    name: inst.name,
    normName: normName(inst.name),
    firstPart: parts[0],
    normFirst: normName(parts[0]),
    pin: extractPin(inst.name),
    firstTokens: getTokens(parts[0]),
    allTokens: getTokens(inst.name),
    state: inst.state
  };
});

const KNOWN_INST_ALIASES = new Map([
  ['all india institute of physical med and rehabilitation mumbai', 253],
  ['bhopal memorial hospital research centre', 418],
  ['north eastern indira gandhi regional instt of health and medical sciences', 257],
  ['sbks medical instt research centre', 87],
  ['veer chandra singh garhwali govt medical sc research instt', 367],
  ['apollo multispecialty hospitals limited', 465],
  ['regional instt of opthalmology previously known asnehru instt of opthalmo', 387],
  ['aster narayanadri hospital', 5149],
  ['dr anji reddy super specialities hospital', 5200],
  ['coimbatore childtrust hospitals pvt ltd', 3118],
  ['neotia getwel a unit of ambuja neotia healtcare venture limited uttorayon', 1500],
  ['yashwant rao chavan memorial hospital', 1373],
  ['apollosage hospital', 6210],
  ['the childrens hospital', 6389]
]);

const collegeCache = new Map();

function matchInstitute(csvCol) {
  if (collegeCache.has(csvCol)) return collegeCache.get(csvCol);

  const parts = csvCol.split(',').map(p => p.trim());
  const cFirst = parts[0];
  const cNormFirst = normName(cFirst);
  const cPin = extractPin(csvCol);
  const cAllTokens = getTokens(csvCol);
  const cFirstTokens = getTokens(cFirst);
  const cState = extractState(csvCol);

  // Check aliases
  for (let [aliasKey, targetId] of KNOWN_INST_ALIASES.entries()) {
    if (cNormFirst.includes(aliasKey) || aliasKey.includes(cNormFirst)) {
      const found = institutes.find(i => i.id === targetId);
      if (found) {
        collegeCache.set(csvCol, found);
        return found;
      }
    }
  }

  if (cFirstTokens.length === 0) {
    collegeCache.set(csvCol, null);
    return null;
  }

  let bestInst = null;
  let bestScore = 0;

  for (let item of instList) {
    if (cState && item.state && cState.toLowerCase() !== item.state.toLowerCase()) {
      continue;
    }

    let score = 0;

    // 1. PINCODE EXACT MATCH
    if (cPin && item.pin && cPin === item.pin) {
      let nameOverlap = 0;
      for (let t of item.firstTokens) {
        if (cFirstTokens.includes(t)) nameOverlap++;
      }
      if (nameOverlap >= 1 || item.normFirst === cNormFirst) {
        score = 1000 + (nameOverlap * 10);
      }
    }

    // 2. NAME + LOCATION TOKENS OVERLAP
    if (score === 0) {
      let nameOverlap = 0;
      for (let t of item.firstTokens) {
        if (cFirstTokens.includes(t)) nameOverlap++;
      }
      const nameRatio = nameOverlap / Math.max(item.firstTokens.length, cFirstTokens.length);

      if (nameRatio >= 0.75 || item.normFirst === cNormFirst) {
        let locOverlap = 0;
        for (let t of item.allTokens) {
          if (cAllTokens.includes(t)) locOverlap++;
        }
        score = (nameRatio * 100) + (locOverlap * 10);
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestInst = item.inst;
    }
  }

  const result = bestScore >= 80 ? bestInst : null;
  collegeCache.set(csvCol, result);
  return result;
}

let maxOptionId = existingData.reduce((max, d) => Math.max(max, d.id || 0), 0);
let maxInstId = institutes.reduce((max, i) => Math.max(max, i.id || 0), 0);

console.log(`Current max option ID: ${maxOptionId}`);
console.log(`Current max institute ID: ${maxInstId}`);

// Build fast lookup map for existing choices
// Key: `${instituteId}_${courseId}_${quotaId}_${category}`
const choiceLookup = new Map();
existingData.forEach(choice => {
  if (choice.institute && choice.course && choice.quota && choice.category) {
    const key = `${choice.institute.id}_${choice.course.id}_${choice.quota.id}_${choice.category}`;
    choiceLookup.set(key, choice);
  }
});

let matchedChoicesCount = 0;
let newChoicesCount = 0;
let newInstitutesCreated = 0;
const newlyCreatedInstitutes = new Map();

// Group multiple allotments in CSV for the same choice
// Key: `${instId}_${courseId}_${quotaId}_${category}` -> array of closing ranks
const choiceRanksMap = new Map();

records.forEach(row => {
  const courseId = mapSpecialization(row.specialization);
  const category = mapCategory(row.category);
  const quota = mapQuota(row.quota, courseId);
  const course = courseObjMap.get(courseId);

  let inst = matchInstitute(row.college);

  if (!inst) {
    if (newlyCreatedInstitutes.has(row.college)) {
      inst = newlyCreatedInstitutes.get(row.college);
    } else {
      maxInstId++;
      const firstPart = row.college.split(',')[0].trim();
      const st = extractState(row.college);
      inst = {
        id: maxInstId,
        name: firstPart,
        short_name: firstPart.substring(0, 35),
        state: st,
        district: null,
        logo_url: null
      };
      newlyCreatedInstitutes.set(row.college, inst);
      newInstitutesCreated++;
    }
  }

  const key = `${inst.id}_${courseId}_${quota.id}_${category}`;
  const rank = parseInt(row.closing_rank, 10);

  if (!choiceRanksMap.has(key)) {
    choiceRanksMap.set(key, {
      inst,
      course,
      quota,
      category,
      ranks: []
    });
  }
  choiceRanksMap.get(key).ranks.push(rank);
});

// Now apply cutoffs to existing or new choices
for (let [key, choiceMeta] of choiceRanksMap.entries()) {
  const { inst, course, quota, category, ranks } = choiceMeta;
  
  // Closing rank is the maximum rank number (last admitted candidate)
  const closingRank = Math.max(...ranks);
  const allotmentsCount = ranks.length;

  const cr_2026_1 = {
    value: `${closingRank}(${allotmentsCount})`,
    session: '2026',
    round: '1',
    closing_rank: closingRank,
    counselling_rank: closingRank,
    ai_rank: closingRank,
    allotments_count: allotmentsCount,
    inservice_candidate: false,
    candidate_flag: null
  };

  if (choiceLookup.has(key)) {
    const existingChoice = choiceLookup.get(key);
    existingChoice.cr_2026_1 = cr_2026_1;
    matchedChoicesCount++;
  } else {
    maxOptionId++;
    const newChoice = {
      id: maxOptionId,
      state: inst.state,
      institute: {
        id: inst.id,
        name: inst.name,
        short_name: inst.short_name,
        logo_url: inst.logo_url,
        district: inst.district
      },
      course: {
        id: course.id,
        name: course.name,
        short_name: course.short_name
      },
      quota: {
        id: quota.id,
        name: quota.name,
        short_name: quota.short_name,
        tooltip_content: null,
        tooltip_content_html: null,
        master_quota: quota.master_quota
      },
      category: category,
      counselling: {
        id: 1,
        name: 'All India Counseling - PG Medical',
        short_name: 'All India PG'
      },
      cr_2026_1: cr_2026_1,
      fee_id: null,
      fee: null,
      stipend_year_1: null,
      bond_years: null,
      bond_penalty: null,
      beds: null,
      choice_list_count: 0
    };

    existingData.push(newChoice);
    choiceLookup.set(key, newChoice);
    newChoicesCount++;
  }
}

const totalAllotmentsAccountedFor = Array.from(choiceRanksMap.values()).reduce((sum, meta) => sum + meta.ranks.length, 0);

console.log('--- INGESTION RESULTS ---');
console.log(`Matched existing choices updated with cr_2026_1: ${matchedChoicesCount}`);
console.log(`New choices created with cr_2026_1: ${newChoicesCount}`);
console.log(`Total unique 2026 Round 1 choices: ${matchedChoicesCount + newChoicesCount}`);
console.log(`Total 2026 Round 1 allotments accounted for: ${totalAllotmentsAccountedFor} (Expected: ${records.length})`);
console.log(`New institutes created: ${newInstitutesCreated}`);
console.log(`Final total choices in dataset: ${existingData.length}`);

if (!isDryRun) {
  const backupPath = path.join(__dirname, '../data/All-India.backup-pre-2026.json');
  const rawBackupPath = path.join(__dirname, '../data/raw/All-India.backup-pre-2026.json');
  console.log(`Writing safety backups to ${backupPath}...`);
  fs.copyFileSync(ALL_INDIA_PATH, backupPath);
  fs.copyFileSync(RAW_ALL_INDIA_PATH, rawBackupPath);

  console.log(`Saving updated dataset to ${ALL_INDIA_PATH} and ${RAW_ALL_INDIA_PATH}...`);
  fs.writeFileSync(ALL_INDIA_PATH, JSON.stringify(existingData, null, 2));
  fs.writeFileSync(RAW_ALL_INDIA_PATH, JSON.stringify(existingData, null, 2));
  console.log('✓ Successfully wrote updated data files.');
} else {
  console.log('Dry run complete. No files were modified.');
}
