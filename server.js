import express from 'express';
import session from 'express-session';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { initDataLayer, searchOptions, getOption, getOptionsBatch, getFilterMetadata, getFilteredIdentities } from './server/data.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// ---------------------------------------------------------------------------
// Required environment variables — fail fast if not set
// ---------------------------------------------------------------------------
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.SESSION_SECRET;

if (!ADMIN_PASSWORD || ADMIN_PASSWORD.trim() === '') {
    console.error('[FATAL] ADMIN_PASSWORD environment variable is required but not set.');
    console.error('[FATAL] Create a .env file from .env.example and set a strong password.');
    process.exit(1);
}
if (!SESSION_SECRET || SESSION_SECRET.trim() === '') {
    console.error('[FATAL] SESSION_SECRET environment variable is required but not set.');
    console.error('[FATAL] Create a .env file from .env.example and set a long random secret.');
    process.exit(1);
}

const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ---------------------------------------------------------------------------
// Allowed browser-facing static paths (explicit allowlist, not root)
// ---------------------------------------------------------------------------
const SAFE_STATIC_DIRS = [
    { prefix: '/css/', dir: path.join(__dirname, 'css') },
    { prefix: '/js/', dir: path.join(__dirname, 'js') },
];

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(compression());
app.get('/api/counsellings', (req, res) => {
    const dirs = fs.readdirSync(path.join(__dirname, 'data/processed'), { withFileTypes: true });
    const counsellings = dirs.filter(d => d.isDirectory() && !d.name.includes('mcc_pg')).map(d => d.name);
    res.json({ success: true, counsellings });
});


// Set no-cache on all API responses to prevent browsers from caching stale data
app.use('/api/', (req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
});

// ---------------------------------------------------------------------------
// Session — secure cookie settings
// ---------------------------------------------------------------------------
app.use(session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        sameSite: 'strict',
        secure: IS_PRODUCTION,          // Require HTTPS in production
        maxAge: 8 * 60 * 60 * 1000     // 8 hours
    }
}));

// ---------------------------------------------------------------------------
// Rate limiting
// ---------------------------------------------------------------------------

// Tight limiter for login — 10 attempts per IP per 15 minutes
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many login attempts. Please try again later.' },
    skipSuccessfulRequests: true,  // Only count failed attempts
});

// General API limiter — 5000 requests per IP per 15 minutes (increased for local dev)
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5000,
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', apiLimiter);

// ---------------------------------------------------------------------------
// Static files — ONLY serve intentional browser assets, never server/ or data/
// ---------------------------------------------------------------------------

// Serve index.html for the SPA root
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve CSS and JS modules explicitly
for (const { prefix, dir } of SAFE_STATIC_DIRS) {
    app.use(prefix, express.static(dir));
}

// ---------------------------------------------------------------------------
// Auth Middleware
// ---------------------------------------------------------------------------
function requireAdmin(req, res, next) {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.status(401).json({ error: 'Unauthorized. Please log in.' });
    }
}

// ---------------------------------------------------------------------------
// Auth endpoints
// ---------------------------------------------------------------------------
app.post('/api/login', loginLimiter, (req, res) => {
    if (req.body.password === ADMIN_PASSWORD) {
        // Regenerate session ID on privilege escalation to prevent session fixation
        req.session.regenerate((err) => {
            if (err) {
                console.error('Session regenerate error:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }
            req.session.isAdmin = true;
            res.json({ success: true });
        });
    } else {
        res.status(401).json({ error: 'Invalid password' });
    }
});

app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error('Session destroy error:', err);
        res.json({ success: true });
    });
});

app.get('/api/check-auth', (req, res) => {
    res.json({ isAuthenticated: !!(req.session && req.session.isAdmin) });
});

// ---------------------------------------------------------------------------
// Search and Data APIs
// ---------------------------------------------------------------------------

