const mongoose = require('mongoose');

const BatchSchema = new mongoose.Schema({
    batch_name: { type: String, required: true },
    batch_type: { type: String, enum: ['morning', 'afternoon', 'evening'], required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    instructor_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    max_students: { type: Number },
    is_active: { type: Boolean },
    status: { type: String, enum: ['pending', 'approved', 'rejected', 'archived'] },
    start_time: { type: String }, // e.g. "09:00"
    end_time: { type: String },   // e.g. "11:00"
    batch_category: { type: String, enum: ['approve', 'remove'] },
    department: { type: String }, // Department this batch belongs to
    processed_at: { type: Date },
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

    created_at: { type: Date, default: Date.now },
    batches: [{
        batch_name: String,
        batch_type: String,
        max_students: Number,
        start_time: String,
        end_time: String,
        is_active: { type: Boolean, default: false },
        status: { type: String, default: 'pending' }

    }]
});

BatchSchema.pre('save', function() {
    if (['morning', 'afternoon', 'evening'].includes(this.batch_type)) {
        this.batch_category = 'remove';
    }
});
BatchSchema.set('toJSON', {
    virtuals: true, versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

const StudentBatchSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    assigned_session: { type: String, enum: ['morning', 'afternoon', 'evening'] }, // Tracks specific slot
    assigned_time_slot: { type: String }, // Store the precise time slot (e.g., "9:00 AM - 11:00 AM")
    assigned_at: { type: Date, default: Date.now },
    assigned_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    previous_batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', default: null },
    updated_at: { type: Date, default: Date.now }
});
// One student can only be in one batch per course
StudentBatchSchema.index({ student_id: 1, course_id: 1 }, { unique: true });
StudentBatchSchema.set('toJSON', {
    virtuals: true, versionKey: false,
    transform: (doc, ret) => { ret.id = ret._id; delete ret._id; }
});

const BatchRequestSchema = new mongoose.Schema({
    student_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    batch_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch', required: true },
    requested_session: { type: String, enum: ['morning', 'afternoon', 'evening'] },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    type: { type: String, enum: ['initial', 'change'], default: 'initial' },
    requested_at: { type: Date, default: Date.now },
    processed_at: { type: Date },
    processed_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

module.exports = {
    Batch: mongoose.model('Batch', BatchSchema),
    StudentBatch: mongoose.model('StudentBatch', StudentBatchSchema),
    BatchRequest: mongoose.model('BatchRequest', BatchRequestSchema)
};