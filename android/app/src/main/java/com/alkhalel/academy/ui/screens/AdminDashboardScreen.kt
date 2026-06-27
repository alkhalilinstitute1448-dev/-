package com.alkhalel.academy.ui.screens

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
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import com.alkhalel.academy.data.model.*

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AdminDashboardScreen(
    users: List<User>,
    batches: List<Batch>,
    stages: List<Stage>,
    exams: List<Exam>,
    curriculumFiles: List<CurriculumFile>,
    onLogout: () -> Unit,
    onRefresh: () -> Unit,
    selectedSection: String,
    onSectionSelected: (String) -> Unit
) {
    val sections = listOf(
        "users" to "المستخدمين",
        "batches" to "الشعب والمراحل",
        "exams" to "الامتحانات",
        "curriculum" to "المناهج",
        "attendance" to "الحضور"
    )

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("لوحة التحكم") },
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
            if (selectedSection.isEmpty()) {
                LazyColumn(
                    modifier = Modifier
                        .fillMaxSize()
                        .padding(padding)
                        .padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    items(sections) { (key, title) ->
                        val icon = when (key) {
                            "users" -> Icons.Default.People
                            "batches" -> Icons.Default.School
                            "exams" -> Icons.Default.Assignment
                            "curriculum" -> Icons.Default.Folder
                            "attendance" -> Icons.Default.CalendarMonth
                            else -> Icons.Default.Menu
                        }
                        val count = when (key) {
                            "users" -> users.size
                            "batches" -> batches.size
                            "exams" -> exams.size
                            "curriculum" -> curriculumFiles.size
                            "attendance" -> 0
                            else -> 0
                        }

                        Card(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clickable { onSectionSelected(key) },
                            shape = RoundedCornerShape(16.dp)
                        ) {
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(20.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Icon(
                                    icon,
                                    contentDescription = null,
                                    tint = MaterialTheme.colorScheme.primary,
                                    modifier = Modifier.size(40.dp)
                                )
                                Spacer(modifier = Modifier.width(16.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Text(title, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                                    Text("$count عنصر", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                                Icon(Icons.Default.ArrowBack, contentDescription = null)
                            }
                        }
                    }
                }
            } else {
                when (selectedSection) {
                    "users" -> UsersSection(users, onSectionSelected = { onSectionSelected("") })
                    "batches" -> BatchesSection(batches, stages, onSectionSelected = { onSectionSelected("") })
                    "exams" -> AdminExamsSection(exams, onSectionSelected = { onSectionSelected("") })
                    "curriculum" -> AdminCurriculumSection(curriculumFiles, onSectionSelected = { onSectionSelected("") })
                    "attendance" -> AdminAttendanceListSection(onSectionSelected = { onSectionSelected("") })
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun UsersSection(users: List<User>, onSectionSelected: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("المستخدمين") },
                navigationIcon = {
                    IconButton(onClick = onSectionSelected) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (users.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("لا يوجد مستخدمين", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            items(users) { user ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(user.fullName ?: user.username ?: "مستخدم", fontWeight = FontWeight.Bold)
                            Text("اسم المستخدم: ${user.username ?: "---"}", style = MaterialTheme.typography.bodySmall)
                            Text("الدور: ${user.role ?: "---"}", style = MaterialTheme.typography.bodySmall)
                            user.isLocked?.let {
                                if (it) {
                                    Text("مقفل", color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun BatchesSection(batches: List<Batch>, stages: List<Stage>, onSectionSelected: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("الشعب والمراحل") },
                navigationIcon = {
                    IconButton(onClick = onSectionSelected) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            if (batches.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("لا يوجد شعب", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            items(batches) { batch ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(batch.name ?: "شعبة", fontWeight = FontWeight.Bold, style = MaterialTheme.typography.titleMedium)
                        batch.description?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Text("المراحل:", style = MaterialTheme.typography.bodySmall, fontWeight = FontWeight.Medium)
                        stages.filter { it.batchId == batch.id }.forEach { stage ->
                            Text("  • ${stage.name ?: "---"}", style = MaterialTheme.typography.bodySmall)
                        }
                        if (stages.filter { it.batchId == batch.id }.isEmpty()) {
                            Text("  لا توجد مراحل", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminExamsSection(exams: List<Exam>, onSectionSelected: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("الامتحانات") },
                navigationIcon = {
                    IconButton(onClick = onSectionSelected) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (exams.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("لا توجد امتحانات", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            items(exams) { exam ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(exam.title ?: "امتحان", fontWeight = FontWeight.Bold)
                        exam.description?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall)
                        }
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            Text("النوع: ${exam.type ?: "---"}", style = MaterialTheme.typography.bodySmall)
                            Text("الدرجة العظمى: ${exam.maxScore ?: 0}", style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminCurriculumSection(files: List<CurriculumFile>, onSectionSelected: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("المناهج") },
                navigationIcon = {
                    IconButton(onClick = onSectionSelected) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع")
                    }
                }
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(8.dp)
        ) {
            if (files.isEmpty()) {
                item {
                    Box(modifier = Modifier.fillMaxSize().padding(32.dp), contentAlignment = Alignment.Center) {
                        Text("لا توجد ملفات منهاج", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    }
                }
            }
            items(files) { file ->
                Card(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.padding(16.dp)) {
                        Text(file.title ?: "ملف", fontWeight = FontWeight.Bold)
                        file.description?.let { Text(it, style = MaterialTheme.typography.bodySmall) }
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun AdminAttendanceListSection(onSectionSelected: () -> Unit) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("سجلات الحضور") },
                navigationIcon = {
                    IconButton(onClick = onSectionSelected) {
                        Icon(Icons.Default.ArrowForward, contentDescription = "رجوع")
                    }
                }
            )
        }
    ) { padding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentAlignment = Alignment.Center
        ) {
            Text("استخدم شاشة الحضور المخصصة", color = MaterialTheme.colorScheme.onSurfaceVariant)
        }
    }
}
