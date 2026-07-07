const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('f:/Projects/Kaaval AI/admin dashboard/kaaval-backend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace uuid in Column
  content = content.replace(/type:\s*'uuid'/g, "type: 'varchar'");
  // Replace jsonb
  content = content.replace(/type:\s*'jsonb'/g, "type: 'json'");
  // Replace timestamptz
  content = content.replace(/type:\s*'timestamptz'/g, "type: 'datetime'");
  // Replace enum
  content = content.replace(/type:\s*'enum'/g, "type: 'varchar'");
  
  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
console.log("Done");
