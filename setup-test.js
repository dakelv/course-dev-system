#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');

async function setupTestEnvironment() {
  console.log('🔧 Setting up AI Curriculum Design System test environment...\n');

  try {
    // Create necessary directories
    const directories = [
      'logs',
      'course-data/MUNI-201/uploads',
      'course-data/MUNI-201/processed',
      'course-data/MUNI-201/phase-a-results',
      'course-data/MUNI-201/final-output'
    ];

    for (const dir of directories) {
      await fs.ensureDir(dir);
      console.log(`✅ Created directory: ${dir}`);
    }

    // Copy .env.example to .env if it doesn't exist
    if (!await fs.pathExists('.env')) {
      await fs.copy('.env.example', '.env');
      console.log('✅ Created .env file from template');
      console.log('⚠️  Please edit .env file and add your API keys!');
    } else {
      console.log('✅ .env file already exists');
    }

    // Create sample test files if uploads directory is empty
    const uploadsDir = 'course-data/MUNI-201/uploads';
    const files = await fs.readdir(uploadsDir);
    const hasRealFiles = files.some(file => !file.startsWith('README'));

    if (!hasRealFiles) {
      console.log('\n📝 Creating sample test files...');
      
      // Create a sample syllabus
      const sampleSyllabus = `
MUNI-201: Municipal Government
Saskatchewan Polytechnic
3 Credit Hours - 15 Weeks

COURSE DESCRIPTION:
This course provides an introduction to municipal government in Saskatchewan, covering structure, functions, and governance processes.

LEARNING OUTCOMES:
Upon successful completion of this course, students will be able to:
1. Identify the key structures and roles within municipal government
2. Analyze municipal governance processes and decision-making
3. Evaluate municipal services and their delivery methods
4. Apply knowledge of municipal finance and budgeting principles

ASSESSMENT:
- Participation: 20%
- Assignments: 40% 
- Midterm Exam: 20%
- Final Project: 20%

COURSE SCHEDULE:
Week 1-3: Introduction to Municipal Government
Week 4-6: Municipal Structure and Organization
Week 7-9: Municipal Services and Functions
Week 10-12: Municipal Finance and Budgeting
Week 13-15: Municipal Planning and Development
      `;

      await fs.writeFile(path.join(uploadsDir, 'MUNI-201-syllabus.txt'), sampleSyllabus.trim());
      console.log('✅ Created sample syllabus file');

      // Create a sample module file
      const sampleModule = `
Module 1: Introduction to Municipal Government

Learning Objectives:
- Define municipal government and its role in Canadian governance
- Identify the historical development of municipal systems in Saskatchewan
- Explain the relationship between municipal, provincial, and federal governments

Content Overview:
1. What is Municipal Government?
2. Historical Development
3. Levels of Government
4. Municipal Autonomy and Authority

Activities:
- Reading: Municipal Government Act (selected sections)
- Discussion: Role of municipalities in your community
- Assignment: Municipal structure comparison

Assessment:
- Quiz on basic concepts (10 points)
- Participation in discussion (5 points)
      `;

      await fs.writeFile(path.join(uploadsDir, 'Module-01-Introduction.txt'), sampleModule.trim());
      console.log('✅ Created sample module file');

      console.log('\n⚠️  Note: These are sample text files for testing.');
      console.log('   For full testing, replace with actual PDF, DOCX, and PPTX files.');
    }

    console.log('\n🎉 Test environment setup complete!');
    console.log('\nNext steps:');
    console.log('1. Edit .env file and add your OpenAI and Claude API keys');
    console.log('2. Install dependencies: npm install');
    console.log('3. Add your MUNI-201 course files to: course-data/MUNI-201/uploads/');
    console.log('4. Run the system: node process-course.js MUNI-201');
    console.log('\nFor help: node process-course.js --help');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  setupTestEnvironment();
}

module.exports = { setupTestEnvironment };