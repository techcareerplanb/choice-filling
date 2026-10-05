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

app.get('/api/options/batch', (req, res) => {
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

        const opt = getOption(req.params.counselling, id);
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

app.post('/api/update-college', requireAdmin, async (req, res) => {
    if (isWriting) {
        return res.status(409).json({ error: 'Another update is in progress. Please try again in a moment.' });
    }

    const { instituteId, courseId, scope, updates } = req.body;
    if (!instituteId) return res.status(400).json({ error: 'instituteId is required' });

    isWriting = true;
    let backupPath = null;
    try {
        const dataPath = path.join(__dirname, 'data', 'All-India.json');
        const backupDir = path.join(__dirname, 'data', 'backups');

        if (!fs.existsSync(dataPath)) {
            throw new Error('Source data file not found');
        }

        // 1. Read existing data asynchronously — avoids blocking the event loop
        const rawData = await fs.promises.readFile(dataPath, 'utf8');
        let records;
        try {
            records = JSON.parse(rawData);
        } catch (e) {
            throw new Error('Failed to parse existing data file.');
        }

        // 2. Identify and update matching records
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

        // 3. Create Backup (before modifying source)
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        backupPath = path.join(backupDir, `All-India-${timestamp}.json`);
        fs.copyFileSync(dataPath, backupPath);

        // Prune old backups (keep last 10)
        const backups = fs.readdirSync(backupDir).filter(f => f.startsWith('All-India-')).sort();
        while (backups.length > 10) {
            const oldest = backups.shift();
            fs.unlinkSync(path.join(backupDir, oldest));
        }

        // 4. Atomic Write — write tmp then rename to avoid torn reads
        const tmpPath = path.join(__dirname, 'data', '.All-India.tmp.json');
        await fs.promises.writeFile(tmpPath, JSON.stringify(records, null, 2), 'utf8');
        fs.renameSync(tmpPath, dataPath);

        // 5. Rebuild Processed Data
        await new Promise((resolve, reject) => {
            execFile('node', [path.join(__dirname, 'scripts', 'preprocess.js')], { timeout: 60000 }, (error, stdout, stderr) => {
                if (error) {
                    console.error('[Update] Preprocess failed:', stderr);
                    reject(new Error('Failed to rebuild processed data.'));
                } else {
                    resolve();
                }
            });
        });

        // 6. Hot-reload in-memory data layer
        //    Keep serving old data until the new load succeeds.
        //    If reload fails, restore the source backup and keep old data active.
        try {
            await initDataLayer();
        } catch (reloadErr) {
            console.error('[Update] In-memory reload failed after build. Restoring backup.', reloadErr);
            // Restore source file from backup
            if (backupPath && fs.existsSync(backupPath)) {
                fs.copyFileSync(backupPath, dataPath);
                // Attempt to reload from the restored backup
                try { await initDataLayer(); } catch (_) { /* original data still in memory */ }
            }
            throw new Error('Rebuild succeeded but data reload failed. Prior data has been restored.');
        }

        res.json({ success: true, updatedCount });
    } catch (err) {
        console.error('[Update] Error:', err.message);
        // If the write already happened but rebuild/reload failed, restore source from backup
        if (backupPath && fs.existsSync(backupPath)) {
            const dataPath = path.join(__dirname, 'data', 'All-India.json');
            try {
                fs.copyFileSync(backupPath, dataPath);
            } catch (restoreErr) {
                console.error('[Update] Failed to restore backup:', restoreErr);
            }
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
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`Server is also accessible on your local network at http://0.0.0.0:${PORT}`);
            console.log(`Admin password and session secret loaded from environment.`);
        });
    } catch (e) {
        console.error('Failed to start server:', e);
        process.exit(1);
    }
}

startServer();
