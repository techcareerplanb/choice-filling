import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { initDataLayer, searchOptions, getOption, getOptionsBatch, getFilterMetadata, getFilteredIdentities } from './server/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'; // Default password for local testing

app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.use(session({
    secret: 'neet-pg-secret-key-xyz',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Set to true if using HTTPS
}));

// Apply basic rate limiting to API
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5000, // Limit each IP to 5000 requests per windowMs
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// Serve static files
app.use(express.static(__dirname));

// Auth Middleware
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
}

app.post('/api/login', (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/api/check-auth', (req, res) => {
    res.json({ isAuthenticated: !!(req.session && req.session.isAdmin) });
});

// --- Search and Data APIs ---

app.get('/api/filter-metadata', (req, res) => {
    try {
        const metadata = getFilterMetadata();
        res.json(metadata);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/options', (req, res) => {
    try {
        const result = searchOptions(req.query);
        res.json(result);
    } catch (err) {
        if (err.message === 'INVALID_CURSOR') {
            res.status(400).json({ error: 'Invalid or expired cursor.' });
        } else {
            console.error('Search API Error:', err);
            res.status(500).json({ error: err.message });
        }
    }
});


app.get('/api/options/identities', (req, res) => {
    try {
        const result = getFilteredIdentities(req.query);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/options/batch', (req, res) => {
    try {
        const idsParam = req.query.ids;
        if (!idsParam) return res.status(400).json({ error: 'Missing ids parameter' });
        
        const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n));
        if (ids.length === 0) return res.status(400).json({ error: 'Invalid ids parameter' });
        if (ids.length > 100) return res.status(400).json({ error: 'Maximum 100 IDs allowed for batch request' });
        
        const result = getOptionsBatch(ids);
        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/options/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid option ID' });
        
        const opt = getOption(id, req.query.year, req.query.round, req.query.rank);
        if (!opt) return res.status(404).json({ error: 'Option not found' });
        
        res.json(opt);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- Write API ---

// Mutex to prevent concurrent writes
let isWriting = false;

// Format money helper
function formatMoney(val, existingStr) {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    if (isNaN(num)) return null;
    
    // Format to Indian Rupees format e.g. 1,00,000
    let formatted = '₹' + num.toLocaleString('en-IN');
    
    // Preserve asterisk if the original string had it, or default to not having it unless it was added.
    if (existingStr && existingStr.includes('*')) {
        formatted += '*';
    }
    return formatted;
}

app.post('/api/update-college', requireAdmin, async (req, res) => {
    if (isWriting) {
        return res.status(409).json({ error: 'Another update is in progress. Please try again in a moment.' });
    }
    
    const { instituteId, courseId, scope, updates } = req.body;
    if (!instituteId) return res.status(400).json({ error: 'instituteId is required' });
    
    isWriting = true;
    try {
        const dataPath = path.join(__dirname, 'data', 'All-India.json');
        const backupDir = path.join(__dirname, 'data', 'backups');
        
        if (!fs.existsSync(dataPath)) {
            throw new Error('Source data file not found');
        }
        
        // 1. Read existing data
        const rawData = fs.readFileSync(dataPath, 'utf8');
        let records;
        try {
            records = JSON.parse(rawData);
        } catch (e) {
            throw new Error('Failed to parse existing data file.');
        }

        // 2. Identify records
        let updatedCount = 0;
        for (let i = 0; i < records.length; i++) {
            const rec = records[i];
            
            // Match institute
            if (rec.institute && rec.institute.id === parseInt(instituteId)) {
                
                // If course-specific, only update if course matches
                if (scope === 'course' && courseId) {
                    if (rec.course && rec.course.id !== parseInt(courseId)) {
                        continue;
                    }
                }

                // Apply Updates (preserving existing formatting where applicable)
                if (updates.fees !== undefined) {
                    if (updates.fees.annualTuition !== undefined) {
                        rec.fee = formatMoney(updates.fees.annualTuition, rec.fee) || rec.fee;
                    }
                    if (updates.fees.totalCourse !== undefined) rec.fee_total = updates.fees.totalCourse;
                    if (updates.fees.hostel !== undefined) rec.fee_hostel = updates.fees.hostel;
                    if (updates.fees.otherMandatory !== undefined) rec.fee_other = updates.fees.otherMandatory;
                }
                
                if (updates.stipend !== undefined) {
                    if (updates.stipend.monthly !== undefined) {
                        rec.stipend_year_1 = formatMoney(updates.stipend.monthly, rec.stipend_year_1) || rec.stipend_year_1;
                    }
                }
                
                if (updates.courseDurationMonths !== undefined) {
                    rec.course_duration_months = updates.courseDurationMonths;
                }
                
                if (updates.bond !== undefined) {
                    if (updates.bond.durationMonths !== undefined) {
                        // All-India currently stores bond in years as string
                        const years = updates.bond.durationMonths !== null ? (updates.bond.durationMonths / 12) : null;
                        if (years !== null) {
                            rec.bond_years = String(years) + (rec.bond_years && rec.bond_years.includes('*') ? '*' : '');
                        }
                    }
                    if (updates.bond.penaltyAmount !== undefined) {
                        rec.bond_penalty = formatMoney(updates.bond.penaltyAmount, rec.bond_penalty) || rec.bond_penalty;
                    }
                    if (updates.bond.details !== undefined) rec.bond_details = updates.bond.details;
                    if (updates.bond.required !== undefined) rec.bond_required = updates.bond.required;
                }
                
                if (updates.remarks !== undefined) rec.remarks = updates.remarks;
                if (updates.source !== undefined) {
                    if (updates.source.label !== undefined) rec.source_label = updates.source.label;
                    if (updates.source.url !== undefined) rec.source_url = updates.source.url;
                }
                
                rec.lastUpdatedAt = new Date().toISOString();
                rec.lastUpdatedBy = 'admin';
                updatedCount++;
            }
        }
        
        if (updatedCount === 0) {
            throw new Error('No matching records found to update.');
        }

        // 3. Create Backup
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `All-India-${timestamp}.json`);
        fs.copyFileSync(dataPath, backupPath);
        
        // Clean up old backups (keep last 10)
        const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('All-India-')).sort();
        while (backups.length > 10) {
            const oldest = backups.shift();
            fs.unlinkSync(path.join(backupDir, oldest));
        }

        // 4. Atomic Write
        const tmpPath = path.join(__dirname, 'data', '.All-India.tmp.json');
        fs.writeFileSync(tmpPath, JSON.stringify(records, null, 2));
        fs.renameSync(tmpPath, dataPath);

        // 5. Rebuild Processed Data
        await new Promise((resolve, reject) => {
            execFile('node', [path.join(__dirname, 'scripts', 'preprocess.js')], (error, stdout, stderr) => {
                if (error) {
                    console.error('Build Error:', stderr);
                    // Restore from backup
                    fs.copyFileSync(backupPath, dataPath);
                    reject(new Error('Failed to rebuild processed data. Changes were rolled back.'));
                } else {
                    resolve();
                }
            });
        });

        res.json({ success: true, updatedCount });
    } catch (err) {
        console.error('Update Error:', err);
        res.status(500).json({ error: err.message });
    } finally {
        isWriting = false;
    }
});

async function startServer() {
    try {
        await initDataLayer();
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`Default Admin Password: ${ADMIN_PASSWORD}`);
        });
    } catch (e) {
        console.error("Failed to start server:", e);
        process.exit(1);
    }
}

startServer();
