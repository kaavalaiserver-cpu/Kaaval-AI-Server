const fs = require('fs');
const path = require('path');

function findFiles(dir, filter, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, filter, fileList);
    } else if (filter.test(filePath)) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const srcDir = path.join(__dirname, 'src');
const files = findFiles(srcDir, /\.ts$/);

const searchStr1 = "'SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER'";
const replaceStr1 = "'SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH', 'SP', 'DSP', 'DEVELOPER'";

const searchStr2 = "['SUPER_ADMIN', 'SP', 'DSP', 'DEVELOPER']";
const replaceStr2 = "['SUPER_ADMIN', 'ADMIN_SAJIV', 'ADMIN_BINU', 'ADMIN_HARISH', 'SP', 'DSP', 'DEVELOPER']";

for (const filepath of files) {
  const content = fs.readFileSync(filepath, 'utf-8');
  let newContent = content.split(searchStr1).join(replaceStr1);
  newContent = newContent.split(searchStr2).join(replaceStr2);
  
  if (content !== newContent) {
    fs.writeFileSync(filepath, newContent, 'utf-8');
    console.log('Patched:', filepath);
  }
}
