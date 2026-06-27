package com.alkhalel.academy.data.api

import com.alkhalel.academy.data.model.*
import retrofit2.Response
import retrofit2.http.*

interface ApiService {

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): Response<LoginResponse>

    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<RegisterResponse>>

    @GET("auth/me")
    suspend fun getMe(): Response<User>

    @GET("users")
    suspend fun getUsers(): Response<ApiResponse<List<User>>>

    @POST("users")
    suspend fun createUser(@Body user: User): Response<ApiResponse<User>>

    @PUT("users/{id}")
    suspend fun updateUser(@Path("id") id: Int, @Body user: User): Response<ApiResponse<User>>

    @DELETE("users/{id}")
    suspend fun deleteUser(@Path("id") id: Int): Response<ApiResponse<Any>>

    @POST("users/{id}/unlock")
    suspend fun unlockUser(@Path("id") id: Int, @Body request: UnlockRequest): Response<ApiResponse<User>>

    @GET("students")
    suspend fun getStudents(@Query("batch_id") batchId: Int? = null): Response<ApiResponse<List<Student>>>

    @GET("students/{id}")
    suspend fun getStudent(@Path("id") id: Int): Response<ApiResponse<Student>>

    @PUT("students/{id}")
    suspend fun updateStudent(@Path("id") id: Int, @Body student: Student): Response<ApiResponse<Student>>

    @GET("batches")
    suspend fun getBatches(): Response<ApiResponse<List<Batch>>>

    @POST("batches")
    suspend fun createBatch(@Body batch: Batch): Response<ApiResponse<Batch>>

    @GET("batches/{id}/stages")
    suspend fun getBatchStages(@Path("id") id: Int): Response<ApiResponse<List<Stage>>>

    @POST("batches/{id}/stages")
    suspend fun createStage(@Path("id") batchId: Int, @Body stage: Stage): Response<ApiResponse<Stage>>

    @GET("exams")
    suspend fun getExams(
        @Query("batch_id") batchId: Int? = null,
        @Query("stage_id") stageId: Int? = null
    ): Response<ApiResponse<List<Exam>>>

    @POST("exams")
    suspend fun createExam(@Body exam: Exam): Response<ApiResponse<Exam>>

    @GET("exams/{id}")
    suspend fun getExam(@Path("id") id: Int): Response<ApiResponse<Exam>>

    @POST("exams/{id}/submit")
    suspend fun submitExam(@Path("id") id: Int, @Body request: ExamSubmitRequest): Response<ApiResponse<ExamResult>>

    @GET("attendance")
    suspend fun getAttendance(
        @Query("date") date: String? = null,
        @Query("batch_id") batchId: Int? = null,
        @Query("stage_id") stageId: Int? = null
    ): Response<ApiResponse<List<Attendance>>>

    @POST("attendance")
    suspend fun createAttendance(@Body request: AttendanceRequest): Response<ApiResponse<Attendance>>

    @POST("attendance/batch")
    suspend fun createBatchAttendance(@Body request: BatchAttendanceRequest): Response<ApiResponse<List<Attendance>>>

    @PUT("attendance/{id}")
    suspend fun updateAttendance(@Path("id") id: Int, @Body request: AttendanceRequest): Response<ApiResponse<Attendance>>

    @DELETE("attendance/{id}")
    suspend fun deleteAttendance(@Path("id") id: Int): Response<ApiResponse<Any>>

    @GET("curriculum")
    suspend fun getCurriculum(
        @Query("batch_id") batchId: Int? = null,
        @Query("stage_id") stageId: Int? = null
    ): Response<ApiResponse<List<CurriculumFile>>>

    @POST("curriculum")
    suspend fun createCurriculum(@Body request: CurriculumRequest): Response<ApiResponse<CurriculumFile>>

    @GET("grades/{studentId}")
    suspend fun getStudentGrades(@Path("studentId") studentId: Int): Response<ApiResponse<List<Grade>>>

    @POST("grades")
    suspend fun createGrade(@Body request: GradeRequest): Response<ApiResponse<Grade>>

    @PUT("grades/{id}")
    suspend fun updateGrade(@Path("id") id: Int, @Body request: GradeRequest): Response<ApiResponse<Grade>>
}
