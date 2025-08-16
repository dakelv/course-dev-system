# Course Generalization Guide

The AI Curriculum Design System is now fully generalized to work with **any course from any discipline**. This guide explains how the system automatically adapts to different subjects and how to use it effectively.

## 🎯 System Overview

The system automatically:
- **Extracts course context** from syllabus documents (Program and Course rows)
- **Classifies subject areas** and program types
- **Adapts content generation** based on the specific discipline
- **Provides subject-specific resources** and activity templates
- **Customizes search queries** for relevant, authoritative sources

## 📚 Supported Disciplines

### Currently Optimized For:
- **Municipal Administration** - Government, public sector, policy
- **Business Management** - Strategy, operations, leadership, marketing
- **Accounting** - Financial reporting, taxation, auditing, compliance
- **Computer Science** - Programming, web development, software engineering
- **Health Sciences** - Nursing, medical practice, healthcare systems
- **Engineering** - Design, technical standards, safety, project management

### Generic Support For:
- **Social Sciences** - Psychology, sociology, anthropology
- **Mathematics** - Statistics, calculus, applied mathematics
- **English & Communications** - Writing, literature, communication
- **History & Humanities** - Historical analysis, cultural studies
- **Environmental Studies** - Sustainability, ecology, conservation
- **Any other discipline** - Falls back to general academic templates

## 🔧 How It Works

### 1. Course Context Extraction

The system reads your syllabus and automatically extracts:

```
Program: Business Diploma          → Program Type: "business"
Course: Municipal Administration    → Subject Area: "municipal administration"
```

**Supported Syllabus Formats:**
- Standard Saskatchewan Polytechnic format with Program/Course rows
- Any document containing "Program:" and "Course:" labels
- Fallback extraction from course titles and descriptions

### 2. Automatic Classification

**Program Types:**
- `business` - Business, commerce, management, administration
- `engineering` - Engineering, technology, computer science
- `health` - Health sciences, nursing, medical programs
- `arts` - Liberal arts, humanities, social sciences
- `trades` - Skilled trades, apprenticeships
- `education` - Teaching, early childhood education
- `science` - Pure sciences, mathematics, environmental

**Subject Areas:**
- Automatically detected from course titles and content
- Maps to specific activity templates and resource databases
- Provides contextual search parameters and source recommendations

### 3. Subject-Specific Adaptations

**Activity Templates:**
- **Municipal Admin**: Budget simulations, policy analysis, stakeholder engagement
- **Business**: Case studies, strategic planning, market research
- **Accounting**: Financial statement analysis, tax calculations, audit procedures
- **Computer Science**: Programming projects, code reviews, system design
- **Health Sciences**: Clinical cases, patient care scenarios, evidence-based practice

**Source Recommendations:**
- **Municipal**: Government reports, FCM resources, municipal websites
- **Business**: Industry reports, Statistics Canada, business journals
- **Accounting**: CPA Canada, CRA publications, accounting standards
- **Computer Science**: Official documentation, GitHub, Stack Overflow
- **Health**: Health Canada, medical journals, clinical guidelines

## 🚀 Using the System

### Step 1: Prepare Your Course Documents

1. **Create course directory**: `course-data/{COURSE-ID}/uploads/`
2. **Upload syllabus**: Must contain Program and Course information
3. **Add supporting documents**: Learning outcomes, course outlines, etc.

**Example Syllabus Structure:**
```
Program:
Business Diploma

Course:
Strategic Management (MGMT 301)

Course Description:
This course covers strategic planning, competitive analysis...
```

### Step 2: Run the System

```bash
# Process any course
node src/main.js MGMT-301

# The system will automatically:
# - Extract course context (Business → Strategic Management)
# - Generate business-specific activities
# - Use business-focused search queries
# - Apply business assessment criteria
```

### Step 3: Review Generated Content

The system produces:
- **Course Blueprint** - Tailored to your subject area
- **Learning Activities** - Subject-specific templates and examples
- **Production Specifications** - Appropriate for your discipline
- **Assessment Framework** - Aligned with subject standards

## 📋 Subject-Specific Features

### Municipal Administration
- **Sources**: Government reports, municipal websites, policy documents
- **Activities**: Budget simulations, service delivery analysis, stakeholder engagement
- **Examples**: Canadian municipalities, provincial regulations, FCM resources
- **Assessment**: Policy analysis, municipal planning projects, governance understanding

### Business Management
- **Sources**: Industry reports, market data, business case studies
- **Activities**: Strategic planning, market research, financial analysis
- **Examples**: Canadian businesses, Statistics Canada data, industry trends
- **Assessment**: Business plans, case analysis, strategic presentations

### Accounting
- **Sources**: CPA Canada standards, CRA publications, financial regulations
- **Activities**: Financial statement preparation, tax calculations, audit procedures
- **Examples**: Canadian accounting standards, real financial statements
- **Assessment**: Technical accuracy, compliance, professional communication

