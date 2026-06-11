const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Base schema for resources to reduce duplication
// (Removed duplicate unused schema)

const CourseSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true },
    description: { type: String },
    thumbnail_url: { type: String },
    instructor_ids: [{ type: Schema.Types.ObjectId, ref: 'User' }], // References to multiple Users
    category: { type: String },
    department: { type: String }, // Department this course belongs to (CSE, ECE, etc.)
    price: { type: Number, default: 0 },
    original_price: { type: Number },
    status: { type: String, default: 'draft' }, // draft, published, archived, pending
    level: { type: String, default: 'beginner' },
    duration: { type: String },
    rating: { type: Number, default: 0 },
    theme_color: { type: String },
    tags: [String],
    is_active: { type: Boolean, default: true },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
    // Specific fields for approval
    rejection_reason: { type: String },
    reviewed_at: { type: Date },
    reviewed_by: { type: Schema.Types.ObjectId, ref: 'User' }
});
CourseSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

// Course Enrollment
const EnrollmentSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    status: { type: String, default: 'pending' }, // active, completed, dropped, pending, rejected
    progress_percentage: { type: Number, default: 0 },
    payment_proof_url: { type: String }, // New field for payment confirmation
    utr_number: { type: String }, // Unique Transaction Reference
    applied_coupon: { type: String }, // The code used
    final_price: { type: Number }, // The price after discount
    payment_term: { type: String, default: 'full' }, // full, term1, term2
    remaining_balance: { type: Number, default: 0 },
    requested_batch_type: { type: String, enum: ['morning', 'afternoon', 'evening'], default: 'morning' },
    requested_batch_id: { type: Schema.Types.ObjectId, ref: 'Batch' },
    requested_time_slot: { type: String },

    category: { type: String, default: 'remove' }, // approve, remove
    payment: [
        {
            term: String,
            proof_url: String,
            utr: String,
            amount: Number,
            status: { type: String, default: 'pending' },
            submitted_at: { type: Date, default: Date.now },
            approved_at: Date
        }
    ],
    enrolled_at: { type: Date, default: Date.now },
    completed_at: { type: Date },
    last_accessed_at: { type: Date }
});
// Composite unique index to prevent duplicate enrollments
EnrollmentSchema.index({ user_id: 1, course_id: 1 }, { unique: true });
EnrollmentSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });


// Sub-collections
const TopicSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: { type: String },
    order_index: { type: Number, default: 0 },
    created_at: { type: Date, default: Date.now }
});
TopicSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const ModuleSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    topic_id: { type: Schema.Types.ObjectId, ref: 'Topic' }, // Optional, if hierarchy exists
    title: { type: String, required: true },
    content: { type: String }, // HTML/Markdown
    order_index: { type: Number, default: 0 },
    video_url: { type: String }, // Optional direct video link
    duration_minutes: { type: Number },
    is_free_preview: { type: Boolean, default: false },
    // Batch access control: empty = visible to all enrolled students
    allowed_batches: [{ type: Schema.Types.Mixed, ref: 'Batch' }],
    batch_type: { type: String }, // e.g., 'morning', 'afternoon', 'evening'
    unlock_after_days: { type: Number, default: 1 }, // Drip content
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});
ModuleSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const VideoSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    module_id: { type: Schema.Types.ObjectId, ref: 'Module' },
    title: { type: String, required: true },
    video_url: { type: String }, // Optional depending if they use drive_link instead
    drive_link: { type: String }, // Google Drive link option
    thumbnail_url: { type: String },
    duration: { type: Number }, // seconds
    duration_minutes: { type: Number },
    order_index: { type: Number, default: 0 },
    is_published: { type: Boolean, default: true },
    // Batch access control: empty = visible to all enrolled students
    allowed_batches: [{ type: Schema.Types.Mixed, ref: 'Batch' }],
    batch_type: { type: String }, // e.g., 'morning', 'afternoon', 'evening'
    unlock_after_days: { type: Number, default: 1 }, // legacy, kept for compatibility
    // ── Drip Release System ──────────────────────────────────────────────────
    // release_day = 1 → unlocks on student's join date (Day 1)
    // release_day = 2 → unlocks on Day 2 (join_date + 1 day)
    // release_day = N → unlocks on Day N (join_date + N-1 days)
    release_day: { type: Number, default: 1 },
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});
VideoSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const AnnouncementSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    content: { type: String, required: true },
    is_pinned: { type: Boolean, default: false },
    // Batch access control: empty = visible to all enrolled students
    allowed_batches: [{ type: Schema.Types.Mixed, ref: 'Batch' }],
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date }
});
AnnouncementSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const TimelineSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    title: { type: String, required: true },
    description: { type: String },
    scheduled_date: { type: Date, required: true },
    type: { type: String, default: 'lecture' }, // lecture, assignment, quiz, exam
    allowed_batches: [{ type: Schema.Types.Mixed, ref: 'Batch' }],
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});
TimelineSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const ResourceSchema = new Schema({
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    asset_title: { type: String, required: true },
    file_url: { type: String, required: true },
    resource_type: { type: String, default: 'Study Material' },
    upload_format: { type: String },
    instructor_name: { type: String },
    instructor_avatar_url: { type: String },
    short_description: { type: String },
    category: { type: String },
    allowed_batches: [{ type: Schema.Types.Mixed, ref: 'Batch' }],
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User' },
    created_at: { type: Date, default: Date.now }
});
ResourceSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });


const InstructorProgressSchema = new mongoose.Schema({
    instructor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    topics_completed: { type: Number, default: 0 },
    total_topics: { type: Number, default: 0 },
    videos_uploaded: { type: Number, default: 0 },
    resources_uploaded: { type: Number, default: 0 },
    live_classes_conducted: { type: Number, default: 0 },
    last_activity_at: { type: Date, default: Date.now },
    notes: { type: String },
    updated_at: { type: Date, default: Date.now }
});
InstructorProgressSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

const CourseRatingSchema = new Schema({
    user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor_id: { type: Schema.Types.ObjectId, ref: 'User' }, // Specifically for instructor pulse
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String },
    created_at: { type: Date, default: Date.now }
});
CourseRatingSchema.index({ user_id: 1, course_id: 1 }, { unique: true });
CourseRatingSchema.set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } });

module.exports = {
    Course: mongoose.model('Course', CourseSchema),
    Enrollment: mongoose.model('Enrollment', EnrollmentSchema),
    Topic: mongoose.model('Topic', TopicSchema),
    Module: mongoose.model('Module', ModuleSchema),
    Video: mongoose.model('Video', VideoSchema),
    Announcement: mongoose.model('Announcement', AnnouncementSchema),
    Timeline: mongoose.model('Timeline', TimelineSchema),
    Resource: mongoose.model('Resource', ResourceSchema),
    InstructorProgress: mongoose.model('InstructorProgress', InstructorProgressSchema),
    CourseRating: mongoose.model('CourseRating', CourseRatingSchema),
    VideoProgress: mongoose.model('VideoProgress', new Schema({
        user_id: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        course_id: { type: Schema.Types.ObjectId, ref: 'Course', required: true },
        video_id: { type: String, required: true }, // Can be video MongoDB ID or S3 URL
        watched_percentage: { type: Number, default: 0 },
        last_watched_time: { type: Number, default: 0 }, // in seconds
        completed: { type: Boolean, default: false },
        updated_at: { type: Date, default: Date.now }
    }).set('toJSON', { virtuals: true, versionKey: false, transform: (doc, ret) => { ret.id = ret._id; delete ret._id; } }))
};