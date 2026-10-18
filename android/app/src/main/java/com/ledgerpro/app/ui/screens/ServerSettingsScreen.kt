package com.ledgerpro.app.ui.screens

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.Dns
import androidx.compose.material.icons.filled.Warning
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.ledgerpro.app.data.api.ApiClient
import com.ledgerpro.app.data.model.ServerStatus
import com.ledgerpro.app.data.repository.LedgerRepository
import com.ledgerpro.app.ui.theme.*
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ServerSettingsScreen(
    onBack: () -> Unit
) {
    val context = LocalContext.current
    var serverUrl by remember { mutableStateOf(ApiClient.getServerUrl()) }
    var testResult by remember { mutableStateOf<String?>(null) }
    var isSuccess by remember { mutableStateOf<Boolean?>(null) }
    var isTesting by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val repository = remember { LedgerRepository() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Backend Server Configuration") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Default.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = DarkSurface,
                    titleContentColor = TextPrimary,
                    navigationIconContentColor = TextPrimary
                )
            )
        },
        containerColor = DarkBackground
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(20.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                text = "Connect to LedgerPro Backend",
                style = MaterialTheme.typography.titleLarge,
                color = TextPrimary
            )

            Text(
                text = "Configure the REST API endpoint where this Android app retrieves engineering billing data, user accounts, and company settings.",
                style = MaterialTheme.typography.bodyMedium,
                color = TextSecondary
            )

            OutlinedTextField(
                value = serverUrl,
                onValueChange = { serverUrl = it },
                label = { Text("Backend Base URL") },
                leadingIcon = { Icon(Icons.Default.Dns, contentDescription = null, tint = AccentCyan) },
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(8.dp)
            )

            // Preset suggestions
            Text("Quick Presets:", fontSize = 12.sp, color = TextMuted)
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedButton(
                    onClick = {
                        serverUrl = "http://10.0.2.2:8001/api/"
                        ApiClient.updateServerUrl(context, serverUrl)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Docker (10.0.2.2:8001)", fontSize = 11.sp)
                }
                OutlinedButton(
                    onClick = {
                        serverUrl = "http://10.0.2.2:3000/api/"
                        ApiClient.updateServerUrl(context, serverUrl)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Dev (10.0.2.2:3000)", fontSize = 11.sp)
                }
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                OutlinedButton(
                    onClick = {
                        serverUrl = "http://localhost:8001/api/"
                        ApiClient.updateServerUrl(context, serverUrl)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Localhost:8001", fontSize = 11.sp)
                }
                OutlinedButton(
                    onClick = {
                        serverUrl = "http://localhost:3000/api/"
                        ApiClient.updateServerUrl(context, serverUrl)
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(6.dp)
                ) {
                    Text("Localhost:3000", fontSize = 11.sp)
                }
            }

            // Test button
            Button(
                onClick = {
                    isTesting = true
                    testResult = null
                    isSuccess = null
                    ApiClient.updateServerUrl(context, serverUrl)
                    scope.launch {
                        val res = repository.checkServer()
                        isTesting = false
                        if (res.isSuccess) {
                            val status = res.getOrNull()!!
                            isSuccess = true
                            testResult = "Connected! ${status.app} v${status.version} (${status.currency}) — ${status.service}"
                        } else {
                            isSuccess = false
                            testResult = "Failed: ${res.exceptionOrNull()?.localizedMessage ?: "Connection refused"}"
                        }
                    }
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue),
                shape = RoundedCornerShape(8.dp),
                enabled = !isTesting
            ) {
                if (isTesting) {
                    CircularProgressIndicator(modifier = Modifier.size(20.dp), color = TextPrimary)
                } else {
                    Text("Test Connection & Ping API", fontWeight = FontWeight.SemiBold)
                }
            }

            if (testResult != null) {
                Card(
                    modifier = Modifier.fillMaxWidth(),
                    colors = CardDefaults.cardColors(
                        containerColor = if (isSuccess == true) StatusPaidBg else StatusOverdueBg
                    ),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Row(
                        modifier = Modifier.padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Icon(
                            imageVector = if (isSuccess == true) Icons.Default.Check else Icons.Default.Warning,
                            contentDescription = null,
                            tint = if (isSuccess == true) StatusPaidText else StatusOverdueText
                        )
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            text = testResult!!,
                            color = if (isSuccess == true) StatusPaidText else StatusOverdueText,
                            fontSize = 13.sp
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.weight(1f))

            Button(
                onClick = {
                    ApiClient.updateServerUrl(context, serverUrl)
                    onBack()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                colors = ButtonDefaults.buttonColors(containerColor = DarkSurfaceElevated),
                shape = RoundedCornerShape(8.dp)
            ) {
                Text("Save and Return")
            }
        }
    }
}