### Computer Science
- **Sources**: Official documentation, GitHub repositories, technical tutorials
- **Activities**: Programming projects, code reviews, system design challenges
- **Examples**: Current technologies, industry best practices, open source projects
- **Assessment**: Code quality, technical problem-solving, documentation

### Health Sciences
- **Sources**: Health Canada guidelines, medical journals, clinical research
- **Activities**: Case studies, patient care scenarios, evidence-based practice
- **Examples**: Canadian healthcare system, clinical guidelines, research studies
- **Assessment**: Clinical knowledge, patient safety, ethical considerations

## 🔍 Search Integration

### Automatic Query Adaptation
```javascript
// Municipal Administration
"budget planning municipal administration Canada 2023 2024 government municipal education"

// Business Management  
"strategic planning business management Canada 2023 2024 business government statistics"

// Computer Science
"web development computer science Canada 2023 2024 technical documentation tutorial"
```

### Domain Targeting
- **Municipal**: canada.ca, fcm.ca, municipal websites
- **Business**: statcan.gc.ca, bdc.ca, industry sites
- **Accounting**: cpacanada.ca, cra-arc.gc.ca
- **Computer Science**: github.com, stackoverflow.com, developer.mozilla.org
- **Health**: healthcanada.gc.ca, phac-aspc.gc.ca

## 🎨 Customization Options

### Adding New Subject Areas

1. **Update CourseContextExtractor** - Add subject keywords to `subjectAreaMap`
2. **Extend ActivityTemplates** - Add subject-specific templates
3. **Configure SearchService** - Add domain and source mappings
4. **Update ProductionGenerator** - Add subject requirements

### Example: Adding Psychology
```javascript
// In course-context-extractor.js
subjectAreaMap: {
    'psychology': ['psychology', 'mental health', 'behavioral', 'cognitive'],
    // ...
}

// In subject-activity-templates.js
'psychology': {
    reading: {
        sources: ['Psychology textbooks', 'Research journals', 'Case studies'],
        examples: ['APA publications', 'Canadian Psychological Association']
    },
    activities: ['Case analysis', 'Research projects', 'Behavioral observations']
}
```

## 📊 Quality Assurance

### Automatic Validation
- **Context Extraction**: Verifies Program/Course information found
- **Subject Classification**: Confirms appropriate subject area mapping
- **Template Selection**: Ensures subject-specific templates applied
- **Source Relevance**: Validates search domains and sources match subject

### Manual Review Points
- **Subject Area Accuracy**: Verify auto-classification is correct
- **Activity Relevance**: Ensure generated activities fit the discipline
- **Source Authority**: Confirm recommended sources are appropriate
- **Assessment Alignment**: Check criteria match subject standards

## 🔧 Troubleshooting

### Common Issues

**Issue**: Subject area not detected correctly
**Solution**: Check syllabus format, ensure Course row contains subject keywords

**Issue**: Generic activities generated instead of subject-specific
**Solution**: Verify subject area classification, add keywords to mapping if needed

**Issue**: Inappropriate sources recommended
**Solution**: Check search service domain mapping, add subject-specific domains

**Issue**: Assessment criteria don't match discipline
**Solution**: Review activity templates, ensure subject-specific criteria defined

### Debug Mode
```bash
# Enable detailed logging
DEBUG=true node src/main.js COURSE-ID

# Check course context extraction
node test-course-generalization.js
```

## 🎯 Best Practices

### For Course Developers
1. **Clear Syllabus Structure** - Use standard Program/Course format
2. **Descriptive Course Titles** - Include subject keywords for better classification
3. **Complete Documentation** - Provide learning outcomes and course descriptions
4. **Review Generated Content** - Verify subject-specific adaptations are appropriate

### For System Administrators
1. **Regular Template Updates** - Keep subject templates current with industry standards
2. **Source Validation** - Periodically review and update recommended sources
3. **New Subject Integration** - Add emerging disciplines as needed
4. **Quality Monitoring** - Track classification accuracy and content relevance

## 📈 Future Enhancements

### Planned Features
- **Industry-Specific Variants** - Specialized templates for different industries
- **Regional Adaptations** - Province-specific content and regulations
- **Competency Mapping** - Integration with professional certification requirements
- **Multi-Language Support** - French-language content generation
- **Advanced AI Classification** - Machine learning-based subject detection

### Integration Opportunities
- **LMS Platforms** - Direct integration with D2L, Canvas, Moodle
- **Professional Bodies** - Alignment with CPA, Engineers Canada, etc.
- **Government Standards** - Integration with provincial education requirements
- **Industry Partners** - Real-world case studies and current examples

---

## 🎉 Success! Your System is Now Universal

The AI Curriculum Design System can now process courses from **any discipline** with:
- ✅ Automatic subject detection and classification
- ✅ Subject-specific activity templates and resources
- ✅ Contextual search queries and authoritative sources
- ✅ Appropriate assessment criteria and production requirements
- ✅ Professional-quality output tailored to each discipline

**Ready to transform curriculum development across all subjects!** 🚀