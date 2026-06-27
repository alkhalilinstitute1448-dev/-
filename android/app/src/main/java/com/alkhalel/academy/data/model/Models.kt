package com.alkhalel.academy.data.model

import com.google.gson.annotations.SerializedName

data class LoginRequest(
    val username: String,
    val password: String
)

data class LoginResponse(
    val token: String,
    val user: User
)

data class RegisterRequest(
    @SerializedName("full_name") val fullName: String,
    @SerializedName("father_name") val fatherName: String,
    @SerializedName("mother_name") val motherName: String,
    @SerializedName("father_status") val fatherStatus: String? = null,
    @SerializedName("mother_status") val motherStatus: String? = null,
    @SerializedName("father_occupation") val fatherOccupation: String? = null,
    @SerializedName("mother_occupation") val motherOccupation: String? = null,
    @SerializedName("student_phone") val studentPhone: String? = null,
    @SerializedName("father_phone") val fatherPhone: String? = null,
    @SerializedName("mother_phone") val motherPhone: String? = null,
    @SerializedName("primary_contact") val primaryContact: String? = null,
    @SerializedName("birth_year") val birthYear: Int? = null,
    @SerializedName("student_photo") val studentPhoto: String? = null
)

data class RegisterResponse(
    val username: String,
    val password: String,
    val user: User
)

data class User(
    val id: Int? = null,
    val username: String? = null,
    val password: String? = null,
    val role: String? = null,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("father_name") val fatherName: String? = null,
    @SerializedName("mother_name") val motherName: String? = null,
    @SerializedName("father_status") val fatherStatus: String? = null,
    @SerializedName("mother_status") val motherStatus: String? = null,
    @SerializedName("father_occupation") val fatherOccupation: String? = null,
    @SerializedName("mother_occupation") val motherOccupation: String? = null,
    @SerializedName("student_phone") val studentPhone: String? = null,
    @SerializedName("father_phone") val fatherPhone: String? = null,
    @SerializedName("mother_phone") val motherPhone: String? = null,
    @SerializedName("primary_contact") val primaryContact: String? = null,
    @SerializedName("birth_year") val birthYear: Int? = null,
    @SerializedName("student_photo") val studentPhoto: String? = null,
    @SerializedName("is_locked") val isLocked: Boolean? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class Student(
    val id: Int? = null,
    @SerializedName("user_id") val userId: Int? = null,
    @SerializedName("full_name") val fullName: String? = null,
    @SerializedName("father_name") val fatherName: String? = null,
    @SerializedName("mother_name") val motherName: String? = null,
    @SerializedName("batch_id") val batchId: Int? = null,
    @SerializedName("stage_id") val stageId: Int? = null,
    @SerializedName("batch_name") val batchName: String? = null,
    @SerializedName("stage_name") val stageName: String? = null,
    @SerializedName("student_phone") val studentPhone: String? = null,
    @SerializedName("father_phone") val fatherPhone: String? = null,
    @SerializedName("mother_phone") val motherPhone: String? = null,
    val username: String? = null,
    @SerializedName("is_locked") val isLocked: Boolean? = null
)

data class Batch(
    val id: Int? = null,
    val name: String? = null,
    val description: String? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class Stage(
    val id: Int? = null,
    val name: String? = null,
    val description: String? = null,
    @SerializedName("batch_id") val batchId: Int? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class BatchWithStages(
    val batch: Batch? = null,
    val stages: List<Stage>? = null
)

data class Exam(
    val id: Int? = null,
    val title: String? = null,
    val description: String? = null,
    val type: String? = null,
    @SerializedName("batch_id") val batchId: Int? = null,
    @SerializedName("stage_id") val stageId: Int? = null,
    @SerializedName("max_score") val maxScore: Double? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class ExamSubmitRequest(
    val answers: List<ExamAnswer>? = null,
    val score: Double? = null
)

data class ExamAnswer(
    @SerializedName("question_id") val questionId: Int? = null,
    val answer: String? = null
)

data class ExamResult(
    val id: Int? = null,
    @SerializedName("exam_id") val examId: Int? = null,
    @SerializedName("student_id") val studentId: Int? = null,
    val score: Double? = null,
    @SerializedName("max_score") val maxScore: Double? = null,
    val exam: Exam? = null
)

data class Attendance(
    val id: Int? = null,
    @SerializedName("student_id") val studentId: Int? = null,
    @SerializedName("batch_id") val batchId: Int? = null,
    @SerializedName("stage_id") val stageId: Int? = null,
    val date: String? = null,
    val status: String? = null,
    @SerializedName("student_name") val studentName: String? = null,
    @SerializedName("batch_name") val batchName: String? = null,
    @SerializedName("stage_name") val stageName: String? = null
)

data class AttendanceRequest(
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("batch_id") val batchId: Int,
    @SerializedName("stage_id") val stageId: Int,
    val date: String,
    val status: String
)

data class BatchAttendanceRequest(
    @SerializedName("batch_id") val batchId: Int,
    @SerializedName("stage_id") val stageId: Int? = null,
    val date: String,
    val records: List<AttendanceRecord>
)

data class AttendanceRecord(
    @SerializedName("student_id") val studentId: Int,
    val status: String
)

data class Grade(
    val id: Int? = null,
    @SerializedName("student_id") val studentId: Int? = null,
    @SerializedName("exam_id") val examId: Int? = null,
    val score: Double? = null,
    val subject: String? = null,
    val notes: String? = null,
    val exam: Exam? = null,
    @SerializedName("exam_title") val examTitle: String? = null
)

data class GradeRequest(
    @SerializedName("student_id") val studentId: Int,
    @SerializedName("exam_id") val examId: Int? = null,
    val score: Double,
    val subject: String? = null,
    val notes: String? = null
)

data class CurriculumFile(
    val id: Int? = null,
    val title: String? = null,
    val description: String? = null,
    @SerializedName("file_url") val fileUrl: String? = null,
    @SerializedName("batch_id") val batchId: Int? = null,
    @SerializedName("stage_id") val stageId: Int? = null,
    @SerializedName("uploaded_by") val uploadedBy: Int? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class CurriculumRequest(
    val title: String,
    val description: String? = null,
    @SerializedName("batch_id") val batchId: Int? = null,
    @SerializedName("stage_id") val stageId: Int? = null
)

data class Book(
    val id: Int? = null,
    val title: String? = null,
    val author: String? = null,
    val subject: String? = null,
    @SerializedName("batch_id") val batchId: Int? = null,
    @SerializedName("stage_id") val stageId: Int? = null,
    val quantity: Int? = null,
    @SerializedName("created_at") val createdAt: String? = null
)

data class ApiResponse<T>(
    val success: Boolean? = null,
    val message: String? = null,
    val data: T? = null
)

data class PaginatedResponse<T>(
    val data: List<T>? = null,
    val total: Int? = null,
    val page: Int? = null,
    val limit: Int? = null
)

data class UnlockRequest(
    val password: String? = null
)
