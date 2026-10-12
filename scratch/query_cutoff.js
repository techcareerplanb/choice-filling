const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data/processed');

function findCutoffs(counselling) {
    const dir = path.join(dataDir, counselling);
    if (!fs.existsSync(dir)) return;
    
    const institutes = JSON.parse(fs.readFileSync(path.join(dir, 'institutes.json'), 'utf8'));
    const courses = JSON.parse(fs.readFileSync(path.join(dir, 'courses.json'), 'utf8'));
    const categories = JSON.parse(fs.readFileSync(path.join(dir, 'categories.json'), 'utf8'));
    const quotas = JSON.parse(fs.readFileSync(path.join(dir, 'quotas.json'), 'utf8'));
    const options = JSON.parse(fs.readFileSync(path.join(dir, 'options.json'), 'utf8'));
    const cutoffs = JSON.parse(fs.readFileSync(path.join(dir, 'cutoffs.json'), 'utf8'));
    
    const instId = Object.keys(institutes).find(id => institutes[id].name.toLowerCase().includes('rnt medical college'));
    const courseId = Object.keys(courses).find(id => courses[id].name.toLowerCase().includes('paediatrics'));
    
    if (!instId || !courseId) return;
    
    const optionIds = Object.keys(options).filter(id => options[id].institute_id == instId && options[id].course_id == courseId);
    
    if (optionIds.length === 0) return;
    
    console.log(`\n--- ${counselling} ---`);
    console.log(`Institute: ${institutes[instId].name}`);
    console.log(`Course: ${courses[courseId].name}`);
    
    optionIds.forEach(optId => {
        const opt = options[optId];
        const cat = categories.find(c => c.id == opt.category_id);
        const quota = quotas[opt.quota_id];
        
        const optCutoffs = cutoffs[optId];
        if (optCutoffs) {
            optCutoffs.forEach(c => {
                if (c.year == 2025 && c.round == 3) {
                    console.log(`Quota: ${quota.name} | Category: ${cat ? cat.name : opt.category_id}`);
                    console.log(`  Round 3 Rank: ${c.closing_rank} (AIR: ${c.ai_rank || 'N/A'})`);
                }
            });
        }
    });
}

findCutoffs('Rajasthan');
findCutoffs('All-India');
