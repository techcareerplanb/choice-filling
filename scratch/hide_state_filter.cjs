const fs = require('fs');

let content = fs.readFileSync('js/ui/views/results.js', 'utf8');

// The block to wrap:
const start = `<div class="form-group" style="margin-bottom: 1.25rem; position: relative;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">State</label>`;
                            
const wrapperStart = `\${localStorage.getItem('activeCounselling') === 'All-India' ? \`
                        <div class="form-group" style="margin-bottom: 1.25rem; position: relative;">
                            <label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">State</label>`;
                            
const end = `</div>
                                </div>
                            </div>
                        </div>`;
                        
const wrapperEnd = `</div>
                                </div>
                            </div>
                        </div>
                        \` : ''}`;

// We will just do a string replacement on the start and end of that specific form-group for the state dropdown.
// But we have to be careful with the end tag, as there are many </div> sequences.
// Let's use a targeted replace.

const regex = /(<div class="form-group" style="margin-bottom: 1.25rem; position: relative;">\s*<label class="form-label" style="display:block; margin-bottom:0.5rem; font-weight:500;">State<\/label>[\s\S]*?<div id="state-checkbox-list" style="padding:0.5rem;">[\s\S]*?<\/div>\s*<\/div>\s*<\/div>)/;

const matched = content.match(regex);
if (matched) {
    let replacedBlock = `\${localStorage.getItem('activeCounselling') === 'All-India' ? \`\n` + matched[0] + `\n\` : ''}`;
    content = content.replace(regex, replacedBlock);
    fs.writeFileSync('js/ui/views/results.js', content);
    console.log("State filter hidden for state counsellings!");
} else {
    console.log("Could not match the State filter block in results.js");
}

