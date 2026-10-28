import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { execFileSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.join(__dirname, '..');
const RAW_DIR = path.join(ROOT_DIR, 'data/raw');
const PROCESSED_DIR = path.join(ROOT_DIR, 'data/processed');

console.log('=== Ingesting 2026 Seat Matrices for Rajasthan & Uttar Pradesh ===\n');

function clean(s) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

// ============================================================================
// 1. RAJASTHAN INGESTION
// ============================================================================
console.log('--- Processing Rajasthan ---');

const rajCsvPath = path.join(RAW_DIR, 'rajasthan_seat_matrix_round_1_2026.csv');
const rajRawPath = path.join(RAW_DIR, 'Rajasthan.json');
const rajCsv = parse(fs.readFileSync(rajCsvPath, 'utf8'), { columns: true, skip_empty_lines: true });
const rajRaw = JSON.parse(fs.readFileSync(rajRawPath, 'utf8'));

const RAJ_COLLEGE_MAP = {
    [clean("Dr SNMC Jodhpur")]: 287,
    [clean("GMC Kota")]: 285,
    [clean("JLN MC Ajmer")]: 288,
    [clean("RNT MC Udaipur")]: 282,
    [clean("SMS MC Jaipur")]: 284,
    [clean("SPMC Bikaner")]: 283,
    [clean("RUHS CMS Jaipur")]: 293,
    [clean("GMC Bhilwara")]: 3445,
    [clean("GMC Pali")]: 3428,
    [clean("JMC Jhalawar")]: 286,
    [clean("ESIC Alwar")]: 6136,
    [clean("GMC Bharatpur")]: 3424,
    [clean("GMC Churu")]: 3425,
    [clean("GMC Dungarpur")]: 3426,
    [clean("Govt DH Kekri")]: 1437,
    [clean("GH Barmer")]: 754,
    [clean("Govt Amrit Kaur Hosp Beawar Dist Ajmer")]: 769,
    [clean("Govt Mahatma Gandhi DH Banswara")]: 773,
    [clean("MGH Bhilwara")]: 922,
    [clean("Govt DH Bundi")]: 730,
    [clean("SSG Govt DH Chittorgarh")]: 1186,
    [clean("Govt. DB General DH Churu")]: 771,
    [clean("DH Dholpur")]: 622,
    [clean("GMC & Assoc. Hosp. Dungarpur")]: 761,
    [clean("Govt Dist civil Hosp Sri Ganganagar")]: 772,
    [clean("MGH Govt DH Hanumangarh Town")]: 964,
    [clean("General Hospital, Jalore")]: 1436,
    [clean("Govt BDK Hosp Jhunjhunu")]: 770,
    [clean("GH Karauli")]: 710,
    [clean("JLN Govt Dist. Hosp. Nagaur")]: 838,
    [clean("DH Pratapgarh")]: 630,
    [clean("RK Govt District Hospital Rajsamand")]: 1049,
    [clean("GH Sawai Madhopur")]: 742,
    [clean("SK Hospital Sikar")]: 1087,
    [clean("GH Sirohi")]: 629,
    [clean("Govt Dist Sadat Hosp. Tonk")]: 1438,
    [clean("Rajiv Gandhi Govt. GH Alwar")]: 1065,
    [clean("Govt. RDBP Jaipuria Hospital, Jaipur")]: 777,
    [clean("Pacific Medical College & Hospital, Udaipur")]: 291,
    [clean("Pacific Institute of Medical Sciences, Umarda, Udaipur")]: 290,
    [clean("Mahatma Gandhi Medical College and Hospital, Jaipur")]: 289,
    [clean("National Institute of Medical Sciences & Research, (NIMS) Jaipur")]: 295,
    [clean("Jaipur National University Institute of Medical Sciences and Resarch Centre, Jaipur")]: 292,
    [clean("Geetanjali Medical College & Hospital, Udaipur")]: 294,
    [clean("Dr S S Tantia Medical College Hospital & Research Centre, Sri Ganganagar")]: 5749,
    [clean("Ananta Institute of Medical Sciences & Research Centre, Rajsamand")]: 1346,
    [clean("American International Institute of Medical Sciences, Bedwas")]: 1345
};

const RAJ_COURSE_MAP = {
    "DNB Emergency Medicine": 82,
    "MD (ANAESTHESIOLOGY)": 32,
    "MD (BIOCHEMISTRY)": 37,
    "MD (EMERGENCY MEDICINE)": 43,
    "MD (FAMILY MEDICINE)": 44,
    "MD (FORENSIC MEDICINE)": 45,
    "MD (GENERAL MEDICINE)": 46,
    "MD (GERIATRICS/GERIATRIC MEDICINE)": 47,
    "MD (HOSPITAL ADMINISTRATION)": 48,
    "MD (IMMUNOHAEMATOLOGY & BLOOD TRANSFUSION/ TRANSFUSION MEDICINE)": 49,
    "MD (LABORATORY MEDICINE)": 50,
    "MD (MICROBIOLOGY)": 51,
    "MD (NUCLEAR MEDICINE)": 52,
    "MD (PAEDIATRICS)": 53,
    "MD (PALLIATIVE MEDICINE)": 54,
    "MD (PATHOLOGY)": 55,
    "MD (PHARMACOLOGY)": 57,
    "MD (PHYSICAL MED. & REHABILITATION)": 58,
    "MD (PHYSIOLOGY)": 59,
    "MD (PREVENTIVE & SOCIAL MEDICINE (PSM)/ COMMUNITY MEDICINE)": 63,
    "MD (PSYCHIATRY)": 60,
    "MD (RADIO-DIAGNOSIS/ RADIOLOGY)": 62,
    "MD (RADIOTHERAPY/ RADIATION ONCOLOGY)": 61,
    "MD (RESPIRATORY MEDICINE/T.B. & CHEST/ TUBERCULOSIS & RESPIRATORY DISEASES)": 67,
    "MD (SKIN & V.D./DERMATOLOGY VEN. & LEPROSY)": 42,
    "MD (TROPICAL MEDICINE)": 66,
    "MD/MS (ANATOMY)": 34,
    "MS (E.N.T./ OTORHINOLARYNGOLOGY)": 68,
    "MS (GENERAL SURGERY)": 69,
    "MS (OBSTETRICS & GYNAECOLOGY)": 70,
    "MS (OPHTHALMOLOGY)": 71,
    "MS (ORTHOPAEDICS)": 72,
    "MS (TRAUMATOLOGY & SURGERY)": 73,
    "Post MBBS Diploma Anaesthesia": 146,
    "Post MBBS Diploma ENT": 147,
    "Post MBBS Diploma Family Medicine": 148,
    "Post MBBS Diploma Obs & Gyne": 149,
    "Post MBBS Diploma Ophthalmology": 150,
    "Post MBBS Diploma Paediatrics": 151,
    "Post MBBS Diploma TB & Chest": 153
};

function getRajQuota(collegeType, quotaName) {
    if (collegeType === 'Government') {
        return {
            id: 106,
            name: 'Rajasthan Govt Seats - Govt Quota',
            short_name: 'RAJ Govt - Govt Quota',
            tooltip_content: null,
            tooltip_content_html: null,
            master_quota: 'Rajasthan Govt Seats'
        };
    }
    if (collegeType === 'RUHS-CMS' || collegeType === 'Society') {
        if (quotaName.includes('Management')) {
            return {
                id: 506,
                name: 'Rajasthan Govt Seats - Management Quota',
                short_name: 'RAJ Govt - Mgmt Quota',
                tooltip_content: null,
                tooltip_content_html: null,
                master_quota: 'Rajasthan Govt Seats'
            };
        }
        return {
            id: 106,
            name: 'Rajasthan Govt Seats - Govt Quota',
            short_name: 'RAJ Govt - Govt Quota',
            tooltip_content: null,
            tooltip_content_html: null,
            master_quota: 'Rajasthan Govt Seats'
        };
    }
    if (collegeType === 'Private') {
        if (quotaName === 'All India Nature') {
            return {
                id: 107,
                name: 'Rajasthan Private Seats - All India (Eligibility)',
                short_name: 'RAJ Priv-All India',
                tooltip_content: null,
                tooltip_content_html: null,
                master_quota: 'Rajasthan Private Seats'
            };
        }
        if (quotaName === 'State Quota') {
            return {
                id: 108,
                name: 'Rajasthan Private Seats - Govt Quota',
                short_name: 'RAJ Priv-Govt Quota',
                tooltip_content: null,
                tooltip_content_html: null,
                master_quota: 'Rajasthan Private Seats'
            };
        }
        if (quotaName === 'Management Quota') {
            return {
                id: 109,
                name: 'Rajasthan Private Seats - Management Quota',
                short_name: 'RAJ Priv-Mgmt Quota',
                tooltip_content: null,
                tooltip_content_html: null,
                master_quota: 'Rajasthan Private Seats'
            };
        }
    }
    if (collegeType === 'Government Hospital') {
        return {
            id: 178,
            name: 'Rajasthan DNB Inservice Seats',
            short_name: 'Raj DNB Serv',
            tooltip_content: null,
            tooltip_content_html: null,
            master_quota: 'Rajasthan DNB Inservice Seats'
        };
    }
    return null;
}

// Templates from existing raw
const rajInstMap = new Map();
const rajCourseMap = new Map();
const rajExistingKeys = new Set();
const rajOptionMap = new Map();

let rajMaxId = 0;
rajRaw.forEach(r => {
    if (r.id > rajMaxId) rajMaxId = r.id;
    if (r.institute && !rajInstMap.has(r.institute.id)) {
        rajInstMap.set(r.institute.id, r.institute);
    }
    if (r.course && !rajCourseMap.has(r.course.id)) {
        rajCourseMap.set(r.course.id, r.course);
    }
    const key = `${r.institute?.id}_${r.course?.id}_${r.quota?.id}_${r.category}`;
    rajExistingKeys.add(key);

    const tripletKey = `${r.institute?.id}_${r.course?.id}_${r.quota?.id}`;
    if (!rajOptionMap.has(tripletKey)) {
        rajOptionMap.set(tripletKey, r.id);
    }
});

console.log(`Rajasthan Max existing ID: ${rajMaxId}`);

// Ingest new options into raw and build seat matrix
const rajSeatMatrix = [];
let rajNextId = rajMaxId + 1;
let rajNewOptionsCount = 0;

rajCsv.forEach(r => {
    const instId = RAJ_COLLEGE_MAP[clean(r.college)];
    const courseId = RAJ_COURSE_MAP[r.course.trim()];
    const quotaObj = getRajQuota(r.college_type, r.quota);
    const seats = parseInt(r.seats, 10) || 0;

    if (!instId || !courseId || !quotaObj) {
        console.warn(`[WARN] Skipping unmatched row in Rajasthan CSV: ${r.college} | ${r.course}`);
        return;
    }

    const tripletKey = `${instId}_${courseId}_${quotaObj.id}`;
    const choiceKey = `${tripletKey}_GEN`;

    let optId = rajOptionMap.get(tripletKey) || null;

    if (!rajExistingKeys.has(choiceKey)) {
        // Need to create new choice option
        optId = rajNextId++;
        rajOptionMap.set(tripletKey, optId);
        rajExistingKeys.add(choiceKey);

        const sampleOfInst = rajRaw.find(x => x.institute?.id === instId);

        const newChoice = {
            id: optId,
            state: "Rajasthan",
            institute: rajInstMap.get(instId) || { id: instId, name: r.college, short_name: r.college, logo_url: null, district: null },
            course: rajCourseMap.get(courseId) || { id: courseId, name: r.course, short_name: r.course },
            quota: quotaObj,
            category: "GEN",
            counselling: { id: 25, name: "Rajasthan - PG Medical", short_name: "RJSTHN PG" },
            fee_id: sampleOfInst?.fee_id || null,
            fee: sampleOfInst?.fee || null,
            stipend_year_1: sampleOfInst?.stipend_year_1 || null,
            bond_years: sampleOfInst?.bond_years || null,
            bond_penalty: sampleOfInst?.bond_penalty || null,
            beds: sampleOfInst?.beds || "-",
            choice_list_count: 0
        };

        rajRaw.push(newChoice);
        rajNewOptionsCount++;
    }

    // Build seat matrix entry
    rajSeatMatrix.push({
        optionId: optId,
        instituteId: instId,
        courseId: courseId,
        quotaId: quotaObj.id,
        instituteCode: "",
        instituteName: r.college,
        programRaw: r.course,
        totalSeats: seats,
        categorySeats: {
            "1": seats // GEN / OPEN fallback
        },
        year: 2026,
        round: 1,
        sourceType: r.quota,
        source: "Rajasthan State Counselling"
    });
});

console.log(`Added ${rajNewOptionsCount} new choice options to Rajasthan. Total choices now: ${rajRaw.length}`);
console.log(`Created ${rajSeatMatrix.length} seat matrix records for Rajasthan.`);

// Save Rajasthan raw & seat matrix
fs.writeFileSync(rajRawPath, JSON.stringify(rajRaw, null, 2), 'utf8');
const rajSmDir = path.join(PROCESSED_DIR, 'Rajasthan');
if (!fs.existsSync(rajSmDir)) fs.mkdirSync(rajSmDir, { recursive: true });
fs.writeFileSync(path.join(rajSmDir, 'seat-matrix-2026.json'), JSON.stringify(rajSeatMatrix, null, 2), 'utf8');
console.log('Saved data/raw/Rajasthan.json and data/processed/Rajasthan/seat-matrix-2026.json\n');


// ============================================================================
// 2. UTTAR PRADESH INGESTION
// ============================================================================
console.log('--- Processing Uttar Pradesh ---');

const upCsvPath = path.join(RAW_DIR, 'up_seat_matrix_round_1_2026.csv');
const upRawPath = path.join(RAW_DIR, 'Uttar pradesh.json');
const upCsv = parse(fs.readFileSync(upCsvPath, 'utf8'), { columns: true, skip_empty_lines: true });
const upRaw = JSON.parse(fs.readFileSync(upRawPath, 'utf8'));

const UP_EXACT_MAP = {
    "AUTONOMOUS MEDICAL COLLEGE, AYODHYA": 512,
    "AUTONOMOUS MEDICAL COLLEGE, BAHRAICH": 5334,
    "AUTONOMOUS MEDICAL COLLEGE, BASTI": 5330,
    "AUTONOMOUS MEDICAL COLLEGE, DEORIA": 5336,
    "AUTONOMOUS MEDICAL COLLEGE, ETAH": 3501,
    "AUTONOMOUS MEDICAL COLLEGE, FATEHPUR": 6141,
    "AUTONOMOUS MEDICAL COLLEGE, FIROZABAD": 5332,
    "AUTONOMOUS MEDICAL COLLEGE, GHAZIPUR": 6410,
    "AUTONOMOUS MEDICAL COLLEGE, HARDOI": 3502,
    "AUTONOMOUS MEDICAL COLLEGE, JAUNPUR": 5337,
    "AUTONOMOUS MEDICAL COLLEGE, MIRZAPUR": 6143,
    "AUTONOMOUS MEDICAL COLLEGE, PRATAPGARH": 6375,
    "AUTONOMOUS MEDICAL COLLEGE, SHAHJAHANPUR": 5333,
    "AUTONOMOUS MEDICAL COLLEGE, SIDDHARTHNAGAR": 6140,
    "BABA RAGHAV DAS MEDICAL COLLEGE, GORAKHPUR": 380,
    "CAREER INSTITUTE OF MEDICAL SCIENCES, LKO": 395,
    "CAREER INSTITUTE OF MEDICAL SCIENCES, LKO (MUSLIM MINORITY)": 395,
    "DR. RAM MANOHAR LOHIA INSTITUTE OF MEDICAL SCIENCES, LUCKNOW": 381,
    "ERA MEDICAL COLLEGE LUCKNOW": 396,
    "ERA MEDICAL COLLEGE LUCKNOW (MUSLIM MINORITY)": 396,
    "F.H. MEDICAL COLLEGE & HOSPITAL, AGRA": 389,
    "F.H. MEDICAL COLLEGE & HOSPITAL, AGRA (MUSLIM MINORITY)": 389,
    "G.S. MEDICAL COLLEGE, HAPUR": 1358,
    "GANESH SHANKAR VIDYARTHI MEMORIAL MEDICAL COLLEGE, KANPUR": 376,
    "GOVERNMENT INSTITUTE OF MEDICAL SCIENCES, GREATER NOIDA": 755,
    "GOVERNMENT MEDICAL COLLEGE, AMBEDKAR NAGAR": 1476,
    "GOVERNMENT MEDICAL COLLEGE, AZAMGARH": 383,
    "GOVERNMENT MEDICAL COLLEGE, BADAUN": 1475,
    "GOVERNMENT MEDICAL COLLEGE, BANDA": 1353,
    "GOVERNMENT MEDICAL COLLEGE, JALAUN": 1944,
    "GOVERNMENT MEDICAL COLLEGE, KANNAUJ": 2339,
    "GOVERNMENT MEDICAL COLLEGE, SAHARANPUR": 1355,
    "HERITAGE MEDICAL COLLEGE, VARANASI": 393,
    "HIND MEDICAL COLLEGE BARABANKI": 388,
    "HIND MEDICAL COLLEGE, SITAPUR": 391,
    "INSTITUTE OF MENTAL HEALTH & HOSPITAL, AGRA": 384,
    "INTEGRAL INSTITUTE OF MEDICAL SCIENCES, LUCKNOW": 390,
    "INTEGRAL INSTITUTE OF MEDICAL SCIENCES, LUCKNOW (MUSLIM MINORITY)": 390,
    "K.D. MEDICAL COLLEGE, MATHURA": 1356,
    "K.M. MEDICAL COLLEGE, MATHURA": 1357,
    "KING GEORGES MEDICAL UNIVESITY, LUCKNOW": 372,
    "LALA LAJPAT RAI MEMORIAL MEDICAL COLLEGE, MEERUT": 373,
    "MAHARANI LAXMI BAI MEDICAL COLLEGE, JHANSI": 374,
    "MAYO INSTITUTE OF MEDICAL SCIENCE, BARABANKI": 387,
    "MOTI LAL NEHRU MEDICAL COLLEGE, PRAYAGRAJ": 375,
    "MUZAFFAR NAGAR MEDICAL COLLEGE MUZAFFAR NAGAR": 382,
    "NARAINA MEICAL COLLEGE & RESEARCH CENTRE, KANPUR": 6342,
    "NATIONAL CAPITAL MEDICAL COLLEGE, MEERUT": 1931,
    "NOIDA INTERNATIONAL INSTITUTE OF MEDICAL SCIENCES, GREATER NOIDA": 5742,
    "POST GRADUATE INSTITUTE OF CHILD HEALTH, NOIDA": 394,
    "PRASAD MEDICAL COLLEGE, LUCKNOW": 1929,
    "RAJSHREE MEDICAL RESEARCH INSTITUTE BAREILLY": 394,
    "RAMA MEDICAL COLLEGE HOSPITAL & RESEARCH CENTRE, HAPUR": 385,
    "RAMA MEDICAL COLLEGE KANPUR": 382,
    "REGIONAL INSTITUTE OF OPHTHALMOLOGY, SITAPUR": 387,
    "ROHILKHAND MEDICAL COLLEGE, BAREILLY": 377,
    "SANJAY GANDHI POSTGRADUATE INSTITUTE OF MEDICAL SCIENCE, LUCKNOW": 379,
    "SARASWATI INSTITUTE OF MEDICAL SCIENCES HAPUR": 378,
    "SARASWATI MEDICAL COLLEGE, UNNAO": 6369,
    "SAROJINI NAIDU MEDICAL COLLGE, AGRA": 369,
    "SCHOOL OF MEDICAL SCIENCES & RESEARCH, SHARDA UNIVERSITY G. NOIDA": 385,
    "SHRI RAM MURTI MEDICAL SCIENCES BARILLY": 392,
    "SKS HOSPITAL MEDICAL COLLEGE & RESEARCH CENTER, MATHURA": 6370,
    "SUBHARATI MEDICAL COLLEGE, MEERUT": 381,
    "T.S. MISHRA MEDICAL COLLEGE & HOSPITAL, LUCKNOW": 397,
    "TEERTHANKER MAHAVEER UNIVERSITY, MORADABAD": 381,
    "TEERTHANKER MAHAVEER UNIVERSITY, MORADABAD (JAIN MINORITY)": 381,
    "UNITED MEDICAL COLLEGE, PRAYAGRAJ": 3435,
    "UTTAR PRADESH UNIVERSITY OF MEDICAL SCIENCES, SAIFAI, ETAWAH": 5308,
    "VARUNARJUN MEDICAL COLLEGE, SHAHAJANPUR": 1359,
    "VENKATESHWARA MEDICAL COLLEGE, AMROHA": 1359
};

const UP_COURSE_MAP = {
    "MD ANAESTHESIA": 32,
    "MS ANATOMY": 34,
    "MD BIOCHEMISTRY": 37,
    "MD COMMUNITY MEDICINE": 63,
    "MD DERMATOLOGY": 42,
    "MD EMERGENCY MEDICINE": 43,
    "MS ENT": 68,
    "MD FORENSIC MEDICINE": 45,
    "MD GENERAL MEDICINE": 46,
    "MS GENERAL SURGERY": 69,
    "MD Hospital Administration": 48,
    "MD IMMUNOHAEMATOLOGY & BLOOD TRANSFUISION": 49,
    "MD Lab Medicine": 50,
    "MD MICROBIOLOGY": 51,
    "MD NUCLEAR MEDICINE": 52,
    "MS OBSTETRICS & GYNAECOLOGY": 70,
    "MS OPHTHALMOLOGY": 71,
    "MS ORTHOPAEDICS": 72,
    "MD PAEDIATRICS": 53,
    "MD PATHOLOGY": 55,
    "MD PHARMACOLOGY": 57,
    "MD PHYSICAL MEDICINE AND REHABILITATION": 58,
    "MD PHYSIOLOGY": 59,
    "MD PSYCHIATRY": 60,
    "MD RADIATION ONCOLOGY": 61,
    "MD RADIODIAGNOSIS": 62,
    "MD RESPIRATORY MEDICINE": 67,
    "MD Sports Medicine": 64,
    "MD TRAUMATOLOGY & SURGERY": 73,
    "DA": 1,
    "DCH": 3,
    "DGO": 18,
    "DLO": 21,
    "DMRD": 27,
    "DVD": 6,
    "D ORTH": 20
};

function getUpQuota(collegeType, collegeName) {
    if (collegeType === 'Govt.') {
        return {
            id: 115,
            name: 'Uttar Pradesh Govt Quota',
            short_name: 'UP-Govt Quota',
            tooltip_content: null,
            tooltip_content_html: null,
            master_quota: 'Uttar Pradesh Govt Quota'
        };
    }
    if (collegeName.includes('MINORITY')) {
        return {
            id: 117,
            name: 'Uttar Pradesh Private Seats - Minority Quota',
            short_name: 'UP Priv-Min. Quota',
            tooltip_content: null,
            tooltip_content_html: null,
            master_quota: 'Uttar Pradesh Private Seats'
        };
    }
    return {
        id: 116,
        name: 'Uttar Pradesh Private Seats - Open Quota',
        short_name: 'UP Priv-Open Quota',
        tooltip_content: null,
        tooltip_content_html: null,
        master_quota: 'Uttar Pradesh Private Seats'
    };
}

// Templates from existing UP raw
const upInstMap = new Map();
const upCourseMap = new Map();
const upExistingKeys = new Set();
const upOptionMap = new Map();

let upMaxId = 0;
upRaw.forEach(r => {
    if (r.id > upMaxId) upMaxId = r.id;
    if (r.institute && !upInstMap.has(r.institute.id)) {
        upInstMap.set(r.institute.id, r.institute);
    }
    if (r.course && !upCourseMap.has(r.course.id)) {
        upCourseMap.set(r.course.id, r.course);
    }
    const key = `${r.institute?.id}_${r.course?.id}_${r.quota?.id}_${r.category}`;
    upExistingKeys.add(key);

    const tripletKey = `${r.institute?.id}_${r.course?.id}_${r.quota?.id}`;
    if (!upOptionMap.has(tripletKey)) {
        upOptionMap.set(tripletKey, r.id);
    }
});

console.log(`Uttar Pradesh Max existing ID: ${upMaxId}`);

const upSeatMatrix = [];
let upNextId = upMaxId + 1;
let upNewOptionsCount = 0;

upCsv.forEach(r => {
    const instId = UP_EXACT_MAP[r.college_name.trim()];
    const courseId = UP_COURSE_MAP[r.course_name.trim()];
    const quotaObj = getUpQuota(r.college_type, r.college_name);
    const totalSeats = parseInt(r.total_seats, 10) || 0;

    if (!instId || !courseId || !quotaObj) {
        console.warn(`[WARN] Skipping unmatched row in UP CSV: ${r.college_name} | ${r.course_name}`);
        return;
    }

    const tripletKey = `${instId}_${courseId}_${quotaObj.id}`;
    let optId = upOptionMap.get(tripletKey) || null;

    // Build category seats object
    const categorySeats = {};
    const categoriesToAdd = [];

    const urTotal = parseInt(r.ur_total, 10) || 0;
    const bcTotal = parseInt(r.bc_total, 10) || 0;
    const scTotal = parseInt(r.sc_total, 10) || 0;
    const stTotal = parseInt(r.st_total, 10) || 0;
    const ewTotal = parseInt(r.ew_total, 10) || 0;

    if (urTotal > 0) { categorySeats["1"] = urTotal; categoriesToAdd.push("UR"); }
    if (ewTotal > 0) { categorySeats["4"] = ewTotal; categoriesToAdd.push("EW"); }
    if (bcTotal > 0) { categorySeats["5"] = bcTotal; categoriesToAdd.push("BC"); }
    if (scTotal > 0) { categorySeats["9"] = scTotal; categoriesToAdd.push("SC"); }
    if (stTotal > 0) { categorySeats["11"] = stTotal; categoriesToAdd.push("ST"); }

    const urPh = parseInt(r.ur_ph, 10) || 0;
    const bcPh = parseInt(r.bc_ph, 10) || 0;
    const scPh = parseInt(r.sc_ph, 10) || 0;
    const ewPh = parseInt(r.ew_ph, 10) || 0;
    if (urPh > 0) categorySeats["15"] = urPh;
    if (bcPh > 0) categorySeats["12"] = bcPh;
    if (scPh > 0) categorySeats["14"] = scPh;
    if (ewPh > 0) categorySeats["16"] = ewPh;

    if (categoriesToAdd.length === 0) {
        // Fallback to UR
        categoriesToAdd.push("UR");
        categorySeats["1"] = totalSeats;
    }

    // Add new choices to raw if not existing
    const sampleOfInst = upRaw.find(x => x.institute?.id === instId);

    categoriesToAdd.forEach(cat => {
        const choiceKey = `${tripletKey}_${cat}`;
        if (!upExistingKeys.has(choiceKey)) {
            const thisOptId = upNextId++;
            if (!optId) optId = thisOptId;
            upOptionMap.set(tripletKey, thisOptId);
            upExistingKeys.add(choiceKey);

            const newChoice = {
                id: thisOptId,
                state: "Uttar Pradesh",
                institute: upInstMap.get(instId) || { id: instId, name: r.college_name, short_name: r.college_name, logo_url: null, district: null },
                course: upCourseMap.get(courseId) || { id: courseId, name: r.course_name, short_name: r.course_name },
                quota: quotaObj,
                category: cat,
                counselling: { id: 32, name: "Uttar Pradesh - PG Medical", short_name: "UP PG" },
                fee_id: sampleOfInst?.fee_id || null,
                fee: sampleOfInst?.fee || null,
                stipend_year_1: sampleOfInst?.stipend_year_1 || null,
                bond_years: sampleOfInst?.bond_years || null,
                bond_penalty: sampleOfInst?.bond_penalty || null,
                beds: sampleOfInst?.beds || "-",
                choice_list_count: 0
            };

            upRaw.push(newChoice);
            upNewOptionsCount++;
        }
    });

    // Build seat matrix entry
    upSeatMatrix.push({
        optionId: optId,
        instituteId: instId,
        courseId: courseId,
        quotaId: quotaObj.id,
        instituteCode: r.college_code || "",
        instituteName: r.college_name,
        programRaw: r.course_name,
        totalSeats: totalSeats,
        categorySeats: categorySeats,
        year: 2026,
        round: 1,
        sourceType: quotaObj.name,
        source: "UP DGME State Counselling"
    });
});

console.log(`Added ${upNewOptionsCount} new choice options to Uttar Pradesh. Total choices now: ${upRaw.length}`);
console.log(`Created ${upSeatMatrix.length} seat matrix records for Uttar Pradesh.`);

// Save UP raw & seat matrix
fs.writeFileSync(upRawPath, JSON.stringify(upRaw, null, 2), 'utf8');
const upSmDir = path.join(PROCESSED_DIR, 'Uttar pradesh');
if (!fs.existsSync(upSmDir)) fs.mkdirSync(upSmDir, { recursive: true });
fs.writeFileSync(path.join(upSmDir, 'seat-matrix-2026.json'), JSON.stringify(upSeatMatrix, null, 2), 'utf8');
console.log('Saved data/raw/Uttar pradesh.json and data/processed/Uttar pradesh/seat-matrix-2026.json\n');

// Save combined seat-matrix-2026.json
const combinedSm = [...rajSeatMatrix, ...upSeatMatrix];
fs.writeFileSync(path.join(PROCESSED_DIR, 'seat-matrix-2026.json'), JSON.stringify(combinedSm, null, 2), 'utf8');
console.log(`Saved combined ${combinedSm.length} records to data/processed/seat-matrix-2026.json\n`);

console.log('Ingestion script completed successfully.');

