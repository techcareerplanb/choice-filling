const fs = require('fs');
const path = require('path');

const processedData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed/seat-matrix-2025.json'), 'utf8'));
const rawData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/raw/mcc_pg_2025_seat_matrix_source.json'), 'utf8'));
const oldGaps = JSON.parse(fs.readFileSync(path.join(__dirname, '../reports/coverage-gaps-2025.json'), 'utf8'));
const courses = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/processed/courses.json'), 'utf8'));

const courseMap = new Map();
courses.forEach(c => courseMap.set(c.id, c.name));

const rawMap = new Map();
rawData.forEach((row, idx) => rawMap.set(JSON.stringify(row), idx + 1));

const fixedReports = [];

oldGaps.forEach(gap => {
    // find raw row
    let rawMatches = rawData.filter(r => r.Institute === gap.instituteName && r.Program === gap.program);
    let rawRow = rawMatches[0];
    let sourceRowId = rawMap.get(JSON.stringify(rawRow));
    
    // find processed record
    let processed = processedData.find(p => p.instituteName === gap.instituteName && p.programRaw === gap.program);
    
    if (processed) {
        fixedReports.push({
            sourceRowId: sourceRowId,
            instituteCode: processed.instituteCode,
            instituteName: gap.instituteName,
            originalProgram: gap.program,
            normalizedProgram: gap.program,
            canonicalCourseId: processed.courseId,
            canonicalCourseName: courseMap.get(processed.courseId),
            quota: rawRow.Quota,
            optionId: processed.optionId,
            previousClassification: "VALID_BUT_NOT_MODELED (COVERAGE_GAP)",
            newClassification: "MATCHED",
            mappingMethod: "DETERMINISTIC_PROGRAM_ALIAS"
        });
    }
});

fs.writeFileSync(path.join(__dirname, '../reports/coverage-gaps-2025-fixed.json'), JSON.stringify(fixedReports, null, 2));
console.log(`Generated ${fixedReports.length} fixed reports`);
