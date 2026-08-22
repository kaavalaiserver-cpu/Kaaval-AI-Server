const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Get all rejected violation IDs from the DB
const result = execSync('docker exec kaaval-postgres psql -U postgres -d kaaval_ai -t -c "SELECT id FROM violations WHERE status = \\'REJECTED\\';"').toString();
const rejectedIds = result.split('\n').map(l => l.trim()).filter(l => l.length > 0);

console.log(`Found ${rejectedIds.length} rejected violations in DB`);

let foundCount = 0;
function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.resolve(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else { 
            results.push(file);
        }
    });
    return results;
}

console.log('Scanning uploads directory...');
const allFiles = walk('F:/kaaval ai database/uploads');
console.log(`Found ${allFiles.length} files in uploads directory`);

const fileNames = new Set(allFiles.map(f => path.basename(f, path.extname(f))));

for (const id of rejectedIds) {
    if (fileNames.has(id)) {
        foundCount++;
    }
}

console.log(`Found images for ${foundCount} rejected violations`);
