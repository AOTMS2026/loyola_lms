require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { User, Profile, UserRole } = require('./models/User');
const { LeaderboardStat, Notification } = require('./models/System');
const { Enrollment, Course } = require('./models/Course');
const { Exam, QuestionBank, ExamResult, StudentExamAccess } = require('./models/Exam');
const { Batch, StudentBatch } = require('./models/Batch');

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('[DB] Connected');
};

// ─── USER DATA ───────────────────────────────────────────────────────────────
const usersToSeed = [
    // Super Admin
    { email: '23hp1a0548@gmail.com',       password: 'Admin@2024!',       fullName: 'System Admin',           role: 'admin',      courseType: 'full_time',  phone: '9000000001', rollNumber: '23HP1A0548', department: 'CSE',   year: '' },

    // Department Managers (one per department)
    { email: 'manager.cse@aotms.in',       password: 'Manager@CSE2024!',  fullName: 'Ravi Kumar (CSE Mgr)',   role: 'manager',    courseType: 'full_time',  phone: '9000000010', rollNumber: 'MGR-CSE-001', department: 'CSE',   year: '' },
    { email: 'manager.ece@aotms.in',       password: 'Manager@ECE2024!',  fullName: 'Priya Nair (ECE Mgr)',   role: 'manager',    courseType: 'full_time',  phone: '9000000011', rollNumber: 'MGR-ECE-001', department: 'ECE',   year: '' },
    { email: 'manager.eee@aotms.in',       password: 'Manager@EEE2024!',  fullName: 'Suresh B (EEE Mgr)',     role: 'manager',    courseType: 'full_time',  phone: '9000000012', rollNumber: 'MGR-EEE-001', department: 'EEE',   year: '' },
    { email: 'manager.ds@aotms.in',        password: 'Manager@DS2024!',   fullName: 'Kavitha R (DS Mgr)',     role: 'manager',    courseType: 'full_time',  phone: '9000000013', rollNumber: 'MGR-DS-001',  department: 'DS',    year: '' },
    { email: 'manager.aiml@aotms.in',      password: 'Manager@AIML2024!', fullName: 'Arjun K (AI/ML Mgr)',   role: 'manager',    courseType: 'full_time',  phone: '9000000014', rollNumber: 'MGR-AIML-001',department: 'AI/ML', year: '' },
    { email: 'manager.it@aotms.in',        password: 'Manager@IT2024!',   fullName: 'Deepika S (IT Mgr)',     role: 'manager',    courseType: 'full_time',  phone: '9000000015', rollNumber: 'MGR-IT-001',  department: 'IT',    year: '' },

    // Instructor
    { email: 'maheshchoudare21@gmail.com', password: 'Instructor@2024!',  fullName: 'Mahesh Choudare',        role: 'instructor', courseType: 'full_time',  phone: '9000000003', rollNumber: '23HP1A0550', department: 'CSE',   year: '' },

    // ─── CSE Students (roll: 23HP1A05xx) ──────────────────────────────────────
    { email: 'anuraguthu31@gmail.com',     password: 'Anu@2005',          fullName: 'Anu Raguthu',            role: 'student',    courseType: 'full_time',  phone: '9100000001', rollNumber: '23HP1A0501', department: 'CSE',   year: '3' },
    { email: 'maheshgutha21@gmail.com',    password: 'Mahesh@2005',       fullName: 'Mahesh Gutha',           role: 'student',    courseType: 'full_time',  phone: '9100000002', rollNumber: '23HP1A0502', department: 'CSE',   year: '3' },
    { email: 'pooja.mishra32@gmail.com',   password: 'Pooja@2005',        fullName: 'Pooja Mishra',           role: 'student',    courseType: 'full_time',  phone: '9100000003', rollNumber: '23HP1A0503', department: 'CSE',   year: '3' },
    { email: 'deepika.ch38@gmail.com',     password: 'Deepika@2005',      fullName: 'Deepika Ch',             role: 'student',    courseType: 'full_time',  phone: '9100000004', rollNumber: '23HP1A0504', department: 'CSE',   year: '4' },

    // ─── ECE Students ─────────────────────────────────────────────────────────
    { email: 'rahul.verma23@gmail.com',    password: 'Rahul@2005',        fullName: 'Rahul Verma',            role: 'student',    courseType: 'full_time',  phone: '9100000005', rollNumber: '23HP1A0505', department: 'ECE',   year: '2' },
    { email: 'priya.sharma22@gmail.com',   password: 'Priya@2005',        fullName: 'Priya Sharma',           role: 'student',    courseType: 'full_time',  phone: '9100000006', rollNumber: '23HP1A0506', department: 'ECE',   year: '2' },
    { email: 'naveen.reddy39@gmail.com',   password: 'Naveen@2005',       fullName: 'Naveen Reddy',           role: 'student',    courseType: 'full_time',  phone: '9100000007', rollNumber: '23HP1A0507', department: 'ECE',   year: '3' },

    // ─── EEE Students ─────────────────────────────────────────────────────────
    { email: 'sneha.reddy24@gmail.com',    password: 'Sneha@2005',        fullName: 'Sneha Reddy',            role: 'student',    courseType: 'full_time',  phone: '9100000008', rollNumber: '23HP1A0508', department: 'EEE',   year: '1' },
    { email: 'kavitha.m36@gmail.com',      password: 'Kavitha@2005',      fullName: 'Kavitha M',              role: 'student',    courseType: 'full_time',  phone: '9100000009', rollNumber: '23HP1A0509', department: 'EEE',   year: '3' },
    { email: 'rohit.gupta35@gmail.com',    password: 'Rohit@2005',        fullName: 'Rohit Gupta',            role: 'student',    courseType: 'full_time',  phone: '9100000010', rollNumber: '23HP1A0510', department: 'EEE',   year: '1' },

    // ─── DS Students ──────────────────────────────────────────────────────────
    { email: 'arjun.krishna25@gmail.com',  password: 'Arjun@2005',        fullName: 'Arjun Krishna',          role: 'student',    courseType: 'full_time',  phone: '9100000011', rollNumber: '23HP1A0511', department: 'DS',    year: '1' },
    { email: 'divya.nair26@gmail.com',     password: 'Divya@2005',        fullName: 'Divya Nair',             role: 'student',    courseType: 'full_time',  phone: '9100000012', rollNumber: '23HP1A0512', department: 'DS',    year: '4' },
    { email: 'ananya.das34@gmail.com',     password: 'Ananya@2005',       fullName: 'Ananya Das',             role: 'student',    courseType: 'full_time',  phone: '9100000013', rollNumber: '23HP1A0513', department: 'DS',    year: '2' },

    // ─── AI/ML Students ───────────────────────────────────────────────────────
    { email: 'meera.iyer28@gmail.com',     password: 'Meera@2005',        fullName: 'Meera Iyer',             role: 'student',    courseType: 'full_time',  phone: '9100000014', rollNumber: '23HP1A0514', department: 'AI/ML', year: '3' },
    { email: 'suresh.babu29@gmail.com',    password: 'Suresh@2005',       fullName: 'Suresh Babu',            role: 'student',    courseType: 'full_time',  phone: '9100000015', rollNumber: '23HP1A0515', department: 'AI/ML', year: '2' },

    // ─── IT Students ──────────────────────────────────────────────────────────
    { email: 'lakshmi.devi30@gmail.com',   password: 'Lakshmi@2005',      fullName: 'Lakshmi Devi',           role: 'student',    courseType: 'full_time',  phone: '9100000016', rollNumber: '23HP1A0516', department: 'IT',    year: '1' },
    { email: 'vijay.kumar31@gmail.com',    password: 'Vijay@2005',        fullName: 'Vijay Kumar',            role: 'student',    courseType: 'full_time',  phone: '9100000017', rollNumber: '23HP1A0517', department: 'IT',    year: '4' },
    { email: 'ravi.shankar33@gmail.com',   password: 'Ravi@2005',         fullName: 'Ravi Shankar',           role: 'student',    courseType: 'full_time',  phone: '9100000018', rollNumber: '23HP1A0518', department: 'IT',    year: '2' },

    // ─── Intern ───────────────────────────────────────────────────────────────
    { email: 'swathiraguthu@gmail.com',    password: 'Swathi@2005',       fullName: 'Swathi Raguthu',         role: 'intern',     courseType: 'internship', phone: '9200000001', rollNumber: '23HP1A0521', department: 'CSE',   year: '3' },

    // ─── Sanjay & Kiran remain as misc CSE students ───────────────────────────
    { email: 'sanjay.rao37@gmail.com',     password: 'Sanjay@2005',       fullName: 'Sanjay Rao',             role: 'student',    courseType: 'full_time',  phone: '9100000019', rollNumber: '23HP1A0519', department: 'CSE',   year: '4' },
    { email: 'kiran.patel27@gmail.com',    password: 'Kiran@2005',        fullName: 'Kiran Patel',            role: 'student',    courseType: 'full_time',  phone: '9100000020', rollNumber: '23HP1A0520', department: 'CSE',   year: '4' },
];

