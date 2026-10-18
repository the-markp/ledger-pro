package com.ledgerpro.app.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import com.ledgerpro.app.data.model.Transaction
import com.ledgerpro.app.ui.theme.*
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

@Composable
fun NewTransactionDialog(
    onDismiss: () -> Unit,
    onSubmit: (Transaction) -> Unit
) {
    var client by remember { mutableStateOf("") }
    var projectName by remember { mutableStateOf("") }
    var purpose by remember { mutableStateOf("") }
    var billText by remember { mutableStateOf("") }
    var printCostText by remember { mutableStateOf("0") }
    var ee by remember { mutableStateOf("") }
    var pl by remember { mutableStateOf("") }
    var st by remember { mutableStateOf("") }
    var arch by remember { mutableStateOf("") }
    var remarks by remember { mutableStateOf("") }

    val todayDate = remember {
        SimpleDateFormat("yyyy-MM-dd", Locale.getDefault()).format(Date())
    }

    Dialog(onDismissRequest = onDismiss) {
        Card(
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.9f)
                .padding(4.dp),
            shape = RoundedCornerShape(16.dp),
            colors = CardDefaults.cardColors(containerColor = DarkSurface)
        ) {
            Column(
                modifier = Modifier
                    .padding(20.dp)
                    .verticalScroll(rememberScrollState())
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "New Project Billing",
                        style = MaterialTheme.typography.titleLarge,
                        color = TextPrimary
                    )
                    IconButton(onClick = onDismiss) {
                        Icon(Icons.Default.Close, contentDescription = "Close", tint = TextSecondary)
                    }
                }

                Spacer(modifier = Modifier.height(14.dp))

                OutlinedTextField(
                    value = client,
                    onValueChange = { client = it },
                    label = { Text("Client / Developer Company *") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = projectName,
                    onValueChange = { projectName = it },
                    label = { Text("Project Name & Location *") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = purpose,
                    onValueChange = { purpose = it },
                    label = { Text("Scope of Work / Deliverables") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(modifier = Modifier.height(14.dp))

                // Financial Inputs (in ₱)
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    OutlinedTextField(
                        value = billText,
                        onValueChange = { billText = it },
                        label = { Text("Design Fee (₱) *") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    )
                    OutlinedTextField(
                        value = printCostText,
                        onValueChange = { printCostText = it },
                        label = { Text("Blueprint (₱)") },
                        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(8.dp)
                    )
                }

                Spacer(modifier = Modifier.height(14.dp))
                Text("Engineering Disciplines & Sign-offs", fontSize = 12.sp, color = AccentCyan)
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = ee,
                    onValueChange = { ee = it },
                    label = { Text("Electrical Engineer (EE)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = st,
                    onValueChange = { st = it },
                    label = { Text("Structural Engineer (ST)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = pl,
                    onValueChange = { pl = it },
                    label = { Text("Sanitary / Plumbing Engineer (PL)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )
                Spacer(modifier = Modifier.height(8.dp))

                OutlinedTextField(
                    value = arch,
                    onValueChange = { arch = it },
                    label = { Text("Architect (ARCH)") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = remarks,
                    onValueChange = { remarks = it },
                    label = { Text("Remarks / Milestone Terms") },
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(8.dp)
                )

                Spacer(modifier = Modifier.height(20.dp))

                Button(
                    onClick = {
                        val bill = billText.toDoubleOrNull() ?: 0.0
                        val print = printCostText.toDoubleOrNull() ?: 0.0
                        if (client.isBlank() || projectName.isBlank() || bill <= 0) return@Button

                        val tx = Transaction(
                            id = "",
                            date = todayDate,
                            client = client.trim(),
                            projectName = projectName.trim(),
                            purpose = purpose.trim(),
                            bill = bill,
                            printCost = print,
                            totalBill = bill + print,
                            paymentStatus = "Pending",
                            amountPaid = 0.0,
                            balance = bill + print,
                            ee = ee.trim(),
                            pl = pl.trim(),
                            st = st.trim(),
                            arch = arch.trim(),
                            remarks = remarks.trim()
                        )
                        onSubmit(tx)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = PrimaryBlue),
                    shape = RoundedCornerShape(8.dp)
                ) {
                    Text("Save & Sync to Server", fontWeight = FontWeight.SemiBold)
                }
            }
        }
    }
}
