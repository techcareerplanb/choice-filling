const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data/processed');

function findCutoffs(counselling) {
    const dir = path.join(dataDir, counselling);
    if (!fs.existsSync(dir)) return;
    
    const institutes = JSON.parse(fs.readFileSync(path.join(dir, 'institutes.json'), 'utf8'));
    const courses = JSON.parse(fs.readFileSync(path.join(dir, 'courses.json'), 'utf8'));
    const categories = JSON.parse(fs.readFileSync(path.join(dir, 'categories.json'), 'utf8'));
    const quotas = JSON.parse(fs.readFileSync(path.join(dir, 'quotas.json'), 'utf8'));
    const options = JSON.parse(fs.readFileSync(path.join(dir, 'options.json'), 'utf8'));
    const cutoffs = JSON.parse(fs.readFileSync(path.join(dir, 'cutoffs.json'), 'utf8'));
    
    const inst = institutes.find(i => i.name.toLowerCase().includes('rnt medical college'));
    const course = courses.find(c => c.name.toLowerCase() === 'md paediatrics');
    
    if (!inst || !course) return;
    
    const targetOptions = options.filter(o => o.instituteId == inst.id && o.courseId == course.id);
    
    if (targetOptions.length === 0) return;
    
    console.log(`\n--- ${counselling} ---`);
    console.log(`Institute: ${inst.name}`);
    console.log(`Course: ${course.name}`);
    
    targetOptions.forEach(opt => {
        const optId = opt.id;
        const cat = categories.find(c => c.id == opt.categoryId);
        const quota = quotas.find(q => q.id == opt.quotaId);
        
        const optCutoffs = cutoffs.filter(c => c.optionId == optId);
        optCutoffs.forEach(c => {
            console.log(`Quota: ${quota.name} | Category: ${cat ? cat.name : opt.categoryId}`);
            console.log(`  Year: ${c.year} Round: ${c.round} -> Rank: ${c.counsellingRank || c.closingRank} (AIR: ${c.aiRank || 'N/A'})`);
        });
    });
}

findCutoffs('Rajasthan');
findCutoffs('All-India');
