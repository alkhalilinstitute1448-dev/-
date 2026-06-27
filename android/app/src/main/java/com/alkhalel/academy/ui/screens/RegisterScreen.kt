package com.alkhalel.academy.ui.screens

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.util.Base64
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalLayoutDirection
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.LayoutDirection
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.accompanist.permissions.ExperimentalPermissionsApi
import com.google.accompanist.permissions.isGranted
import com.google.accompanist.permissions.rememberPermissionState
import java.io.ByteArrayOutputStream

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun RegisterScreen(
    onRegister: (Map<String, String>) -> Unit,
    onNavigateBack: () -> Unit,
    isLoading: Boolean,
    errorMessage: String?,
    successResult: Pair<String, String>?
) {
    var fullName by remember { mutableStateOf("") }
    var fatherName by remember { mutableStateOf("") }
    var motherName by remember { mutableStateOf("") }
    var fatherStatus by remember { mutableStateOf("") }
    var motherStatus by remember { mutableStateOf("") }
    var fatherOccupation by remember { mutableStateOf("") }
    var motherOccupation by remember { mutableStateOf("") }
    var studentPhone by remember { mutableStateOf("") }
    var fatherPhone by remember { mutableStateOf("") }
    var motherPhone by remember { mutableStateOf("") }
    var primaryContact by remember { mutableStateOf("الأب") }
    var birthYear by remember { mutableStateOf("") }
    var photoBitmap by remember { mutableStateOf<Bitmap?>(null) }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var copiedToClipboard by remember { mutableStateOf(false) }

    val focusManager = LocalFocusManager.current
    val context = LocalContext.current

    LaunchedEffect(successResult) {
        if (successResult != null) {
            showSuccessDialog = true
        }
    }

    val cameraPermission = rememberPermissionState(Manifest.permission.CAMERA)

    val cameraLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.TakePicturePreview()
    ) { bitmap ->
        bitmap?.let {
            val stream = ByteArrayOutputStream()
            it.compress(Bitmap.CompressFormat.JPEG, 70, stream)
            photoBitmap = it
        }
    }

    if (showSuccessDialog && successResult != null) {
        AlertDialog(
            onDismissRequest = { showSuccessDialog = false },
            title = {
                Text(
                    "تم إنشاء الحساب",
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier.fillMaxWidth(),
                    textAlign = TextAlign.Center
                )
            },
            text = {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Icon(
                        Icons.Default.CheckCircle,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                        modifier = Modifier.size(64.dp)
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Text("اسم المستخدم:", fontWeight = FontWeight.Bold)
                    Text(
                        successResult.first,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    Text("كلمة المرور:", fontWeight = FontWeight.Bold)
                    Text(
                        successResult.second,
                        style = MaterialTheme.typography.titleLarge,
                        color = MaterialTheme.colorScheme.primary
                    )
                    Spacer(modifier = Modifier.height(16.dp))
                    Button(onClick = {
                        val clipboard = context.getSystemService(android.content.Context.CLIPBOARD_SERVICE) as android.content.ClipboardManager
                        val clip = android.content.ClipData.newPlainText("credentials", "اسم المستخدم: ${successResult.first}\nكلمة المرور: ${successResult.second}")
                        clipboard.setPrimaryClip(clip)
                        copiedToClipboard = true
                    }) {
                        Icon(Icons.Default.ContentCopy, contentDescription = null)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(if (copiedToClipboard) "تم النسخ" else "نسخ البيانات")
                    }
                }
            },
            confirmButton = {
                Button(onClick = {
                    showSuccessDialog = false
                    onNavigateBack()
                }) {
                    Text("حسناً")
                }
            }
        )
    }

    CompositionLocalProvider(LocalLayoutDirection provides LayoutDirection.Rtl) {
        Scaffold(
            topBar = {
                TopAppBar(
                    title = { Text("إنشاء حساب جديد") },
                    navigationIcon = {
                        IconButton(onClick = onNavigateBack) {
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
                    .padding(horizontal = 24.dp)
                    .verticalScroll(rememberScrollState()),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Spacer(modifier = Modifier.height(16.dp))

                Box(
                    contentAlignment = Alignment.BottomEnd,
                    modifier = Modifier.size(120.dp)
                ) {
                    if (photoBitmap != null) {
                        Image(
                            bitmap = photoBitmap!!.asImageBitmap(),
                            contentDescription = null,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(120.dp)
                                .clip(CircleShape)
                                .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape)
                        )
                    } else {
                        Box(
                            contentAlignment = Alignment.Center,
                            modifier = Modifier
                                .size(120.dp)
                                .clip(CircleShape)
                                .background(MaterialTheme.colorScheme.primaryContainer)
                                .border(2.dp, MaterialTheme.colorScheme.primary, CircleShape)
                        ) {
                            Icon(
                                Icons.Default.Person,
                                contentDescription = null,
                                modifier = Modifier.size(48.dp),
                                tint = MaterialTheme.colorScheme.onPrimaryContainer
                            )
                        }
                    }

                    IconButton(
                        onClick = {
                            if (cameraPermission.status.isGranted) {
                                cameraLauncher.launch(null)
                            } else {
                                cameraPermission.launchPermissionRequest()
                            }
                        },
                        modifier = Modifier
                            .size(36.dp)
                            .background(MaterialTheme.colorScheme.primary, CircleShape)
                    ) {
                        Icon(
                            Icons.Default.CameraAlt,
                            contentDescription = "التقاط صورة",
                            tint = MaterialTheme.colorScheme.onPrimary,
                            modifier = Modifier.size(20.dp)
                        )
                    }
                }

                Spacer(modifier = Modifier.height(8.dp))
                Text("صورة الطالب", style = MaterialTheme.typography.bodySmall, color = MaterialTheme.colorScheme.onSurfaceVariant)

                Spacer(modifier = Modifier.height(24.dp))

                OutlinedTextField(
                    value = fullName,
                    onValueChange = { fullName = it },
                    label = { Text("الاسم الرباعي *") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = fatherName,
                    onValueChange = { fatherName = it },
                    label = { Text("اسم الأب *") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = motherName,
                    onValueChange = { motherName = it },
                    label = { Text("اسم الأم *") },
                    leadingIcon = { Icon(Icons.Default.Person, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = fatherStatus,
                    onValueChange = { fatherStatus = it },
                    label = { Text("حالة الأب (اختياري)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = motherStatus,
                    onValueChange = { motherStatus = it },
                    label = { Text("حالة الأم (اختياري)") },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = fatherOccupation,
                    onValueChange = { fatherOccupation = it },
                    label = { Text("مهنة الأب") },
                    leadingIcon = { Icon(Icons.Default.Work, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = motherOccupation,
                    onValueChange = { motherOccupation = it },
                    label = { Text("مهنة الأم") },
                    leadingIcon = { Icon(Icons.Default.Work, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = studentPhone,
                    onValueChange = { studentPhone = it },
                    label = { Text("هاتف الطالب (اختياري)") },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = fatherPhone,
                    onValueChange = { fatherPhone = it },
                    label = { Text("هاتف الأب") },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = motherPhone,
                    onValueChange = { motherPhone = it },
                    label = { Text("هاتف الأم") },
                    leadingIcon = { Icon(Icons.Default.Phone, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Phone, imeAction = ImeAction.Next),
                    keyboardActions = KeyboardActions(onNext = { focusManager.moveFocus(FocusDirection.Down) })
                )

                Spacer(modifier = Modifier.height(12.dp))

                Text("جهة الاتصال الأساسية", style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium)

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceEvenly
                ) {
                    listOf("الأب", "الأم", "الطالب").forEach { contact ->
                        FilterChip(
                            selected = primaryContact == contact,
                            onClick = { primaryContact = contact },
                            label = { Text(contact) }
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                OutlinedTextField(
                    value = birthYear,
                    onValueChange = { birthYear = it },
                    label = { Text("سنة الميلاد") },
                    leadingIcon = { Icon(Icons.Default.CalendarMonth, contentDescription = null) },
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Done),
                    keyboardActions = KeyboardActions(onDone = { focusManager.clearFocus() })
                )

                Spacer(modifier = Modifier.height(8.dp))

                if (errorMessage != null) {
                    Text(
                        text = errorMessage,
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                        textAlign = TextAlign.Center,
                        modifier = Modifier.fillMaxWidth()
                    )
                }

                Spacer(modifier = Modifier.height(24.dp))

                Button(
                    onClick = {
                        val photoBase64 = photoBitmap?.let { bmp ->
                            val stream = ByteArrayOutputStream()
                            bmp.compress(Bitmap.CompressFormat.JPEG, 70, stream)
                            Base64.encodeToString(stream.toByteArray(), Base64.NO_WRAP)
                        }

                        onRegister(
                            mapOf(
                                "full_name" to fullName,
                                "father_name" to fatherName,
                                "mother_name" to motherName,
                                "father_status" to fatherStatus,
                                "mother_status" to motherStatus,
                                "father_occupation" to fatherOccupation,
                                "mother_occupation" to motherOccupation,
                                "student_phone" to studentPhone,
                                "father_phone" to fatherPhone,
                                "mother_phone" to motherPhone,
                                "primary_contact" to primaryContact,
                                "birth_year" to birthYear,
                                "student_photo" to (photoBase64 ?: "")
                            )
                        )
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(50.dp),
                    enabled = fullName.isNotBlank() && fatherName.isNotBlank() && motherName.isNotBlank() && !isLoading
                ) {
                    if (isLoading) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(24.dp),
                            color = MaterialTheme.colorScheme.onPrimary,
                            strokeWidth = 2.dp
                        )
                    } else {
                        Text("تسجيل", fontSize = 16.sp)
                    }
                }

                Spacer(modifier = Modifier.height(32.dp))
            }
        }
    }
}