// ─── COURSE ENROLLMENTS (Each student only in their DEPT course + optional skill courses) ───
// Rule: student enrolls in their dept course + max 1 skill course
const courseEnrollments = {
    // Department courses — students ONLY from that dept
    'cse':       ['anuraguthu31@gmail.com', 'maheshgutha21@gmail.com', 'pooja.mishra32@gmail.com', 'deepika.ch38@gmail.com', 'sanjay.rao37@gmail.com', 'kiran.patel27@gmail.com'],
    'ece':       ['rahul.verma23@gmail.com', 'priya.sharma22@gmail.com', 'naveen.reddy39@gmail.com'],
    'eee':       ['sneha.reddy24@gmail.com', 'kavitha.m36@gmail.com', 'rohit.gupta35@gmail.com'],
    'ds':        ['arjun.krishna25@gmail.com', 'divya.nair26@gmail.com', 'ananya.das34@gmail.com'],
    'aiml':      ['meera.iyer28@gmail.com', 'suresh.babu29@gmail.com'],
    'it':        ['lakshmi.devi30@gmail.com', 'vijay.kumar31@gmail.com', 'ravi.shankar33@gmail.com'],
    // mech has no students in this seed — dept not in our student list
    'mech':      [],

    // Skill courses — open to ALL departments (placement prep)
    'coding':    ['anuraguthu31@gmail.com', 'maheshgutha21@gmail.com', 'rahul.verma23@gmail.com', 'arjun.krishna25@gmail.com', 'meera.iyer28@gmail.com', 'lakshmi.devi30@gmail.com'],
    'reasoning': ['pooja.mishra32@gmail.com', 'priya.sharma22@gmail.com', 'sneha.reddy24@gmail.com', 'divya.nair26@gmail.com', 'suresh.babu29@gmail.com', 'vijay.kumar31@gmail.com'],
    'aptitude':  ['deepika.ch38@gmail.com', 'naveen.reddy39@gmail.com', 'kavitha.m36@gmail.com', 'ananya.das34@gmail.com', 'rohit.gupta35@gmail.com', 'ravi.shankar33@gmail.com'],
};

