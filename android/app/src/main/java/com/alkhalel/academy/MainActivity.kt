package com.alkhalel.academy

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.unit.LayoutDirection
import com.alkhalel.academy.data.api.RetrofitClient
import com.alkhalel.academy.data.model.*
import com.alkhalel.academy.ui.screens.*
import com.alkhalel.academy.ui.theme.AlkhalelAcademyTheme
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.io.IOException

sealed class Screen {
    data object Login : Screen()
    data object Register : Screen()
    data class StudentDashboard(val user: User, val student: Student?) : Screen()
    data object AdminDashboard : Screen()
    data object Attendance : Screen()
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        RetrofitClient.init(applicationContext)

        setContent {
            AlkhalelAcademyTheme {
                CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
                    Surface(
                        modifier = Modifier.fillMaxSize(),
                        color = MaterialTheme.colorScheme.background
                    ) {
                        AppNavigation()
                    }
                }
            }
        }
    }
}

@Composable
fun AppNavigation() {
    var currentScreen by remember { mutableStateOf<Screen>(Screen.Login) }
    var isLoading by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var successResult by remember { mutableStateOf<Pair<String, String>?>(null) }

    var userData by remember { mutableStateOf<User?>(null) }
    var studentData by remember { mutableStateOf<Student?>(null) }
    var grades by remember { mutableStateOf<List<Grade>>(emptyList()) }
    var exams by remember { mutableStateOf<List<Exam>>(emptyList()) }
    var examResults by remember { mutableStateOf<List<ExamResult>>(emptyList()) }
    var attendanceRecords by remember { mutableStateOf<List<Attendance>>(emptyList()) }
    var curriculumFiles by remember { mutableStateOf<List<CurriculumFile>>(emptyList()) }
    var books by remember { mutableStateOf<List<Book>>(emptyList()) }

    var users by remember { mutableStateOf<List<User>>(emptyList()) }
    var batches by remember { mutableStateOf<List<Batch>>(emptyList()) }
    var stages by remember { mutableStateOf<List<Stage>>(emptyList()) }
    var adminExams by remember { mutableStateOf<List<Exam>>(emptyList()) }
    var adminCurriculum by remember { mutableStateOf<List<CurriculumFile>>(emptyList()) }
    var students by remember { mutableStateOf<List<Student>>(emptyList()) }
    var selectedSection by remember { mutableStateOf("") }

    val scope = rememberCoroutineScope()
    val api = RetrofitClient.getApiService()

    fun checkAuthAndNavigate() {
        if (RetrofitClient.isLoggedIn()) {
            scope.launch {
                try {
                    val meResponse = api.getMe()
                    if (meResponse.isSuccessful) {
                        val user = meResponse.body()!!
                        userData = user

                        when (user.role) {
                            "student" -> {
                                val studentsResp = api.getStudents()
                                if (studentsResp.isSuccessful) {
                                    val sList = studentsResp.body()?.data ?: emptyList()
                                    studentData = sList.firstOrNull { it.userId == user.id }
                                }
                                loadStudentData()
                                currentScreen = Screen.StudentDashboard(user, studentData)
                            }
                            "admin", "attendance_officer" -> {
                                loadAdminData()
                                currentScreen = Screen.AdminDashboard
                            }
                            else -> {
                                currentScreen = Screen.Login
                            }
                        }
                    }
                } catch (e: Exception) {
                    RetrofitClient.clearToken()
                    currentScreen = Screen.Login
                }
            }
        }
    }

    fun loadStudentData() {
        scope.launch {
            try {
                val sId = studentData?.id ?: return@launch
                val gradesResp = api.getStudentGrades(sId)
                if (gradesResp.isSuccessful) {
                    grades = gradesResp.body()?.data ?: emptyList()
                }
                val examsResp = api.getExams()
                if (examsResp.isSuccessful) {
                    exams = examsResp.body()?.data ?: emptyList()
                }
                val attResp = api.getAttendance()
                if (attResp.isSuccessful) {
                    attendanceRecords = attResp.body()?.data ?: emptyList()
                }
                val currResp = api.getCurriculum()
                if (currResp.isSuccessful) {
                    curriculumFiles = currResp.body()?.data ?: emptyList()
                }
            } catch (_: Exception) { }
        }
    }

    fun loadAdminData() {
        scope.launch {
            try {
                val usersResp = api.getUsers()
                if (usersResp.isSuccessful) users = usersResp.body()?.data ?: emptyList()

                val batchesResp = api.getBatches()
                if (batchesResp.isSuccessful) batches = batchesResp.body()?.data ?: emptyList()

                val examsResp = api.getExams()
                if (examsResp.isSuccessful) adminExams = examsResp.body()?.data ?: emptyList()

                val currResp = api.getCurriculum()
                if (currResp.isSuccessful) adminCurriculum = currResp.body()?.data ?: emptyList()

                val studentsResp = api.getStudents()
                if (studentsResp.isSuccessful) students = studentsResp.body()?.data ?: emptyList()

                batches.forEach { batch ->
                    batch.id?.let { id ->
                        scope.launch {
                            try {
                                val stagesResp = api.getBatchStages(id)
                                if (stagesResp.isSuccessful) {
                                    val newStages = stagesResp.body()?.data ?: emptyList()
                                    stages = stages + newStages.filter { s -> stages.none { it.id == s.id } }
                                }
                            } catch (_: Exception) { }
                        }
                    }
                }
            } catch (_: Exception) { }
        }
    }

    LaunchedEffect(Unit) {
        checkAuthAndNavigate()
    }

    when (val screen = currentScreen) {
        is Screen.Login -> {
            errorMessage = null
            LoginScreen(
                onLogin = { username, password ->
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        try {
                            val response = api.login(LoginRequest(username, password))
                            if (response.isSuccessful) {
                                val body = response.body()!!
                                RetrofitClient.saveToken(body.token)
                                userData = body.user
                                when (body.user.role) {
                                    "student" -> {
                                        val studentsResp = api.getStudents()
                                        if (studentsResp.isSuccessful) {
                                            val sList = studentsResp.body()?.data ?: emptyList()
                                            studentData = sList.firstOrNull { it.userId == body.user.id }
                                        }
                                        loadStudentData()
                                        currentScreen = Screen.StudentDashboard(body.user, studentData)
                                    }
                                    "admin", "attendance_officer" -> {
                                        loadAdminData()
                                        currentScreen = Screen.AdminDashboard
                                    }
                                    else -> {
                                        errorMessage = "دور المستخدم غير معروف"
                                    }
                                }
                            } else {
                                errorMessage = "اسم المستخدم أو كلمة المرور غير صحيحة"
                            }
                        } catch (e: HttpException) {
                            errorMessage = "خطأ في الاتصال: ${e.code()}"
                        } catch (e: IOException) {
                            errorMessage = "تعذر الاتصال بالخادم"
                        } finally {
                            isLoading = false
                        }
                    }
                },
                onNavigateToRegister = {
                    errorMessage = null
                    successResult = null
                    currentScreen = Screen.Register
                },
                isLoading = isLoading,
                errorMessage = errorMessage
            )
        }

        is Screen.Register -> {
            RegisterScreen(
                onRegister = { data ->
                    isLoading = true
                    errorMessage = null
                    scope.launch {
                        try {
                            val request = RegisterRequest(
                                fullName = data["full_name"] ?: "",
                                fatherName = data["father_name"] ?: "",
                                motherName = data["mother_name"] ?: "",
                                fatherStatus = data["father_status"]?.takeIf { it.isNotBlank() },
                                motherStatus = data["mother_status"]?.takeIf { it.isNotBlank() },
                                fatherOccupation = data["father_occupation"]?.takeIf { it.isNotBlank() },
                                motherOccupation = data["mother_occupation"]?.takeIf { it.isNotBlank() },
                                studentPhone = data["student_phone"]?.takeIf { it.isNotBlank() }?.let { PhoneUtils.normalizePhone(it) },
                                fatherPhone = data["father_phone"]?.takeIf { it.isNotBlank() }?.let { PhoneUtils.normalizePhone(it) },
                                motherPhone = data["mother_phone"]?.takeIf { it.isNotBlank() }?.let { PhoneUtils.normalizePhone(it) },
                                primaryContact = data["primary_contact"]?.takeIf { it.isNotBlank() },
                                birthYear = data["birth_year"]?.toIntOrNull(),
                                studentPhoto = data["student_photo"]?.takeIf { it.isNotBlank() }
                            )
                            val response = api.register(request)
                            if (response.isSuccessful) {
                                val respData = response.body()?.data
                                if (respData != null) {
                                    successResult = Pair(respData.username, respData.password)
                                }
                            } else {
                                val errBody = response.errorBody()?.string()
                                errorMessage = errBody ?: "فشل التسجيل"
                            }
                        } catch (e: HttpException) {
                            errorMessage = "خطأ في الاتصال: ${e.code()}"
                        } catch (e: IOException) {
                            errorMessage = "تعذر الاتصال بالخادم"
                        } finally {
                            isLoading = false
                        }
                    }
                },
                onNavigateBack = {
                    currentScreen = Screen.Login
                },
                isLoading = isLoading,
                errorMessage = errorMessage,
                successResult = successResult
            )
        }

        is Screen.StudentDashboard -> {
            StudentDashboardScreen(
                userData = userData,
                studentData = studentData,
                grades = grades,
                exams = exams,
                examResults = examResults,
                attendanceRecords = attendanceRecords,
                curriculumFiles = curriculumFiles,
                books = books,
                onLogout = {
                    RetrofitClient.clearToken()
                    currentScreen = Screen.Login
                },
                onRefresh = { loadStudentData() }
            )
        }

        is Screen.AdminDashboard -> {
            AdminDashboardScreen(
                users = users,
                batches = batches,
                stages = stages,
                exams = adminExams,
                curriculumFiles = adminCurriculum,
                onLogout = {
                    RetrofitClient.clearToken()
                    currentScreen = Screen.Login
                },
                onRefresh = { loadAdminData() },
                selectedSection = selectedSection,
                onSectionSelected = { section ->
                    if (section == "attendance") {
                        currentScreen = Screen.Attendance
                    } else {
                        selectedSection = section
                    }
                }
            )
        }

        is Screen.Attendance -> {
            AttendanceScreen(
                students = students,
                batches = batches,
                stages = stages,
                onBack = {
                    selectedSection = ""
                    currentScreen = Screen.AdminDashboard
                },
                onSubmit = { request ->
                    isLoading = true
                    scope.launch {
                        try {
                            val response = api.createBatchAttendance(request)
                            if (response.isSuccessful) {
                                currentScreen = Screen.AdminDashboard
                            } else {
                                errorMessage = "فشل تسجيل الحضور"
                            }
                        } catch (e: Exception) {
                            errorMessage = "تعذر الاتصال بالخادم"
                        } finally {
                            isLoading = false
                        }
                    }
                },
                isSubmitting = isLoading,
                errorMessage = errorMessage
            )
        }
    }
}
