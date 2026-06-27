package com.alkhalel.academy.ui.screens

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
fun AttendanceScreen(
    students: List<Student>,
    batches: List<Batch>,
    stages: List<Stage>,
    onBack: () -> Unit,
    onSubmit: (BatchAttendanceRequest) -> Unit,
    isSubmitting: Boolean,
    errorMessage: String?
) {
    var selectedDate by remember { mutableStateOf("") }
    var selectedBatchId by remember { mutableIntStateOf(-1) }
    var selectedStageId by remember { mutableIntStateOf(-1) }
    var expandedBatch by remember { mutableStateOf(false) }
    var expandedStage by remember { mutableStateOf(false) }
    var attendanceMap by remember { mutableStateOf(mapOf<Int, String>()) }

    val filteredStages = stages.filter { it.batchId == selectedBatchId }
    val filteredStudents = students.filter { s ->
        (selectedBatchId == -1 || s.batchId == selectedBatchId) &&
        (selectedStageId == -1 || s.stageId == selectedStageId)
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("تسجيل الحضور") },
                    navigationIcon = {
                        IconButton(onClick = onBack) {
                            Icon(Icons.Default.ArrowForward, contentDescription = "رجوع")
                        }
                    }
                )
            }
        ) { padding ->
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(padding)
                    .padding(16.dp)
            ) {
                OutlinedTextField(
                    value = selectedDate,
                    onValueChange = { selectedDate = it },
                    label = { Text("التاريخ (YYYY-MM-DD)") },
                    leadingIcon = { Icon(Icons.Default.CalendarMonth, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    placeholder = { Text("مثال: 2026-06-26") }
                )

                Spacer(modifier = Modifier.height(12.dp))

                ExposedDropdownMenuBox(
                    expanded = expandedBatch,
                    onExpandedChange = { expandedBatch = !expandedBatch }
                ) {
                    OutlinedTextField(
                        value = batches.find { it.id == selectedBatchId }?.name ?: "اختر الشعبة",
                        onValueChange = {},
                        readOnly = true,
                        trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedBatch) },
                        modifier = Modifier
                            .fillMaxWidth()
                            .menuAnchor()
                    )
                    ExposedDropdownMenu(
                        expanded = expandedBatch,
                        onDismissRequest = { expandedBatch = false }
                    ) {
                        DropdownMenuItem(
                            text = { Text("الكل") },
                            onClick = {
                                selectedBatchId = -1
                                selectedStageId = -1
                                expandedBatch = false
                            }
                        )
                        batches.forEach { batch ->
                            DropdownMenuItem(
                                text = { Text(batch.name ?: "") },
                                onClick = {
                                    selectedBatchId = batch.id ?: -1
                                    selectedStageId = -1
                                    expandedBatch = false
                                }
                            )
                        }
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                if (selectedBatchId > 0) {
                    ExposedDropdownMenuBox(
                        expanded = expandedStage,
                        onExpandedChange = { expandedStage = !expandedStage }
                    ) {
                        OutlinedTextField(
                            value = filteredStages.find { it.id == selectedStageId }?.name ?: "اختر المرحلة",
                            onValueChange = {},
                            readOnly = true,
                            trailingIcon = { ExposedDropdownMenuDefaults.TrailingIcon(expanded = expandedStage) },
                            modifier = Modifier
                                .fillMaxWidth()
                                .menuAnchor()
                        )
                        ExposedDropdownMenu(
                            expanded = expandedStage,
                            onDismissRequest = { expandedStage = false }
                        ) {
                            DropdownMenuItem(
                                text = { Text("الكل") },
                                onClick = {
                                    selectedStageId = -1
                                    expandedStage = false
                                }
                            )
                            filteredStages.forEach { stage ->
                                DropdownMenuItem(
                                    text = { Text(stage.name ?: "") },
                                    onClick = {
                                        selectedStageId = stage.id ?: -1
                                        expandedStage = false
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(12.dp))
                }

                Spacer(modifier = Modifier.height(8.dp))

                Text(
                    "الطلاب (${filteredStudents.size})",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold
                )

                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier.weight(1f),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(filteredStudents) { student ->
                        val currentStatus = attendanceMap[student.id] ?: "present"

                        Card(modifier = Modifier.fillMaxWidth()) {
                            Column(modifier = Modifier.padding(12.dp)) {
                                Text(
                                    student.fullName ?: "طالب",
                                    fontWeight = FontWeight.Medium
                                )

                                Spacer(modifier = Modifier.height(8.dp))

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.SpaceEvenly
                                ) {
                                    AttendanceStatusButton(
                                        label = "حاضر",
                                        icon = Icons.Default.CheckCircle,
                                        isSelected = currentStatus == "present",
                                        color = androidx.compose.ui.graphics.Color(0xFF2E7D32),
                                        onClick = {
                                            attendanceMap = attendanceMap + ((student.id ?: 0) to "present")
                                        }
                                    )
                                    AttendanceStatusButton(
                                        label = "غائب",
                                        icon = Icons.Default.Cancel,
                                        isSelected = currentStatus == "absent",
                                        color = androidx.compose.ui.graphics.Color(0xFFC62828),
                                        onClick = {
                                            attendanceMap = attendanceMap + ((student.id ?: 0) to "absent")
                                        }
                                    )
                                    AttendanceStatusButton(
                                        label = "متأخر",
                                        icon = Icons.Default.Schedule,
                                        isSelected = currentStatus == "late",
                                        color = androidx.compose.ui.graphics.Color(0xFFF57F17),
                                        onClick = {
                                            attendanceMap = attendanceMap + ((student.id ?: 0) to "late")
                                        }
                                    )
                                    AttendanceStatusButton(
                                        label = "معذر",
                                        icon = Icons.Default.MedicalServices,
                                        isSelected = currentStatus == "excused",
                                        color = androidx.compose.ui.graphics.Color(0xFF1565C0),
                                        onClick = {
                                            attendanceMap = attendanceMap + ((student.id ?: 0) to "excused")
                                        }
                                    )
                                }
                            }
                        }
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))

                if (errorMessage != null) {
                    Text(
                        errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Button(
                    onClick = {
                        val records = attendanceMap.map { (studentId, status) ->
                            AttendanceRecord(studentId = studentId, status = status)
                        }
                        onSubmit(
                            BatchAttendanceRequest(
                                batchId = if (selectedBatchId > 0) selectedBatchId else 0,
                                stageId = if (selectedStageId > 0) selectedStageId else null,
                                date = selectedDate,
                                records = records
                            )
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    enabled = selectedDate.isNotBlank() && attendanceMap.isNotEmpty() && !isSubmitting
                ) {
                    if (isSubmitting) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("تسجيل الحضور", fontWeight = FontWeight.Bold)
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
            }
        }
    }
}

@Composable
private fun AttendanceStatusButton(
    label: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    isSelected: Boolean,
    color: androidx.compose.ui.graphics.Color,
    onClick: () -> Unit
) {
    FilterChip(
        selected = isSelected,
        onClick = onClick,
        label = { Text(label, style = MaterialTheme.typography.bodySmall) },
        leadingIcon = {
            Icon(
                icon,
                contentDescription = null,
                tint = if (isSelected) color else MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(16.dp)
            )
        },
        colors = FilterChipDefaults.filterChipColors(
            selectedContainerColor = color.copy(alpha = 0.15f),
            selectedLabelColor = color
        )
    )
}