// Batch sessions
const batchSessionMap = {
    'cse':       ['morning', 'morning', 'afternoon', 'afternoon', 'evening', 'morning'],
    'ece':       ['morning', 'afternoon', 'morning'],
    'eee':       ['morning', 'afternoon', 'morning'],
    'ds':        ['morning', 'morning', 'evening'],
    'aiml':      ['morning', 'afternoon'],
    'it':        ['morning', 'morning', 'afternoon'],
    'mech':      [],
    'coding':    ['morning', 'morning', 'afternoon', 'afternoon', 'morning', 'afternoon'],
    'reasoning': ['morning', 'afternoon', 'morning', 'evening', 'morning', 'afternoon'],
    'aptitude':  ['morning', 'morning', 'afternoon', 'evening', 'afternoon', 'morning'],
};

const seedData = async () => {
    await connectDB();

    try {
        // ─── DROP OLD CONFLICTING INDEXES (run once, safe to run multiple times) ──
        console.log('\n========== PRE-STEP: Dropping old unique indexes ==========');
        try {
            await mongoose.connection.db.collection('profiles').dropIndex('roll_number_1');
            console.log('  ✓ Dropped index: roll_number_1');
        } catch (e) { console.log('  ~ roll_number_1 index not found (ok)'); }
        try {
            await mongoose.connection.db.collection('profiles').dropIndex('mobile_number_1');
            console.log('  ✓ Dropped index: mobile_number_1');
        } catch (e) { console.log('  ~ mobile_number_1 index not found (ok)'); }

        // ─── STEP 1: Users ──────────────────────────────────────────────────────
        console.log('\n========== STEP 1: Seeding Users ==========');
        const userMap = {};
        let instructorId = null;
        let adminId = null;

        for (const item of usersToSeed) {
            const salt = await bcrypt.genSalt(10);
            const passwordHash = await bcrypt.hash(item.password, salt);
            const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(item.fullName)}&background=random&color=fff`;
            const now = new Date();
            const registrationDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const registrationTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

            let userObj = await User.findOne({ email: item.email });
            if (userObj) {
                console.log(`  [UPDATE] ${item.email}`);
                userObj.password_hash = passwordHash;
                userObj.full_name = item.fullName;
                userObj.avatar_url = avatarUrl;
                userObj.phone = item.phone;
                await userObj.save();
            } else {
                console.log(`  [CREATE] ${item.email}`);
                userObj = await User.create({ email: item.email, password_hash: passwordHash, full_name: item.fullName, avatar_url: avatarUrl, phone: item.phone, registration_date: registrationDate, registration_time: registrationTime });
            }

            await Profile.findOneAndUpdate(
                { user_id: userObj._id },
                { user_id: userObj._id, email: item.email, full_name: item.fullName, avatar_url: avatarUrl, mobile_number: item.phone, department: item.department || '', roll_number: item.rollNumber || '', year: item.year || '', course_type: item.courseType, registration_date: registrationDate, registration_time: registrationTime, approval_status: 'approved', updated_at: new Date() },
                { upsert: true, returnDocument: 'after' }
            );

            await UserRole.findOneAndUpdate(
                { user_id: userObj._id },
                { user_id: userObj._id, role: item.role, updated_at: new Date() },
                { upsert: true, returnDocument: 'after' }
            );

            userMap[item.email] = userObj;
            if (item.role === 'instructor') instructorId = userObj._id;
            if (item.role === 'admin') adminId = userObj._id;
        }
        console.log(`  ✓ ${usersToSeed.length} users seeded`);

        // ─── STEP 2: Courses ────────────────────────────────────────────────────
        console.log('\n========== STEP 2: Seeding Courses ==========');
        const coursesToSeed = [
            // Department-specific courses
            { slug: 'cse',       title: 'Computer Science and Engineering (CSE)',             desc: 'Core CS: software dev, data structures, algorithms.',           category: 'Engineering',       color: '#3B82F6', department: 'CSE'   },
            { slug: 'ece',       title: 'Electronics and Communication Engineering (ECE)',    desc: 'Digital electronics, microprocessors, communication.',           category: 'Engineering',       color: '#8B5CF6', department: 'ECE'   },
            { slug: 'ds',        title: 'Data Science (DS)',                                  desc: 'Analytics, ML, data visualization.',                            category: 'Engineering',       color: '#10B981', department: 'DS'    },
            { slug: 'aiml',      title: 'Artificial Intelligence & Machine Learning (AIML)', desc: 'Deep learning, neural networks, AI.',                           category: 'Engineering',       color: '#F59E0B', department: 'AI/ML' },
            { slug: 'it',        title: 'Information Technology (IT)',                        desc: 'DBMS, networking, cybersecurity, web.',                         category: 'Engineering',       color: '#EF4444', department: 'IT'    },
            { slug: 'mech',      title: 'Mechanical Engineering (MECH)',                      desc: 'Thermodynamics, manufacturing, machine design.',                category: 'Engineering',       color: '#6366F1', department: 'MECH'  },
            { slug: 'eee',       title: 'Electrical and Electronics Engineering (EEE)',       desc: 'Power systems, circuits, control machinery.',                   category: 'Engineering',       color: '#EC4899', department: 'EEE'   },
            // Skill courses (open to all departments — null dept = no restriction)
            { slug: 'coding',    title: 'Coding & Programming Fundamentals',                  desc: 'Programming, problem-solving, algorithms.',                    category: 'Skill Development', color: '#14B8A6', department: null    },
            { slug: 'reasoning', title: 'Logical Reasoning & Critical Thinking',              desc: 'Syllogisms, puzzles, series, reasoning for placements.',       category: 'Skill Development', color: '#F97316', department: null    },
            { slug: 'aptitude',  title: 'Quantitative Aptitude & Problem Solving',            desc: 'Arithmetic, algebra, percentages, placement prep.',            category: 'Skill Development', color: '#84CC16', department: null    },
        ];

        const courseMap = {};

        for (const item of coursesToSeed) {
            const courseData = {
                title: item.title, slug: item.slug, description: item.desc,
                thumbnail_url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=600',
                instructor_ids: instructorId ? [instructorId] : [],
                category: item.category, department: item.department || null,
                price: 0, original_price: 19999, status: 'published',
                level: 'beginner', duration: '4 Months', theme_color: item.color,
                is_active: true, updated_at: new Date()
            };
            let course = await Course.findOne({ slug: item.slug });
            if (course) {
                await Course.updateOne({ slug: item.slug }, { $set: courseData });
                course = await Course.findOne({ slug: item.slug });
            } else {
                course = await Course.create(courseData);
            }
            courseMap[item.slug] = course;
            console.log(`  [${course.isNew ? 'CREATE' : 'UPDATE'}] ${item.slug} (dept: ${item.department || 'ALL'})`);
        }
        console.log(`  ✓ ${coursesToSeed.length} courses seeded`);

        // ─── STEP 3: Batches ────────────────────────────────────────────────────
        console.log('\n========== STEP 3: Seeding Batches ==========');
        const batchMap = {};

        for (const item of coursesToSeed) {
            const course = courseMap[item.slug];
            const sessions = ['morning', 'afternoon', 'evening'];
            batchMap[item.slug] = {};
            for (const session of sessions) {
                let batch = await Batch.findOne({ course_id: course._id, batch_type: session });
                if (!batch) {
                    batch = await Batch.create({
                        batch_name: `${item.slug.toUpperCase()} - ${session.charAt(0).toUpperCase() + session.slice(1)}`,
                        batch_type: session, course_id: course._id,
                        instructor_id: instructorId, max_students: 30,
                        is_active: true, status: 'approved',
                        start_time: session === 'morning' ? '09:00' : session === 'afternoon' ? '14:00' : '18:00',
                        end_time: session === 'morning' ? '11:00' : session === 'afternoon' ? '16:00' : '20:00',
                        department: item.department || null
                    });
                }
                batchMap[item.slug][session] = batch;
            }
        }
        console.log(`  ✓ Batches seeded`);

        // ─── STEP 4: Enrollments ────────────────────────────────────────────────
        console.log('\n========== STEP 4: Seeding Enrollments ==========');
        for (const [slug, emails] of Object.entries(courseEnrollments)) {
            const course = courseMap[slug];
            const sessions = batchSessionMap[slug] || [];
            for (let i = 0; i < emails.length; i++) {
                const email = emails[i];
                const student = userMap[email];
                if (!student) continue;

                let enroll = await Enrollment.findOne({ user_id: student._id, course_id: course._id });
                if (!enroll) {
                    enroll = await Enrollment.create({ user_id: student._id, course_id: course._id, status: 'active', progress_percentage: Math.floor(Math.random() * 40) + 60, enrolled_at: new Date() });
                }

                const session = sessions[i] || 'morning';
                const batch = batchMap[slug]?.[session];
                if (batch) {
                    const existSB = await StudentBatch.findOne({ student_id: student._id, course_id: course._id });
                    if (!existSB) {
                        await StudentBatch.create({ student_id: student._id, course_id: course._id, batch_id: batch._id, assigned_session: session, assigned_by: adminId });
                    }
                }
                console.log(`  [ENROLL] ${email} → ${slug} (${session})`);
            }
        }
        console.log(`  ✓ Enrollments seeded`);

        // ─── STEP 2b: Force-patch department on ALL existing exams & questions ──
        console.log('\n========== STEP 2b: Patching department on existing data ==========');

        const deptByCourseSlug = {
            'cse': 'CSE', 'ece': 'ECE', 'eee': 'EEE', 'ds': 'DS',
            'aiml': 'AI/ML', 'it': 'IT', 'mech': 'MECH',
            'coding': null, 'reasoning': null, 'aptitude': null
        };

        for (const [slug, dept] of Object.entries(deptByCourseSlug)) {
            const course = courseMap[slug];
            if (!course) continue;

            // Patch all exams for this course (collection: exam_schedulings)
            const examResult = await mongoose.connection.db.collection('exam_schedulings').updateMany(
                { course_id: course._id },
                { $set: { department: dept } }
            );
            // Patch all question_bank entries for this course (collection: questionbanks)
            const qbResult = await mongoose.connection.db.collection('questionbanks').updateMany(
                { course_id: course._id },
                { $set: { department: dept } }
            );
            console.log(`  [PATCH] ${slug.toUpperCase()} → dept:${dept || 'ALL'} | exams:${examResult.modifiedCount} | questions:${qbResult.modifiedCount}`);
        }
        console.log('  ✓ Department patched on all existing exams and questions');


        console.log('\n========== STEP 5: Seeding Question Banks ==========');

        const questionData = {
            // CSE
            'cse': {
                topic: 'Data Structures & Algorithms', department: 'CSE',
                questions: [
                    { q: 'What is the time complexity of binary search?',        opts: ['O(n)', 'O(log n)', 'O(n²)', 'O(1)'],                                                             correct: 1 },
                    { q: 'Which data structure uses LIFO order?',                opts: ['Queue', 'Stack', 'Tree', 'Graph'],                                                               correct: 1 },
                    { q: 'What is polymorphism in OOP?',                         opts: ['One class, many forms', 'Many classes, one form', 'Only inheritance', 'Only encapsulation'],    correct: 0 },
                    { q: 'Which sorting algorithm has O(n log n) average case?', opts: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'],                                correct: 2 },
                    { q: 'What is a linked list?',                               opts: ['Array of pointers', 'Sequence of nodes', 'Stack structure', 'Binary tree'],                    correct: 1 },
                ]
            },
            // ECE
            'ece': {
                topic: 'Digital Electronics', department: 'ECE',
                questions: [
                    { q: 'What is the output of an AND gate when both inputs are 1?', opts: ['0', '1', 'X', 'Z'],                                                                        correct: 1 },
                    { q: 'Which number system uses base 16?',                    opts: ['Binary', 'Octal', 'Decimal', 'Hexadecimal'],                                                     correct: 3 },
                    { q: 'What does a flip-flop store?',                         opts: ['1 byte', '1 bit', '4 bits', '1 nibble'],                                                         correct: 1 },
                    { q: 'NOR gate is a combination of which gates?',            opts: ['NOT + AND', 'NOT + OR', 'AND + OR', 'NAND + NOT'],                                              correct: 1 },
                    { q: 'What is the binary equivalent of decimal 10?',         opts: ['1010', '1001', '1100', '1110'],                                                                  correct: 0 },
                ]
            },
            // EEE
            'eee': {
                topic: 'Power Systems', department: 'EEE',
                questions: [
                    { q: 'What is the unit of electrical power?',                opts: ['Volt', 'Ampere', 'Watt', 'Ohm'],                                                                correct: 2 },
                    { q: 'What does a transformer do?',                          opts: ['Converts AC to DC', 'Changes voltage levels', 'Stores energy', 'Measures current'],            correct: 1 },
                    { q: "What is the formula for Ohm's Law?",                   opts: ['V = IR', 'P = IV', 'I = PR', 'R = VP'],                                                         correct: 0 },
                    { q: 'Which type of current is used in households?',         opts: ['DC', 'AC', 'Pulsating DC', 'None'],                                                             correct: 1 },
                    { q: 'Power factor is the cosine of?',                       opts: ['Voltage angle', 'Phase angle between V and I', 'Current angle', 'Impedance angle'],            correct: 1 },
                ]
            },
            // DS
            'ds': {
                topic: 'Machine Learning Basics', department: 'DS',
                questions: [
                    { q: 'Which algorithm is used for classification problems?', opts: ['Linear Regression', 'Logistic Regression', 'K-Means', 'PCA'],                                  correct: 1 },
                    { q: 'What does overfitting mean?',                          opts: ['Model performs well on train, poor on test', 'Model performs well on test', 'Underfitted model', 'None'], correct: 0 },
                    { q: 'Which metric is used for regression?',                 opts: ['Accuracy', 'F1 Score', 'RMSE', 'Precision'],                                                    correct: 2 },
                    { q: 'K-Means is a type of?',                                opts: ['Supervised learning', 'Unsupervised learning', 'Reinforcement learning', 'Deep learning'],      correct: 1 },
                    { q: 'What is a decision tree?',                             opts: ['A sorting algorithm', 'A tree-based model', 'A neural network', 'A clustering method'],        correct: 1 },
                ]
            },
            // AI/ML
            'aiml': {
                topic: 'Neural Networks', department: 'AI/ML',
                questions: [
                    { q: 'What is an activation function?',                      opts: ['A loss function', 'Introduces non-linearity', 'An optimizer', 'A weight initializer'],         correct: 1 },
                    { q: 'What does backpropagation do?',                        opts: ['Feeds data forward', 'Updates weights using gradients', 'Normalizes inputs', 'Reduces overfitting'], correct: 1 },
                    { q: 'Which optimizer is widely used in deep learning?',     opts: ['SGD', 'Adam', 'RMSProp', 'All of the above'],                                                   correct: 3 },
                    { q: 'CNN is primarily used for?',                           opts: ['Text processing', 'Time series', 'Image recognition', 'Audio processing'],                     correct: 2 },
                    { q: 'RNN is best suited for?',                              opts: ['Image data', 'Sequential/time-series data', 'Tabular data', 'Clustering'],                     correct: 1 },
                ]
            },
            // IT
            'it': {
                topic: 'Database Management', department: 'IT',
                questions: [
                    { q: 'What does SQL stand for?',                             opts: ['Structured Query Language', 'Simple Query Language', 'Standard Query Logic', 'Structured Queue Logic'], correct: 0 },
                    { q: 'Which command retrieves data from a table?',           opts: ['INSERT', 'UPDATE', 'SELECT', 'DELETE'],                                                         correct: 2 },
                    { q: 'What is a primary key?',                               opts: ['Allows duplicates', 'Uniquely identifies a record', 'A foreign reference', 'An index key'],   correct: 1 },
                    { q: 'Which JOIN returns all records from both tables?',     opts: ['INNER JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'FULL OUTER JOIN'],                                     correct: 3 },
                    { q: 'What is normalization in databases?',                  opts: ['Adding redundancy', 'Reducing redundancy', 'Creating indexes', 'Partitioning tables'],         correct: 1 },
                ]
            },
            // MECH
            'mech': {
                topic: 'Thermodynamics', department: 'MECH',
                questions: [
                    { q: 'What is the first law of thermodynamics?',             opts: ['Energy cannot be created or destroyed', 'Entropy always increases', 'Heat flows cold to hot', 'Work = force × distance'], correct: 0 },
                    { q: 'Which cycle is used in petrol engines?',               opts: ['Diesel cycle', 'Otto cycle', 'Rankine cycle', 'Brayton cycle'],                                correct: 1 },
                    { q: 'What is the unit of pressure?',                        opts: ['Newton', 'Joule', 'Pascal', 'Watt'],                                                            correct: 2 },
                    { q: 'What is entropy a measure of?',                        opts: ['Temperature', 'Disorder in a system', 'Pressure', 'Volume'],                                   correct: 1 },
                    { q: 'Which law states heat flows from hot to cold?',        opts: ['Zeroth law', 'First law', 'Second law', 'Third law'],                                           correct: 2 },
                ]
            },
            // Skill courses (no dept restriction)
            'coding': {
                topic: 'Programming Fundamentals', department: null,
                questions: [
                    { q: 'Which keyword defines a function in Python?',          opts: ['func', 'function', 'def', 'define'],                                                            correct: 2 },
                    { q: 'Output of: print(2 ** 3) in Python?',                  opts: ['6', '8', '9', '5'],                                                                             correct: 1 },
                    { q: 'Which is NOT a programming language?',                 opts: ['Python', 'Java', 'HTML', 'C++'],                                                                correct: 2 },
                    { q: 'What does a loop do?',                                 opts: ['Terminates program', 'Repeats code block', 'Declares variable', 'Imports module'],             correct: 1 },
                    { q: 'Index of the first element in an array?',              opts: ['1', '-1', '0', 'Depends on language'],                                                          correct: 2 },
                    { q: 'Which data type stores True or False?',                opts: ['int', 'string', 'boolean', 'float'],                                                            correct: 2 },
                    { q: 'What does "++i" do in C/C++?',                         opts: ['Post-increments i', 'Pre-increments i', 'Decrements i', 'Does nothing'],                      correct: 1 },
                    { q: 'Single-line comment symbol in Python?',                opts: ['/', '//', '#', '--'],                                                                            correct: 2 },
                    { q: 'What is recursion?',                                   opts: ['A loop structure', 'A function calling itself', 'An array operation', 'A class method'],      correct: 1 },
                    { q: 'Best average time complexity sorting algorithm?',      opts: ['Bubble Sort', 'Selection Sort', 'Merge Sort', 'Insertion Sort'],                               correct: 2 },
                ]
            },
            'reasoning': {
                topic: 'Logical Reasoning', department: null,
                questions: [
                    { q: 'All roses are flowers, all flowers are plants. Roses are?', opts: ['Animals', 'Trees', 'Plants', 'None'],                                                    correct: 2 },
                    { q: 'Odd one out: 2, 4, 6, 9, 10',                          opts: ['2', '4', '9', '10'],                                                                           correct: 2 },
                    { q: 'A is brother of B, B is sister of C. A is related to C?', opts: ['Sister', 'Brother', 'Cousin', 'Uncle'],                                                    correct: 1 },
                    { q: 'Complete: 3, 6, 12, 24, ?',                            opts: ['36', '48', '30', '42'],                                                                        correct: 1 },
                    { q: 'CODING→DPEJOH. LOGIC becomes?',                        opts: ['MPHJD', 'MNHJD', 'MPJHD', 'NMPJH'],                                                           correct: 0 },
                    { q: 'Clock at 3:00 — angle between hands?',                 opts: ['45°', '60°', '90°', '120°'],                                                                   correct: 2 },
                    { q: 'Always a logical fallacy?',                            opts: ['Modus Ponens', 'Ad Hominem', 'Syllogism', 'Hypothetical Syllogism'],                           correct: 1 },
                    { q: 'MANGO = 41. GRAPE = ?',                                opts: ['39', '43', '41', '45'],                                                                        correct: 1 },
                    { q: 'Next in: AZ, BY, CX, DW, ?',                          opts: ['EV', 'EU', 'FV', 'EW'],                                                                        correct: 0 },
                    { q: '"She is daughter of my grandfather\'s only son." Relation?', opts: ['Sister', 'Cousin', 'Aunt', 'Mother'],                                                   correct: 0 },
                ]
            },
            'aptitude': {
                topic: 'Quantitative Aptitude', department: null,
                questions: [
                    { q: 'What is 15% of 200?',                                  opts: ['25', '30', '35', '40'],                                                                        correct: 1 },
                    { q: 'Train travels 240 km in 4 hours. Speed?',              opts: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'],                                                   correct: 2 },
                    { q: 'LCM of 12 and 18?',                                    opts: ['6', '24', '36', '72'],                                                                         correct: 2 },
                    { q: 'Shirt ₹500, 20% discount. New price?',                opts: ['₹400', '₹380', '₹420', '₹450'],                                                               correct: 0 },
                    { q: '5 workers finish in 8 days. 10 workers take?',        opts: ['16', '4', '8', '2'],                                                                           correct: 1 },
                    { q: 'Square root of 144?',                                  opts: ['11', '12', '13', '14'],                                                                        correct: 1 },
                    { q: 'Sum becomes ₹1200 SI in 2 yrs at 10%. Principal?',   opts: ['₹800', '₹900', '₹1000', '₹1100'],                                                             correct: 2 },
                    { q: 'A:B = 3:5. B = 25, A = ?',                            opts: ['10', '12', '15', '18'],                                                                        correct: 2 },
                    { q: 'Average of 10,20,30,40,50?',                          opts: ['25', '30', '35', '40'],                                                                        correct: 1 },
                    { q: 'Sold at 25% profit for ₹500. Cost price?',            opts: ['₹350', '₹375', '₹400', '₹425'],                                                              correct: 2 },
                ]
            },
        };

        const qbMap = {};

        for (const [slug, data] of Object.entries(questionData)) {
            const course = courseMap[slug];
            const existing = await QuestionBank.find({ topic: data.topic, course_id: course._id });
            if (existing.length > 0) {
                console.log(`  [UPDATE] QB: ${data.topic} | Dept: ${data.department || 'ALL'} | ${existing.length} questions`);
                await QuestionBank.updateMany(
                    { course_id: course._id },
                    { $set: { department: data.department !== undefined ? data.department : null, topic: data.topic } }
                );
                qbMap[slug] = await QuestionBank.find({ course_id: course._id });
                continue;
            }

            const questions = [];
            for (const tmpl of data.questions) {
                const q = await QuestionBank.create({
                    topic: data.topic,
                    difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)],
                    question_text: tmpl.q,
                    options: tmpl.opts.map((text, idx) => ({ text, is_correct: idx === tmpl.correct })),
                    correct_answer: tmpl.opts[tmpl.correct],
                    type: 'multiple_choice', marks: 2,
                    course_id: course._id,
                    department: data.department || null,
                    approval_status: 'approved',
                    created_by: adminId
                });
                questions.push(q);
            }
            qbMap[slug] = questions;
            console.log(`  [CREATE] QB: ${data.topic} | Dept: ${data.department || 'ALL'} | ${questions.length} questions`);
        }
        console.log(`  ✓ Question banks seeded`);

        // ─── STEP 6: Exams per course (dept-tagged) ─────────────────────────────
        console.log('\n========== STEP 6: Seeding Exams ==========');
        const examMap = {};

        const examConfig = {
            // Dept exams (5 questions × 2 marks = 10)
            'cse':       { title: 'CSE Week 1 — Data Structures Assessment',        questions: 5, dept: 'CSE'   },
            'ece':       { title: 'ECE Week 1 — Digital Electronics Assessment',    questions: 5, dept: 'ECE'   },
            'eee':       { title: 'EEE Week 1 — Power Systems Assessment',          questions: 5, dept: 'EEE'   },
            'ds':        { title: 'DS Week 1 — Machine Learning Assessment',        questions: 5, dept: 'DS'    },
            'aiml':      { title: 'AI/ML Week 1 — Neural Networks Assessment',      questions: 5, dept: 'AI/ML' },
            'it':        { title: 'IT Week 1 — Database Management Assessment',     questions: 5, dept: 'IT'    },
            'mech':      { title: 'MECH Week 1 — Thermodynamics Assessment',        questions: 5, dept: 'MECH'  },
            // Skill exams (10 questions × 2 marks = 20, open to all)
            'coding':    { title: 'Coding Fundamentals — Placement Readiness Test', questions: 10, dept: null   },
            'reasoning': { title: 'Logical Reasoning — Placement Readiness Test',   questions: 10, dept: null   },
            'aptitude':  { title: 'Quantitative Aptitude — Placement Readiness Test',questions: 10, dept: null  },
        };

        const scheduledDate = new Date();
        scheduledDate.setDate(scheduledDate.getDate() - 7);

        for (const [slug, cfg] of Object.entries(examConfig)) {
            const course = courseMap[slug];
            let exam = await Exam.findOne({ course_id: course._id, exam_type: 'mock' });
            const totalMarks = cfg.questions * 2;
            const passingMarks = Math.ceil(totalMarks * 0.6);

            const examData = {
                title: cfg.title,
                description: `${cfg.dept || 'Placement Prep'} assessment — Week 1 foundation test.`,
                exam_type: 'mock', course_id: course._id,
                department: cfg.dept || null,
                duration_minutes: cfg.questions === 10 ? 45 : 30,
                total_marks: totalMarks, passing_marks: passingMarks,
                negative_marking: 0, max_attempts: 2,
                scheduled_date: scheduledDate,
                shuffle_questions: true, show_results: true,
                status: 'completed', approval_status: 'approved',
                total_questions: cfg.questions,
                topics: [questionData[slug]?.topic || cfg.title],
                created_by: adminId, is_active: true
            };

            if (exam) {
                await Exam.updateOne({ _id: exam._id }, { $set: examData });
                exam = await Exam.findById(exam._id);
                console.log(`  [UPDATE] Exam: ${cfg.title} | Dept: ${cfg.dept || 'ALL'}`);
            } else {
                exam = await Exam.create(examData);
                console.log(`  [CREATE] Exam: ${cfg.title} | Dept: ${cfg.dept || 'ALL'}`);
            }
            examMap[slug] = exam;
        }
        console.log(`  ✓ Exams seeded — 7 dept exams + 3 skill exams = 10 total`);

        // ─── STEP 7: Exam Results (students only take THEIR dept exam + skill exam) ──
        console.log('\n========== STEP 7: Seeding Exam Results ==========');

        // Scores per student per course slug
        const examScores = {
            // CSE students — take CSE exam + coding skill exam
            'anuraguthu31@gmail.com':  { 'cse': 8,  'coding': 16, 'reasoning': 14 },
            'maheshgutha21@gmail.com': { 'cse': 9,  'coding': 18, 'reasoning': 12 },
            'pooja.mishra32@gmail.com':{ 'cse': 7,  'reasoning': 14 },
            'deepika.ch38@gmail.com':  { 'cse': 10, 'aptitude': 18 },
            'sanjay.rao37@gmail.com':  { 'cse': 8  },
            'kiran.patel27@gmail.com': { 'cse': 6  },

            // ECE students
            'rahul.verma23@gmail.com': { 'ece': 9,  'coding': 14, 'aptitude': 16 },
            'priya.sharma22@gmail.com':{ 'ece': 7,  'reasoning': 16 },
            'naveen.reddy39@gmail.com':{ 'ece': 8,  'aptitude': 14 },

            // EEE students
            'sneha.reddy24@gmail.com': { 'eee': 10, 'reasoning': 18 },
            'kavitha.m36@gmail.com':   { 'eee': 8,  'reasoning': 16 },
            'rohit.gupta35@gmail.com': { 'eee': 6,  'aptitude': 14 },

            // DS students
            'arjun.krishna25@gmail.com':{ 'ds': 8,  'coding': 16 },
            'divya.nair26@gmail.com':   { 'ds': 9,  'aptitude': 18 },
            'ananya.das34@gmail.com':   { 'ds': 10, 'aptitude': 20 },

            // AI/ML students
            'meera.iyer28@gmail.com':   { 'aiml': 10, 'coding': 20 },
            'suresh.babu29@gmail.com':  { 'aiml': 8,  'reasoning': 18 },

            // IT students
            'lakshmi.devi30@gmail.com': { 'it': 8,  'coding': 16 },
            'vijay.kumar31@gmail.com':  { 'it': 7,  'reasoning': 18 },
            'ravi.shankar33@gmail.com': { 'it': 9,  'aptitude': 16 },
        };

        const skillCourses = ['coding', 'reasoning', 'aptitude'];

        for (const [email, scores] of Object.entries(examScores)) {
            const student = userMap[email];
            if (!student) continue;

            for (const [slug, score] of Object.entries(scores)) {
                const exam = examMap[slug];
                const course = courseMap[slug];
                if (!exam || !course) continue;

                const isSkill = skillCourses.includes(slug);
                const totalMarks = isSkill ? 20 : 10;
                const percentage = (score / totalMarks) * 100;

                const existing = await ExamResult.findOne({ student_id: student._id, exam_id: exam._id });
                if (existing) {
                    console.log(`  [EXISTS] ${email} → ${slug}`);
                    continue;
                }

                await ExamResult.create({
                    student_id: student._id, exam_id: exam._id, course_id: course._id,
                    test_title: exam.title, score, objective_score: score,
                    total_questions: isSkill ? 10 : 5,
                    percentage, grading_status: 'graded',
                    time_spent: Math.floor(Math.random() * 900) + 600,
                    submitted_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
                });

                try {
                    await StudentExamAccess.create({
                        student_id: student._id, exam_id: exam._id,
                        access_type: 'exam', assigned_by: adminId,
                        scheduled_date: exam.scheduled_date,
                        granted_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
                    });
                } catch (e) { /* duplicate */ }

                console.log(`  [CREATE] ${email} → ${slug} exam: ${score}/${totalMarks} (${percentage.toFixed(0)}%)`);
            }
        }
        console.log(`  ✓ Exam results seeded`);

        // ─── STEP 8: Leaderboard ────────────────────────────────────────────────
        console.log('\n========== STEP 8: Seeding Leaderboard ==========');

        const studentEmails = usersToSeed.filter(u => u.role === 'student').map(u => u.email);
        const allResults = await ExamResult.find({
            student_id: { $in: studentEmails.map(e => userMap[e]?._id).filter(Boolean) }
        });

        const scoreTotals = {};
        for (const result of allResults) {
            const uid = result.student_id.toString();
            scoreTotals[uid] = (scoreTotals[uid] || 0) + (result.score || 0);
        }

        const sortedStudents = Object.entries(scoreTotals).sort((a, b) => b[1] - a[1]);

        for (let i = 0; i < sortedStudents.length; i++) {
            const [uid, total] = sortedStudents[i];
            const rank = i + 1;
            const badges = [];
            if (rank === 1) badges.push('gold_medal');
            if (rank === 2) badges.push('silver_medal');
            if (rank === 3) badges.push('bronze_medal');
            if (total >= 40) badges.push('high_achiever');
            if (total >= 25) badges.push('consistent');

            await LeaderboardStat.findOneAndUpdate(
                { user_id: uid },
                { user_id: uid, total_score: total, rank, badges, updated_at: new Date() },
                { upsert: true, returnDocument: 'after' }
            );
        }
        console.log(`  ✓ Leaderboard updated for ${sortedStudents.length} students`);

        // ─── SUMMARY ────────────────────────────────────────────────────────────
        console.log('\n========== ✅ SEED COMPLETE ==========');
        console.log(`Users:        ${usersToSeed.length} (1 admin + 6 dept managers + 1 instructor + 20 students + 1 intern)`);
        console.log(`Courses:      10 (7 dept courses + 3 skill courses)`);
        console.log(`Dept Exams:   7 (CSE/ECE/EEE/DS/AI/ML/IT/MECH) — scoped to each dept`);
        console.log(`Skill Exams:  3 (Coding/Reasoning/Aptitude) — open to all depts`);
        console.log(`QB per dept:  5 questions each (7 depts × 5 = 35 dept questions)`);
        console.log(`QB skills:    10 questions each (3 skills × 10 = 30 skill questions)`);
        console.log('\n📋 DEPARTMENT STRUCTURE:');
        console.log('  CSE  : Anu Raguthu, Mahesh Gutha, Pooja Mishra, Deepika Ch, Sanjay Rao, Kiran Patel → CSE exam');
        console.log('  ECE  : Rahul Verma, Priya Sharma, Naveen Reddy → ECE exam');
        console.log('  EEE  : Sneha Reddy, Kavitha M, Rohit Gupta → EEE exam');
        console.log('  DS   : Arjun Krishna, Divya Nair, Ananya Das → DS exam');
        console.log('  AI/ML: Meera Iyer, Suresh Babu → AI/ML exam');
        console.log('  IT   : Lakshmi Devi, Vijay Kumar, Ravi Shankar → IT exam');
        console.log('\n📋 MANAGER CREDENTIALS:');
        for (const u of usersToSeed.filter(u => u.role === 'manager')) {
            console.log(`  [${u.department.padEnd(5)}] ${u.email.padEnd(28)} | ${u.password}`);
        }
        console.log('\n📋 STUDENT CREDENTIALS:');
        for (const u of usersToSeed.filter(u => u.role === 'student')) {
            console.log(`  [${u.department.padEnd(5)}] ${u.email.padEnd(32)} | ${u.password} | Year ${u.year} | ${u.rollNumber}`);
        }
        console.log('\n🔑 ADMIN/INSTRUCTOR:');
        for (const u of usersToSeed.filter(u => ['admin','instructor'].includes(u.role))) {
            console.log(`  [${u.role.toUpperCase().padEnd(10)}] ${u.email.padEnd(32)} | ${u.password}`);
        }

    } catch (error) {
        console.error('Error seeding data:', error);
        console.error(error.stack);
    } finally {
        await mongoose.connection.close();
        console.log('\nDatabase connection closed.');
    }
};

seedData();