app.get('/api/:counselling/filter-metadata', (req, res) => {
    try {
        const metadata = getFilterMetadata(req.params.counselling);
        res.json(metadata);
    } catch (err) {
        console.error('Filter metadata error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/:counselling/options', (req, res) => {
    try {
        const result = searchOptions(req.params.counselling, req.query);
        res.json(result);
    } catch (err) {
        if (err.message === 'INVALID_CURSOR') {
            res.status(400).json({ error: 'Invalid or expired cursor.' });
        } else {
            console.error('Search API Error:', err);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

app.get('/api/:counselling/identities', (req, res) => {
    try {
        const result = getFilteredIdentities(req.params.counselling, req.query);
        res.json(result);
    } catch (err) {
        console.error('Identities API Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/:counselling/options/batch', (req, res) => {
    try {
        const idsParam = req.query.ids;
        if (!idsParam) return res.status(400).json({ error: 'Missing ids parameter' });

        const ids = idsParam.split(',').map(Number).filter(n => !isNaN(n));
        if (ids.length === 0) return res.status(400).json({ error: 'Invalid ids parameter' });
        if (ids.length > 100) return res.status(400).json({ error: 'Maximum 100 IDs allowed for batch request' });

        const result = getOptionsBatch(req.params.counselling, ids);
        res.json(result);
    } catch (err) {
        console.error('Batch API Error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/:counselling/options/:id', (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ error: 'Invalid option ID' });

        const opt = getOption(req.params.counselling, id, req.query.year, req.query.round, req.query.rank, req.query.includeInservice);
        if (!opt) return res.status(404).json({ error: 'Option not found' });

        res.json(opt);
    } catch (err) {
        console.error('Get option error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ---------------------------------------------------------------------------
// Write API — admin-only
// ---------------------------------------------------------------------------

// Mutex to prevent concurrent writes
let isWriting = false;

// Format money helper
function formatMoney(val, existingStr) {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    if (isNaN(num)) return null;

    // Format to Indian Rupees format e.g. 1,00,000
    let formatted = '₹' + num.toLocaleString('en-IN');

    // Preserve asterisk if the original string had it
    if (existingStr && existingStr.includes('*')) {
        formatted += '*';
    }
    return formatted;
}

// Helper to resolve raw JSON path for any counselling
function getCounsellingSourcePath(counselling) {
    if (!counselling || counselling === 'All-India') {
        const pRaw = path.join(__dirname, 'data', 'raw', 'All-India.json');
        if (fs.existsSync(pRaw)) return pRaw;
        return path.join(__dirname, 'data', 'All-India.json');
    }
    const p1 = path.join(__dirname, 'data', 'raw', `${counselling}.json`);
    if (fs.existsSync(p1)) return p1;
    const p2 = path.join(__dirname, 'data', `${counselling}.json`);
    if (fs.existsSync(p2)) return p2;
    return null;
}

// ---------------------------------------------------------------------------
// Admin Data Inspection APIs
// ---------------------------------------------------------------------------

app.get('/api/admin/college-hierarchy', requireAdmin, async (req, res) => {
    try {
        const counselling = req.query.counselling || 'All-India';
        const instituteId = parseInt(req.query.instituteId, 10);
        if (isNaN(instituteId)) return res.status(400).json({ error: 'Valid instituteId is required' });

        const sourcePath = getCounsellingSourcePath(counselling);
        if (!sourcePath || !fs.existsSync(sourcePath)) {
            return res.status(404).json({ error: `Source dataset not found for: ${counselling}` });
        }

        const raw = await fs.promises.readFile(sourcePath, 'utf8');
        const records = JSON.parse(raw);

        const instRecords = records.filter(r => r.institute && r.institute.id === instituteId);
        
        const courseMap = new Map();
        const options = [];

        instRecords.forEach(r => {
            if (r.course && r.course.id) {
                if (!courseMap.has(r.course.id)) {
                    courseMap.set(r.course.id, {
                        id: r.course.id,
                        name: r.course.name,
                        short_name: r.course.short_name || r.course.name
                    });
                }
            }
            options.push({
                id: r.id,
                courseId: r.course?.id,
                courseName: r.course?.name,
                quotaId: r.quota?.id,
                quotaName: r.quota?.name,
                quotaShort: r.quota?.short_name || r.quota?.name,
                category: r.category
            });
        });

        const courses = Array.from(courseMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        options.sort((a, b) => (a.courseName || '').localeCompare(b.courseName || ''));

        res.json({
            success: true,
            totalRecords: instRecords.length,
            courses,
            options
        });
    } catch (err) {
        console.error('[Admin College Hierarchy] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.get('/api/admin/record', requireAdmin, async (req, res) => {
    try {
        const counselling = req.query.counselling || 'All-India';
        const optionId = req.query.optionId ? parseInt(req.query.optionId, 10) : null;
        const sourcePath = getCounsellingSourcePath(counselling);
        
        if (!sourcePath || !fs.existsSync(sourcePath)) {
            return res.status(404).json({ error: `Source dataset not found for counselling: ${counselling}` });
        }

        const raw = await fs.promises.readFile(sourcePath, 'utf8');
        const records = JSON.parse(raw);

        if (optionId) {
            const record = records.find(r => r.id === optionId);
            if (!record) return res.status(404).json({ error: `Option ID ${optionId} not found in ${counselling}` });
            return res.json({ success: true, record });
        }

        const instituteId = req.query.instituteId ? parseInt(req.query.instituteId, 10) : null;
        const courseId = req.query.courseId ? parseInt(req.query.courseId, 10) : null;

        if (instituteId) {
            let filtered = records.filter(r => r.institute && r.institute.id === instituteId);
            if (courseId) {
                filtered = filtered.filter(r => r.course && r.course.id === courseId);
            }
            return res.json({ success: true, count: filtered.length, records: filtered.slice(0, 100) });
        }

        res.status(400).json({ error: 'Please provide optionId or instituteId' });
    } catch (err) {
        console.error('[Admin Record] Error:', err);
        res.status(500).json({ error: err.message });
    }
});

// ---------------------------------------------------------------------------
// Write API — admin-only: Updates every parameter of any data point
// ---------------------------------------------------------------------------

app.post('/api/update-college', requireAdmin, async (req, res) => {
    if (isWriting) {
        return res.status(409).json({ error: 'Another update is in progress. Please try again in a moment.' });
    }

    const { counselling = 'All-India', instituteId, courseId, optionId, scope = 'option', updates = {}, rawRecord } = req.body;
    
    if (scope === 'option' && !optionId && !rawRecord?.id) {
        return res.status(400).json({ error: 'optionId is required for option-specific updates' });
    }
    if ((scope === 'course' || scope === 'college') && !instituteId) {
        return res.status(400).json({ error: 'instituteId is required' });
    }

    isWriting = true;
    let backupPath = null;
    let dataPath = null;

    try {
        dataPath = getCounsellingSourcePath(counselling);
        const backupDir = path.join(__dirname, 'data', 'backups');

        if (!dataPath || !fs.existsSync(dataPath)) {
            throw new Error(`Source data file not found for counselling: ${counselling}`);
        }

        // 1. Read existing data asynchronously
        const rawData = await fs.promises.readFile(dataPath, 'utf8');
        let records;
        try {
            records = JSON.parse(rawData);
        } catch (e) {
            throw new Error('Failed to parse existing data file.');
        }

        // 2. Identify and update matching records
        let updatedCount = 0;
        const targetOptionId = optionId ? parseInt(optionId, 10) : (rawRecord?.id ? parseInt(rawRecord.id, 10) : null);
        const targetInstId = instituteId ? parseInt(instituteId, 10) : null;
        const targetCourseId = courseId ? parseInt(courseId, 10) : null;

        for (let i = 0; i < records.length; i++) {
            const rec = records[i];

            // Match based on scope
            let matches = false;
            if (scope === 'option') {
                matches = (rec.id === targetOptionId);
            } else if (scope === 'course') {
                matches = (rec.institute && rec.institute.id === targetInstId && rec.course && rec.course.id === targetCourseId);
            } else if (scope === 'college') {
                matches = (rec.institute && rec.institute.id === targetInstId);
            }

            if (!matches) continue;

            // Direct Raw Record Replacement (Option Scope only)
            if (scope === 'option' && rawRecord && typeof rawRecord === 'object') {
                const preservedId = rec.id;
                Object.assign(rec, rawRecord);
                rec.id = preservedId; // ensure ID cannot be corrupted
            } else {
                // Apply Granular Field Updates
                if (updates.state !== undefined) rec.state = updates.state;
                if (updates.beds !== undefined) rec.beds = String(updates.beds);

                // Institute updates
                if (updates.institute && typeof updates.institute === 'object') {
                    if (!rec.institute) rec.institute = {};
                    if (updates.institute.name !== undefined) rec.institute.name = updates.institute.name;
                    if (updates.institute.short_name !== undefined) rec.institute.short_name = updates.institute.short_name;
                    if (updates.institute.district !== undefined) rec.institute.district = updates.institute.district;
                }

                // Course updates
                if (updates.course && typeof updates.course === 'object') {
                    if (!rec.course) rec.course = {};
                    if (updates.course.name !== undefined) rec.course.name = updates.course.name;
                    if (updates.course.short_name !== undefined) rec.course.short_name = updates.course.short_name;
                }

                // Quota updates
                if (updates.quota && typeof updates.quota === 'object') {
                    if (!rec.quota) rec.quota = {};
                    if (updates.quota.name !== undefined) rec.quota.name = updates.quota.name;
                    if (updates.quota.short_name !== undefined) rec.quota.short_name = updates.quota.short_name;
                    if (updates.quota.master_quota !== undefined) rec.quota.master_quota = updates.quota.master_quota;
                }

                // Category updates
                if (updates.category !== undefined) rec.category = updates.category;

                // Fees
                if (updates.fees !== undefined) {
                    if (updates.fees.feeRaw !== undefined) {
                        rec.fee = updates.fees.feeRaw;
                    } else if (updates.fees.annualTuition !== undefined) {
                        rec.fee = formatMoney(updates.fees.annualTuition, rec.fee) || rec.fee;
                    }
                    if (updates.fees.totalCourse !== undefined) rec.fee_total = updates.fees.totalCourse;
                    if (updates.fees.hostel !== undefined) rec.fee_hostel = updates.fees.hostel;
                    if (updates.fees.otherMandatory !== undefined) rec.fee_other = updates.fees.otherMandatory;
                    if (updates.fees.feeId !== undefined) rec.fee_id = updates.fees.feeId;
                }

                // Stipend
                if (updates.stipend !== undefined) {
                    if (updates.stipend.stipendRaw !== undefined) {
                        rec.stipend_year_1 = updates.stipend.stipendRaw;
                    } else if (updates.stipend.monthly !== undefined) {
                        rec.stipend_year_1 = formatMoney(updates.stipend.monthly, rec.stipend_year_1) || rec.stipend_year_1;
                    }
                }

                // Duration
                if (updates.courseDurationMonths !== undefined) {
                    rec.course_duration_months = updates.courseDurationMonths;
                }

                // Bond
                if (updates.bond !== undefined) {
                    if (updates.bond.bondYearsRaw !== undefined) {
                        rec.bond_years = String(updates.bond.bondYearsRaw);
                    } else if (updates.bond.durationMonths !== undefined) {
                        const years = updates.bond.durationMonths !== null ? (updates.bond.durationMonths / 12) : null;
                        if (years !== null) {
                            rec.bond_years = String(years) + (rec.bond_years && rec.bond_years.includes('*') ? '*' : '');
                        }
                    }
                    if (updates.bond.penaltyRaw !== undefined) {
                        rec.bond_penalty = updates.bond.penaltyRaw;
                    } else if (updates.bond.penaltyAmount !== undefined) {
                        rec.bond_penalty = formatMoney(updates.bond.penaltyAmount, rec.bond_penalty) || rec.bond_penalty;
                    }
                    if (updates.bond.details !== undefined) rec.bond_details = updates.bond.details;
                    if (updates.bond.required !== undefined) rec.bond_required = updates.bond.required;
                }

                // Cutoffs (cr_<year>_<round>)
                if (updates.cutoffs && typeof updates.cutoffs === 'object') {
                    Object.keys(updates.cutoffs).forEach(key => {
                        const co = updates.cutoffs[key];
                        if (co === null) {
                            delete rec[key];
                        } else if (typeof co === 'object') {
                            rec[key] = {
                                ...(rec[key] || {}),
                                ...co
                            };
                            if (rec[key].closing_rank !== undefined && rec[key].allotments_count !== undefined) {
                                rec[key].value = `${rec[key].closing_rank}(${rec[key].allotments_count})`;
                            }
                        }
                    });
                }

                // Metadata & Remarks
                if (updates.remarks !== undefined) rec.remarks = updates.remarks;
                if (updates.source !== undefined) {
                    if (updates.source.label !== undefined) rec.source_label = updates.source.label;
                    if (updates.source.url !== undefined) rec.source_url = updates.source.url;
                }
                if (updates.choiceListCount !== undefined) rec.choice_list_count = updates.choiceListCount;
            }

            rec.lastUpdatedAt = new Date().toISOString();
            rec.lastUpdatedBy = 'admin';
            updatedCount++;
        }

        if (updatedCount === 0) {
            throw new Error('No matching records found to update.');
        }

        // 3. Create Backup
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const cleanName = counselling.replace(/[^a-zA-Z0-9_-]/g, '_');
        backupPath = path.join(backupDir, `${cleanName}-${timestamp}.json`);
        fs.copyFileSync(dataPath, backupPath);

        // Prune old backups (keep last 15)
        const backups = fs.readdirSync(backupDir).filter(f => f.startsWith(`${cleanName}-`)).sort();
        while (backups.length > 15) {
            const oldest = backups.shift();
            try { fs.unlinkSync(path.join(backupDir, oldest)); } catch(_) {}
        }

        // 4. Atomic Write
        const tmpPath = path.join(path.dirname(dataPath), `.${path.basename(dataPath)}.tmp`);
        await fs.promises.writeFile(tmpPath, JSON.stringify(records, null, 2), 'utf8');
        fs.renameSync(tmpPath, dataPath);

        // Also sync data/All-India.json if counselling is All-India
        if (counselling === 'All-India') {
            const altPath = path.join(__dirname, 'data', 'All-India.json');
            if (dataPath !== altPath) {
                try { await fs.promises.writeFile(altPath, JSON.stringify(records, null, 2), 'utf8'); } catch(_) {}
            }
        }

        // 5. Rebuild Processed Data for this Counselling
        const outDir = path.join(__dirname, 'data', 'processed', counselling);
        await new Promise((resolve, reject) => {
            execFile('node', [path.join(__dirname, 'scripts', 'preprocess.js')], {
                timeout: 60000,
                env: {
                    ...process.env,
                    INPUT_PATH: dataPath,
                    OUT_DIR: outDir
                }
            }, (error, stdout, stderr) => {
                if (error) {
                    console.error('[Update] Preprocess failed:', stderr);
                    reject(new Error('Failed to rebuild processed data: ' + stderr));
                } else {
                    resolve();
                }
            });
        });

        if (counselling === 'All-India') {
            await new Promise((resolve) => {
                execFile('node', [path.join(__dirname, 'scripts', 'preprocess.js')], {
                    timeout: 60000,
                    env: {
                        ...process.env,
                        INPUT_PATH: dataPath,
                        OUT_DIR: path.join(__dirname, 'data', 'processed')
                    }
                }, () => resolve());
            });
        }

        // 6. Hot-reload in-memory data layer
        try {
            await initDataLayer();
        } catch (reloadErr) {
            console.error('[Update] In-memory reload failed. Restoring backup.', reloadErr);
            if (backupPath && fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, dataPath);
                try { await initDataLayer(); } catch (_) {}
            }
            throw new Error('Rebuild succeeded but data reload failed. Prior data has been restored.');
        }

        res.json({ success: true, updatedCount });
    } catch (err) {
        console.error('[Update] Error:', err.message);
        if (backupPath && dataPath && fs.existsSync(backupPath)) {
            try { fs.copyFileSync(backupPath, dataPath); } catch (_) {}
        }
        res.status(500).json({ error: err.message });
    } finally {
        isWriting = false;
    }
});

// ---------------------------------------------------------------------------
// Catch-all 404 for anything not matched above
// ---------------------------------------------------------------------------
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// ---------------------------------------------------------------------------
// Server startup
// ---------------------------------------------------------------------------
async function startServer() {
    try {
        await initDataLayer();
        app.listen(PORT, '0.0.0.0', () => {
            console.log(`Server is running:`);
            console.log(`  Local:   http://localhost:${PORT}`);
            const nets = os.networkInterfaces();
            for (const name of Object.keys(nets)) {
                for (const net of nets[name] || []) {
                    if (net.family === 'IPv4' && !net.internal) {
                        console.log(`  Network: http://${net.address}:${PORT}`);
                    }
                }
            }
            console.log(`Admin password and session secret loaded from environment.`);
        });
    } catch (e) {
        console.error('Failed to start server:', e);
        process.exit(1);
    }
}

startServer();
