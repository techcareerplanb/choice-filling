const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '../data/All-India.json');
const rawData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

const stats = {
    totalRecords: rawData.length,
    institutes: new Set(),
    courses: new Set(),
    quotas: new Set(),
    categories: new Set(),
    counsellings: new Set(),
    years: new Set(),
    rounds: new Set(),
    fieldFrequency: {},
    missingNull: {},
    financialAsterisks: { fee: 0, stipend: 0, bondPenalty: 0, bondYears: 0 },
    bedsUnavailable: 0,
    missingRounds: 0,
    quotaMasterCombos: new Set(),
    categoryFormats: new Set(),
    courseNamingPatterns: new Set(), // maybe just list prefixes or unique words
    inconsistentTypes: new Set(),
    suspiciousRecords: []
};

// Discover all possible rounds
const allRoundKeys = new Set();
rawData.forEach(item => {
    Object.keys(item).forEach(key => {
        if (key.startsWith('cr_')) {
            allRoundKeys.add(key);
            const [, year, round] = key.split('_');
            stats.years.add(year);
            stats.rounds.add(round);
        }
    });
});

rawData.forEach(item => {
    // Basic Unique Counts
    if (item.institute) stats.institutes.add(item.institute.id);
    if (item.course) stats.courses.add(item.course.id);
    if (item.quota) stats.quotas.add(item.quota.id);
    if (item.category) stats.categories.add(item.category);
    if (item.counselling) stats.counsellings.add(item.counselling.id);
    
    // Field Frequency & Missing/Null
    Object.keys(item).forEach(key => {
        stats.fieldFrequency[key] = (stats.fieldFrequency[key] || 0) + 1;
        if (item[key] === null || item[key] === undefined || item[key] === '') {
            stats.missingNull[key] = (stats.missingNull[key] || 0) + 1;
        }
    });

    // Financial asterisks
    if (item.fee && typeof item.fee === 'string' && item.fee.includes('*')) stats.financialAsterisks.fee++;
    if (item.stipend_year_1 && typeof item.stipend_year_1 === 'string' && item.stipend_year_1.includes('*')) stats.financialAsterisks.stipend++;
    if (item.bond_penalty && typeof item.bond_penalty === 'string' && item.bond_penalty.includes('*')) stats.financialAsterisks.bondPenalty++;
    if (item.bond_years && typeof item.bond_years === 'string' && item.bond_years.includes('*')) stats.financialAsterisks.bondYears++;

    // Beds unavailable
    if (!item.beds || item.beds === 'Info Not Available' || item.beds === 'Not Available' || item.beds === '0') {
        stats.bedsUnavailable++;
    }

    // Missing rounds (record doesn't have ALL round keys)
    let hasAllRounds = true;
    allRoundKeys.forEach(rk => {
        if (!item[rk]) hasAllRounds = false;
    });
    if (!hasAllRounds) stats.missingRounds++;

    // Quota/Master combinations
    if (item.quota) {
        stats.quotaMasterCombos.add(`${item.quota.name} | ${item.quota.master_quota}`);
    }

    // Category formats
    if (item.category) {
        stats.categoryFormats.add(item.category);
    }
    
    // Course Naming (just an example, check if they start with MD/MS/DNB)
    if (item.course && item.course.name) {
        const prefix = item.course.name.split(' ')[0];
        stats.courseNamingPatterns.add(prefix);
    }

    // Inconsistent types (e.g. fee is sometimes string, sometimes number?)
    if (item.fee_id && typeof item.fee_id !== 'number') stats.inconsistentTypes.add(`fee_id is ${typeof item.fee_id}`);
    if (item.beds && isNaN(Number(item.beds)) && item.beds !== 'Info Not Available') stats.inconsistentTypes.add(`beds contains non-numeric: ${item.beds}`);
});

const result = {
    totalRecords: stats.totalRecords,
    uniqueInstitutes: stats.institutes.size,
    uniqueCourses: stats.courses.size,
    uniqueQuotas: stats.quotas.size,
    uniqueCategories: stats.categories.size,
    uniqueCounsellings: stats.counsellings.size,
    years: Array.from(stats.years),
    rounds: Array.from(stats.rounds),
    fieldFrequency: stats.fieldFrequency,
    missingNull: stats.missingNull,
    financialAsterisks: stats.financialAsterisks,
    bedsUnavailable: stats.bedsUnavailable,
    missingRounds: stats.missingRounds,
    quotaMasterCombos: Array.from(stats.quotaMasterCombos),
    categoryFormats: Array.from(stats.categoryFormats),
    courseNamingPatterns: Array.from(stats.courseNamingPatterns),
    inconsistentTypes: Array.from(stats.inconsistentTypes),
    allRoundKeys: Array.from(allRoundKeys)
};

fs.writeFileSync(path.join(__dirname, '../data/processed/analysis_results.json'), JSON.stringify(result, null, 2));
console.log('Analysis complete. Results saved to analysis_results.json');
