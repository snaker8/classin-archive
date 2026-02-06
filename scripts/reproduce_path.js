const path = require('path');

const rootDir = "D:\\Classes";
const filePath = "D:\\Classes\\M1\\KoreanClass\\TypeA\\2025-01-26\\student_test.jpg";

function testParse() {
    const relativePath = path.relative(rootDir, filePath);
    const parts = relativePath.split(path.sep);

    console.log("Relative:", relativePath);
    console.log("Parts:", parts);

    // Simulation of current logic
    const className = parts[0];
    const dateFolder = parts[1];

    console.log("Current className:", className);
    console.log("Current dateFolder:", dateFolder);
}

testParse();
