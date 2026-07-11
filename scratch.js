const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx')) { 
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Replace top header backgrounds with glass-header
  content = content.replace(/bg-zinc-950\/[0-9]+ backdrop-blur-[a-z]+ border-b border-zinc-900/g, 'glass-header');
  content = content.replace(/bg-zinc-950\/[0-9]+ backdrop-blur-[a-z]+ border-b border-zinc-800/g, 'glass-header');
  content = content.replace(/bg-gradient-to-b from-black\/80 to-transparent/g, 'glass-header');

  // Add pt-safe
  const exactStyleStr = " style={{ paddingTop: 'max(env(safe-area-inset-top), 16px)' }}";
  if (content.includes(exactStyleStr)) {
    // Find all occurrences and replace
    let index = content.indexOf(exactStyleStr);
    while (index !== -1) {
      // Find className=" before this index
      let classIdx = content.lastIndexOf('className="', index);
      if (classIdx !== -1) {
        let endQuoteIdx = content.indexOf('"', classIdx + 11);
        if (endQuoteIdx !== -1 && endQuoteIdx < index) {
          // insert pt-safe
          content = content.slice(0, endQuoteIdx) + ' pt-safe' + content.slice(endQuoteIdx);
          // the exactStyleStr has shifted by 8 characters
          index += 8;
        }
      }
      content = content.substring(0, index) + content.substring(index + exactStyleStr.length);
      index = content.indexOf(exactStyleStr);
    }
  }
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
  }
});
