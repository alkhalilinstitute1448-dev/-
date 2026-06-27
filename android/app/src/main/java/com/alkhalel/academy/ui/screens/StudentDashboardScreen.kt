package com.alkhalel.academy.ui.screens

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.alkhalel.academy.data.model.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun StudentDashboardScreen(
    userData: User?,
    studentData: Student?,
    grades: List<Grade>,
    exams: List<Exam>,
    examResults: List<ExamResult>,
    attendanceRecords: List<Attendance>,
    curriculumFiles: List<CurriculumFile>,
    books: List<Book>,
    onLogout: () -> Unit,
    onRefresh: () -> Unit
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("الملف الشخصي", "الدرجات", "الامتحانات", "الحضور", "المناهج", "الكتب")

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("أكاديمية الخليل") },
                    actions = {
                        IconButton(onClick = onRefresh) {
                            Icon(Icons.Default.Refresh, contentDescription = "تحديث")
                        }
                        IconButton(onClick = onLogout) {
                            Icon(Icons.Default.Logout, contentDescription = "تسجيل الخروج")
                        }
                    },
                    colors = TopAppBarDefaults.topAppBarColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        titleContentColor = MaterialTheme.colorScheme.onPrimary,
                        actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                    )
                )
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
            ) {
                ScrollableTabRow(
                    selectedTabIndex = selectedTab,
                    edgePadding = 0.dp
                ) {
                    tabs.forEachIndexed { index, title ->
                        Tab(
                            selected = selectedTab == index,
                            onClick = { selectedTab = index },
                            text = {
                                Text(
                                    title,
                                    maxLines = 1,
                                    style = MaterialTheme.typography.bodySmall
                                )
                            }
                        )
                    }
                }

                when (selectedTab) {
                    0 -> ProfileSection(userData, studentData)
                    1 -> GradesSection(grades)
                    2 -> ExamsSection(exams, examResults)
                    3 -> AttendanceSection(attendanceRecords)
                    4 -> CurriculumSection(curriculumFiles)
                    5 -> BooksSection(books)
                }
            }
        }
    }
}

@Composable
private fun ProfileSection(userData: User?, studentData: Student?) {
    val displayName = studentData?.fullName ?: userData?.fullName ?: "---"

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        item {
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.primaryContainer)
            ) {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally
                ) {
                    Icon(
                        Icons.Default.Person,
                        contentDescription = null,
                        modifier = Modifier.size(64.dp),
                        tint = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        displayName,
                        style = MaterialTheme.typography.headlineSmall,
                        fontWeight = FontWeight.Bold,
                        textAlign = TextAlign.Center
                    )
                    Text(
                        "اسم المستخدم: ${userData?.username ?: studentData?.username ?: "---"}",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onPrimaryContainer
                    )
                }
            }
        }

        item {
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text("معلومات إضافية", style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                    Spacer(modifier = Modifier.height(8.dp))
                    InfoRow("الشعبة", studentData?.batchName ?: "---")
                    InfoRow("المرحلة", studentData?.stageName ?: "---")
                    InfoRow("هاتف الطالب", studentData?.studentPhone ?: "---")
                    InfoRow("هاتف الأب", studentData?.fatherPhone ?: "---")
                    InfoRow("هاتف الأم", studentData?.motherPhone ?: "---")
                }
            }
        }
    }
}

@Composable
private fun InfoRow(label: String, value: String) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(label, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Text(value, fontWeight = FontWeight.Medium)
    }
}

@Composable
private fun GradesSection(grades: List<Grade>) {
    if (grades.isEmpty()) {
        EmptyState("لا توجد درجات بعد")
        return
    }
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(grades) { grade ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(grade.subject ?: grade.examTitle ?: "امتحان", fontWeight = FontWeight.Bold)
                        Text(grade.notes ?: "", style = MaterialTheme.typography.bodySmall)
                    }
                    Text(
                        "${grade.score ?: 0}",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Bold,
                        color = if ((grade.score ?: 0.0) >= 50.0) Color(0xFF2E7D32) else MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
private fun ExamsSection(exams: List<Exam>, results: List<ExamResult>) {
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        if (exams.isEmpty() && results.isEmpty()) {
            item { EmptyState("لا توجد امتحانات") }
        }
        items(results) { result ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(result.exam?.title ?: "امتحان", fontWeight = FontWeight.Bold)
                        Text(
                            "الدرجة العظمى: ${result.maxScore ?: 0}",
                            style = MaterialTheme.typography.bodySmall
                        )
                    }
                    Text(
                        "${result.score ?: 0} / ${result.maxScore ?: 0}",
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = if ((result.score ?: 0.0) >= (result.maxScore ?: 1.0) * 0.5)
                            Color(0xFF2E7D32) else MaterialTheme.colorScheme.error
                    )
                }
            }
        }
    }
}

@Composable
private fun AttendanceSection(records: List<Attendance>) {
    if (records.isEmpty()) {
        EmptyState("لا توجد سجلات حضور")
        return
    }
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(records) { record ->
            val statusColor = when (record.status) {
                "present" -> Color(0xFF2E7D32)
                "absent" -> Color(0xFFC62828)
                "late" -> Color(0xFFF57F17)
                "excused" -> Color(0xFF1565C0)
                else -> Color.Gray
            }
            val statusText = when (record.status) {
                "present" -> "حاضر"
                "absent" -> "غائب"
                "late" -> "متأخر"
                "excused" -> "معذر"
                else -> record.status ?: "---"
            }

            Card(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(record.date ?: "---", style = MaterialTheme.typography.bodySmall)
                        Text(
                            "${record.batchName ?: ""} - ${record.stageName ?: ""}",
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Surface(
                        color = statusColor,
                        shape = RoundedCornerShape(8.dp)
                    ) {
                        Text(
                            statusText,
                            color = Color.White,
                            modifier = Modifier.padding(horizontal = 12.dp, vertical = 4.dp),
                            style = MaterialTheme.typography.bodyMedium,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun CurriculumSection(files: List<CurriculumFile>) {
    if (files.isEmpty()) {
        EmptyState("لا توجد ملفات منهاج")
        return
    }
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(files) { file ->
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { }
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(file.title ?: "ملف", fontWeight = FontWeight.Bold)
                        Text(file.description ?: "", style = MaterialTheme.typography.bodySmall)
                    }
                    Icon(
                        Icons.Default.Download,
                        contentDescription = "تحميل",
                        tint = MaterialTheme.colorScheme.primary
                    )
                }
            }
        }
    }
}

@Composable
private fun BooksSection(books: List<Book>) {
    if (books.isEmpty()) {
        EmptyState("لا توجد كتب")
        return
    }
    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(books) { book ->
            Card(modifier = Modifier.fillMaxWidth()) {
                Column(modifier = Modifier.padding(16.dp)) {
                    Text(book.title ?: "كتاب", fontWeight = FontWeight.Bold)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween
                    ) {
                        Text("المؤلف: ${book.author ?: "---"}", style = MaterialTheme.typography.bodySmall)
                        Text("المادة: ${book.subject ?: "---"}", style = MaterialTheme.typography.bodySmall)
                    }
                    Text("الكمية: ${book.quantity ?: 0}", style = MaterialTheme.typography.bodySmall)
                }
            }
        }
    }
}

@Composable
private fun EmptyState(message: String) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(32.dp),
        contentAlignment = Alignment.Center
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(
                Icons.Default.Info,
                contentDescription = null,
                modifier = Modifier.size(48.dp),
                tint = MaterialTheme.colorScheme.onSurfaceVariant
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                message,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }
    }
}
